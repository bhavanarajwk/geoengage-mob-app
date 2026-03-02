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
        console.error('[JWT] Failed to decode:', err.message);
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
                config.headers.Authorization = `Bearer ${token}`;
                
                console.log('\n╔══════════════════════════════════════════════════════════════════╗');
                console.log('║                       API REQUEST DEBUG                          ║');
                console.log('╠══════════════════════════════════════════════════════════════════╣');
                console.log(`║ Endpoint:    ${config.method.toUpperCase()} ${config.url}`.padEnd(67) + '║');
                console.log(`║ Full URL:    ${config.baseURL}${config.url}`.padEnd(67) + '║');
                console.log(`║ User:        ${user.email}`.padEnd(67) + '║');
                console.log(`║ UID:         ${user.uid}`.padEnd(67) + '║');
                console.log('╠══════════════════════════════════════════════════════════════════╣');
                console.log('║ FULL JWT TOKEN (Copy this to compare with Swagger):             ║');
                console.log('╠══════════════════════════════════════════════════════════════════╣');
                console.log(token);
                console.log('╠══════════════════════════════════════════════════════════════════╣');
                
                // Decode JWT to see claims
                const decoded = decodeJWT(token);
                if (decoded) {
                    console.log('║ JWT PAYLOAD (Claims):                                            ║');
                    console.log('╠══════════════════════════════════════════════════════════════════╣');
                    console.log(JSON.stringify(decoded, null, 2));
                    console.log('╠══════════════════════════════════════════════════════════════════╣');
                    console.log(`║ Token Issued:    ${new Date(decoded.iat * 1000).toISOString()}`.padEnd(67) + '║');
                    console.log(`║ Token Expires:   ${new Date(decoded.exp * 1000).toISOString()}`.padEnd(67) + '║');
                    console.log(`║ Time Until Exp:  ${Math.floor((decoded.exp * 1000 - Date.now()) / 1000 / 60)} minutes`.padEnd(67) + '║');
                }
                
                console.log('╠══════════════════════════════════════════════════════════════════╣');
                console.log('║ Request Headers:                                                 ║');
                console.log('╠══════════════════════════════════════════════════════════════════╣');
                console.log(JSON.stringify({
                    'Authorization': 'Bearer <token_shown_above>',
                    'Content-Type': config.headers['Content-Type'],
                    'Accept': config.headers['Accept'],
                    'ngrok-skip-browser-warning': config.headers['ngrok-skip-browser-warning']
                }, null, 2));
                
                if (config.data) {
                    console.log('╠══════════════════════════════════════════════════════════════════╣');
                    console.log('║ Request Body:                                                    ║');
                    console.log('╠══════════════════════════════════════════════════════════════════╣');
                    console.log(JSON.stringify(config.data, null, 2));
                }
                
                console.log('╚══════════════════════════════════════════════════════════════════╝\n');
                
            } catch (err) {
                console.error('[API] ❌ Failed to get Firebase ID token:', err.message);
                console.error('[API] ❌ Error details:', err);
            }
        } else {
            console.error('\n╔══════════════════════════════════════════════════════════════════╗');
            console.error('║                    ⚠️  CRITICAL ERROR  ⚠️                        ║');
            console.error('╠══════════════════════════════════════════════════════════════════╣');
            console.error('║ No authenticated user found (auth().currentUser is NULL)         ║');
            console.error(`║ Request: ${config.method.toUpperCase()} ${config.url}`.padEnd(67) + '║');
            console.error('║ This request will FAIL with 401 Unauthorized                     ║');
            console.error('╚══════════════════════════════════════════════════════════════════╝\n');
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
        console.log('\n╔══════════════════════════════════════════════════════════════════╗');
        console.log('║                    ✅ API RESPONSE SUCCESS                        ║');
        console.log('╠══════════════════════════════════════════════════════════════════╣');
        console.log(`║ Status:   ${response.status}`.padEnd(67) + '║');
        console.log(`║ Endpoint: ${response.config.method?.toUpperCase()} ${response.config.url}`.padEnd(67) + '║');
        console.log('╠══════════════════════════════════════════════════════════════════╣');
        console.log('║ Response Data:                                                   ║');
        console.log('╠══════════════════════════════════════════════════════════════════╣');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('╚══════════════════════════════════════════════════════════════════╝\n');
        return response;
    },
    error => {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.response?.data?.detail || error.message;
        
        console.error('\n╔══════════════════════════════════════════════════════════════════╗');
        console.error('║                      ❌ API RESPONSE ERROR                        ║');
        console.error('╠══════════════════════════════════════════════════════════════════╣');
        console.error(`║ Status:   ${status || 'No Response'}`.padEnd(67) + '║');
        console.error(`║ Message:  ${message}`.padEnd(67) + '║');
        console.error(`║ Endpoint: ${error.config?.method?.toUpperCase()} ${error.config?.url}`.padEnd(67) + '║');
        
        if (status === 401) {
            console.error('╠══════════════════════════════════════════════════════════════════╣');
            console.error('║ 🚫 AUTHENTICATION FAILED - 401 Unauthorized                      ║');
            console.error('╠══════════════════════════════════════════════════════════════════╣');
            console.error('║ Possible causes:                                                 ║');
            console.error('║ 1. JWT token is invalid or malformed                             ║');
            console.error('║ 2. Backend Firebase Admin SDK not configured correctly           ║');
            console.error('║ 3. Token audience/issuer mismatch                                ║');
            console.error('║ 4. Backend not reading Authorization header                      ║');
            console.error('╠══════════════════════════════════════════════════════════════════╣');
            console.error('║ Backend Response:                                                ║');
            console.error('╠══════════════════════════════════════════════════════════════════╣');
            console.error(JSON.stringify(error.response?.data, null, 2));
        }
        
        console.error('╠══════════════════════════════════════════════════════════════════╣');
        console.error('║ Full Error Response:                                             ║');
        console.error('╠══════════════════════════════════════════════════════════════════╣');
        console.error(JSON.stringify({
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            headers: error.response?.headers
        }, null, 2));
        console.error('╚══════════════════════════════════════════════════════════════════╝\n');
        
        return Promise.reject(error);
    },
);

export default APIService;
