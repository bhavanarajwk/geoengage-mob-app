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
   * Save zone entry to persistent storage AND send to backend
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

      // Save to backend first (triggers campaigns)
      try {
        // Note: floorLevel comes from Indoor Atlas location updates (location.floorLevel)
        // It's an integer representing the floor number (e.g., 1, 2, 3)
        // If null, we default to 1
        const floorId = entry.floorLevel !== null && entry.floorLevel !== undefined 
          ? entry.floorLevel 
          : 1;
        
        const payload = {
          zone_id: entry.zoneId,           // Indoor Atlas zone UUID (string)
          zone_name: entry.zoneName,        // Human-readable zone name (string)
          floor_id: floorId,                // Floor number (integer)
        };
        
        console.log('[ZoneService] 📤 Sending to backend POST /api/v1/event');
        console.log('  → zone_name:', payload.zone_name);
        console.log('  → floor_id:', payload.floor_id);
        console.log('  → zone_id:', payload.zone_id, '(IA UUID)');
        const response = await APIService.post('/api/v1/event', payload);
        console.log('[ZoneService] ✅ Backend response:', response.data);
      } catch (apiErr) {
        console.error('[ZoneService] ❌ Backend error:', apiErr.response?.status, apiErr.response?.data);
        if (apiErr.response?.status === 401) {
          console.error('[ZoneService] 🚫 401 Unauthorized - Check if JWT is being sent correctly');
          console.error('[ZoneService] 📋 Error details:', JSON.stringify(apiErr.response?.data, null, 2));
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
      
      console.log('[ZoneService] ✅ Zone entry saved locally');

    } catch (error) {
      console.error('[ZoneService] ❌ Failed to save zone entry:', error);
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
      console.log(`[ZoneService] 📡 Fetching history from backend (limit=${limit}, offset=${offset})`);
      
      const response = await APIService.get('/api/v1/notifications', {
        params: { limit, offset },
      });
      
      console.log(`[ZoneService] ✅ Retrieved ${response.data?.length || 0} entries from backend`);
      return response.data || [];
      
    } catch (apiErr) {
      console.warn('[ZoneService] ⚠️ Backend fetch failed, using local storage:', apiErr.message);
      
      // Fallback to AsyncStorage
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        
        const history = JSON.parse(data);
        console.log(`[ZoneService] Retrieved ${history.length} entries from local storage`);
        return history;
      } catch (storageErr) {
        console.error('[ZoneService] ❌ Failed to get zone history from storage:', storageErr);
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
