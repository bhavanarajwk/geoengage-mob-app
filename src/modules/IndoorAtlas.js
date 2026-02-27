import { NativeModules, NativeEventEmitter } from 'react-native';

const { IndoorAtlas } = NativeModules;

if (!IndoorAtlas) {
  throw new Error(
    'IndoorAtlas native module not found. Make sure the native module is properly linked.'
  );
}

// Create event emitter for listening to Indoor Atlas events
const eventEmitter = new NativeEventEmitter(IndoorAtlas);

/**
 * Indoor Atlas SDK JavaScript Wrapper
 * Provides clean API for interacting with Indoor Atlas positioning
 */
class IndoorAtlasService {
  /**
   * Initialize Indoor Atlas SDK with API credentials
   * @param {string} apiKey - Indoor Atlas API Key
   * @param {string} apiSecret - Indoor Atlas API Secret
   * @returns {Promise<boolean>}
   */
  static async initialize(apiKey, apiSecret) {
    try {
      const result = await IndoorAtlas.initialize(apiKey, apiSecret);
      console.log('✅ Indoor Atlas initialized successfully');
      return result;
    } catch (error) {
      console.error('❌ Failed to initialize Indoor Atlas:', error);
      throw error;
    }
  }

  /**
   * Start positioning (location updates)
   * @returns {Promise<boolean>}
   */
  static async startPositioning() {
    try {
      const result = await IndoorAtlas.startPositioning();
      console.log('✅ Indoor Atlas positioning started');
      return result;
    } catch (error) {
      console.error('❌ Failed to start positioning:', error);
      throw error;
    }
  }

  /**
   * Stop positioning (location updates)
   * @returns {Promise<boolean>}
   */
  static async stopPositioning() {
    try {
      const result = await IndoorAtlas.stopPositioning();
      console.log('✅ Indoor Atlas positioning stopped');
      return result;
    } catch (error) {
      console.error('❌ Failed to stop positioning:', error);
      throw error;
    }
  }

  /**
   * Get current location (one-time request)
   * @returns {Promise<Object>} Location object
   */
  static async getCurrentLocation() {
    try {
      const location = await IndoorAtlas.getCurrentLocation();
      return location;
    } catch (error) {
      console.error('❌ Failed to get current location:', error);
      throw error;
    }
  }

  /**
   * Subscribe to location changes
   * @param {function} callback - Function called with location updates
   * @returns {Object} Subscription object with remove() method
   */
  static onLocationChanged(callback) {
    return eventEmitter.addListener('onLocationChanged', callback);
  }

  /**
   * Subscribe to geofence entry events
   * @param {function} callback - Function called when entering a zone
   * @returns {Object} Subscription object with remove() method
   */
  static onGeofenceEnter(callback) {
    return eventEmitter.addListener('onGeofenceEnter', callback);
  }

  /**
   * Subscribe to geofence exit events
   * @param {function} callback - Function called when exiting a zone
   * @returns {Object} Subscription object with remove() method
   */
  static onGeofenceExit(callback) {
    return eventEmitter.addListener('onGeofenceExit', callback);
  }

  /**
   * Subscribe to status changes
   * @param {function} callback - Function called on status change
   * @returns {Object} Subscription object with remove() method
   */
  static onStatusChanged(callback) {
    return eventEmitter.addListener('onStatusChanged', callback);
  }

  /**
   * Remove all event listeners (call in cleanup)
   */
  static removeAllListeners() {
    eventEmitter.removeAllListeners('onLocationChanged');
    eventEmitter.removeAllListeners('onGeofenceEnter');
    eventEmitter.removeAllListeners('onGeofenceExit');
    eventEmitter.removeAllListeners('onStatusChanged');
  }
}

export default IndoorAtlasService;
