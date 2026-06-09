import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// Danh sách ca làm việc
export function useShifts(params?: Record<string, any>) {
    return useQuery({
        queryKey: ['shifts', params],
        queryFn: async () => {
            // Chỉ gửi params được whitelist: page, limit, search, is_night_shift
            const allowed = ['page', 'limit', 'search', 'is_night_shift'];
            const filtered = Object.fromEntries(
                Object.entries(params || {}).filter(([k]) => allowed.includes(k))
            );
            // Backend giới hạn limit tối đa 100
            if (filtered.limit) filtered.limit = Math.min(Number(filtered.limit), 100);
            const query = new URLSearchParams(filtered as any).toString();
            const res = await api.apiGet(`/shifts${query ? '?' + query : ''}`);
            const data = res?.data || res || {};
            const items = data?.items || data?.data || data;
            return Array.isArray(items) ? items : [];
        },
        staleTime: 60_000,
    });
}

// Danh sách phân công ca làm việc
export function useShiftAssignments(params?: Record<string, any>) {
    return useQuery({
        queryKey: ['shift-assignments', params],
        queryFn: async () => {
            // Chỉ gửi params được whitelist: page, limit, employee_id, shift_id, from, to
            const allowed = ['page', 'limit', 'employee_id', 'shift_id', 'from', 'to'];
            const filtered = Object.fromEntries(
                Object.entries(params || {}).filter(([k]) => allowed.includes(k))
            );
            // Backend giới hạn limit tối đa 100
            if (filtered.limit) filtered.limit = Math.min(Number(filtered.limit), 100);
            const query = new URLSearchParams(filtered as any).toString();
            const res = await api.apiGet(`/shift-assignments${query ? '?' + query : ''}`);
            const data = res?.data || res || {};
            const items = data?.items || data?.data || data;
            return Array.isArray(items) ? items : [];
        },
        staleTime: 30_000,
    });
}

// Tạo ca làm việc mới
export function useCreateShift() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => api.apiPost('/shifts', payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
    });
}

// Cập nhật ca làm việc
export function useUpdateShift() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) => api.apiPatch(`/shifts/${id}`, payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
    });
}

// Xóa ca làm việc
export function useDeleteShift() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.apiDelete(`/shifts/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['shifts'] });
            qc.invalidateQueries({ queryKey: ['shift-assignments'] });
        },
    });
}

// Thêm phân công ca làm việc
export function useCreateShiftAssignment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => api.apiPost('/shift-assignments', payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['shift-assignments'] }),
    });
}

// Xóa phân công ca
export function useDeleteShiftAssignment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.apiDelete(`/shift-assignments/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['shift-assignments'] }),
    });
}

// Phân công ca làm việc hàng loạt
export function useBulkAssignShifts() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => api.apiPost('/shift-assignments/bulk', payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['shift-assignments'] }),
    });
}

// Cập nhật phân công ca
export function useUpdateShiftAssignment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) => api.apiPatch(`/shift-assignments/${id}`, payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['shift-assignments'] }),
    });
}
