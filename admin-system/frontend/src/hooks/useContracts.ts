import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from '../lib/toast';

// Params được whitelist bởi contract.listQuery: page, limit, search, employee_id, from, to
const LIST_ALLOWED = ['page', 'limit', 'search', 'employee_id', 'from', 'to', 'status'];

function filterParams(params: Record<string, any>, allowed: string[]) {
    const filtered = Object.fromEntries(
        Object.entries(params).filter(([k, v]) => allowed.includes(k) && v !== undefined && v !== null)
    );
    if (filtered.limit) filtered.limit = Math.min(Number(filtered.limit), 100);
    return filtered;
}

// Danh sách hợp đồng (có thể lọc theo employee_id)
export function useContracts(params?: Record<string, any>) {
    return useQuery({
        queryKey: ['contracts', params],
        queryFn: async () => {
            const safe = filterParams(params || {}, LIST_ALLOWED);
            const query = new URLSearchParams(safe as any).toString();
            const res = await api.apiGet(`/contracts${query ? '?' + query : ''}`);
            const data = res?.data || res || {};
            const items = data?.items || data?.data || data;
            return {
                items: Array.isArray(items) ? items : [],
                pagination: data?.pagination
            };
        },
        staleTime: 60_000,
    });
}

// Hợp đồng của một nhân viên cụ thể
export function useEmployeeContracts(employeeId: string | undefined) {
    return useQuery({
        queryKey: ['contracts', 'employee', employeeId],
        queryFn: async () => {
            const res = await api.apiGet(`/contracts?employee_id=${employeeId}&limit=20`);
            const data = res?.data || res || {};
            const items = data?.items || data?.data || data;
            return Array.isArray(items) ? items : [];
        },
        enabled: !!employeeId,
        staleTime: 60_000,
    });
}

// Tạo tài liệu hợp đồng (Markdown)
export function useGenerateContract() {
    return {
        generate: async (id: string) => {
            const res = await api.apiGet(`/contracts/${id}/generate-document`);
            return res?.data?.markdown;
        }
    };
}

export function useCreateContract() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: any) => {
            return await api.apiPost('/contracts', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contracts'] });
            toast('Contract created successfully');
        },
        onError: (err: any) => {
            toast('Failed to create contract: ' + (err?.message || 'Error'));
        }
    });
}

export function useUpdateContract() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, payload }: { id: string, payload: any }) => {
            return await api.apiPatch(`/contracts/${id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contracts'] });
            toast('Contract updated successfully');
        },
        onError: (err: any) => {
            toast('Failed to update contract: ' + (err?.message || 'Error'));
        }
    });
}

export function useUpdateContractStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            return await api.apiPatch(`/contracts/${id}/status`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contracts'] });
            toast('Contract status updated');
        },
        onError: (err: any) => {
            toast('Failed to update status: ' + (err?.message || 'Error'));
        }
    });
}

export function useGenerateHtmlContract() {
    return {
        generateUrl: (id: string) => {
            return `${api.API_BASE}/contracts/${id}/generate-html`;
        }
    };
}
