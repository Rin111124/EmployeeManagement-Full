import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// Training model fields: course_name, sessions[]
// Params whitelist: page, limit, search (từ listQuery())
const LIST_ALLOWED = ['page', 'limit', 'search'];

function filterParams(params: Record<string, any>, allowed: string[]) {
    const filtered = Object.fromEntries(
        Object.entries(params).filter(([k, v]) => allowed.includes(k) && v !== undefined && v !== null)
    );
    if (filtered.limit) filtered.limit = Math.min(Number(filtered.limit), 100);
    return filtered;
}

export interface Training {
    _id: string;
    course_name: string;  // backend field name
    sessions?: Array<{
        start_date?: string;
        end_date?: string;
        employees?: Array<{ employee_id: string; status: string; score?: number }>;
    }>;
    // Computed helpers
    status?: 'active' | 'completed' | 'cancelled';
    participants?: number;
    total_participants?: number;
    completed_count?: number;
    completion_percentage?: number;
}

// List training courses
export const useTrainingList = (params?: Record<string, any>) => {
    return useQuery({
        queryKey: ['training', 'list', params],
        queryFn: async () => {
            try {
                const safe = filterParams(params || {}, LIST_ALLOWED);
                const query = new URLSearchParams(safe as any).toString();
                const url = `/training${query ? '?' + query : ''}`;
                const res = await api.apiGet(url);
                const payload = res?.data || res || {};
                const items = payload.items || payload.data || payload;
                return Array.isArray(items) ? items : [];
            } catch (err) {
                console.error('Failed to fetch training list', err);
                return [];
            }
        },
    });
};

// Get training detail
export const useTrainingDetail = (id: string) => {
    return useQuery({
        queryKey: ['training', id],
        queryFn: async () => {
            const res = await api.apiGet(`/training/${id}`);
            return res?.data || null;
        },
        enabled: !!id,
    });
};

// Create training — backend field: course_name (không phải title)
export const useCreateTraining = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { course_name?: string; title?: string; [key: string]: any }) => {
            // Map title → course_name nếu được truyền vào
            const body = {
                course_name: payload.course_name || payload.title || '',
                sessions: payload.sessions || [],
            };
            const res = await api.apiPost('/training', body);
            return res?.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['training', 'list'] });
        },
    });
};

// Update training
export const useUpdateTraining = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Training> }) => {
            const res = await api.apiPatch(`/training/${id}`, data);
            return res?.data;
        },
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['training', 'list'] });
            if (data?._id) qc.invalidateQueries({ queryKey: ['training', data._id] });
        },
    });
};

// Delete training
export const useDeleteTraining = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.apiDelete(`/training/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['training', 'list'] });
        },
    });
};
