import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { API_BASE_URL } from '@env';

// Backend URL loaded from .env file

/**
 * Decode JWT payload (without verification)
 * Used for debugging only - to see token claims
 */
const decodeJWT = (token) => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = parts[1];
        // React Native compatible base64 decode
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (err) {

        return null;
    }
};

const APIService = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // DevTunnel compatibility (VS Code port forwarding)
        'ngrok-skip-browser-warning': 'true',
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
                
                // Validate token exists before proceeding
                if (!token) {
                    console.error('[APIService] Token refresh returned null');
                    return Promise.reject(new Error('No authentication token available'));
                }
                
                config.headers.Authorization = `Bearer ${token}`;

                // Decode JWT to see claims
                const decoded = decodeJWT(token);
                if (decoded) {

                }

                if (config.data) {

                }

            } catch (err) {
                console.error('[APIService] Failed to get auth token:', err);
                return Promise.reject(new Error('Authentication token unavailable'));
            }
        } else {

        }
        return config;
    },
    error => Promise.reject(error),
);

/**
 * Response interceptor: log errors consistently.
 */
APIService.interceptors.response.use(
    response => {

        return response;
    },
    error => {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.response?.data?.detail || error.message;

        if (status === 401) {

        }

        return Promise.reject(error);
    },
);

export default APIService;
