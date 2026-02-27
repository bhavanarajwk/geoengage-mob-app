import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { configureGoogleSignIn } from './src/services/AuthService';

// Custom theme based on existing dark theme
const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#4285F4',
    background: '#1a1a2e',
    surface: '#0f3460',
    surfaceVariant: '#1e3a5f',
    error: '#dc2626',
    onBackground: '#ffffff',
    onSurface: '#ffffff',
    onSurfaceVariant: '#a8a8b3',
  },
};

export default function App() {
  useEffect(() => {
    // Configure Google Sign-In on app startup
    configureGoogleSignIn();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AppNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
