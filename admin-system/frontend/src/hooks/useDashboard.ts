import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../lib/api';

// Tổng số nhân viên + phân bổ theo phòng ban
export function useEmployeeStats() {
    return useQuery({
        queryKey: ['employees', 'stats'],
        queryFn: async () => {
            const res = await api.apiGet('/employees?limit=100');
            const data = res?.data || res || {};
            const items: any[] = data?.items || [];
            const total: number = data?.pagination?.total ?? items.length;

            // Tính phân bổ theo department
            const deptMap: Record<string, number> = {};
            items.forEach((emp: any) => {
                const dept = emp.department || 'Unknown';
                deptMap[dept] = (deptMap[dept] || 0) + 1;
            });

            const colors = ['#4F46E5', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];
            const deptDistribution = Object.entries(deptMap).map(([name, value], i) => ({
                name,
                value,
                color: colors[i % colors.length],
            }));

            return { total, deptDistribution };
        },
        staleTime: 60_000,
    });
}

// Báo cáo chấm công hôm nay
export function useTodayAttendance() {
    const today = new Date().toISOString().split('T')[0];
    return useQuery({
        queryKey: ['attendance', 'report', 'daily', today],
        queryFn: async () => {
            const res = await api.apiGet(`/attendance/reports/daily?date=${today}`);
            const data = res?.data || {};
            return {
                checkedIn: data.checked_in || 0,
                checkedOut: data.checked_out || 0,
                totalWorkedHours: data.total_worked_hours || 0,
                records: data.records || [],
            };
        },
        staleTime: 30_000,
    });
}

// Xu hướng chấm công tuần hiện tại (Thứ 2 → Thứ 6)
export function useWeeklyAttendanceTrend() {
    return useQuery({
        queryKey: ['attendance', 'trend', 'weekly'],
        queryFn: async () => {
            const today = new Date();
            const dow = today.getDay(); // 0=Sun
            const monday = new Date(today);
            monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

            const days = Array.from({ length: 5 }, (_, i) => {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                return d;
            });

            const results = await Promise.all(
                days.map(async (d) => {
                    const dateStr = d.toISOString().split('T')[0];
                    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
                    try {
                        const res = await api.apiGet(`/attendance/reports/daily?date=${dateStr}`);
                        const data = res?.data || {};
                        return {
                            name: label,
                            present: (data.checked_in || 0) + (data.checked_out || 0),
                        };
                    } catch {
                        return { name: label, present: 0 };
                    }
                }),
            );
            return results;
        },
        staleTime: 60_000,
    });
}

// Đơn nghỉ phép đang chờ duyệt
export function usePendingLeaveRequests() {
    return useQuery({
        queryKey: ['leave-requests', 'pending', 'dashboard'],
        queryFn: async () => {
            const res = await api.apiGet('/leave-requests?status=Pending&limit=5');
            const data = res?.data || res || {};
            const items = data?.items || data?.data || data;
            return Array.isArray(items) ? items : [];
        },
        staleTime: 30_000,
    });
}

// Số đơn tăng ca đang chờ duyệt
export function usePendingOvertimeCount() {
    return useQuery({
        queryKey: ['overtime', 'pending', 'count'],
        queryFn: async () => {
            const res = await api.apiGet('/overtime?status=Pending&limit=1');
            const data = res?.data || res || {};
            return data?.pagination?.total ?? 0;
        },
        staleTime: 30_000,
    });
}

// Số đơn nghỉ phép đang được duyệt (approved + active hôm nay)
export function useApprovedLeaveCount() {
    return useQuery({
        queryKey: ['leave-requests', 'approved', 'count'],
        queryFn: async () => {
            const res = await api.apiGet('/leave-requests?status=Approved&limit=1');
            const data = res?.data || res || {};
            return data?.pagination?.total ?? 0;
        },
        staleTime: 60_000,
    });
}

// Xu hướng quỹ lương 6 tháng gần nhất
export function usePayrollTrend() {
    return useQuery({
        queryKey: ['payroll', 'trend', '6months'],
        queryFn: async () => {
            const now = new Date();
            const months = Array.from({ length: 6 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
                return { year: d.getFullYear(), month: d.getMonth() + 1 };
            });

            const results = await Promise.all(
                months.map(async ({ year, month }) => {
                    const label = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    try {
                        const res = await api.apiGet(`/payroll?year=${year}&month=${month}&limit=100`);
                        const data = res?.data || res || {};
                        const items: any[] = data?.items || data?.data || [];
                        const total = items.reduce((sum: number, p: any) => sum + (p.net_salary || 0), 0);
                        return { month: label, amount: total };
                    } catch {
                        return { month: label, amount: 0 };
                    }
                })
            );
            return results;
        },
        staleTime: 300_000,
    });
}

// Lắng nghe sự kiện attendance từ WebSocket
export function useAttendanceSocket() {
    const queryClient = useQueryClient();

    useEffect(() => {
        // Khởi tạo socket
        const SOCKET_URL = api.API_BASE.replace('/api/v1', '');
        const socket = io(SOCKET_URL);

        socket.on('attendance:update', (data) => {
            console.log('[WebSocket] Attendance update received:', data);
            // Invalidate attendance queries để gọi lại API mới nhất
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
        });

        return () => {
            socket.disconnect();
        };
    }, [queryClient]);
}
