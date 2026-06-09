import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '../lib/api';

export function useTimeConfig() {
    return useQuery({
        queryKey: ['settings', 'time_config'],
        queryFn: async () => {
            const res = await apiGet('/settings/time_config');
            return res?.data || null;
        },
    });
}

export function useUpdateTimeConfig() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: any) => {
            const res = await apiPut('/settings/time_config', payload);
            return res?.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['settings', 'time_config'] });
        },
    });
}
