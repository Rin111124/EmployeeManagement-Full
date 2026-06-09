import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from '../lib/toast';

const LIST_ALLOWED = ['page', 'limit', 'search', 'employee_id', 'status', 'category'];

function filterParams(params: Record<string, any>, allowed: string[]) {
    const filtered = Object.fromEntries(
        Object.entries(params).filter(([k, v]) => allowed.includes(k) && v !== undefined && v !== null && v !== '')
    );
    if (filtered.limit) filtered.limit = Math.min(Number(filtered.limit), 100);
    return filtered;
}

export function useAssets(params?: Record<string, any>) {
    return useQuery({
        queryKey: ['assets', params],
        queryFn: async () => {
            const safe = filterParams(params || {}, LIST_ALLOWED);
            const query = new URLSearchParams(safe as any).toString();
            const res = await api.apiGet(`/assets${query ? '?' + query : ''}`);
            const data = res?.data || res || {};
            const items = data?.items || data?.data || data;
            return Array.isArray(items) ? items : [];
        },
        staleTime: 60_000,
    });
}

export function useEmployeeAssets(employeeId: string | undefined) {
    return useQuery({
        queryKey: ['assets', 'employee', employeeId],
        queryFn: async () => {
            const res = await api.apiGet(`/assets?employee_id=${employeeId}&limit=20`);
            const data = res?.data || res || {};
            const items = data?.items || data?.data || data;
            return Array.isArray(items) ? items : [];
        },
        enabled: !!employeeId,
        staleTime: 60_000,
    });
}

export function useCreateAsset() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => api.apiPost('/assets', payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast('Asset created successfully', 'success');
        },
        onError: (err: any) => {
            toast(err.message || 'Failed to create asset', 'error');
        }
    });
}

export function useUpdateAsset() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) => api.apiPatch(`/assets/${id}`, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast('Asset updated successfully', 'success');
        },
        onError: (err: any) => {
            toast(err.message || 'Failed to update asset', 'error');
        }
    });
}

export function useDeleteAsset() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.apiDelete(`/assets/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast('Asset deleted successfully', 'success');
        },
        onError: (err: any) => {
            toast(err.message || 'Failed to delete asset', 'error');
        }
    });
}
