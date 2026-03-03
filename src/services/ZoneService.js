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
const COOLDOWN_SECONDS = 60; // Don't notify about same zone within 60 seconds

class ZoneService {
  constructor() {
    // In-memory cooldown tracking (persists during app session)
    // Format: Map<zoneId, timestamp>
    this.lastNotified = new Map();

    // Current zone user is in
    this.currentZone = null;
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
    try {

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

        // eslint-disable-next-line no-console
        console.log('[ZoneService] Sending zone/floor event payload:', payload);

        const response = await APIService.post('/api/v1/event', payload);

      } catch (apiErr) {

        if (apiErr.response?.status === 401) {

        }
        // Continue to save locally even if backend fails
      }

      // Also save to local AsyncStorage as backup (use local method to avoid backend call)
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const history = data ? JSON.parse(data) : [];
      history.unshift({
        ...entry,
        timestamp: entry.timestamp || Date.now(),
      });
      const trimmedHistory = history.slice(0, 100);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));

    } catch (error) {

      throw error;
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

      const response = await APIService.get('/api/v1/notifications', {
        params: { limit, offset },
      });

      return response.data || [];

    } catch (apiErr) {

      // Fallback to AsyncStorage
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (!data) return [];

        const history = JSON.parse(data);

        return history;
      } catch (storageErr) {

        return [];
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
      await AsyncStorage.removeItem(STORAGE_KEY);

      // 🔄 FUTURE: Replace above with API call
      // await APIService.clearZoneHistory();

    } catch (error) {

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

    } else {

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
