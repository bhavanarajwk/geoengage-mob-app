import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureGoogleSignIn } from '../services/AuthService';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import MapScreen from '../screens/MapScreen';
import NotificationHistoryScreen from '../screens/NotificationHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);
    const [showSplash, setShowSplash] = useState(true);
    const [isFirstLaunch, setIsFirstLaunch] = useState(null);
    const [pendingValidation, setPendingValidation] = useState(false);

    useEffect(() => {
        // Configure Google Sign-In FIRST — must happen before any signIn() call
        configureGoogleSignIn();

        // Check if first launch
        const checkFirstLaunch = async () => {
            try {
                const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
                setIsFirstLaunch(hasSeenOnboarding === null);
            } catch (error) {
                console.error('[AppNavigator] Error checking first launch:', error);
                setIsFirstLaunch(false);
            }
        };
        checkFirstLaunch();

        // Listen to Firebase Auth state changes
        const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    console.log('[AppNavigator] User authenticated:', firebaseUser.uid);

                    // Check if server validation is pending (new sign-in in progress)
                    const pending = await AsyncStorage.getItem('pendingServerValidation');
                    setPendingValidation(pending === 'true');

                    // Get fresh ID token with error handling
                    try {
                        const idToken = await firebaseUser.getIdToken();
                        console.log('[AppNavigator] ID token refreshed successfully');
                    } catch (tokenError) {
                        console.error('[AppNavigator] Failed to get ID token:', tokenError);
                        // Continue anyway - user is authenticated even if token refresh fails
                        // The app can retry token fetch when needed (e.g., during API calls)
                    }
                } else {
                    console.log('[AppNavigator] User signed out');
                    setPendingValidation(false);
                }

                // Always update user state, even if token fetch failed
                setUser(firebaseUser);
                if (initializing) {
                    setInitializing(false);
                }
            } catch (error) {
                // Catch any unexpected errors in the auth state handler
                console.error('[AppNavigator] Error in auth state handler:', error);
                
                // Ensure we don't get stuck initializing
                if (initializing) {
                    setInitializing(false);
                }
                
                // Set user to null on error to prevent stuck state
                setUser(null);
            }
        });

        return unsubscribe; // Unsubscribe on unmount
    }, [initializing]);

    // Poll for pendingValidation flag to be cleared by AuthScreen
    useEffect(() => {
        if (!pendingValidation || !user) return;

        const checkValidation = async () => {
            const pending = await AsyncStorage.getItem('pendingServerValidation');
            if (pending !== 'true') {
                console.log('[AppNavigator] Server validation completed, clearing pendingValidation');
                setPendingValidation(false);
            }
        };

        // Check every 500ms
        const interval = setInterval(checkValidation, 500);
        return () => clearInterval(interval);
    }, [pendingValidation, user]);

    // Handle splash completion - memoized to prevent re-renders
    const handleSplashComplete = useCallback(() => {
        setShowSplash(false);
    }, []);

    // Show splash screen first
    if (showSplash) {
        return <SplashScreen onAnimationComplete={handleSplashComplete} />;
    }

    // Wait for first launch check and auth initialization
    if (initializing || isFirstLaunch === null) {
        return null;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user && !pendingValidation ? (
                    // Authenticated stack - only show after server validation completes
                    <>
                        <Stack.Screen name="Map" component={MapScreen} />
                        <Stack.Screen
                            name="NotificationHistory"
                            component={NotificationHistoryScreen}
                            options={{
                                animation: 'slide_from_right',
                            }}
                        />
                        <Stack.Screen
                            name="Profile"
                            component={ProfileScreen}
                            options={{
                                animation: 'slide_from_right',
                            }}
                        />
                    </>
                ) : (
                    // Unauthenticated stack
                    <>
                        {isFirstLaunch && (
                            <Stack.Screen 
                                name="Onboarding" 
                                component={OnboardingScreen}
                                options={{
                                    animation: 'fade',
                                }}
                            />
                        )}
                        <Stack.Screen 
                            name="Auth" 
                            component={AuthScreen}
                            options={{
                                animation: 'fade',
                            }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
