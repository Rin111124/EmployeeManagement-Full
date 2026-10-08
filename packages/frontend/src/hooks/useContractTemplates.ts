import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from '../lib/toast';

const CONTRACT_TEMPLATES_ENDPOINT = '/contract-templates';

export function useContractTemplates(params?: Record<string, any>) {
    return useQuery({
        queryKey: ['contract-templates', params],
        queryFn: async () => {
            const query = new URLSearchParams(params as any).toString();
            const res = await api.apiGet(`${CONTRACT_TEMPLATES_ENDPOINT}${query ? '?' + query : ''}`);
            const data = res?.data || res || {};
            const items = data?.items || data?.data || data;
            return Array.isArray(items) ? items : [];
        },
        staleTime: 60_000,
    });
}

export function useCreateContractTemplate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => api.apiPost(CONTRACT_TEMPLATES_ENDPOINT, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['contract-templates'] });
            toast('Template created successfully');
        },
    });
}

export function useUpdateContractTemplate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) => api.apiPatch(`${CONTRACT_TEMPLATES_ENDPOINT}/${id}`, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['contract-templates'] });
            toast('Template updated successfully');
        },
    });
}

export function useDeleteContractTemplate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.apiDelete(`${CONTRACT_TEMPLATES_ENDPOINT}/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['contract-templates'] });
            toast('Template deleted');
        },
    });
}
