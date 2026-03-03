import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';

const STORAGE_KEY_PREFIX = '@notifications_history_';
const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
const MAX_NOTIFICATIONS = 100;

let cache = [];

const NotificationStore = {
    /**
     * Get the per-user storage key based on current Firebase user.
     * Returns null if no authenticated user is available.
     */
    getStorageKey() {
        const user = auth().currentUser;
        if (!user || !user.uid) {
            return null;
        }
        return `${STORAGE_KEY_PREFIX}${user.uid}`;
    },

    /**
     * Apply 10-day retention and max length limit to the in-memory cache.
     */
    applyRetention() {
        const cutoff = Date.now() - TEN_DAYS_MS;
        cache = cache.filter((n) => {
            const ts = typeof n.receivedAt === 'number' ? n.receivedAt : 0;
            return ts >= cutoff;
        });

        if (cache.length > MAX_NOTIFICATIONS) {
            cache = cache.slice(0, MAX_NOTIFICATIONS);
        }
    },

    /**
     * Load notifications for the current user from AsyncStorage.
     * Returns a shallow copy of the in-memory list.
     */
    async loadAll() {
        const key = this.getStorageKey();
        if (!key) {
            cache = [];
            return [];
        }

        try {
            const data = await AsyncStorage.getItem(key);
            cache = data ? JSON.parse(data) : [];
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log('[NotificationStore] Failed to load notifications', e);
            cache = [];
        }

        this.applyRetention();
        return cache.slice();
    },

    /**
     * Persist the current cache for the active user.
     */
    async persist() {
        const key = this.getStorageKey();
        if (!key) {
            return;
        }

        try {
            await AsyncStorage.setItem(key, JSON.stringify(cache));
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log('[NotificationStore] Failed to persist notifications', e);
        }
    },

    /**
     * Get a snapshot of the current in-memory notifications.
     */
    getAll() {
        return cache.slice();
    },

    /**
     * Add or update a notification.
     * If an item with the same id already exists, it will be updated.
     * If no id is provided, a deterministic one will be generated.
     */
    async addNotification(raw) {
        const now = Date.now();
        const campaignId =
            raw.campaignId !== undefined && raw.campaignId !== null
                ? raw.campaignId
                : null;

        const id =
            raw.id ||
            raw.messageId ||
            (campaignId !== null ? `campaign:${campaignId}:${now}` : `local:${now}`);

        const notification = {
            id,
            campaignId,
            zoneName: raw.zoneName || null,
            floor: typeof raw.floor === 'number' ? raw.floor : null,
            title: raw.title || 'New notification',
            message: raw.message || '',
            receivedAt: raw.receivedAt || now,
            read: !!raw.read,
            clicked: !!raw.clicked,
        };

        const existingIndex = cache.findIndex((n) => n.id === id);
        if (existingIndex >= 0) {
            cache[existingIndex] = {
                ...cache[existingIndex],
                ...notification,
            };
        } else {
            cache.unshift(notification);
        }

        this.applyRetention();
        await this.persist();

        return notification;
    },

    /**
     * Mark a notification as read.
     */
    async markAsRead(id) {
        const index = cache.findIndex((n) => n.id === id);
        if (index === -1) {
            return;
        }
        cache[index] = { ...cache[index], read: true };
        await this.persist();
    },

    /**
     * Mark a notification as clicked (used for CTR tracking).
     */
    async markClicked(id) {
        const index = cache.findIndex((n) => n.id === id);
        if (index === -1) {
            return;
        }
        cache[index] = { ...cache[index], clicked: true };
        await this.persist();
    },

    /**
     * Remove a single notification by id.
     */
    async remove(id) {
        cache = cache.filter((n) => n.id !== id);
        await this.persist();
    },

    /**
     * Clear all notifications for the current user from memory and storage.
     * Does NOT delete other users' histories.
     */
    async clearAll() {
        cache = [];
        await this.persist();
    },
};

export default NotificationStore;

