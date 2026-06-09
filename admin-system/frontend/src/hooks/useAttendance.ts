import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';

// Params được whitelist bởi historyQuerySchema: page, limit (max 100), employee_id, device_id, from, to
const HISTORY_ALLOWED = ['page', 'limit', 'employee_id', 'device_id', 'from', 'to'];

function filterParams(params: Record<string, any>, allowed: string[]) {
    const filtered = Object.fromEntries(
        Object.entries(params).filter(([k, v]) => allowed.includes(k) && v !== undefined && v !== null)
    );
    // Đảm bảo limit không vượt quá 100 (giới hạn backend)
    if (filtered.limit) filtered.limit = Math.min(Number(filtered.limit), 100);
    return filtered;
}

// Get attendance history
export const useAttendanceHistory = (params?: Record<string, any>) => {
    return useQuery<any, Error>({
        queryKey: ['attendance', 'history', params],
        queryFn: async () => {
            try {
                const safe = filterParams(params || {}, HISTORY_ALLOWED);
                const query = new URLSearchParams(safe as any).toString();
                const url = `/attendance/history${query ? '?' + query : ''}`;
                const res = await api.apiGet(url);
                const payload = res?.data || res || {};
                const items = payload.items || payload.data || payload;
                return {
                    items: Array.isArray(items) ? items : [],
                    pagination: payload.pagination
                };
            } catch (error) {
                console.error('Failed to fetch attendance:', error);
                return { items: [], pagination: null };
            }
        },
    });
};

// Get daily attendance report — chỉ nhận param: date
export const useDailyAttendanceReport = (date: string) => {
    return useQuery({
        queryKey: ['attendance', 'report', 'daily', date],
        queryFn: async () => {
            const res = await api.apiGet(`/attendance/reports/daily?date=${date}`);
            return res?.data || null;
        },
        enabled: !!date,
    });
};

// Get monthly attendance report — chỉ nhận: year, month (required)
export const useMonthlyAttendanceReport = (year: number, month: number) => {
    return useQuery({
        queryKey: ['attendance', 'report', 'monthly', year, month],
        queryFn: async () => {
            const res = await api.apiGet(`/attendance/reports/monthly?year=${year}&month=${month}`);
            return res?.data || null;
        },
        enabled: !!year && !!month,
    });
};

export const useCreateAttendance = () => {
    return useMutation({
        mutationFn: async (payload: any) => {
            const res = await api.apiPost('/attendance', payload);
            return res?.data || res;
        },
    });
};

export const useUpdateAttendance = () => {
    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
            const res = await api.apiPatch(`/attendance/${id}`, payload);
            return res?.data || res;
        },
    });
};
