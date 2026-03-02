/**
 * ZoneService - Manages zone entry detection and cooldown logic
 * 
 * This service handles:
 * - Zone entry cooldown (prevent duplicate notifications)
 * - Current zone tracking
 * - Backend-ready architecture (easy to swap AsyncStorage with API calls)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

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

    console.log(`[ZoneService] Zone: ${zoneId}, Last notified: ${Math.floor(timeSinceLastNotification)}s ago, Should notify: ${shouldNotify}`);

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
    console.log(`[ZoneService] Marked zone ${zoneId} as notified at ${new Date(now).toISOString()}`);
  }

  /**
   * Save zone entry to persistent storage
   * 🔄 BACKEND-READY: Replace this with API call when backend is ready
   * 
   * @param {Object} entry - Zone entry data
   * @param {string} entry.zoneId - Zone identifier
   * @param {string} entry.zoneName - Zone display name
   * @param {number} entry.timestamp - Entry timestamp
   * @param {number} entry.floorLevel - Floor level
   * @returns {Promise<void>}
   */
  async saveZoneEntry(entry) {
    try {
      console.log('[ZoneService] Saving zone entry:', entry);

      // Get existing history
      const history = await this.getZoneHistory();

      // Add new entry at the beginning
      history.unshift({
        ...entry,
        timestamp: entry.timestamp || Date.now(),
      });

      // Keep last 100 entries only
      const trimmedHistory = history.slice(0, 100);

      // Save back to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
      
      console.log('[ZoneService] ✅ Zone entry saved successfully');
      
      // 🔄 FUTURE: Replace above with API call
      // await APIService.saveZoneEntry(entry);

    } catch (error) {
      console.error('[ZoneService] ❌ Failed to save zone entry:', error);
      throw error;
    }
  }

  /**
   * Get zone entry history from storage
   * 🔄 BACKEND-READY: Replace this with API call when backend is ready
   * 
   * @returns {Promise<Array>} Array of zone entries, newest first
   */
  async getZoneHistory() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (!data) {
        return [];
      }

      const history = JSON.parse(data);
      console.log(`[ZoneService] Retrieved ${history.length} zone entries from history`);
      
      return history;

      // 🔄 FUTURE: Replace above with API call
      // return await APIService.getZoneHistory();

    } catch (error) {
      console.error('[ZoneService] ❌ Failed to get zone history:', error);
      return [];
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
      console.log('[ZoneService] ✅ Zone history cleared');

      // 🔄 FUTURE: Replace above with API call
      // await APIService.clearZoneHistory();

    } catch (error) {
      console.error('[ZoneService] ❌ Failed to clear zone history:', error);
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
      console.log(`[ZoneService] Current zone set to: ${zone.name} (${zone.id})`);
    } else {
      console.log('[ZoneService] Exited all zones');
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
