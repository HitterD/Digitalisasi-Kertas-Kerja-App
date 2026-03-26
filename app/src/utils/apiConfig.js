import { getAuthStr, getJwtToken, clearAuth } from './auth';

/**
 * API Configuration — Dynamic base URL resolution.
 * 
 * In BROWSER: uses relative URLs (e.g. /api/db/status) → same server.
 * In CAPACITOR APK: uses absolute URL to PC server (e.g. http://localhost:5181/api/db/status).
 * 
 * The server URL is stored in localStorage so users can change it from settings.
 */

// Default PC server address on the local network
// For WiFi: user can change via Settings or localStorage.setItem('server_url', 'http://IP:5181')
const DEFAULT_SERVER = 'http://localhost:5181';

/**
 * Detect if running inside Capacitor (Android APK)
 */
export function isCapacitor() {
    return typeof window !== 'undefined' &&
        window.Capacitor &&
        window.Capacitor.isNativePlatform &&
        window.Capacitor.isNativePlatform();
}

/**
 * Get the saved server URL (for Capacitor mode)
 */
export function getServerUrl() {
    try {
        return localStorage.getItem('server_url') || DEFAULT_SERVER;
    } catch {
        return DEFAULT_SERVER;
    }
}

/**
 * Save a new server URL
 */
export function setServerUrl(url) {
    try {
        localStorage.setItem('server_url', url);
    } catch {
        // ignore
    }
}

/**
 * Build the full API URL.
 * - Browser: returns path as-is (relative)
 * - Capacitor: prepends the server URL
 * 
 * @param {string} path - API path like '/api/db/status'
 * @returns {string} Full URL
 */
export function apiUrl(path) {
    if (isCapacitor()) {
        return `${getServerUrl()}${path}`;
    }
    return path;
}

/**
 * Get the Auth Headers for API calls
 */
export function getAuthHeaders() {
    try {
        // Prefer JWT token
        const token = getJwtToken();
        if (token) {
            return { 'Authorization': `Bearer ${token}` };
        }

        // Fallback to legacy basic auth if token missing but auth exists
        const authStr = getAuthStr();
        if (authStr) {
            const auth = JSON.parse(authStr);
            if (auth.username && auth.password) {
                const b64 = window.btoa(`${auth.username}:${auth.password}`);
                return { 'Authorization': `Basic ${b64}` };
            }
        }
    } catch {
        // ignore
    }
    return {};
}

/**
 * Global fetch wrapper that automatically handles 401 Unauthorized
 * by logging the user out and redirecting to the login page.
 */
let isRedirecting = false;

export async function fetchWithAuth(url, options = {}) {
    const headers = {
        ...getAuthHeaders(),
        ...(options.headers || {})
    };

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401 && !isRedirecting) {
        isRedirecting = true;
        
        // Clear auth tokens
        clearAuth();

        // Hard redirect to clear any lingering React states
        window.location.href = '/login';

        // Throw an error to stop further execution in the calling code
        throw new Error('Sesi telah berakhir atau tidak valid. Silakan login kembali.');
    }

    return res;
}

/**
 * Wrapper around fetchWithAuth that also parses JSON and checks success flag.
 * Throws Error if !success so calling code only needs to handle the happy path.
 *
 * @param {string} url - API URL
 * @param {object} [options] - Fetch options
 * @returns {Promise<object>} Parsed JSON response body
 */
export async function fetchJsonWithAuth(url, options = {}) {
    const res = await fetchWithAuth(url, options);
    const json = await res.json();
    if (!json.success) {
        throw new Error(json.error || json.message || 'Request gagal');
    }
    return json;
}
