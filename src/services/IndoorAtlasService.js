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
  }

  /**
   * Initialize Indoor Atlas SDK with credentials from environment
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.isInitialized) {

      return true;
    }

    try {
      // Validate configuration
      validateConfig();

      await IndoorAtlas.initialize(
        INDOOR_ATLAS_CONFIG.apiKey,
        INDOOR_ATLAS_CONFIG.apiSecret
      );

      this.isInitialized = true;

      return true;

    } catch (error) {

      throw error;
    }
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

      return true;
    }

    try {

      const success = await IndoorAtlas.startPositioning();

      if (success) {
        this.isPositioning = true;

      } else {

      }

      return success;

    } catch (error) {

      throw error;
    }
  }

  /**
   * Stop receiving position updates
   * @returns {Promise<boolean>} Success status
   */
  async stopPositioning() {
    if (!this.isPositioning) {

      return true;
    }

    try {

      const success = await IndoorAtlas.stopPositioning();

      if (success) {
        this.isPositioning = false;

      }

      return success;

    } catch (error) {

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

      const location = await IndoorAtlas.getCurrentLocation();

      return location;

    } catch (error) {

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

    // Remove all subscriptions
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
    });

    this.subscriptions = [];

  }

  /**
   * Full shutdown - stop positioning and cleanup
   */
  async shutdown() {

    if (this.isPositioning) {
      await this.stopPositioning();
    }

    this.cleanup();
    this.isInitialized = false;

  }
}

// Export singleton instance
export default new IndoorAtlasService();
