import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { Employee } from '../types';

// Backend API is mounted under /api/v1
// api.ts tự động attach Bearer token và retry khi 401
const BASE = '/employees';

export async function listEmployees(params?: Record<string, any>) {
    const allowed = ['page', 'limit', 'search', 'status', 'department'];
    const filtered: Record<string, string> = {};
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            if (allowed.includes(k) && v !== undefined && v !== null && v !== '') {
                filtered[k] = String(v);
            }
        }
        if (filtered.limit) {
            filtered.limit = String(Math.min(Number(filtered.limit), 100));
        }
    }
    const qs = new URLSearchParams(filtered).toString();
    return apiGet(`${BASE}${qs ? '?' + qs : ''}`);
}

export async function getEmployee(id: string) {
    return apiGet(`${BASE}/${id}`);
}

export async function createEmployee(payload: Employee) {
    return apiPost(BASE, payload);
}

export async function updateEmployee(id: string, payload: Partial<Employee>) {
    return apiPatch(`${BASE}/${id}`, payload);
}

export async function deleteEmployee(id: string) {
    return apiDelete(`${BASE}/${id}`);
}
