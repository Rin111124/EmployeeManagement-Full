import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    BadgeCheck,
    Briefcase,
    CalendarCheck,
    Clock,
    FileText,
    Laptop,
    Loader2,
    Send,
    UserRound,
    Wallet,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEmployee } from '../features/employees/hooks/useEmployees';
import { useAttendanceHistory } from '../hooks/useAttendance';
import { usePayrollList } from '../hooks/usePayroll';
import { useEmployeeContracts } from '../hooks/useContracts';
import { useEmployeeAssets } from '../hooks/useAssets';
import { useLeaveRequests, useOvertimeRequests } from '../hooks/useRequests';
import { useShiftAssignments } from '../hooks/useShifts';
import api from '../lib/api';
import toast from '../lib/toast';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

function getEmployeeId(user: any) {
    return user?.employee_id?._id || user?.employee_id || '';
}

function formatDate(value?: string | Date | null) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string | Date | null) {
    if (!value) return '-';
    return new Date(value).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function statusClass(status?: string) {
    switch (status) {
        case 'Approved':
        case 'Signed':
        case 'Active':
        case 'CheckedOut':
            return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        case 'Pending':
        case 'CheckedIn':
            return 'bg-amber-50 text-amber-700 border-amber-100';
        case 'Rejected':
        case 'Terminated':
        case 'Cancelled':
            return 'bg-rose-50 text-rose-700 border-rose-100';
        default:
            return 'bg-slate-50 text-slate-600 border-slate-100';
    }
}

function StatCard({ icon: Icon, label, value, tone = 'secondary' }: any) {
    return (
        <div className="rounded-xl border border-outline-variant/30 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-outline">{label}</p>
                    <p className="mt-2 text-2xl font-black text-primary-container">{value}</p>
                </div>
                <div className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl',
                    tone === 'green' && 'bg-emerald-50 text-emerald-600',
                    tone === 'amber' && 'bg-amber-50 text-amber-600',
                    tone === 'rose' && 'bg-rose-50 text-rose-600',
                    tone === 'secondary' && 'bg-secondary/10 text-secondary',
                )}>
                    <Icon size={21} />
                </div>
            </div>
        </div>
    );
}

function Section({ title, icon: Icon, children, action }: any) {
    return (
        <section className="rounded-xl border border-outline-variant/30 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/10 px-5 py-4">
                <div className="flex items-center gap-2">
                    <Icon size={18} className="text-secondary" />
                    <h2 className="text-sm font-black text-primary-container">{title}</h2>
                </div>
                {action}
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

export default function MyPortal() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const employeeId = getEmployeeId(user);
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

    const { data: employeeResponse, isLoading: loadingEmployee } = useEmployee(employeeId);
    const employee = employeeResponse?.data || employeeResponse || user?.employee_id || null;
    const { data: attendance = [] } = useAttendanceHistory({ employee_id: employeeId, from: monthStart, to: monthEnd, limit: 100 });
    const { data: payroll = [] } = usePayrollList({ employee_id: employeeId, limit: 12 });
    const { data: contracts = [] } = useEmployeeContracts(employeeId);
    const { data: assets = [] } = useEmployeeAssets(employeeId);
    const { data: leaveRequests = [] } = useLeaveRequests({ employee_id: employeeId, limit: 20 });
    const { data: overtimeRequests = [] } = useOvertimeRequests({ employee_id: employeeId, limit: 20 });
    const { data: assignments = [] } = useShiftAssignments({ employee_id: employeeId, from: monthStart, to: monthEnd, limit: 100 });

    const [leaveForm, setLeaveForm] = useState({
        type: 'Annual',
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date().toISOString().slice(0, 10),
        total_days: 1,
        reason: '',
    });
    const [otForm, setOtForm] = useState({
        work_date: new Date().toISOString().slice(0, 10),
        hours: 1,
        type: 'Weekday',
        reason: '',
    });

    const activeContract = useMemo(() => {
        return [...contracts].sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];
    }, [contracts]);
    const latestPayroll = payroll[0];
    const pendingRequests = leaveRequests.filter((item: any) => item.status === 'Pending').length
        + overtimeRequests.filter((item: any) => item.status === 'Pending').length;
    const totalLate = attendance.reduce((sum: number, item: any) => sum + Number(item.late_minutes || 0), 0);

    const createLeave = useMutation({
        mutationFn: (payload: any) => api.apiPost('/leave-requests/mine', payload),
        onSuccess: () => {
            toast('Submitted leave request');
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
            setLeaveForm((prev) => ({ ...prev, reason: '' }));
        },
        onError: (err: any) => toast(err?.message || 'Failed to submit leave request'),
    });

    const createOvertime = useMutation({
        mutationFn: (payload: any) => api.apiPost('/overtime/mine', payload),
        onSuccess: () => {
            toast('Submitted overtime request');
            queryClient.invalidateQueries({ queryKey: ['overtime'] });
            setOtForm((prev) => ({ ...prev, reason: '' }));
        },
        onError: (err: any) => toast(err?.message || 'Failed to submit overtime request'),
    });

    if (!employeeId) {
        return (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-6 text-sm font-bold text-amber-700">
                {t('myPortal:no_employee_link')}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-secondary">{t('myPortal:eyebrow')}</p>
                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-primary-container">{t('common:my_portal')}</h1>
                    <p className="text-sm font-medium text-outline">{t('myPortal:description')}</p>
                </div>
                <div className="rounded-xl border border-outline-variant/30 bg-white px-4 py-3 text-right shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-outline">{t('common:employee')}</p>
                    <p className="text-sm font-black text-primary-container">{employee?.full_name || user?.username}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={CalendarCheck} label="Ngay cong thang nay" value={attendance.length} tone="green" />
                <StatCard icon={Clock} label="Phut di muon" value={totalLate} tone={totalLate > 0 ? 'amber' : 'green'} />
                <StatCard icon={Wallet} label="Phieu luong gan nhat" value={latestPayroll ? `${latestPayroll.month}/${latestPayroll.year}` : '-'} />
                <StatCard icon={Send} label="Yeu cau dang cho" value={pendingRequests} tone={pendingRequests > 0 ? 'amber' : 'secondary'} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Section title="Ho so ca nhan" icon={UserRound}>
                    {loadingEmployee ? (
                        <Loader2 className="animate-spin text-secondary" size={20} />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container text-lg font-black text-white">
                                    {(employee?.full_name || user?.username || 'NV').slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-lg font-black text-primary-container">{employee?.full_name || '-'}</p>
                                    <p className="text-xs font-bold text-outline">{employee?.employee_code || '-'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <Info label="Phong ban" value={employee?.department} />
                                <Info label="Chuc vu" value={employee?.position} />
                                <Info label="Email" value={employee?.contact?.email || employee?.email} />
                                <Info label="Dien thoai" value={employee?.contact?.phone || employee?.phone} />
                                <Info label="Ngay vao lam" value={formatDate(employee?.hire_date)} />
                                <Info label="Trang thai" value={employee?.status} badge />
                            </div>
                        </div>
                    )}
                </Section>

                <Section title="Hop dong hien tai" icon={Briefcase}>
                    {activeContract ? (
                        <div className="space-y-3 text-xs">
                            <div className="flex items-center justify-between">
                                <p className="font-black text-primary-container">{activeContract.type}</p>
                                <span className={cn('rounded-full border px-2 py-1 text-[10px] font-black', statusClass(activeContract.status))}>{activeContract.status}</span>
                            </div>
                            <Info label="Bat dau" value={formatDate(activeContract.start_date)} />
                            <Info label="Ket thuc" value={formatDate(activeContract.end_date)} />
                            <Info label="Luong co ban" value={activeContract.base_salary?.toLocaleString('vi-VN')} />
                        </div>
                    ) : (
                        <EmptyText text="Chua co hop dong duoc ghi nhan." />
                    )}
                </Section>

                <Section title="Tai san duoc cap" icon={Laptop}>
                    {assets.length ? (
                        <div className="space-y-2">
                            {assets.slice(0, 4).map((asset: any) => (
                                <div key={asset._id} className="rounded-lg border border-outline-variant/20 bg-surface/30 p-3">
                                    <p className="text-xs font-black text-primary-container">{asset.asset_name}</p>
                                    <p className="mt-1 text-[10px] font-bold text-outline">{asset.category} • {asset.serial_number || 'No serial'}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyText text="Chua co tai san dang duoc gan." />
                    )}
                </Section>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Section title="Cham cong gan day" icon={CalendarCheck}>
                    <div className="space-y-2">
                        {attendance.slice(0, 8).map((record: any) => (
                            <div key={record._id} className="grid grid-cols-4 gap-2 rounded-lg border border-outline-variant/20 p-3 text-xs">
                                <span className="font-black text-primary-container">{formatDate(record.work_date)}</span>
                                <span className="text-outline">{formatDateTime(record.check_in)}</span>
                                <span className="text-outline">{formatDateTime(record.check_out)}</span>
                                <span className={cn('justify-self-end rounded-full border px-2 py-0.5 text-[10px] font-black', statusClass(record.status))}>
                                    {record.late_minutes ? `${record.late_minutes}p late` : record.status}
                                </span>
                            </div>
                        ))}
                        {!attendance.length && <EmptyText text="Chua co du lieu cham cong trong thang nay." />}
                    </div>
                </Section>

                <Section title="Lich ca thang nay" icon={Clock}>
                    <div className="space-y-2">
                        {assignments.slice(0, 8).map((item: any) => (
                            <div key={item._id} className="flex items-center justify-between rounded-lg border border-outline-variant/20 p-3 text-xs">
                                <span className="font-black text-primary-container">{formatDate(item.work_date)}</span>
                                <span className="font-bold text-secondary">{item.shift_id?.shift_name || 'Shift'}</span>
                                <span className="text-outline">{item.shift_id?.start_time} - {item.shift_id?.end_time}</span>
                            </div>
                        ))}
                        {!assignments.length && <EmptyText text="Chua co ca lam trong thang nay." />}
                    </div>
                </Section>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Section title="Bang luong gan day" icon={Wallet}>
                    <div className="space-y-2">
                        {payroll.slice(0, 6).map((item: any) => (
                            <div key={item._id} className="flex items-center justify-between rounded-lg border border-outline-variant/20 p-3 text-xs">
                                <span className="font-black text-primary-container">Thang {item.month}/{item.year}</span>
                                <span className="font-black text-emerald-600">{Number(item.net_salary || 0).toLocaleString('vi-VN')} VND</span>
                                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black', statusClass(item.status))}>{item.status || 'Draft'}</span>
                            </div>
                        ))}
                        {!payroll.length && <EmptyText text="Chua co bang luong." />}
                    </div>
                </Section>

                <Section title="Yeu cau cua toi" icon={FileText}>
                    <div className="space-y-2">
                        {[...leaveRequests, ...overtimeRequests]
                            .sort((a: any, b: any) => new Date(b.createdAt || b.work_date || b.start_date).getTime() - new Date(a.createdAt || a.work_date || a.start_date).getTime())
                            .slice(0, 6)
                            .map((item: any) => (
                                <div key={item._id} className="flex items-center justify-between rounded-lg border border-outline-variant/20 p-3 text-xs">
                                    <span className="font-black text-primary-container">{item.work_date ? `OT ${formatDate(item.work_date)}` : `Leave ${formatDate(item.start_date)}`}</span>
                                    <span className="text-outline">{item.reason || item.type}</span>
                                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black', statusClass(item.status))}>{item.status}</span>
                                </div>
                            ))}
                        {!leaveRequests.length && !overtimeRequests.length && <EmptyText text="Chua co yeu cau nao." />}
                    </div>
                </Section>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Section title="Gui don nghi phep" icon={Send}>
                    <form
                        className="grid grid-cols-1 gap-3 md:grid-cols-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            createLeave.mutate(leaveForm);
                        }}
                    >
                        <Select label="Loai nghi" value={leaveForm.type} onChange={(type) => setLeaveForm({ ...leaveForm, type })} options={['Annual', 'Sick', 'Unpaid', 'Other']} />
                        <Input label="So ngay" type="number" min="0.5" step="0.5" value={leaveForm.total_days} onChange={(total_days) => setLeaveForm({ ...leaveForm, total_days: Number(total_days) })} />
                        <Input label="Tu ngay" type="date" value={leaveForm.start_date} onChange={(start_date) => setLeaveForm({ ...leaveForm, start_date })} />
                        <Input label="Den ngay" type="date" value={leaveForm.end_date} onChange={(end_date) => setLeaveForm({ ...leaveForm, end_date })} />
                        <div className="md:col-span-2">
                            <Input label="Ly do" value={leaveForm.reason} onChange={(reason) => setLeaveForm({ ...leaveForm, reason })} />
                        </div>
                        <SubmitButton loading={createLeave.isPending} label="Gui don nghi" />
                    </form>
                </Section>

                <Section title="Gui yeu cau OT" icon={BadgeCheck}>
                    <form
                        className="grid grid-cols-1 gap-3 md:grid-cols-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            createOvertime.mutate(otForm);
                        }}
                    >
                        <Input label="Ngay OT" type="date" value={otForm.work_date} onChange={(work_date) => setOtForm({ ...otForm, work_date })} />
                        <Input label="So gio" type="number" min="0.5" step="0.5" value={otForm.hours} onChange={(hours) => setOtForm({ ...otForm, hours: Number(hours) })} />
                        <Select label="Loai OT" value={otForm.type} onChange={(type) => setOtForm({ ...otForm, type })} options={['Weekday', 'Weekend', 'Holiday']} />
                        <Input label="Ly do" value={otForm.reason} onChange={(reason) => setOtForm({ ...otForm, reason })} />
                        <SubmitButton loading={createOvertime.isPending} label="Gui yeu cau OT" />
                    </form>
                </Section>
            </div>
        </div>
    );
}

function Info({ label, value, badge }: any) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-outline">{label}</p>
            {badge ? (
                <span className={cn('mt-1 inline-block rounded-full border px-2 py-1 text-[10px] font-black', statusClass(value))}>{value || '-'}</span>
            ) : (
                <p className="mt-1 truncate font-bold text-primary-container">{value || '-'}</p>
            )}
        </div>
    );
}

function EmptyText({ text }: { text: string }) {
    return <p className="rounded-lg border border-dashed border-outline-variant/30 bg-surface/20 p-4 text-center text-xs font-bold text-outline">{text}</p>;
}

function Input({ label, value, onChange, ...props }: any) {
    return (
        <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-outline">{label}</span>
            <input
                {...props}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm font-medium text-primary-container outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
            />
        </label>
    );
}

function Select({ label, value, onChange, options }: any) {
    return (
        <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-outline">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm font-medium text-primary-container outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
            >
                {options.map((option: string) => <option key={option} value={option}>{option}</option>)}
            </select>
        </label>
    );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
    return (
        <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-xs font-black text-white shadow-sm shadow-secondary/20 hover:bg-secondary-container disabled:opacity-60"
        >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {label}
        </button>
    );
}
