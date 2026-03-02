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
            if (firebaseUser) {
                console.log('\n========== USER ALREADY AUTHENTICATED ==========');
                console.log('📧 Email:', firebaseUser.email);
                console.log('👤 Display Name:', firebaseUser.displayName);
                console.log('🆔 User UID:', firebaseUser.uid);
                
                // Get fresh ID token
                try {
                    const idToken = await firebaseUser.getIdToken();
                    console.log('🔑 Current Firebase ID Token (JWT):', idToken);
                } catch (error) {
                    console.error('❌ Failed to get ID token:', error);
                }
                
                console.log('================================================\n');
            } else {
                console.log('⚠️ No user authenticated - showing login screen');
            }
            
            setUser(firebaseUser);
            if (initializing) {
                setInitializing(false);
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
