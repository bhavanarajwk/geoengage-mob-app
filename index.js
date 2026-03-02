/**
 * GeoEngage — App Entry Point
 *
 * FCM background handler MUST be registered here, before AppRegistry,
 * so it works when the app is in the background or killed state.
 */
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import FCMService from './src/services/FCMService';

// Register FCM background handler FIRST
FCMService.setupBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
