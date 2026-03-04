import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import { configureGoogleSignIn } from '../services/AuthService';

import AuthScreen from '../screens/AuthScreen';
import MapScreen from '../screens/MapScreen';
import NotificationHistoryScreen from '../screens/NotificationHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        // Configure Google Sign-In FIRST — must happen before any signIn() call
        configureGoogleSignIn();

        // Listen to Firebase Auth state changes
        const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    console.log('[AppNavigator] User authenticated:', firebaseUser.uid);

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

    // Render nothing while Firebase resolves the initial auth state
    if (initializing) {
        return null;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user ? (
                    // Authenticated stack
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
                    <Stack.Screen name="Auth" component={AuthScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
