import { apiPost } from './api';

export function saveToken(token: string) {
    void token;
}

export function clearToken() {
    // Auth tokens are stored in HttpOnly cookies by the backend.
}

export async function logout() {
    try {
        await apiPost('/auth/logout', {});
    } catch {
        // ignore errors
    }
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
}

export function isAuthenticated() {
    return false;
}

export default { saveToken, clearToken, logout, isAuthenticated };
