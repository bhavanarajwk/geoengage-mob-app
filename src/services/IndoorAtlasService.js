import IndoorAtlas from '../modules/IndoorAtlas';
import { INDOOR_ATLAS_CONFIG, validateConfig } from '../config/indoorAtlas';

/**
 * High-level service for Indoor Atlas SDK
 * Handles initialization, positioning, and event management
 */
class IndoorAtlasService {
  constructor() {
    this.isInitialized = false;
    this.isPositioning = false;
    this.subscriptions = [];
    this.initializePromise = null; // Track ongoing initialization
  }

  /**
   * Initialize Indoor Atlas SDK with credentials from environment
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('[IndoorAtlasService] Already initialized');
      return true;
    }

    // Return existing promise if initialization already in progress
    if (this.initializePromise) {
      console.log('[IndoorAtlasService] Initialization already in progress, returning existing promise');
      return this.initializePromise;
    }

    // Create and store initialization promise
    this.initializePromise = (async () => {
      try {
        // Validate configuration
        validateConfig();

        console.log('[IndoorAtlasService] Initializing SDK...');
        await IndoorAtlas.initialize(
          INDOOR_ATLAS_CONFIG.apiKey,
          INDOOR_ATLAS_CONFIG.apiSecret
        );

        this.isInitialized = true;
        console.log('[IndoorAtlasService] SDK initialized successfully');
        return true;

      } catch (error) {
        console.error('[IndoorAtlasService] Initialization failed:', error.message);
        throw error;
      } finally {
        // Clear promise reference after completion (success or failure)
        this.initializePromise = null;
      }
    })();

    return this.initializePromise;
  }

  /**
   * Start receiving position updates
   * @returns {Promise<boolean>} Success status
   */
  async startPositioning() {
    if (!this.isInitialized) {
      throw new Error('IndoorAtlas SDK not initialized. Call initialize() first.');
    }

    if (this.isPositioning) {
      console.log('[IndoorAtlasService] Positioning already active');
      return true;
    }

    try {
      console.log('[IndoorAtlasService] Starting positioning...');
      const success = await IndoorAtlas.startPositioning();

      if (success) {
        this.isPositioning = true;
        console.log('[IndoorAtlasService] Positioning started successfully');
      } else {
        console.error('[IndoorAtlasService] startPositioning returned false');
      }

      return success;

    } catch (error) {
      // Reset state flag on error to allow retry
      this.isPositioning = false;
      console.error('[IndoorAtlasService] Error starting positioning:', error.message);
      throw error;
    }
  }

  /**
   * Stop receiving position updates
   * @returns {Promise<boolean>} Success status
   */
  async stopPositioning() {
    if (!this.isPositioning) {
      console.log('[IndoorAtlasService] Positioning already stopped');
      return true;
    }

    try {
      console.log('[IndoorAtlasService] Stopping positioning...');
      const success = await IndoorAtlas.stopPositioning();

      if (success) {
        this.isPositioning = false;
        console.log('[IndoorAtlasService] Positioning stopped successfully');
      }

      return success;

    } catch (error) {
      console.error('[IndoorAtlasService] Error stopping positioning:', error.message);
      throw error;
    }
  }

  /**
   * Get current location (one-time request)
   * @returns {Promise<Object>} Location object with lat, lng, accuracy, etc.
   */
  async getCurrentLocation() {
    if (!this.isInitialized) {
      throw new Error('IndoorAtlas SDK not initialized. Call initialize() first.');
    }

    try {
      console.log('[IndoorAtlasService] Requesting current location...');
      const location = await IndoorAtlas.getCurrentLocation();

      // Validate response shape
      if (!location || typeof location !== 'object') {
        throw new Error('Invalid response from native module: location is null or not an object');
      }

      if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        throw new Error('Invalid location data: missing or invalid latitude/longitude');
      }

      console.log('[IndoorAtlasService] Current location obtained:', {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy
      });

      return location;

    } catch (error) {
      console.error('[IndoorAtlasService] Error getting current location:', error.message);
      throw error;
    }
  }

  /**
   * Subscribe to location updates
   * @param {Function} callback - Called with location data on each update
   * @returns {Object} Subscription object with remove() method
   */
  onLocationChanged(callback) {
    const subscription = IndoorAtlas.onLocationChanged((location) => {
      // Location updates are too frequent to log
      callback(location);
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Subscribe to geofence enter events
   * @param {Function} callback - Called when entering a zone
   * @returns {Object} Subscription object with remove() method
   */
  onGeofenceEnter(callback) {
    const subscription = IndoorAtlas.onGeofenceEnter((region) => {

      callback(region);
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Subscribe to geofence exit events
   * @param {Function} callback - Called when exiting a zone
   * @returns {Object} Subscription object with remove() method
   */
  onGeofenceExit(callback) {
    const subscription = IndoorAtlas.onGeofenceExit((region) => {

      callback(region);
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Subscribe to status changes
   * @param {Function} callback - Called when SDK status changes
   * @returns {Object} Subscription object with remove() method
   */
  onStatusChanged(callback) {
    const subscription = IndoorAtlas.onStatusChanged((status) => {

      callback(status);
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Subscribe to floor plan changes
   * @param {Function} callback - Called when floor plan loads
   * @returns {Object} Subscription object with remove() method
   */
  onFloorPlanChanged(callback) {
    const subscription = IndoorAtlas.onFloorPlanChanged((floorPlan) => {

      callback(floorPlan);
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Remove all event subscriptions and cleanup
   */
  cleanup() {
    console.log('[IndoorAtlasService] Cleaning up subscriptions...');
    // Remove all subscriptions
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
    });

    this.subscriptions = [];
    console.log('[IndoorAtlasService] Cleanup complete');
  }

  /**
   * Full shutdown - stop positioning and cleanup
   */
  async shutdown() {
    console.log('[IndoorAtlasService] Shutting down...');
    if (this.isPositioning) {
      await this.stopPositioning();
    }

    this.cleanup();
    this.isInitialized = false;
    console.log('[IndoorAtlasService] Shutdown complete');
  }
}

// Export singleton instance
export default new IndoorAtlasService();
