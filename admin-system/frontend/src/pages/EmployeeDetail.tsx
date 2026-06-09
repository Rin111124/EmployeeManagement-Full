import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Edit2, Lock, UserMinus, Phone, Mail, Building2,
    BadgeCheck, CreditCard, FileText, ShieldCheck, MapPin, Clock,
    Loader2, Calendar, Briefcase, AlertCircle, ChevronLeft, ChevronRight,
    CheckCircle2, XCircle, Monitor, Timer,
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';
import { useAttendanceHistory, useUpdateAttendance } from '../hooks/useAttendance';
import { useEmployeeContracts } from '../hooks/useContracts';
import { useEmployeeAssets } from '../hooks/useAssets';
import { usePayrollList } from '../hooks/usePayroll';
import { useOvertimeRequests } from '../hooks/useRequests';
import { useEmployee, useUpdateEmployee } from '../features/employees/hooks/useEmployees';
import { useDepartments } from '../hooks/useDepartments';
import EmployeeForm from '../features/employees/components/EmployeeForm';
import toast from '../lib/toast';
import CheckoutModal from '../components/CheckoutModal';
import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'personal' | 'contracts' | 'attendance' | 'payroll' | 'assets' | 'overtime';

const fmtCurrency = (n: number, locale: string = 'vi-VN') =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d?: string | Date | null, locale: string = 'vi-VN', opts?: Intl.DateTimeFormatOptions) =>
    d ? new Date(d).toLocaleDateString(locale, opts ?? { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtTime = (d?: string | Date | null, locale: string = 'vi-VN') =>
    d ? new Date(d).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '--:--';

// ─── Shared UI ────────────────────────────────────────────────────────────────
function InfoField({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <p className="text-[10px] font-black text-outline uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm font-bold text-primary-container">{value || '—'}</p>
        </div>
    );
}

function TabLoader() {
    return (
        <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-secondary" size={28} />
        </div>
    );
}

function TabEmpty({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-outline">
            <Icon size={36} className="opacity-25" />
            <p className="text-sm font-semibold">{message}</p>
        </div>
    );
}

function TabError({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-rose-500">
            <AlertCircle size={32} className="opacity-60" />
            <p className="text-sm font-semibold">{message}</p>
        </div>
    );
}

// ─── Contracts Tab ────────────────────────────────────────────────────────────
function ContractsTab({ employeeId, t, dateLocale }: { employeeId: string, t: any, dateLocale: string }) {
    const { data: contracts = [], isLoading, isError } = useEmployeeContracts(employeeId);

    if (isLoading) return <TabLoader />;
    if (isError) return <TabError message={t('employees:error_load_detail')} />;
    if (!contracts.length) return <TabEmpty icon={Briefcase} message={t('employees:no_contracts')} />;

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {contracts.map((c: any) => (
                <div key={c._id} className="rounded-xl border border-outline-variant/20 overflow-hidden hover:border-secondary/30 transition-colors">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 bg-surface/40 border-b border-outline-variant/10">
                        <span className="px-2.5 py-1 bg-primary-container/10 text-primary-container rounded-full text-[10px] font-black uppercase tracking-wider">
                            {c.type || 'Contract'}
                        </span>
                        <span className={cn(
                            'text-[10px] font-bold px-2.5 py-1 rounded-full',
                            c.end_date
                                ? new Date(c.end_date) < new Date()
                                    ? 'bg-rose-50 text-rose-600'
                                    : 'bg-emerald-50 text-emerald-600'
                                : 'bg-violet-50 text-violet-600',
                        )}>
                            {c.end_date
                                ? new Date(c.end_date) < new Date()
                                    ? `${t('employees:expired')} ${fmtDate(c.end_date, dateLocale)}`
                                    : `${t('employees:expires')} ${fmtDate(c.end_date, dateLocale)}`
                                : t('employees:open_ended')}
                        </span>
                    </div>
                    {/* Body */}
                    <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-6">
                        <InfoField label={t('scheduling:from_date')} value={fmtDate(c.start_date, dateLocale)} />
                        <InfoField label={t('employees:expires')} value={c.end_date ? fmtDate(c.end_date, dateLocale) : t('employees:open_ended')} />
                        <InfoField label={t('employees:base_salary')} value={fmtCurrency(c.base_salary || 0, dateLocale)} />
                        <InfoField label={t('employees:allowances')} value={c.allowances?.length ? `${c.allowances.length} ${t('employees:item_s')}` : t('employees:none')} />
                    </div>
                    {c.allowances?.length > 0 && (
                        <div className="px-5 pb-5 flex flex-wrap gap-2">
                            {c.allowances.map((a: any, i: number) => (
                                <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-bold">
                                    {a.name}: {fmtCurrency(a.amount || 0, dateLocale)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Assets Tab ───────────────────────────────────────────────────────────────
function AssetsTab({ employeeId, t, dateLocale }: { employeeId: string, t: any, dateLocale: string }) {
    const { data: assets = [], isLoading, isError } = useEmployeeAssets(employeeId);

    if (isLoading) return <TabLoader />;
    if (isError) return <TabError message={t('employees:error_load_detail')} />;
    if (!assets.length) return <TabEmpty icon={Monitor} message={t('employees:no_assets')} />;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
            {assets.map((a: any) => (
                <div key={a._id} className="p-4 rounded-xl border border-outline-variant/20 flex items-start gap-4 hover:border-secondary/30 transition-colors bg-surface/20">
                    <div className="p-2.5 bg-white rounded-xl shadow-sm border border-outline-variant/15 text-indigo-500">
                        <Monitor size={20} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-tighter border border-emerald-100">
                                {a.status}
                            </span>
                            <span className="text-[9px] font-black text-outline uppercase tracking-widest">{a.category}</span>
                        </div>
                        <h4 className="text-sm font-black text-primary-container truncate">{a.name}</h4>
                        <p className="text-[10px] font-mono text-outline uppercase tracking-tighter mt-0.5">SN: {a.serial_number || 'N/A'}</p>
                        {a.purchase_date && (
                            <p className="text-[10px] text-outline-variant mt-2 font-bold">{t('employees:purchased')}: {fmtDate(a.purchase_date, dateLocale)}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Overtime Tab ─────────────────────────────────────────────────────────────
function OvertimeTab({ employeeId, t, dateLocale }: { employeeId: string, t: any, dateLocale: string }) {
    const { data: requests = [], isLoading, isError } = useOvertimeRequests({ employee_id: employeeId });

    if (isLoading) return <TabLoader />;
    if (isError) return <TabError message={t('employees:error_load_detail')} />;
    if (!requests.length) return <TabEmpty icon={Timer} message={t('employees:no_overtime')} />;

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {requests.map((r: any) => (
                <div key={r._id} className="p-4 rounded-xl border border-outline-variant/20 flex items-center justify-between hover:border-secondary/30 transition-colors bg-surface/20">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white rounded-xl shadow-sm border border-outline-variant/15 text-amber-500">
                            <Timer size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-primary-container">{fmtDate(r.date, dateLocale)}</p>
                            <p className="text-[10px] text-outline font-bold uppercase tracking-widest">{r.hours} {t('employees:hours')} · {r.reason || t('employees:none')}</p>
                        </div>
                    </div>
                    <span className={cn(
                        'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
                        r.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        r.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-amber-50 text-amber-600 border-amber-100'
                    )}>
                        {r.status || 'Pending'}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────
function AttendanceTab({ employeeId, setCheckoutRecord, t, dateLocale }: { employeeId: string, setCheckoutRecord: (r: any) => void, t: any, dateLocale: string }) {
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    const { data: records = [], isLoading, isError } = useAttendanceHistory({
        employee_id: employeeId,
        page,
        limit: PAGE_SIZE,
    });

    const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
        CheckedOut: { label: t('employees:complete'), cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2 },
        CheckedIn: { label: t('employees:complete'), cls: 'bg-amber-50 text-amber-600 border-amber-100', icon: Clock },
        MissingCheckout: { label: t('attendance:missing'), cls: 'bg-rose-50 text-rose-600 border-rose-100', icon: XCircle },
    };

    if (isLoading) return <TabLoader />;
    if (isError) return <TabError message={t('employees:error_load_detail')} />;
    if (!records.length && page === 1) return <TabEmpty icon={Clock} message={t('employees:no_attendance')} />;

    return (
        <div className="animate-in fade-in duration-300 space-y-4">
            <div className="overflow-x-auto rounded-lg border border-outline-variant/20">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="bg-surface/60 border-b border-outline-variant/20">
                            {[t('attendance:date'), t('employees:check_in'), t('employees:check_out'), t('employees:hours'), t('employees:late'), t('common:status')].map(h => (
                                <th key={h} className="px-4 py-3 text-[10px] font-black text-outline uppercase tracking-wider">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 font-semibold text-primary-container">
                        {records.map((r: any) => {
                            const st = STATUS_MAP[r.status] ?? { label: r.status || '—', cls: 'bg-surface text-outline border-outline-variant/20', icon: Clock };
                            const Icon = st.icon;
                            return (
                                <tr key={r._id} className="hover:bg-secondary/5 transition-colors">
                                    <td className="px-4 py-3 font-medium text-outline">{fmtDate(r.work_date, dateLocale)}</td>
                                    <td className="px-4 py-3 font-mono font-bold">{fmtTime(r.check_in, dateLocale)}</td>
                                    <td className="px-4 py-3 font-mono font-bold">{fmtTime(r.check_out, dateLocale)}</td>
                                    <td className="px-4 py-3 font-mono font-black">{(r.worked_hours ?? 0).toFixed(1)}h</td>
                                    <td className="px-4 py-3">
                                        {r.late_minutes > 0
                                            ? <span className="text-amber-600 font-black">{r.late_minutes}m</span>
                                            : <span className="text-outline/30">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border', st.cls)}>
                                            <Icon size={10} />
                                            {st.label}
                                        </span>
                                        {r.status === 'CheckedIn' && (
                                            <button 
                                                onClick={() => setCheckoutRecord(r)}
                                                className="ml-2 px-2 py-0.5 bg-secondary text-white rounded text-[8px] font-black uppercase hover:opacity-80 transition-opacity"
                                            >
                                                {t('attendance:clock_out')}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-outline">
                    Page {page} · {records.length} records
                </p>
                <div className="flex gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="h-8 w-8 rounded-lg border border-outline-variant/20 flex items-center justify-center text-outline hover:text-secondary hover:border-secondary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <button
                        disabled={records.length < PAGE_SIZE}
                        onClick={() => setPage(p => p + 1)}
                        className="h-8 w-8 rounded-lg border border-outline-variant/20 flex items-center justify-center text-outline hover:text-secondary hover:border-secondary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Payroll Tab ──────────────────────────────────────────────────────────────
function PayrollTab({ employeeId, t, dateLocale }: { employeeId: string, t: any, dateLocale: string }) {
    const { data: records = [], isLoading, isError } = usePayrollList({
        employee_id: employeeId,
        limit: 24,
    });

    if (isLoading) return <TabLoader />;
    if (isError) return <TabError message={t('employees:error_load_detail')} />;
    if (!records.length) return <TabEmpty icon={CreditCard} message={t('employees:no_payroll')} />;

    const totalNet = records.reduce((s: number, r: any) => s + (r.net_salary ?? 0), 0);

    return (
        <div className="animate-in fade-in duration-300 space-y-4">
            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: t('attendance:records'), value: records.length.toString() },
                    { label: t('employees:total_net'), value: fmtCurrency(totalNet, dateLocale) },
                    { label: t('employees:finalized'), value: records.filter((r: any) => r.status === 'Finalized').length.toString() },
                ].map(s => (
                    <div key={s.label} className="p-4 bg-surface/50 rounded-xl border border-outline-variant/20 text-center">
                        <p className="text-[10px] font-black text-outline uppercase tracking-wider">{s.label}</p>
                        <p className="text-base font-extrabold text-primary-container mt-1">{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="overflow-x-auto rounded-lg border border-outline-variant/20">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="bg-surface/60 border-b border-outline-variant/20">
                            {[t('payroll:period'), t('payroll:work_hours'), 'OT Hours', t('employees:base_salary'), t('payroll:net_salary'), t('common:status')].map(h => (
                                <th key={h} className="px-4 py-3 text-[10px] font-black text-outline uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 font-semibold text-primary-container">
                        {records.map((r: any) => (
                            <tr key={r._id} className="hover:bg-secondary/5 transition-colors">
                                <td className="px-4 py-3 font-extrabold">
                                    {r.month && r.year
                                        ? new Date(r.year, r.month - 1).toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' })
                                        : '—'}
                                </td>
                                <td className="px-4 py-3 font-mono">{(r.total_work_hours ?? 0).toFixed(1)}h</td>
                                <td className="px-4 py-3 font-mono text-amber-600">
                                    {r.total_overtime_hours > 0 ? `+${r.total_overtime_hours.toFixed(1)}h` : '—'}
                                </td>
                                <td className="px-4 py-3">{fmtCurrency(r.basic_salary ?? 0, dateLocale)}</td>
                                <td className="px-4 py-3 font-black">{fmtCurrency(r.net_salary ?? 0, dateLocale)}</td>
                                <td className="px-4 py-3">
                                    <span className={cn(
                                        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border',
                                        r.status === 'Finalized'
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            : 'bg-amber-50 text-amber-600 border-amber-100',
                                    )}>
                                        {r.status === 'Finalized' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                        {r.status ?? 'Draft'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Personal Tab ─────────────────────────────────────────────────────────────
function PersonalTab({ employee, t, dateLocale }: { employee: any, t: any, dateLocale: string }) {
    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Identity */}
            <section>
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-1 h-5 bg-secondary rounded-full" />
                    <h3 className="text-sm font-black text-primary-container uppercase tracking-widest">{t('employees:identity_residency')}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <InfoField label={t('employees:national_id')} value={employee.identity?.number} />
                    <InfoField label={t('employees:issue_date')} value={fmtDate(employee.identity?.issue_date, dateLocale)} />
                    <InfoField label={t('employees:issue_place')} value={employee.identity?.issue_place} />
                    <InfoField label={t('employees:gender')} value={employee.gender} />
                    <InfoField label={t('employees:dob')} value={fmtDate(employee.date_of_birth, dateLocale)} />
                    <InfoField label={t('employees:pob')} value={employee.place_of_birth} />
                    <div className="sm:col-span-2 lg:col-span-3 grid sm:grid-cols-2 gap-6 pt-4 border-t border-outline-variant/10">
                        <InfoField label={t('employees:permanent_address')} value={employee.contact?.permanent_address} />
                        <InfoField label={t('employees:current_address')} value={employee.contact?.current_address} />
                    </div>
                </div>
            </section>

            {/* Insurance & Tax */}
            <section className="pt-6 border-t border-outline-variant/10">
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-1 h-5 bg-secondary rounded-full" />
                    <h3 className="text-sm font-black text-primary-container uppercase tracking-widest">{t('employees:insurance_tax')}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { icon: ShieldCheck, label: t('employees:insurance_book'), value: employee.insurance?.social_insurance },
                        { icon: CreditCard, label: t('employees:tax_id'), value: employee.insurance?.tax_code },
                        { icon: ShieldCheck, label: t('employees:health_insurance'), value: employee.insurance?.health_insurance },
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="p-4 bg-surface/40 rounded-xl border border-outline-variant/15 border-dashed">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-white rounded-lg shadow-sm border border-outline-variant/20 text-outline">
                                    <Icon size={13} />
                                </div>
                                <p className="text-[10px] font-black text-outline uppercase tracking-wider">{label}</p>
                            </div>
                            <p className="text-base font-extrabold text-primary-container">{value || '—'}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Bank Accounts */}
            <section className="pt-6 border-t border-outline-variant/10">
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-1 h-5 bg-secondary rounded-full" />
                    <h3 className="text-sm font-black text-primary-container uppercase tracking-widest">{t('employees:bank_accounts')}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {employee.bank_accounts?.length > 0 ? (
                        employee.bank_accounts.map((bank: any, idx: number) => (
                            <div key={idx} className="p-4 bg-surface/40 rounded-xl border border-outline-variant/15 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm border border-outline-variant/20 text-secondary">
                                        <CreditCard size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-primary-container">{bank.bank_name}</p>
                                        <p className="text-[10px] font-mono text-outline">{bank.account_number}</p>
                                    </div>
                                </div>
                                {bank.is_primary && (
                                    <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-[8px] font-black uppercase">{t('employees:primary')}</span>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-outline italic">{t('employees:no_bank_accounts')}</p>
                    )}
                </div>
            </section>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeeDetail() {
    const { t, i18n } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('personal');
    const [showEditForm, setShowEditForm] = useState(false);
    const [checkoutRecord, setCheckoutRecord] = useState<any>(null);
    const avatarCacheKey = id ? `employee-avatar:${id}` : null;
    const [avatarPreview, setAvatarPreview] = useState<string | null>(() => {
        if (!avatarCacheKey) return null;
        try {
            return localStorage.getItem(avatarCacheKey);
        } catch {
            return null;
        }
    });

    const { data: employeeData, isLoading: loading, isError: fetchError } = useEmployee(id);
    const updateEmployee = useUpdateEmployee();

    // Data can be in `data.data` depending on how useEmployee is structured
    const employee = employeeData?.data || employeeData;

    const dateLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

    const handleDeactivate = async () => {
        if (!id || !confirm(t('employees:deactivate_confirm'))) return;
        try {
            await updateEmployee.mutateAsync({ id, payload: { status: 'Inactive' } });
            toast(t('employees:deactivated_success'));
        } catch (e) {
            toast(t('employees:failed_deactivate'));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="animate-spin text-secondary" size={32} />
        </div>
    );

    if (fetchError || !employee) return (
        <div className="flex flex-col items-center justify-center h-96 gap-4 text-outline">
            <AlertCircle size={40} className="opacity-30" />
            <p className="font-bold text-primary-container">
                {fetchError ? t('employees:error_load_detail') : t('employees:not_found')}
            </p>
            <Link to="/employees" className="text-sm text-secondary hover:underline">
                ← {t('employees:back_to_directory')}
            </Link>
        </div>
    );

    const initials = (employee.full_name ?? '?')
        .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

    const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'personal', label: t('employees:personal_info'), icon: ShieldCheck },
        { id: 'contracts', label: t('employees:contracts'), icon: Briefcase },
        { id: 'assets', label: t('employees:assets'), icon: Monitor },
        { id: 'attendance', label: t('employees:attendance'), icon: Clock },
        { id: 'overtime', label: t('employees:overtime'), icon: Timer },
        { id: 'payroll', label: t('employees:payroll'), icon: CreditCard },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'personal': return <PersonalTab employee={employee} t={t} dateLocale={dateLocale} />;
            case 'contracts': return id ? <ContractsTab key={`c-${id}`} employeeId={id} t={t} dateLocale={dateLocale} /> : null;
            case 'assets': return id ? <AssetsTab key={`as-${id}`} employeeId={id} t={t} dateLocale={dateLocale} /> : null;
            case 'overtime': return id ? <OvertimeTab key={`ot-${id}`} employeeId={id} t={t} dateLocale={dateLocale} /> : null;
            case 'attendance': return id ? <AttendanceTab key={`a-${id}`} employeeId={id} setCheckoutRecord={setCheckoutRecord} t={t} dateLocale={dateLocale} /> : null;
            case 'payroll': return id ? <PayrollTab key={`p-${id}`} employeeId={id} t={t} dateLocale={dateLocale} /> : null;
            default: return null;
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {checkoutRecord && (
                <CheckoutModal 
                    record={checkoutRecord} 
                    onClose={() => setCheckoutRecord(null)} 
                />
            )}
            <Link
                to="/employees"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-outline hover:text-secondary group transition-colors"
            >
                <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
                {t('employees:back_to_directory')}
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ── Left: Profile Card ── */}
                <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
                    <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
                        {/* Avatar area */}
                        <div className="p-8 flex flex-col items-center text-center border-b border-outline-variant/10">
                            <div className="relative group/avatar cursor-pointer w-24 h-24 mb-5">
                                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
                                    {avatarPreview || employee.avatar ? (
                                        <img src={avatarPreview || employee.avatar} alt={employee.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl font-black text-secondary">{initials}</span>
                                    )}
                                    {/* Overlay */}
                                    <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer">
                                        <Edit2 size={20} className="text-white mb-1" />
                                        <span className="text-[8px] text-white font-black uppercase">{t('employees:change_avatar')}</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file || !id) return;
                                                const reader = new FileReader();
                                                reader.onloadend = async () => {
                                                    const base64 = reader.result as string;
                                                    setAvatarPreview(base64);
                                                    try {
                                                        if (avatarCacheKey) {
                                                            localStorage.setItem(avatarCacheKey, base64);
                                                        }
                                                    } catch {
                                                        // ignore storage failures
                                                    }
                                                    try {
                                                        await updateEmployee.mutateAsync({ id, payload: { avatar: base64 } });
                                                        toast(t('employees:avatar_updated'));
                                                    } catch {
                                                        setAvatarPreview(null);
                                                        try {
                                                            if (avatarCacheKey) {
                                                                localStorage.removeItem(avatarCacheKey);
                                                            }
                                                        } catch {
                                                            // ignore storage failures
                                                        }
                                                        toast(t('employees:failed_avatar'));
                                                    }
                                                };
                                                reader.readAsDataURL(file);
                                            }}
                                        />
                                    </label>
                                </div>
                                <div className={cn(
                                    'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-white shadow-sm z-10',
                                    employee.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-400',
                                )} />
                            </div>

                            <h1 className="text-lg font-extrabold text-primary-container mb-0.5">{employee.full_name ?? '—'}</h1>
                            <p className="text-xs font-bold text-outline-variant uppercase tracking-tight mb-1">{employee.position ?? '—'}</p>
                            <Link
                                to="/departments"
                                state={{ highlightDept: employee.department }}
                                className="text-xs text-secondary hover:underline font-semibold mb-4 flex items-center gap-1 justify-center"
                            >
                                <Building2 size={12} />
                                {employee.department ?? '—'}
                            </Link>

                            <span className={cn(
                                'mb-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm',
                                employee.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : 'bg-rose-50 text-rose-600 border-rose-100',
                            )}>
                                {employee.status ?? 'Unknown'}
                            </span>
                            
                            {/* Face ID Status */}
                            <div className="mb-6 flex items-center gap-2 px-3 py-1.5 bg-surface rounded-xl border border-outline-variant/20 shadow-inner">
                                <div className={cn(
                                    'w-2 h-2 rounded-full',
                                    employee.face_data?.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-outline/30'
                                )} />
                                <span className="text-[9px] font-black uppercase tracking-tighter text-primary-container">
                                    {t('employees:face_id_status')}: {employee.face_data?.length > 0 ? t('employees:registered') : t('employees:not_set')}
                                </span>
                            </div>

                            <div className="w-full space-y-2">
                                <button onClick={() => setShowEditForm(true)} className="w-full h-9 bg-secondary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md shadow-secondary/20">
                                    <Edit2 size={13} /> {t('employees:edit_profile')}
                                </button>
                                <button className="w-full h-9 border border-outline-variant/40 text-primary-container rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-surface transition-colors">
                                    <Lock size={13} /> {t('employees:reset_password')}
                                </button>
                                <button onClick={handleDeactivate} className="w-full h-9 text-rose-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors">
                                    <UserMinus size={13} /> {t('employees:deactivate')}
                                </button>
                            </div>
                        </div>

                        {/* Contact details */}
                        <div className="p-5 space-y-4 bg-surface/20">
                            <p className="text-[10px] font-black text-outline uppercase tracking-widest">{t('employees:contact_details')}</p>
                            {[
                                { icon: Phone, label: t('common:phone'), value: employee.contact?.phone, link: null },
                                { icon: Mail, label: t('common:email'), value: employee.contact?.email, link: null },
                                { icon: BadgeCheck, label: t('common:employee_code'), value: employee.employee_code, link: null },
                                { icon: Calendar, label: t('employees:hire_date'), value: fmtDate(employee.hire_date, dateLocale), link: null },
                                { icon: MapPin, label: t('employees:address'), value: employee.contact?.permanent_address, link: null },
                            ].map(({ icon: Icon, label, value, link }) => (
                                <div key={label} className="flex items-start gap-3">
                                    <div className="p-1.5 bg-white rounded-lg border border-outline-variant/15 shadow-sm text-outline shrink-0 mt-0.5">
                                        <Icon size={13} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-outline-variant uppercase">{label}</p>
                                        <p className="text-xs font-bold text-primary-container break-all">{value || '—'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* ── Right: Tab Panel ── */}
                <main className="lg:col-span-8 xl:col-span-9">
                    <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
                        {/* Tab Bar */}
                        <div className="px-6 border-b border-outline-variant/10 overflow-x-auto">
                            <div className="flex min-w-max">
                                {TABS.map(({ id: tid, label, icon: Icon }) => (
                                    <button
                                        key={tid}
                                        onClick={() => setActiveTab(tid)}
                                        className={cn(
                                            'flex items-center gap-2 px-4 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap',
                                            activeTab === tid
                                                ? 'text-secondary border-secondary'
                                                : 'text-outline border-transparent hover:text-primary-container hover:border-outline-variant/30',
                                        )}
                                    >
                                        <Icon size={14} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6 min-h-[400px]">
                            {renderTabContent()}
                        </div>
                    </div>
                </main>
            </div>

            {/* Edit Modal */}
            {showEditForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <EmployeeForm
                            initial={employee}
                            onAvatarChange={(nextAvatar) => setAvatarPreview(nextAvatar)}
                            onDone={(saved) => {
                                setShowEditForm(false);
                                if (!saved) {
                                    setAvatarPreview(employee.avatar || null);
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
