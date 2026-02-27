import axios from 'axios';
import auth from '@react-native-firebase/auth';

// Replace with your actual backend URL when ready
const API_BASE_URL = 'https://api.geoengage.com';

const APIService = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
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
            } catch (err) {
                console.warn('[API] Failed to get Firebase ID token:', err.message);
            }
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
        const message = error.response?.data?.error || error.message;
        console.error(`[API] Error ${status}:`, message);
        return Promise.reject(error);
    },
);

export default APIService;
