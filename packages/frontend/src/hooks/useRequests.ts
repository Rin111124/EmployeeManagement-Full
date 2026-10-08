import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// Leave Requests
export function useLeaveRequests(params?: Record<string, any>) {
    return useQuery({
        queryKey: ['leave-requests', params],
        queryFn: async () => {
            const query = new URLSearchParams(params as any).toString();
            const res = await api.apiGet(`/leave-requests${query ? '?' + query : ''}`);
            const data = res?.data || res || {};
            const items = data?.items || data?.data || data;
            return {
                items: Array.isArray(items) ? items : [],
                pagination: data?.pagination
            };
        },
    });
}

export function useCreateLeaveRequest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => api.apiPost('/leave-requests', payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
    });
}

export function useApproveLeaveRequest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.apiPost(`/leave-requests/${id}/approve`, { review_note: 'Approved' }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
    });
}

export function useRejectLeaveRequest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.apiPost(`/leave-requests/${id}/reject`, { review_note: 'Rejected' }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
    });
}

export function useDeleteLeaveRequest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.apiDelete(`/leave-requests/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
    });
}

// Overtime
export function useOvertimeRequests(params?: Record<string, any>) {
    return useQuery({
        queryKey: ['overtime', params],
        queryFn: async () => {
            const query = new URLSearchParams(params as any).toString();
            const res = await api.apiGet(`/overtime${query ? '?' + query : ''}`);
            const data = res?.data || res || {};
            const items = data?.items || data?.data || data;
            return {
                items: Array.isArray(items) ? items : [],
                pagination: data?.pagination
            };
        },
    });
}

export function useCreateOvertime() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => api.apiPost('/overtime', payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime'] }),
    });
}

export function useCreateBulkOvertime() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => api.apiPost('/overtime/bulk', payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime'] }),
    });
}

export function useApproveOvertime() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.apiPost(`/overtime/${id}/approve`, { review_note: 'Approved' }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime'] }),
    });
}

export function useRejectOvertime() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.apiPost(`/overtime/${id}/reject`, { review_note: 'Rejected' }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime'] }),
    });
}

export function useDeleteOvertime() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.apiDelete(`/overtime/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime'] }),
    });
}

// Biometric Requests
export function useBiometricRequests() {
    return useQuery({
        queryKey: ['biometric-requests'],
        queryFn: async () => {
            const res = await api.apiGet('/biometric-requests');
            const data = res?.data || res || {};
            const items = data?.items || data?.data || data;
            return {
                items: Array.isArray(items) ? items : [],
                pagination: data?.pagination
            };
        },
    });
}

export function useUpdateBiometricRequest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => 
            api.apiPatch(`/biometric-requests/${id}`, { status }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['biometric-requests'] }),
    });
}
