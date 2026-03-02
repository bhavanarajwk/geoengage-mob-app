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
      console.log('[IndoorAtlas] Already initialized');
      return true;
    }

    try {
      // Validate configuration
      validateConfig();

      console.log('[IndoorAtlas] Initializing SDK...');
      
      await IndoorAtlas.initialize(
        INDOOR_ATLAS_CONFIG.apiKey,
        INDOOR_ATLAS_CONFIG.apiSecret
      );

      this.isInitialized = true;
      console.log('[IndoorAtlas] ✅ SDK initialized successfully');
      return true;

    } catch (error) {
      console.error('[IndoorAtlas] ❌ Initialization failed:', error);
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
      console.log('[IndoorAtlas] Positioning already started');
      return true;
    }

    try {
      console.log('[IndoorAtlas] Starting positioning...');
      
      const success = await IndoorAtlas.startPositioning();
      
      if (success) {
        this.isPositioning = true;
        console.log('[IndoorAtlas] ✅ Positioning started');
      } else {
        console.warn('[IndoorAtlas] ⚠️ Positioning failed to start');
      }

      return success;

    } catch (error) {
      console.error('[IndoorAtlas] ❌ Failed to start positioning:', error);
      throw error;
    }
  }

  /**
   * Stop receiving position updates
   * @returns {Promise<boolean>} Success status
   */
  async stopPositioning() {
    if (!this.isPositioning) {
      console.log('[IndoorAtlas] Positioning not active');
      return true;
    }

    try {
      console.log('[IndoorAtlas] Stopping positioning...');
      
      const success = await IndoorAtlas.stopPositioning();
      
      if (success) {
        this.isPositioning = false;
        console.log('[IndoorAtlas] ✅ Positioning stopped');
      }

      return success;

    } catch (error) {
      console.error('[IndoorAtlas] ❌ Failed to stop positioning:', error);
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
      console.log('[IndoorAtlas] Requesting current location...');
      
      const location = await IndoorAtlas.getCurrentLocation();
      
      console.log('[IndoorAtlas] ✅ Current location:', {
        lat: location.latitude,
        lng: location.longitude,
        floor: location.floorLevel,
        accuracy: location.accuracy,
      });

      return location;

    } catch (error) {
      console.error('[IndoorAtlas] ❌ Failed to get location:', error);
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
      console.log('[IndoorAtlas] 📍 Location update:', {
        lat: location.latitude?.toFixed(6),
        lng: location.longitude?.toFixed(6),
        floor: location.floorLevel,
        accuracy: location.accuracy?.toFixed(2),
      });
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
      console.log('[IndoorAtlas] 🚪 Entered zone:', region.name || region.id);
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
      console.log('[IndoorAtlas] 🚶 Exited zone:', region.name || region.id);
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
      console.log('[IndoorAtlas] 📡 Status:', status.statusText || status.status);
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
      console.log('[IndoorAtlas] 🗺️ Floor plan changed:');\n      console.log('  - Name:', floorPlan.name);\n      console.log('  - ID:', floorPlan.id);\n      console.log('  - Floor Level:', floorPlan.floorLevel);\n      console.log('  - URL:', floorPlan.url);\n      callback(floorPlan);\n    });\n\n    this.subscriptions.push(subscription);\n    return subscription;\n  }

  /**
   * Remove all event subscriptions and cleanup
   */
  cleanup() {
    console.log('[IndoorAtlas] Cleaning up subscriptions...');
    
    // Remove all subscriptions
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
    });
    
    this.subscriptions = [];
    
    console.log('[IndoorAtlas] ✅ Cleanup complete');
  }

  /**
   * Full shutdown - stop positioning and cleanup
   */
  async shutdown() {
    console.log('[IndoorAtlas] Shutting down...');
    
    if (this.isPositioning) {
      await this.stopPositioning();
    }
    
    this.cleanup();
    this.isInitialized = false;
    
    console.log('[IndoorAtlas] ✅ Shutdown complete');
  }
}

// Export singleton instance
export default new IndoorAtlasService();
