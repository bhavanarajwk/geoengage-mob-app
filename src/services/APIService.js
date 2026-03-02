import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { API_BASE_URL } from '@env';

// Backend URL loaded from .env file

const APIService = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', // Skip ngrok warning page
    },
});

/**
 * Request interceptor: automatically attaches a fresh Firebase ID token
 * to every outgoing request as "Authorization: Bearer <token>".
 */
APIService.interceptors.request.use(
    async config => {
        const user = auth().currentUser;
        if (user) {
            try {
                const token = await user.getIdToken(true); // force refresh if expired
                config.headers.Authorization = `Bearer ${token}`;
                console.log(`[API] 🔐 JWT attached to ${config.method.toUpperCase()} ${config.url}`);
                console.log(`[API] 🔑 Token preview: ${token.substring(0, 30)}...${token.substring(token.length - 10)}`);
                console.log(`[API] 👤 User: ${user.email} (UID: ${user.uid})`);
            } catch (err) {
                console.warn('[API] ❌ Failed to get Firebase ID token:', err.message);
            }
        } else {
            console.warn('[API] ⚠️ No authenticated user - request sent without JWT');
        }
        return config;
    },
    error => Promise.reject(error),
);

/**
 * Response interceptor: log errors consistently.
 */
APIService.interceptors.response.use(
    response => response,
    error => {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.response?.data?.detail || error.message;
        console.error(`[API] ❌ Error ${status}:`, message);
        if (status === 401) {
            console.error('[API] 🚫 Authentication failed - JWT may be invalid or expired');
            console.error('[API] 📋 Response data:', JSON.stringify(error.response?.data, null, 2));
        }
        return Promise.reject(error);
    },
);

export default APIService;
