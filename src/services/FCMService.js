import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import APIService from './APIService';

const FCMService = {
    // Race condition prevention flag
    isRequesting: false,

    /**
     * MUST be called in index.js BEFORE AppRegistry.registerComponent.
     * Handles notifications when the app is in the background or killed state.
     */
    setupBackgroundHandler() {
        messaging().setBackgroundMessageHandler(async remoteMessage => {
            // Silent processing only — do NOT update UI here
            console.log('[FCMService] Background message received:', remoteMessage.messageId);
        });
    },

    /**
     * Register FCM token with backend with retry logic.
     * @param {string} token - FCM token to register
     * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
     * @returns {Promise<boolean>} True if registration successful, false otherwise
     */
    async registerTokenWithBackend(token, maxRetries = 3) {
        if (!token) {
            console.error('[FCMService] Cannot register: token is null or undefined');
            return false;
        }

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[FCMService] Registering token with backend (attempt ${attempt}/${maxRetries})`);
                
                const response = await APIService.post('/api/v1/register-device', { 
                    fcm_token: token 
                });

                console.log('[FCMService] Token registered successfully:', response.data);
                return true;

            } catch (error) {
                const isLastAttempt = attempt === maxRetries;
                const status = error.response?.status;

                if (status === 401) {
                    console.error('[FCMService] Auth error (401) - token may be expired');
                    return false; // Don't retry auth errors
                }

                console.warn(
                    `[FCMService] Registration failed (attempt ${attempt}/${maxRetries}):`, 
                    error.response?.data?.error || error.message
                );

                if (!isLastAttempt) {
                    // Exponential backoff: 1s, 2s, 4s
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    console.log(`[FCMService] Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error('[FCMService] All registration attempts failed');
                    return false;
                }
            }
        }
        return false;
    },

    /**
     * Subscribe to FCM token refresh events.
     * When Google rotates/refreshes the FCM token, this listener is called.
     * @param {function} onTokenRefresh - Callback receiving the new token
     * @returns {function} Unsubscribe function
     */
    onTokenRefresh(onTokenRefresh) {
        return messaging().onTokenRefresh(async (newToken) => {
            try {
                console.log('[FCMService] FCM token refreshed:', newToken);
                
                // Automatically register new token with backend
                const success = await this.registerTokenWithBackend(newToken);
                
                if (success) {
                    console.log('[FCMService] New token registered successfully');
                } else {
                    console.error('[FCMService] Failed to register refreshed token');
                }

                // Notify caller
                if (typeof onTokenRefresh === 'function') {
                    onTokenRefresh(newToken, success);
                }
            } catch (error) {
                console.error('[FCMService] Error in onTokenRefresh callback:', error);
            }
        });
    },

    /**
     * Request Android notification permission and return the FCM token.
     * Call this AFTER sign-in, never on cold app launch.
     * @returns {Promise<string|null>} FCM token or null if permission denied
     */
    async requestPermissionAndGetToken() {
        // Prevent concurrent requests
        if (this.isRequesting) {
            console.warn('[FCMService] Token request already in progress, rejecting duplicate call');
            return null;
        }

        this.isRequesting = true;

        try {
            // On Android 13+ we must explicitly request the POST_NOTIFICATIONS runtime permission.
            if (Platform.OS === 'android' && Platform.Version >= 33) {
                const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
                const alreadyGranted = await PermissionsAndroid.check(permission);

                if (!alreadyGranted) {
                    console.log('[FCMService] Requesting POST_NOTIFICATIONS permission...');
                    const result = await PermissionsAndroid.request(permission);
                    const androidGranted = result === PermissionsAndroid.RESULTS.GRANTED;

                    if (!androidGranted) {
                        console.warn('[FCMService] POST_NOTIFICATIONS permission denied by user');
                        return null;
                    }
                    console.log('[FCMService] POST_NOTIFICATIONS permission granted');
                }
            }

            const authStatus = await messaging().requestPermission();
            const granted =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (!granted) {
                console.warn('[FCMService] Firebase messaging permission denied by user');
                return null;
            }

            console.log('[FCMService] Permissions granted, fetching FCM token...');
            const token = await messaging().getToken();
            
            if (!token) {
                console.error('[FCMService] Failed to get FCM token - messaging().getToken() returned null');
                return null;
            }

            console.log('[FCMService] FCM token obtained successfully');
            return token;

        } catch (error) {
            console.error('[FCMService] Exception while getting FCM token:', error.message);
            return null;
        } finally {
            this.isRequesting = false;
        }
    },

    /**
     * Listen for messages when the app is in the FOREGROUND.
     * Firebase does NOT show a system notification in foreground — you must show
     * your own UI (Alert, toast, etc.) inside the callback.
     * @param {function} onMessage - Callback receiving the remoteMessage object
     * @returns {function} Unsubscribe function — call in useEffect cleanup
     */
    subscribeForeground(onMessage) {
        return messaging().onMessage(async remoteMessage => {
            try {
                console.log('[FCMService] Foreground message received:', {
                    messageId: remoteMessage.messageId,
                    title: remoteMessage.notification?.title,
                    campaignId: remoteMessage.data?.campaign_id,
                });

                if (typeof onMessage === 'function') {
                    onMessage(remoteMessage);
                } else {
                    console.error('[FCMService] subscribeForeground callback is not a function');
                }
            } catch (error) {
                console.error('[FCMService] Error in foreground message handler:', error);
            }
        });
    },

    /**
     * Handle tap on a notification when the app was in the BACKGROUND (not killed).
     * Fires when user taps the system tray notification.
     * @param {function} onOpen - Callback receiving the remoteMessage object
     * @returns {function} Unsubscribe function — call in useEffect cleanup
     */
    subscribeBackgroundOpen(onOpen) {
        return messaging().onNotificationOpenedApp(async remoteMessage => {
            try {
                console.log('[FCMService] Notification opened from background:', {
                    messageId: remoteMessage.messageId,
                    campaignId: remoteMessage.data?.campaign_id,
                });

                if (remoteMessage?.data?.campaign_id) {
                    try {
                        await APIService.post('/api/v1/notification-click', {
                            campaign_id: parseInt(remoteMessage.data.campaign_id, 10),
                        });
                        console.log('[FCMService] Notification click tracked');
                    } catch (err) {
                        console.error('[FCMService] Failed to track notification click:', err.message);
                    }
                }

                if (typeof onOpen === 'function') {
                    onOpen(remoteMessage);
                } else {
                    console.error('[FCMService] subscribeBackgroundOpen callback is not a function');
                }
            } catch (error) {
                console.error('[FCMService] Error in background notification open handler:', error);
            }
        });
    },

    /**
     * Handle tap on a notification that opened the app from a KILLED state.
     * Call this once on mount (e.g., in App.tsx or MapScreen useEffect).
     * @param {function} onOpen - Callback receiving the remoteMessage object
     */
    async checkInitialNotification(onOpen) {
        try {
            const remoteMessage = await messaging().getInitialNotification();
            if (remoteMessage) {
                console.log('[FCMService] App opened from killed state via notification:', {
                    messageId: remoteMessage.messageId,
                    campaignId: remoteMessage.data?.campaign_id,
                });

                if (remoteMessage?.data?.campaign_id) {
                    try {
                        await APIService.post('/api/v1/notification-click', {
                            campaign_id: parseInt(remoteMessage.data.campaign_id, 10),
                        });
                        console.log('[FCMService] Initial notification click tracked');
                    } catch (err) {
                        console.error('[FCMService] Failed to track initial notification click:', err.message);
                    }
                }

                if (typeof onOpen === 'function') {
                    onOpen(remoteMessage);
                } else {
                    console.error('[FCMService] checkInitialNotification callback is not a function');
                }
            }
        } catch (error) {
            console.error('[FCMService] Error checking initial notification:', error);
        }
    },
};

export default FCMService;
