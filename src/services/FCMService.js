import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import APIService from './APIService';

const FCMService = {
    /**
     * MUST be called in index.js BEFORE AppRegistry.registerComponent.
     * Handles notifications when the app is in the background or killed state.
     */
    setupBackgroundHandler() {
        messaging().setBackgroundMessageHandler(async remoteMessage => {
            // Silent processing only — do NOT update UI here

        });
    },

    /**
     * Request Android notification permission and return the FCM token.
     * Call this AFTER sign-in, never on cold app launch.
     * @returns {Promise<string|null>} FCM token or null if permission denied
     */
    async requestPermissionAndGetToken() {
        // On Android 13+ we must explicitly request the POST_NOTIFICATIONS runtime permission.
        if (Platform.OS === 'android' && Platform.Version >= 33) {
            const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
            const alreadyGranted = await PermissionsAndroid.check(permission);

            if (!alreadyGranted) {
                const result = await PermissionsAndroid.request(permission);
                const androidGranted = result === PermissionsAndroid.RESULTS.GRANTED;

                if (!androidGranted) {

                    return null;
                }
            }
        }

        const authStatus = await messaging().requestPermission();
        const granted =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!granted) {

            return null;
        }

        const token = await messaging().getToken();

        return token;
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

            onMessage(remoteMessage);
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

            if (remoteMessage?.data?.campaign_id) {
                try {
                    await APIService.post('/api/v1/notification-click', {
                        campaign_id: parseInt(remoteMessage.data.campaign_id, 10),
                    });
                } catch (err) {

                }
            }
            onOpen(remoteMessage);
        });
    },

    /**
     * Handle tap on a notification that opened the app from a KILLED state.
     * Call this once on mount (e.g., in App.tsx or MapScreen useEffect).
     * @param {function} onOpen - Callback receiving the remoteMessage object
     */
    async checkInitialNotification(onOpen) {
        const remoteMessage = await messaging().getInitialNotification();
        if (remoteMessage) {

            if (remoteMessage?.data?.campaign_id) {
                try {
                    await APIService.post('/api/v1/notification-click', {
                        campaign_id: parseInt(remoteMessage.data.campaign_id, 10),
                    });
                } catch (err) {

                }
            }
            onOpen(remoteMessage);
        }
    },
};

export default FCMService;
