export const API_BASE =
    (import.meta.env.VITE_API_BASE as string) ||
    (import.meta.env.VITE_API_URL as string) ||
    'http://localhost:5000/api/v1';

let refreshPromise: Promise<boolean> | null = null;

async function request(path: string, opts: RequestInit = {}) {
    const url = `${API_BASE}${path}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((opts.headers as Record<string, string>) || {}),
    };

    const init: RequestInit = {
        cache: 'no-store',
        credentials: 'include',
        ...opts,
        headers,
    };

    if (init.body && typeof init.body !== 'string') {
        init.body = JSON.stringify(init.body);
    }

    let res = await fetch(url, init);

    if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            res = await fetch(url, { ...init, headers });
        }
    }

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
        const err: any = new Error((data && data.message) || res.statusText || 'Request failed');
        err.response = data;
        err.status = res.status;
        throw err;
    }

    return data;
}

async function tryRefreshToken(): Promise<boolean> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        try {
            const res = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            return res.ok;
        } catch {
            return false;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

export function apiGet(path: string) { return request(path, { method: 'GET' }); }
export function apiPost(path: string, body: unknown) { return request(path, { method: 'POST', body: body as BodyInit }); }
export function apiPut(path: string, body: unknown) { return request(path, { method: 'PUT', body: body as BodyInit }); }
export function apiPatch(path: string, body: unknown) { return request(path, { method: 'PATCH', body: body as BodyInit }); }
export function apiDelete(path: string) { return request(path, { method: 'DELETE' }); }

export default { API_BASE, apiGet, apiPost, apiPut, apiPatch, apiDelete };
