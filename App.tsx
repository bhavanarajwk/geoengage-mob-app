import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { configureGoogleSignIn } from './src/services/AuthService';

export default function App() {
  useEffect(() => {
    // Configure Google Sign-In on app startup
    configureGoogleSignIn();
  }, []);

  return <AppNavigator />;
}
