/**
 * ZoneService - Manages zone entry detection and cooldown logic
 * 
 * This service handles:
 * - Zone entry cooldown (prevent duplicate notifications)
 * - Current zone tracking
 * - Backend-ready architecture (easy to swap AsyncStorage with API calls)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import APIService from './APIService';

const STORAGE_KEY = '@zone_history';
const COOLDOWN_SECONDS = 0; // Cooldown disabled for testing - change back to 60 for production

class ZoneService {
  static instance = null;

  constructor() {
    // Return existing instance if already created (singleton pattern)
    if (ZoneService.instance) {
      return ZoneService.instance;
    }

    // In-memory cooldown tracking (persists during app session)
    // Format: Map<zoneId, timestamp>
    this.lastNotified = new Map();

    // Current zone user is in
    this.currentZone = null;

    // Store instance
    ZoneService.instance = this;
  }

  /**
   * Check if we should notify user about entering this zone
   * Returns false if notified recently (within cooldown period)
   * 
   * @param {string} zoneId - Zone identifier
   * @returns {boolean} True if we should notify, false if in cooldown
   */
  shouldNotify(zoneId) {
    const now = Date.now();
    const lastNotification = this.lastNotified.get(zoneId);

    if (!lastNotification) {
      // Never notified about this zone
      return true;
    }

    const timeSinceLastNotification = (now - lastNotification) / 1000; // Convert to seconds
    const shouldNotify = timeSinceLastNotification >= COOLDOWN_SECONDS;

    return shouldNotify;
  }

  /**
   * Mark that we notified user about this zone
   * Updates cooldown timestamp
   * 
   * @param {string} zoneId - Zone identifier
   */
  markNotified(zoneId) {
    const now = Date.now();
    this.lastNotified.set(zoneId, now);
    console.log(`[ZoneService] Cooldown started for zone: ${zoneId} (${COOLDOWN_SECONDS}s)`);
  }

  /**
   * Send zone exit event to backend (fire-and-forget)
   * Called when user exits a zone - notifies backend to check for exit campaigns
   *
   * @param {Object} entry - Exit data
   * @param {string} entry.zoneId - Zone UUID
   * @param {string} entry.zoneName - Zone display name
   * @param {number} entry.floorLevel - Floor level
   * @returns {Promise<void>}
   */
  async saveZoneExit(entry) {
    try {
      const floorId = entry.floorLevel !== null && entry.floorLevel !== undefined
        ? entry.floorLevel
        : 1;

      const payload = {
        event_type: 'zone_exit',
        zone_id: entry.zoneId,
        zone_name: entry.zoneName || 'Unknown Zone',
        floor_id: floorId,
      };

      console.log('[ZoneService] Sending zone exit event to backend:', payload);
      const response = await APIService.post('/api/v1/event', payload);
      console.log('[ZoneService] Zone exit event sent successfully:', response.data);

    } catch (error) {
      // Fire-and-forget pattern: log error but don't throw
      // Exit events should not block UI or cause user-facing errors
      console.error('[ZoneService] Failed to send zone exit event:', {
        error: error.message,
        status: error.response?.status,
        zoneId: entry.zoneId,
        zoneName: entry.zoneName,
      });

      if (error.response?.status === 401) {
        console.warn('[ZoneService] Authentication error on zone exit - user token may be expired');
      }
    }
  }

  /**
   * Record a transaction for the user in a zone
   * Called when user taps "Record Transaction" button while in a zone
   * This marks the user's zone session as has_transaction = true on backend
   * preventing exit-without-transaction notifications
   *
   * @param {Object} zoneData - Zone data
   * @param {string} zoneData.zoneId - Zone UUID
   * @param {string} zoneData.zoneName - Zone display name
   * @param {number} zoneData.floorLevel - Floor level
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async recordTransaction(zoneData) {
    try {
      const floorId = zoneData.floorLevel !== null && zoneData.floorLevel !== undefined
        ? zoneData.floorLevel
        : 1;

      const payload = {
        zone_id: zoneData.zoneId,
        zone_name: zoneData.zoneName || 'Unknown Zone',
        floor_id: floorId,
      };

      console.log('[ZoneService] Recording transaction:', payload);
      const response = await APIService.post('/api/v1/transactions', payload);
      console.log('[ZoneService] Transaction recorded successfully:', response.data);

      return { success: true };

    } catch (error) {
      const errorMessage = error.response?.data?.detail
        || error.response?.data?.error
        || error.message
        || 'Failed to record transaction';

      console.error('[ZoneService] Failed to record transaction:', {
        error: errorMessage,
        status: error.response?.status,
        zoneId: zoneData.zoneId,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Save floor/zone entry to persistent storage AND send to backend
   *
   * @param {Object} entry - Entry data
   * @param {'floor'|'zone'} entry.eventType - Type of event ('floor' or 'zone')
   * @param {string} entry.zoneId - Identifier (floor or zone UUID)
   * @param {string} entry.zoneName - Display name (floor or zone)
   * @param {number} entry.timestamp - Entry timestamp
   * @param {number} entry.floorLevel - Floor level
   * @returns {Promise<void>}
   */
  async saveZoneEntry(entry) {
    let backendSuccess = false;
    let localSuccess = false;

    // Save to backend first (triggers campaigns)
    try {
      // Note: floorLevel comes from Indoor Atlas location updates (location.floorLevel)
      // It's an integer representing the floor number (e.g., 1, 2, 3)
      // If null, we default to 1
      const floorId = entry.floorLevel !== null && entry.floorLevel !== undefined 
        ? entry.floorLevel 
        : 1;

      const eventType = entry.eventType === 'floor' ? 'floor' : 'zone';

      // Backend expects all fields to be non-null, even for floor entries.
      // For floors we treat the region as a "zone" representing that floor.
      const zoneId = entry.zoneId || (eventType === 'floor' ? `floor-${floorId}` : 'unknown-zone');
      const zoneName = entry.zoneName || (eventType === 'floor' ? `Floor ${floorId}` : 'Unknown Zone');

      const payload = {
        event_type: eventType,  // 'floor' or 'zone'
        zone_id: zoneId,        // Floor or zone identifier (string, never null)
        zone_name: zoneName,    // Display name (string, never null)
        floor_id: floorId,      // Floor number (integer)
      };

      console.log('[ZoneService] Sending zone/floor event to backend:', payload);
      const response = await APIService.post('/api/v1/event', payload);
      backendSuccess = true;
      console.log('[ZoneService] Backend save successful:', response.data);

    } catch (apiErr) {
      console.error('[ZoneService] Backend save failed:', {
        error: apiErr.message,
        status: apiErr.response?.status,
        eventType: entry.eventType,
        zoneId: entry.zoneId
      });

      if (apiErr.response?.status === 401) {
        console.warn('[ZoneService] Authentication error - user token may be expired');
      }
      // Continue to save locally even if backend fails
    }

    // Save to local AsyncStorage as backup
    try {
      console.log('[ZoneService] Saving to local storage...');
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const history = data ? JSON.parse(data) : [];
      history.unshift({
        ...entry,
        timestamp: entry.timestamp || Date.now(),
      });
      const trimmedHistory = history.slice(0, 100);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
      localSuccess = true;
      console.log('[ZoneService] Local storage save successful');

    } catch (storageErr) {
      console.error('[ZoneService] Local storage save failed:', {
        error: storageErr.message,
        eventType: entry.eventType,
        zoneId: entry.zoneId
      });
    }

    // Log final result
    if (!backendSuccess && !localSuccess) {
      const error = new Error('Failed to save zone entry to both backend and local storage');
      console.error('[ZoneService] Critical: Complete save failure');
      throw error;
    } else if (!backendSuccess) {
      console.warn('[ZoneService] Partial failure: Backend failed but local storage succeeded');
    } else if (!localSuccess) {
      console.warn('[ZoneService] Partial failure: Backend succeeded but local storage failed');
    }
  }

  /**
   * Get zone entry history from backend
   * Falls back to local AsyncStorage if backend fails
   * 
   * @param {number} limit - Max number of entries (default: 50)
   * @param {number} offset - Offset for pagination (default: 0)
   * @returns {Promise<Array>} Array of zone entries, newest first
   */
  async getZoneHistory(limit = 50, offset = 0) {
    try {
      console.log('[ZoneService] Fetching zone history from backend...');
      const response = await APIService.get('/api/v1/notifications', {
        params: { limit, offset },
      });

      console.log(`[ZoneService] Backend returned ${response.data?.length || 0} entries`);
      return response.data || [];

    } catch (apiErr) {
      console.warn('[ZoneService] Backend fetch failed, falling back to local storage:', apiErr.message);

      // Fallback to AsyncStorage
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        
        if (!data) {
          console.log('[ZoneService] No local history found (empty)');
          return [];
        }

        const history = JSON.parse(data);
        console.log(`[ZoneService] Loaded ${history.length} entries from local storage`);
        return history;

      } catch (storageErr) {
        console.error('[ZoneService] Local storage read failed:', storageErr.message);
        // Throw error to differentiate storage failure from empty history
        throw new Error(`Failed to read zone history: ${storageErr.message}`);
      }
    }
  }

  /**
   * Clear all zone history
   * 🔄 BACKEND-READY: Replace this with API call when backend is ready
   * 
   * @returns {Promise<void>}
   */
  async clearHistory() {
    try {
      console.log('[ZoneService] Clearing zone history...');
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('[ZoneService] Zone history cleared successfully');

      // 🔄 FUTURE: Replace above with API call
      // await APIService.clearZoneHistory();

    } catch (error) {
      console.error('[ZoneService] Failed to clear history:', error.message);
      throw error;
    }
  }

  /**
   * Set current zone user is in
   * 
   * @param {Object|null} zone - Zone object or null if exited
   * @param {string} zone.id - Zone identifier
   * @param {string} zone.name - Zone display name
   * @param {number} zone.type - Zone type
   */
  setCurrentZone(zone) {
    this.currentZone = zone;

    if (zone) {
      console.log('[ZoneService] Current zone set:', zone.name || zone.id);
    } else {
      console.log('[ZoneService] Current zone cleared (user exited)');
    }
  }

  /**
   * Get current zone user is in
   * 
   * @returns {Object|null} Current zone or null
   */
  getCurrentZone() {
    return this.currentZone;
  }

  /**
   * Clear cooldown tracking (useful for testing)
   */
  clearCooldowns() {
    this.lastNotified.clear();
    console.log('[ZoneService] All cooldowns cleared');
  }

  /**
   * Get cooldown remaining time for a zone
   * 
   * @param {string} zoneId - Zone identifier
   * @returns {number} Seconds remaining in cooldown, or 0 if not in cooldown
   */
  getCooldownRemaining(zoneId) {
    const lastNotification = this.lastNotified.get(zoneId);

    if (!lastNotification) {
      return 0;
    }

    const now = Date.now();
    const timeSinceLastNotification = (now - lastNotification) / 1000;
    const remaining = Math.max(0, COOLDOWN_SECONDS - timeSinceLastNotification);

    return Math.ceil(remaining);
  }
}

// Export singleton instance
export default new ZoneService();
