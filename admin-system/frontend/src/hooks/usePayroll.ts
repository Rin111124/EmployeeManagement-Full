import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// Params được whitelist bởi payroll.listQuery: page, limit, search, employee_id, month, year
const LIST_ALLOWED = ['page', 'limit', 'search', 'employee_id', 'month', 'year'];

function filterParams(params: Record<string, any>, allowed: string[]) {
    const filtered = Object.fromEntries(
        Object.entries(params).filter(([k, v]) => allowed.includes(k) && v !== undefined && v !== null)
    );
    if (filtered.limit) filtered.limit = Math.min(Number(filtered.limit), 100);
    return filtered;
}

// List payroll records
export const usePayrollList = (params?: Record<string, any>) => {
    return useQuery({
        queryKey: ['payroll', 'list', params],
        queryFn: async () => {
            try {
                const safe = filterParams(params || {}, LIST_ALLOWED);
                const query = new URLSearchParams(safe as any).toString();
                const url = `/payroll${query ? '?' + query : ''}`;
                const res = await api.apiGet(url);
                const payload = res?.data || res || {};
                const items = payload.items || payload.data || payload;
                return {
                    items: Array.isArray(items) ? items : [],
                    pagination: payload.pagination
                };
            } catch (err) {
                console.error('Failed to fetch payroll list', err);
                return { items: [], pagination: null };
            }
        },
    });
};

// Generate payroll
export const useGeneratePayroll = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { employee_id?: string; month: number; year: number; engineConfig?: any }) => {
            const res = await api.apiPost('/payroll/generate', payload);
            return res?.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['payroll'] });
        },
    });
};

// Get single payroll
export const usePayrollDetail = (id: string) => {
    return useQuery({
        queryKey: ['payroll', id],
        queryFn: async () => {
            const res = await api.apiGet(`/payroll/${id}`);
            return res?.data || null;
        },
        enabled: !!id,
    });
};
