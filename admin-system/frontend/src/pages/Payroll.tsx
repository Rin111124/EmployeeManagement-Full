import React, { useState } from 'react';
import {
    CircleDollarSign, Search, Calendar, Download, CreditCard,
    Building, CheckCircle, MoreHorizontal, Loader2, Play, Settings, X, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { usePayrollList, useGeneratePayroll } from '../hooks/usePayroll';
import { useEmployees } from '../features/employees/hooks/useEmployees';
import toast from '../lib/toast';
import { useTranslation } from 'react-i18next';
import Pagination from '../components/ui/Pagination';
import SearchableSelect from '../components/ui/SearchableSelect';

const now = new Date();

const DEFAULT_ENGINE_CONFIG = {
    nightStartHour: 22,
    nightEndHour: 6,
    standardHoursPerDay: 8,
    dayBreakMins: 30,
    nightBreakMins: 45,
    rates: {
        Normal: { day_normal: 1.0, night_normal: 1.3, day_ot: 1.5, night_ot: 2.0 },
        Weekend: { day_normal: 2.0, night_normal: 2.7, day_ot: 2.0, night_ot: 2.7 },
        Holiday: { day_normal: 3.0, night_normal: 3.9, day_ot: 3.0, night_ot: 3.9 },
    },
};

function formatVND(amount: number, locale: string = 'vi-VN') {
    if (amount === 0) return '—';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
    return (
        <label className="flex items-center gap-1 text-[11px] font-bold text-outline uppercase tracking-wider mb-1">
            {children}
            {hint && <span title={hint} className="cursor-help text-outline/40 hover:text-outline"><Info size={11} /></span>}
        </label>
    );
}

function NumInput({ value, onChange, min, max, step }: any) {
    return (
        <input
            type="number" value={value} min={min} max={max} step={step}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
        />
    );
}

export default function Payroll() {
    const { t, i18n } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [resultRecord, setResultRecord] = useState<any>(null);
    const [page, setPage] = useState(1);
    const limit = 20;

    const { data: payrollRes, isLoading, refetch } = usePayrollList({ page, limit });
    const payrollRecords = (payrollRes as any)?.items || [];
    const pagination = (payrollRes as any)?.pagination;
    const generatePayroll = useGeneratePayroll();

    const { data: empData } = useEmployees({ limit: 100 });
    let employees: any[] = [];
    if (Array.isArray(empData)) employees = empData;
    else if (Array.isArray(empData?.items)) employees = empData.items;
    else if (Array.isArray(empData?.data)) employees = empData.data;
    else if (Array.isArray(empData?.data?.items)) employees = empData.data.items;

    // Form state
    const [form, setForm] = useState({
        employee_id: '',
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        deduction: 0,
        standard_month_hours: 176,
        finalize: false,
    });

    const [engineConfig, setEngineConfig] = useState({ ...DEFAULT_ENGINE_CONFIG });

    const setRate = (type: string, key: string, val: number) => {
        setEngineConfig(prev => ({
            ...prev,
            rates: {
                ...prev.rates,
                [type]: { ...(prev.rates as any)[type], [key]: val },
            },
        }));
    };

    const handleRun = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.employee_id) { toast(t('payroll:select_employee')); return; }
        try {
            const res = await generatePayroll.mutateAsync({ ...form, engineConfig });
            setResultRecord(res);
            refetch();
            toast(t('common:success'));
        } catch (err: any) {
            toast(err?.response?.data?.message || t('common:error'));
        }
    };

    const totalNetSalary = payrollRecords.reduce((s: number, r: any) => s + (r.net_salary || 0), 0);
    const totalDeduction = payrollRecords.reduce((s: number, r: any) => s + (r.deduction || 0), 0);
    const totalBasic = payrollRecords.reduce((s: number, r: any) => s + (r.basic_salary || 0), 0);

    const filtered = searchQuery
        ? payrollRecords.filter((r: any) => {
            const name = r.employee_id?.full_name?.toLowerCase() || '';
            return name.includes(searchQuery.toLowerCase()) || `${r.month}/${r.year}`.includes(searchQuery);
        })
        : payrollRecords;

    const dateLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-primary-container tracking-tight">{t('payroll:title')}</h1>
                    <p className="text-sm text-outline font-medium italic">{t('payroll:description')}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setShowModal(true); setResultRecord(null); }}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:bg-secondary-container shadow-sm transition-all"
                    >
                        <Play size={14} />
                        {t('payroll:run_payroll')} — {now.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' })}
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { icon: CircleDollarSign, label: t('payroll:total_net'), value: totalNetSalary, sub: `${payrollRecords.length} ${t('attendance:records')}`, dark: true },
                    { icon: CreditCard, label: t('payroll:total_deductions'), value: totalDeduction, sub: t('payroll:tax_insurance') },
                    { icon: Building, label: t('payroll:total_basic'), value: totalBasic, sub: t('payroll:before_allowances') },
                ].map((kpi, i) => (
                    <div key={i} className={cn(
                        'p-6 rounded-xl border relative overflow-hidden group shadow-sm',
                        kpi.dark ? 'bg-primary-container border-primary-container shadow-primary-container/20' : 'bg-white border-outline-variant/30'
                    )}>
                        <kpi.icon className={cn('absolute -right-4 -bottom-4 w-24 h-24 group-hover:scale-110 transition-transform', kpi.dark ? 'text-white/10' : 'text-surface')} />
                        <p className={cn('text-[10px] font-black uppercase tracking-widest mb-1 relative z-10', kpi.dark ? 'text-white/60' : 'text-outline')}>{kpi.label}</p>
                        {isLoading ? <Loader2 className={cn('animate-spin mt-2', kpi.dark ? 'text-white/60' : 'text-outline-variant')} size={22} /> : (
                            <>
                                <h3 className={cn('text-2xl font-black mb-1 relative z-10', kpi.dark ? 'text-white' : 'text-primary-container')}>{formatVND(kpi.value, dateLocale)}</h3>
                                <p className={cn('text-[10px] font-bold relative z-10', kpi.dark ? 'text-white/50' : 'text-outline-variant')}>{kpi.sub}</p>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                <div className="px-6 py-4 border-b border-outline-variant/10 flex flex-wrap items-center justify-between gap-4 bg-surface/30">
                    <h2 className="text-sm font-black text-primary-container uppercase tracking-tight">{t('payroll:records_title')}</h2>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={14} />
                            <input type="text" placeholder={t('payroll:search_placeholder')} value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="h-8 pl-9 pr-3 text-xs bg-white border border-outline-variant/20 rounded-lg focus:outline-none focus:border-secondary w-48 shadow-sm"
                            />
                        </div>
                        <button className="h-8 w-8 bg-white border border-outline-variant/20 rounded-lg flex items-center justify-center text-outline hover:text-secondary shadow-sm transition-all">
                            <Download size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-surface/50 border-b border-outline-variant/20">
                                {[t('common:employee'), t('payroll:period'), t('payroll:work_hours'), t('payroll:basic_salary'), t('payroll:ot_salary'), t('payroll:net_salary'), t('common:status'), t('payroll:generated'), ''].map(h => (
                                    <th key={h} className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10 text-xs font-semibold text-primary-container">
                            {isLoading ? (
                                <tr><td colSpan={9} className="py-8 text-center"><Loader2 className="animate-spin text-secondary mx-auto" size={24} /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={9} className="py-8 text-center text-outline">
                                    {searchQuery ? t('payroll:no_matching') : t('common:no_data')}
                                </td></tr>
                            ) : filtered.map((item: any) => (
                                <tr key={item._id} className="hover:bg-secondary/5 transition-colors group cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center text-[10px] text-secondary font-bold shrink-0">
                                                {item.employee_id?.full_name?.[0] || '?'}
                                            </div>
                                            <div>
                                                <p className="font-extrabold">{item.employee_id?.full_name || '—'}</p>
                                                <p className="text-[10px] text-outline font-mono">{item.employee_id?.employee_code || '—'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-extrabold">
                                        {item.month && item.year ? new Date(item.year, item.month - 1).toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' }) : '—'}
                                    </td>
                                    <td className="px-6 py-4 font-mono">
                                        {item.total_work_hours?.toFixed(1) || '0'}h
                                        {item.total_overtime_hours > 0 && <span className="ml-1 text-amber-600">(+{item.total_overtime_hours?.toFixed(1)}h OT)</span>}
                                    </td>
                                    <td className="px-6 py-4">{formatVND(item.basic_salary || 0, dateLocale)}</td>
                                    <td className="px-6 py-4 text-amber-600">{formatVND(item.overtime_salary || 0, dateLocale)}</td>
                                    <td className="px-6 py-4 font-black">{formatVND(item.net_salary || 0, dateLocale)}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
                                            item.status === 'Finalized' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                        )}>
                                            <CheckCircle size={10} />{item.status === 'Finalized' ? t('common:approved') : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-outline italic">{item.generated_at ? new Date(item.generated_at).toLocaleDateString(dateLocale) : '—'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-white rounded-lg text-outline shadow-sm border border-transparent hover:border-outline-variant/20 transition-all opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {pagination && (
                    <Pagination 
                        page={pagination.page}
                        limit={pagination.limit}
                        total={pagination.total}
                        totalPages={pagination.total_pages}
                        onPageChange={setPage}
                    />
                )}
            </div>

            {/* Run Payroll Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-outline-variant/10 px-6 py-4 flex items-center justify-between z-10">
                            <div>
                                <h2 className="text-lg font-extrabold text-primary-container">{t('payroll:run_engine')}</h2>
                                <p className="text-xs text-outline mt-0.5">{t('payroll:labor_code_notice')}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-surface rounded-lg text-outline transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleRun} className="p-6 space-y-6">
                            {/* Basic */}
                            <div>
                                <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-3">{t('payroll:parameters')}</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <FieldLabel>{t('common:employee')} *</FieldLabel>
                                        <SearchableSelect
                                            options={employees.map((emp: any) => ({ value: emp._id, label: `${emp.full_name} (${emp.employee_code})` }))}
                                            value={form.employee_id}
                                            onChange={val => setForm({ ...form, employee_id: val })}
                                            placeholder={t('payroll:select_employee')}
                                        />
                                    </div>
                                    <div>
                                        <FieldLabel>{t('payroll:month')} *</FieldLabel>
                                        <select value={form.month} onChange={e => setForm({ ...form, month: Number(e.target.value) })}
                                            className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary">
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString(dateLocale, { month: 'long' })}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <FieldLabel>{t('payroll:year')} *</FieldLabel>
                                        <NumInput value={form.year} onChange={(v: number) => setForm({ ...form, year: v })} min={2020} max={2100} step={1} />
                                    </div>
                                    <div>
                                        <FieldLabel hint={t('payroll:std_month_hours_hint')}>{t('payroll:std_month_hours')}</FieldLabel>
                                        <NumInput value={form.standard_month_hours} onChange={(v: number) => setForm({ ...form, standard_month_hours: v })} min={1} step={1} />
                                    </div>
                                    <div>
                                        <FieldLabel hint={t('payroll:deduction_hint')}>{t('payroll:deduction_vnd')}</FieldLabel>
                                        <NumInput value={form.deduction} onChange={(v: number) => setForm({ ...form, deduction: v })} min={0} step={1000} />
                                    </div>
                                    <div className="col-span-2 flex items-center gap-3">
                                        <input type="checkbox" id="finalize" checked={form.finalize} onChange={e => setForm({ ...form, finalize: e.target.checked })}
                                            className="w-4 h-4 accent-secondary" />
                                        <label htmlFor="finalize" className="text-xs font-bold text-primary-container cursor-pointer">
                                            {t('payroll:mark_finalized')}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Shift Time Config */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest">{t('payroll:shift_config')}</p>
                                    <button type="button" onClick={() => setEngineConfig({ ...DEFAULT_ENGINE_CONFIG })}
                                        className="text-[10px] text-outline hover:text-secondary font-bold">{t('payroll:reset_defaults')}</button>
                                </div>
                                <div className="grid grid-cols-2 gap-4 bg-surface/50 rounded-xl p-4 border border-outline-variant/10">
                                    <div>
                                        <FieldLabel hint={t('payroll:night_start_hint')}>{t('settings:night_start')}</FieldLabel>
                                        <NumInput value={engineConfig.nightStartHour} onChange={(v: number) => setEngineConfig({ ...engineConfig, nightStartHour: v })} min={0} max={23} step={1} />
                                    </div>
                                    <div>
                                        <FieldLabel hint={t('payroll:night_end_hint')}>{t('settings:night_end')}</FieldLabel>
                                        <NumInput value={engineConfig.nightEndHour} onChange={(v: number) => setEngineConfig({ ...engineConfig, nightEndHour: v })} min={0} max={23} step={1} />
                                    </div>
                                    <div>
                                        <FieldLabel hint={t('payroll:std_hours_day_hint')}>{t('settings:standard_hours')}/Day</FieldLabel>
                                        <NumInput value={engineConfig.standardHoursPerDay} onChange={(v: number) => setEngineConfig({ ...engineConfig, standardHoursPerDay: v })} min={1} max={24} step={0.5} />
                                    </div>
                                    <div />
                                    <div>
                                        <FieldLabel hint={t('payroll:day_break_hint')}>Day Break (minutes)</FieldLabel>
                                        <NumInput value={engineConfig.dayBreakMins} onChange={(v: number) => setEngineConfig({ ...engineConfig, dayBreakMins: v })} min={0} max={120} step={5} />
                                    </div>
                                    <div>
                                        <FieldLabel hint={t('payroll:night_break_hint')}>Night Break (minutes)</FieldLabel>
                                        <NumInput value={engineConfig.nightBreakMins} onChange={(v: number) => setEngineConfig({ ...engineConfig, nightBreakMins: v })} min={0} max={120} step={5} />
                                    </div>
                                </div>
                            </div>

                            {/* Rate Config – collapsible */}
                            <div>
                                <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="flex items-center gap-2 text-[10px] font-black text-secondary uppercase tracking-widest mb-3 hover:text-secondary-container transition-colors">
                                    <Settings size={12} />
                                    {t('payroll:multipliers')}
                                    {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>

                                {showAdvanced && (
                                    <div className="space-y-4">
                                        {(['Normal', 'Weekend', 'Holiday'] as const).map(type => (
                                            <div key={type} className="bg-surface/50 rounded-xl p-4 border border-outline-variant/10">
                                                <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-primary-container">{type} Day</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[
                                                        { key: 'day_normal', label: 'Day Normal (×)' },
                                                        { key: 'night_normal', label: 'Night Normal (×)' },
                                                        { key: 'day_ot', label: 'Day OT (×)' },
                                                        { key: 'night_ot', label: 'Night OT (×)' },
                                                    ].map(({ key, label }) => (
                                                        <div key={key}>
                                                            <FieldLabel>{label}</FieldLabel>
                                                            <NumInput
                                                                value={(engineConfig.rates as any)[type][key]}
                                                                onChange={(v: number) => setRate(type, key, v)}
                                                                min={0.5} step={0.05}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Result Preview */}
                            {resultRecord && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-3">✓ {t('payroll:result')}</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {[
                                            [t('payroll:basic_salary'), formatVND(resultRecord.basic_salary, dateLocale)],
                                            [t('payroll:allowance'), formatVND(resultRecord.allowance, dateLocale)],
                                            [t('payroll:ot_salary'), formatVND(resultRecord.overtime_salary, dateLocale)],
                                            [t('common:deduction'), formatVND(resultRecord.deduction, dateLocale)],
                                            [t('payroll:net_salary'), formatVND(resultRecord.net_salary, dateLocale)],
                                            [t('common:status'), resultRecord.status],
                                        ].map(([label, val]) => (
                                            <div key={label} className="flex justify-between">
                                                <span className="text-emerald-700 font-bold">{label}:</span>
                                                <span className="font-extrabold text-emerald-900">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {resultRecord.calculation_details?.engine_breakdown?.length > 0 && (
                                        <div className="mt-3 border-t border-emerald-200 pt-3">
                                            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">{t('payroll:breakdown')}</p>
                                            <div className="space-y-1">
                                                {resultRecord.calculation_details.engine_breakdown.map((b: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-[11px]">
                                                        <span className="text-emerald-700">{b.description} ({b.hours}h × {b.multiplier}×)</span>
                                                        <span className="font-extrabold text-emerald-900">{formatVND(b.amount, dateLocale)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant/10">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-outline-variant/30 text-outline hover:bg-surface rounded-lg text-xs font-bold transition-colors">
                                    {t('common:cancel')}
                                </button>
                                <button type="submit" disabled={generatePayroll.isPending}
                                    className="px-6 py-2 bg-secondary text-white hover:bg-secondary-container rounded-lg text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
                                    {generatePayroll.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                    {generatePayroll.isPending ? t('payroll:calculating') : t('payroll:generate_button')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
