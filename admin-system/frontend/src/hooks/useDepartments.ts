import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ── Flat list (dùng cho dropdown, search) ──────────────────────────────────
export function useDepartments(params?: Record<string, any>) {
    return useQuery({
        queryKey: ['departments', params],
        queryFn: async () => {
            const allowed = ['page', 'limit', 'search', 'parent_id'];
            const filtered = Object.fromEntries(
                Object.entries(params || {}).filter(([k]) => allowed.includes(k))
            );
            if (filtered.limit) filtered.limit = Math.min(Number(filtered.limit), 100);
            const query = new URLSearchParams(filtered as any).toString();
            const res = await api.apiGet(`/departments${query ? '?' + query : ''}`);
            const data = res?.data || res || {};
            const items = data?.items || data?.data || data;
            return Array.isArray(items) ? items : [];
        },
        staleTime: 60_000,
    });
}

// ── Cây phòng ban ──────────────────────────────────────────────────────────
export function useDepartmentTree() {
    return useQuery({
        queryKey: ['departments', 'tree'],
        queryFn: async () => {
            const res = await api.apiGet('/departments/tree');
            return res?.data ?? [];
        },
        staleTime: 60_000,
    });
}

// ── CRUD ──────────────────────────────────────────────────────────────────
export function useCreateDepartment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => api.apiPost('/departments', payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['departments'] });
        },
    });
}

export function useUpdateDepartment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) =>
            api.apiPatch(`/departments/${id}`, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['departments'] });
        },
    });
}

export function useDeleteDepartment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.apiDelete(`/departments/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['departments'] });
        },
    });
}

// ── Điều chuyển nhân sự ────────────────────────────────────────────────────
export function useTransferEmployees() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ deptId, employee_ids, reason }: { deptId: string; employee_ids: string[]; reason?: string }) =>
            api.apiPost(`/departments/${deptId}/transfer`, { employee_ids, reason }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['employees'] });
            qc.invalidateQueries({ queryKey: ['departments'] });
        },
    });
}
