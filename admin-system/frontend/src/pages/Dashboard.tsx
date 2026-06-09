import React from 'react';
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
    Users, UserCheck, Clock, MoreVertical,
    TrendingUp, Calendar, Loader2, Wallet,
    AlertTriangle, CheckCircle, UserX, ArrowRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
    useEmployeeStats,
    useTodayAttendance,
    useWeeklyAttendanceTrend,
    usePendingLeaveRequests,
    usePendingOvertimeCount,
    useApprovedLeaveCount,
    usePayrollTrend,
    useAttendanceSocket,
} from '../hooks/useDashboard';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (n: number, locale: string = 'vi-VN') =>
    new Intl.NumberFormat(locale, { notation: 'compact', compactDisplay: 'short' }).format(n);

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, trend, subtext, color, loading, accent }: any) => (
    <div className={cn(
        'bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col justify-between h-full group hover:shadow-md transition-all duration-200',
        accent && 'border-l-4 border-l-[var(--accent)]'
    )} style={{ '--accent': accent } as any}>
        <div className="flex justify-between items-start mb-4">
            <div className={cn('p-2.5 rounded-xl', color)}>
                <Icon size={20} className="text-current" strokeWidth={2.5} />
            </div>
            {trend && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <TrendingUp size={11} />
                    {trend}
                </span>
            )}
        </div>
        <div>
            <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                {loading ? (
                    <Loader2 size={20} className="animate-spin text-outline-variant" />
                ) : (
                    <h3 className="text-2xl font-extrabold text-primary-container tracking-tight">{value}</h3>
                )}
                {subtext && <span className="text-[11px] font-semibold text-outline-variant">{subtext}</span>}
            </div>
        </div>
    </div>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="px-5 py-3"><div className="h-3 bg-surface rounded w-32" /></td>
        <td className="px-5 py-3"><div className="h-3 bg-surface rounded w-16" /></td>
        <td className="px-5 py-3"><div className="h-3 bg-surface rounded w-20" /></td>
        <td className="px-5 py-3" />
    </tr>
);

// ─── Attendance Donut ─────────────────────────────────────────────────────────
const AttendanceDonut = ({ present, onLeave, absent, total, loading, t }: any) => {
    const donutData = [
        { name: t('dashboard:present'), value: present, color: '#10B981' },
        { name: t('dashboard:on_leave'), value: onLeave, color: '#8B5CF6' },
        { name: t('dashboard:absent'), value: absent, color: '#F87171' },
    ].filter(d => d.value > 0);

    if (loading) return (
        <div className="flex items-center justify-center h-44">
            <Loader2 className="animate-spin text-secondary" size={28} />
        </div>
    );

    const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;

    return (
        <div className="relative">
            <div className="relative h-44">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={72}
                            paddingAngle={3} dataKey="value" animationDuration={1200}>
                            {donutData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                        </Pie>
                        <Tooltip formatter={(v: any, n: any) => [v, n]} />
                    </PieChart>
                </ResponsiveContainer>
                {/* Overlay label — position relative to the h-44 wrapper, not the outer div */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-extrabold text-primary-container leading-none">{presentPct}%</span>
                    <span className="text-[9px] font-bold text-outline uppercase tracking-widest mt-0.5">{t('dashboard:present')}</span>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                    { label: t('dashboard:present'), value: present, color: 'bg-emerald-500' },
                    { label: t('dashboard:on_leave'), value: onLeave, color: 'bg-violet-500' },
                    { label: t('dashboard:absent'), value: absent, color: 'bg-red-400' },
                ].map(item => (
                    <div key={item.label} className="text-center">
                        <div className={cn('w-2 h-2 rounded-full mx-auto mb-1', item.color)} />
                        <p className="text-xs font-extrabold text-primary-container">{item.value}</p>
                        <p className="text-[9px] text-outline font-semibold uppercase tracking-wide">{item.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
const SalaryTooltip = ({ active, payload, label, i18n }: any) => {
    if (!active || !payload?.length) return null;
    const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
    return (
        <div className="bg-white border border-outline-variant/30 rounded-xl p-3 shadow-lg text-xs">
            <p className="font-bold text-primary-container mb-1">{label}</p>
            <p className="text-secondary font-extrabold">{formatCurrency(payload[0].value, locale)} VND</p>
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
// ─── Main Component ────────────────────────────────────────────────────────────
export default function Dashboard() {
    useAttendanceSocket();
    const { t, i18n } = useTranslation();

    const { data: empStats, isLoading: loadingEmp } = useEmployeeStats();
    const { data: todayAtt, isLoading: loadingAtt } = useTodayAttendance();
    const { data: weeklyTrend = [], isLoading: loadingTrend } = useWeeklyAttendanceTrend();
    const { data: pendingLeaves = [], isLoading: loadingLeaves } = usePendingLeaveRequests();
    const { data: pendingOvertimeCount = 0, isLoading: loadingOT } = usePendingOvertimeCount();
    const { data: approvedLeaveCount = 0, isLoading: loadingLeaveCount } = useApprovedLeaveCount();
    const { data: payrollTrend = [], isLoading: loadingPayroll } = usePayrollTrend();

    const totalEmployees = empStats?.total ?? 0;
    const presentToday = (todayAtt?.checkedIn ?? 0) + (todayAtt?.checkedOut ?? 0);
    const deptData = empStats?.deptDistribution ?? [];

    const lateArrivals = (todayAtt?.records ?? []).filter((r: any) => (r.late_minutes || 0) > 0);

    const absentToday = Math.max(0, totalEmployees - presentToday - approvedLeaveCount);

    const latestPayrollTotal = payrollTrend.length > 0
        ? payrollTrend[payrollTrend.length - 1]?.amount ?? 0
        : 0;
    const prevPayrollTotal = payrollTrend.length > 1
        ? payrollTrend[payrollTrend.length - 2]?.amount ?? 0
        : 0;
    const payrollGrowth = prevPayrollTotal > 0
        ? ((latestPayrollTotal - prevPayrollTotal) / prevPayrollTotal * 100).toFixed(1)
        : null;

    const dateLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

    return (
        <div className="space-y-7 animate-in fade-in duration-500">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-primary-container tracking-tight">{t('dashboard:title')}</h1>
                    <p className="text-sm text-outline font-medium mt-0.5">
                        {new Date().toLocaleDateString(dateLocale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex gap-2">
                    <NavLink to="/attendance" className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/40 rounded-xl text-xs font-bold text-primary-container hover:bg-surface transition-colors shadow-sm">
                        <Calendar size={14} /> {t('common:attendance')}
                    </NavLink>
                    <NavLink to="/payroll" className="flex items-center gap-2 px-4 py-2 bg-primary-container text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm">
                        <Wallet size={14} /> {t('common:payroll')}
                    </NavLink>
                </div>
            </div>

            {/* ── KPI Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={Users} label={t('dashboard:total_employees')} value={totalEmployees.toLocaleString()}
                    color="bg-indigo-50 text-indigo-600" accent="#4F46E5" loading={loadingEmp} />
                <KpiCard icon={UserCheck} label={t('dashboard:present_today')} value={presentToday.toLocaleString()}
                    subtext={lateArrivals.length > 0 ? `${lateArrivals.length} ${t('dashboard:late')}` : undefined}
                    color="bg-emerald-50 text-emerald-600" accent="#10B981" loading={loadingAtt} />
                <KpiCard icon={Clock} label={t('dashboard:on_leave')} value={approvedLeaveCount.toLocaleString()}
                    subtext={t('dashboard:approved')} color="bg-violet-50 text-violet-600" accent="#8B5CF6" loading={loadingLeaveCount} />
                <KpiCard icon={AlertTriangle} label={t('dashboard:ot_pending')} value={pendingOvertimeCount.toLocaleString()}
                    subtext={t('dashboard:needs_review')} color="bg-amber-50 text-amber-600" accent="#F59E0B" loading={loadingOT} />
            </div>

            {/* ── Charts Row 1: Attendance Trend + Donut ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Attendance Trend */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-outline-variant/30 shadow-sm">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h2 className="text-base font-extrabold text-primary-container">{t('dashboard:attendance_trend')}</h2>
                            <p className="text-[11px] text-outline font-semibold mt-0.5">{t('dashboard:weekly_checkins')}</p>
                        </div>
                        <span className="text-[10px] font-bold text-outline bg-surface px-2.5 py-1 rounded-lg border border-outline-variant/20 uppercase tracking-wider">{t('common:this_week')}</span>
                    </div>
                    <div className="h-56">
                        {loadingTrend ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="animate-spin text-secondary" size={24} />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={weeklyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                                    <defs>
                                        <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false}
                                        tick={{ fontSize: 11, fill: '#787680', fontWeight: 700 }} dy={8} />
                                    <YAxis axisLine={false} tickLine={false}
                                        tick={{ fontSize: 11, fill: '#787680', fontWeight: 600 }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }} />
                                    <Area type="monotone" dataKey="present" name={t('dashboard:present')}
                                        stroke="#4F46E5" strokeWidth={2.5}
                                        fillOpacity={1} fill="url(#gradPresent)" animationDuration={1400} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Today Attendance Donut */}
                <div className="bg-white p-6 rounded-2xl border border-outline-variant/30 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-base font-extrabold text-primary-container">{t('dashboard:today_status')}</h2>
                        <p className="text-[11px] text-outline font-semibold mt-0.5">
                            {totalEmployees} {t('dashboard:headcount')}
                        </p>
                    </div>
                    <AttendanceDonut
                        present={presentToday}
                        onLeave={approvedLeaveCount}
                        absent={absentToday}
                        total={totalEmployees}
                        loading={loadingAtt || loadingLeaveCount}
                        t={t}
                    />
                </div>
            </div>

            {/* ── Charts Row 2: Payroll Trend + Dept Distribution ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Payroll Trend */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-outline-variant/30 shadow-sm">
                    <div className="flex justify-between items-start mb-5">
                        <div>
                            <h2 className="text-base font-extrabold text-primary-container">{t('dashboard:payroll_expenses')}</h2>
                            <p className="text-[11px] text-outline font-semibold mt-0.5">{t('dashboard:finalized_payroll')}</p>
                        </div>
                        {payrollGrowth !== null && (
                            <div className="text-right">
                                <p className="text-[10px] text-outline uppercase font-bold tracking-widest">{t('common:vs_last_month')}</p>
                                <p className={cn('text-lg font-extrabold', Number(payrollGrowth) >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                                    {Number(payrollGrowth) >= 0 ? '+' : ''}{payrollGrowth}%
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="h-56">
                        {loadingPayroll ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="animate-spin text-secondary" size={24} />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={payrollTrend} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
                                    barCategoryGap="35%">
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false}
                                        tick={{ fontSize: 11, fill: '#787680', fontWeight: 700 }} dy={8} />
                                    <YAxis axisLine={false} tickLine={false}
                                        tick={{ fontSize: 11, fill: '#787680', fontWeight: 600 }}
                                        tickFormatter={(v) => formatCurrency(v, dateLocale)} />
                                    <Tooltip content={<SalaryTooltip i18n={i18n} />} />
                                    <Bar dataKey="amount" name="Net Salary" radius={[6, 6, 0, 0]}
                                        animationDuration={1400}>
                                        {payrollTrend.map((_: any, i: number) => (
                                            <Cell key={i}
                                                fill={i === payrollTrend.length - 1 ? '#4F46E5' : '#C7D2FE'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Department Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
                    <div className="mb-4">
                        <h2 className="text-base font-extrabold text-primary-container">{t('dashboard:by_department')}</h2>
                        <p className="text-[11px] text-outline font-semibold mt-0.5">{t('dashboard:active_headcount')}</p>
                    </div>
                    {loadingEmp ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="animate-spin text-secondary" size={24} />
                        </div>
                    ) : deptData.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-outline text-sm">{t('common:no_data')}</div>
                    ) : (
                        <div className="space-y-2 flex-1 overflow-y-auto">
                            {deptData.map((dept: any, i: number) => {
                                const pct = totalEmployees > 0 ? Math.round((dept.value / totalEmployees) * 100) : 0;
                                return (
                                    <div key={dept.name}>
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                                                <span className="text-[11px] font-bold text-primary-container truncate max-w-[120px]">{dept.name}</span>
                                            </div>
                                            <span className="text-[11px] font-extrabold text-outline">{dept.value} <span className="text-outline-variant font-medium">({pct}%)</span></span>
                                        </div>
                                        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, backgroundColor: dept.color }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Tables Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Pending Leave Requests */}
                <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-outline-variant/20 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-extrabold text-primary-container">{t('dashboard:pending_leave_requests')}</h3>
                        </div>
                        <NavLink to="/requests" className="flex items-center gap-1 text-[11px] font-bold text-secondary hover:underline">
                            {t('common:view_all')} <ArrowRight size={12} />
                        </NavLink>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-surface/40">
                                    <th className="px-5 py-3 text-[10px] font-bold text-outline uppercase tracking-wider">{t('dashboard:employee')}</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-outline uppercase tracking-wider">{t('dashboard:type')}</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-outline uppercase tracking-wider">{t('dashboard:date_range')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/10 font-semibold">
                                {loadingLeaves ? (
                                    <><SkeletonRow /><SkeletonRow /></>
                                ) : pendingLeaves.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-5 py-8 text-center text-outline">
                                            <CheckCircle size={20} className="mx-auto mb-1 text-emerald-400" />
                                            {t('dashboard:no_pending_requests')}
                                        </td>
                                    </tr>
                                ) : pendingLeaves.map((req: any) => {
                                    const name = req.employee_id?.full_name || 'Unknown';
                                    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                                    const start = req.start_date ? new Date(req.start_date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' }) : '—';
                                    const end = req.end_date ? new Date(req.end_date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' }) : '—';
                                    return (
                                        <tr key={req._id} className="hover:bg-surface/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] text-indigo-600 font-bold shrink-0">
                                                        {initials}
                                                    </div>
                                                    <span className="text-primary-container font-bold truncate">{name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 text-[10px] font-bold">{req.type || '—'}</span>
                                            </td>
                                            <td className="px-5 py-3 text-outline font-medium">{start} – {end}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Late Arrivals Today */}
                <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-outline-variant/20 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-extrabold text-primary-container">{t('dashboard:late_arrivals')}</h3>
                        </div>
                        <span className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                            lateArrivals.length > 0
                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        )}>
                            {lateArrivals.length} {t('dashboard:late')}
                        </span>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-surface/40">
                                    <th className="px-5 py-3 text-[10px] font-bold text-outline uppercase tracking-wider">{t('dashboard:employee')}</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-outline uppercase tracking-wider">{t('dashboard:check_in')}</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-outline uppercase tracking-wider text-right">{t('dashboard:late_by')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/10 font-semibold">
                                {loadingAtt ? (
                                    <><SkeletonRow /><SkeletonRow /></>
                                ) : lateArrivals.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-5 py-8 text-center text-outline">
                                            <CheckCircle size={20} className="mx-auto mb-1 text-emerald-400" />
                                            {presentToday === 0 ? t('dashboard:no_checkins_yet') : t('dashboard:no_late_arrivals')}
                                        </td>
                                    </tr>
                                ) : lateArrivals.slice(0, 6).map((r: any) => {
                                    const ci = new Date(r.check_in);
                                    const lateMins = r.late_minutes || 0;
                                    return (
                                        <tr key={r._id} className="hover:bg-surface/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <p className="font-extrabold text-primary-container">{r.employee_id?.full_name || 'Unknown'}</p>
                                                <p className="text-[10px] text-outline font-mono">{r.employee_id?.employee_code || '—'}</p>
                                            </td>
                                            <td className="px-5 py-3 font-mono font-bold tracking-widest text-primary-container">
                                                {ci.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className="text-amber-600 font-extrabold">+{lateMins}m</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
