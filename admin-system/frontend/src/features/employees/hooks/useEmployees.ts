import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as service from '../services/employees.service';
import { Employee } from '../types';

type EmployeeListPayload = {
    items: Employee[];
    pagination?: any;
};

type EmployeeListResult = EmployeeListPayload & {
    data: EmployeeListPayload;
};

export function useEmployees(params: any = {}) {
    return useQuery({
        queryKey: ['employees', params],
        queryFn: async () => {
            const res = await service.listEmployees(params);
            // api.ts returns parsed JSON: { success, data: { items, pagination } }
            const payload = res?.data || res || {};
            const items = payload.items || payload.data || payload;
            const normalized: EmployeeListPayload = {
                items: Array.isArray(items) ? items : [],
                pagination: payload.pagination,
            };

            return {
                ...normalized,
                data: normalized,
            } satisfies EmployeeListResult;
        },
        placeholderData: (previous) => previous,
    });
}


export function useEmployee(id: string | undefined) {
    return useQuery({
        queryKey: ['employee', id],
        queryFn: () => (id ? service.getEmployee(id) : Promise.resolve(null)),
        enabled: !!id,
    });
}

// Bug #3 fix: useMutation v5 dùng object { mutationFn, onSuccess } thay vì (fn, options)
// Bug #4 fix: invalidateQueries v5 dùng { queryKey: [...] } thay vì array trực tiếp
export function useCreateEmployee() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: Employee) => service.createEmployee(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
    });
}

export function useUpdateEmployee() {
    const qc = useQueryClient();
    const { user, refreshUser } = useAuth();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<Employee> }) =>
            service.updateEmployee(id, payload),
        onSuccess: async (res, { id }) => {
            const updatedEmployee = res?.data || res;
            // Update single employee cache
            qc.setQueryData(['employee', id], { ...res, data: updatedEmployee });

            // Update employee list cache
            qc.setQueriesData({ queryKey: ['employees'] }, (old: any) => {
                if (!old?.items) return old;
                return {
                    ...old,
                    items: old.items.map((emp: Employee) =>
                        emp._id === id ? { ...emp, ...updatedEmployee } : emp
                    )
                };
            });

            const currentEmployeeId = (user as any)?.employee_id?._id || (user as any)?.employee_id;
            if (currentEmployeeId && String(currentEmployeeId) === String(id)) {
                await refreshUser();
            }

            qc.invalidateQueries({ queryKey: ['employees'] });
            qc.invalidateQueries({ queryKey: ['employee', id] });
        },
    });
}

export function useDeleteEmployee() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => service.deleteEmployee(id),
        onSuccess: (_, id) => {
            qc.invalidateQueries({ queryKey: ['employees'] });
            qc.invalidateQueries({ queryKey: ['employee', id] });
        },
    });
}
