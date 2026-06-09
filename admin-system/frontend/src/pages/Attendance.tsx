import React, { useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import {
    History,
    Search,
    Download,
    Filter,
    CheckCircle2,
    Clock,
    XCircle,
    Camera,
    Minus,
    Loader2,
    TrendingUp,
    X,
    Plus,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAttendanceHistory, useMonthlyAttendanceReport, useCreateAttendance, useUpdateAttendance } from '../hooks/useAttendance';
import api from '../lib/api';
import CheckoutModal from '../components/CheckoutModal';
import Pagination from '../components/ui/Pagination';
import SearchableSelect from '../components/ui/SearchableSelect';


import { useTranslation } from 'react-i18next';

export default function Attendance() {
    const { t, i18n } = useTranslation();
    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;

    const { data: attendanceRes, isLoading, error } = useAttendanceHistory({
        page,
        limit,
    });
    const attendanceRecords = (attendanceRes as any)?.items || [];
    const pagination = (attendanceRes as any)?.pagination;

    const { data: monthlyReport } = useMonthlyAttendanceReport(selectedYear, selectedMonth);

    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [checkoutRecord, setCheckoutRecord] = useState<any>(null);

    const { mutate: updateAttendance } = useUpdateAttendance();

    const handleQuickCheckout = (record: any) => {
        setCheckoutRecord(record);
    };

    // Filter theo search
    const filtered = searchQuery
        ? attendanceRecords.filter((r: any) => {
              const name = r.employee_id?.full_name?.toLowerCase() || '';
              const code = r.employee_id?.employee_code?.toLowerCase() || '';
              const q = searchQuery.toLowerCase();
              return name.includes(q) || code.includes(q);
          })
        : attendanceRecords;

    // Tính stats từ dữ liệu thật
    const totalWorkedHours = attendanceRecords.reduce((sum: number, r: any) => sum + (r.worked_hours || 0) + (r.ot_hours || 0), 0);
    const checkedOutCount = attendanceRecords.filter((r: any) => r.status === 'CheckedOut').length;
    const onTimeCount = attendanceRecords.filter((r: any) => (r.late_minutes || 0) === 0 && r.status !== 'MissingCheckout').length;
    const onTimeRate = attendanceRecords.length > 0 ? Math.round((onTimeCount / attendanceRecords.length) * 100) : 0;

    const months = i18n.language === 'vi' 
        ? ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dateLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

    function downloadCSV(items: any[]) {
        const header = [
            t('attendance:employee'),
            t('common:employee_code'),
            t('attendance:date'),
            t('attendance:clock_in'),
            t('attendance:clock_out'),
            t('attendance:work_hours'),
            t('attendance:late_min'),
            t('common:status')
        ];
        const rows = items.map((r) => [
            r.employee_id?.full_name,
            r.employee_id?.employee_code,
            new Date(r.work_date || r.check_in).toLocaleDateString(dateLocale),
            r.check_in ? new Date(r.check_in).toLocaleTimeString(dateLocale) : '',
            r.check_out ? new Date(r.check_out).toLocaleTimeString(dateLocale) : '',
            r.worked_hours || 0,
            r.late_minutes || 0,
            r.status
        ]);
        const csv = [header, ...rows]
            .map((r) => r.map((c) => `"${(c || '').toString().replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `attendance_${selectedMonth}_${selectedYear}.csv`;
        a.click();
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-500 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-primary-container tracking-tight">{t('attendance:title')}</h1>
                    <p className="text-sm text-outline font-medium italic mt-1">
                        {t('attendance:description')}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setIsManualModalOpen(true)}
                        className="h-9 px-4 flex items-center gap-2 bg-secondary text-white rounded-lg text-xs font-bold hover:bg-secondary/90 shadow-sm transition-all"
                    >
                        <Clock size={16} />
                        {t('attendance:add_manual')}
                    </button>
                    <div className="bg-white border border-outline-variant/30 rounded-lg shadow-sm flex">
                        <select
                            className="bg-transparent border-none text-xs font-bold text-primary-container focus:ring-0 px-3 py-2 cursor-pointer"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        >
                            {months.map((m, i) => (
                                <option key={m} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select
                            className="bg-transparent border-none text-xs font-bold text-primary-container focus:ring-0 px-3 py-2 cursor-pointer"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {[2024, 2025, 2026].map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <button 
                        onClick={() => downloadCSV(filtered)}
                        className="h-9 px-4 flex items-center gap-2 bg-white border border-outline-variant/30 text-primary-container rounded-lg text-xs font-bold hover:bg-surface shadow-sm transition-all"
                    >
                        <Download size={16} />
                        {t('attendance:export_excel')}
                    </button>
                </div>
            </div>

            {/* Monthly Summary Cards */}
            {monthlyReport && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: t('attendance:total_records'), value: monthlyReport.total_records ?? 0, color: 'text-primary-container' },
                        { label: t('attendance:checked_in'), value: monthlyReport.checked_in ?? 0, color: 'text-emerald-600' },
                        { label: t('attendance:checked_out'), value: monthlyReport.checked_out ?? 0, color: 'text-violet-600' },
                        { label: t('attendance:total_hours'), value: `${(monthlyReport.total_worked_hours ?? 0).toFixed(0)}h`, color: 'text-amber-600' },
                    ].map((s) => (
                        <div key={s.label} className="bg-white p-4 rounded-xl border border-outline-variant/30 shadow-sm">
                            <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">{s.label}</p>
                            <p className={cn('text-xl font-extrabold', s.color)}>{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                {/* Toolbar */}
                <div className="p-4 border-b border-outline-variant/10 flex flex-wrap items-center justify-between gap-4 bg-surface/20">
                    <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
                            <input
                                type="text"
                                placeholder={t('attendance:search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-9 pl-9 pr-3 bg-white border border-outline-variant/20 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-secondary/5 focus:border-secondary transition-all"
                            />
                        </div>
                        <button className="h-9 w-9 bg-white border border-outline-variant/20 rounded-lg flex items-center justify-center text-outline hover:text-secondary shadow-sm transition-all">
                            <Filter size={16} />
                        </button>
                    </div>
                    <div className="flex items-center gap-6 pr-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-outline uppercase tracking-wider">{t('attendance:on_time_rate')}</span>
                            <span className="text-sm font-black text-emerald-600">{onTimeRate}%</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-outline uppercase tracking-wider">{t('attendance:total_work_hours')}</span>
                            <span className="text-sm font-black text-primary-container">{totalWorkedHours.toFixed(1)}h</span>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="flex-1 overflow-x-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-96">
                            <Loader2 className="animate-spin text-secondary" size={32} />
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-96">
                            <div className="text-center text-rose-600">
                                <p className="font-bold">{t('attendance:error_load')}</p>
                                <p className="text-sm mt-1">{t('attendance:try_again')}</p>
                            </div>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex items-center justify-center h-96">
                            <div className="text-center text-outline">
                                <p className="font-bold">{searchQuery ? t('common:no_data') : t('attendance:no_records')}</p>
                            </div>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-surface/50 border-b border-outline-variant/20">
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest min-w-[220px]">{t('common:employees')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest min-w-[110px]">{t('attendance:date')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest min-w-[100px]">{t('attendance:clock_in')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest min-w-[100px]">{t('attendance:clock_out')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest text-right min-w-[110px]">{t('attendance:work_hours')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest text-right min-w-[90px]">{t('attendance:late_min')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest text-center min-w-[120px]">{t('common:status')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest text-center min-w-[80px]">{t('attendance:method')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/10 text-xs font-semibold text-primary-container">
                                {filtered.map((record: any) => {
                                    const checkInTime = record.check_in
                                        ? new Date(record.check_in).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
                                        : '--:--';
                                    const checkOutTime = record.check_out
                                        ? new Date(record.check_out).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
                                        : '--:--';
                                    const date = record.work_date
                                        ? new Date(record.work_date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })
                                        : record.check_in
                                        ? new Date(record.check_in).toLocaleDateString(dateLocale)
                                        : '—';
                                    const workedHours = record.worked_hours || 0;
                                    const lateMinutes = record.late_minutes || 0;
                                    const status = record.status || 'Unknown';

                                    return (
                                        <tr key={record._id} className="hover:bg-secondary/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-[10px] font-black text-primary-container shrink-0 border border-outline-variant/20 uppercase">
                                                        {record.employee_id?.full_name?.[0] || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-extrabold group-hover:text-secondary transition-colors">
                                                            {record.employee_id?.full_name || 'Unknown'}
                                                        </div>
                                                        <div className="text-[10px] text-outline font-mono mt-0.5 uppercase tracking-tighter">
                                                            {record.employee_id?.employee_code || '—'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-outline font-medium italic">{date}</td>
                                            <td className={cn('px-6 py-4 font-mono font-bold tracking-widest', lateMinutes > 0 ? 'text-amber-600' : '')}>{checkInTime}</td>
                                            <td className="px-6 py-4 font-mono font-bold tracking-widest">{checkOutTime}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold">{(workedHours + (record.ot_hours || 0)).toFixed(1)}h</td>
                                            <td className={cn('px-6 py-4 text-right font-black', lateMinutes > 0 ? 'text-amber-600 bg-amber-50/50' : 'text-outline-variant opacity-30')}>
                                                {lateMinutes > 0 ? `${lateMinutes}m` : '0'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn(
                                                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm',
                                                    status === 'CheckedOut'
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                        : status === 'CheckedIn'
                                                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                        : 'bg-rose-50 text-rose-600 border-rose-100',
                                                )}>
                                                    {status === 'CheckedOut' && <CheckCircle2 size={10} />}
                                                    {status === 'CheckedIn' && <Clock size={10} />}
                                                    {status === 'MissingCheckout' && <XCircle size={10} />}
                                                    {status === 'CheckedOut' ? t('common:inactive') : status === 'CheckedIn' ? t('attendance:present') : t('attendance:missing')}
                                                </span>
                                                {status === 'CheckedIn' && (
                                                    <button 
                                                        onClick={() => handleQuickCheckout(record)}
                                                        className="ml-2 px-2 py-0.5 bg-secondary text-white rounded text-[8px] font-black uppercase hover:opacity-80 transition-opacity"
                                                    >
                                                        {t('attendance:clock_out')}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center text-outline">
                                                <div className="flex justify-center">
                                                    {record.method === 'face' && <Camera size={18} className="opacity-60" />}
                                                    {(!record.method || record.method === 'manual') && <Minus size={18} className="opacity-20" />}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer / Pagination */}
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

            {isManualModalOpen && (
                <ManualAttendanceModal 
                    onClose={() => setIsManualModalOpen(false)} 
                    t={t}
                    dateLocale={dateLocale}
                />
            )}

            {checkoutRecord && (
                <CheckoutModal 
                    record={checkoutRecord} 
                    onClose={() => setCheckoutRecord(null)} 
                />
            )}
        </div>
    );
}

function ManualAttendanceModal({ onClose, t, dateLocale }: { onClose: () => void, t: any, dateLocale: string }) {
    const { mutate: createAttendance, isPending } = useCreateAttendance();
    const [formData, setFormData] = useState({
        employee_id: '',
        work_date: new Date().toISOString().split('T')[0],
        check_in: '',
        check_out: '',
    });
    const [employees, setEmployees] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await api.apiGet('/employees?limit=100');
                const data = res?.data?.items || res?.items || res?.data || [];
                setEmployees(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Failed to fetch employees', err);
            }
        };
        fetchEmployees();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const checkInDate = new Date(`${formData.work_date}T${formData.check_in}:00`);
        const checkOutDate = formData.check_out ? new Date(`${formData.work_date}T${formData.check_out}:00`) : null;
        
        createAttendance({
            employee_id: formData.employee_id,
            work_date: formData.work_date,
            check_in: checkInDate.toISOString(),
            check_out: checkOutDate ? checkOutDate.toISOString() : null,
            method: 'manual'
        }, {
            onSuccess: () => {
                onClose();
                window.location.reload();
            },
            onError: (err: any) => {
                alert(err?.response?.data?.message || t('attendance:error_load'));
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-outline-variant/20 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-5 flex items-center justify-between border-b border-outline-variant/10 bg-surface/30">
                    <div>
                        <h2 className="text-lg font-extrabold text-primary-container tracking-tight flex items-center gap-2">
                            <Clock size={18} className="text-secondary" />
                            {t('attendance:manual_modal_title')}
                        </h2>
                        <p className="text-xs text-outline font-medium mt-1">{t('attendance:manual_modal_desc')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors text-outline">
                        <XCircle size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-black text-outline uppercase tracking-wider mb-1.5">{t('attendance:select_employee')}</label>
                        <SearchableSelect
                            options={employees.map(emp => ({
                                value: emp._id,
                                label: `${emp.full_name} (${emp.employee_code})`
                            }))}
                            value={formData.employee_id}
                            onChange={(val) => setFormData(prev => ({ ...prev, employee_id: val }))}
                            placeholder={t('attendance:select_employee')}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-black text-outline uppercase tracking-wider mb-1.5">{t('attendance:work_date')}</label>
                        <input
                            type="date"
                            required
                            value={formData.work_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, work_date: e.target.value }))}
                            className="w-full h-10 px-3 bg-white border border-outline-variant/30 rounded-lg text-sm font-semibold focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-outline uppercase tracking-wider mb-1.5">{t('attendance:clock_in')}</label>
                            <input
                                type="time"
                                required
                                value={formData.check_in}
                                onChange={(e) => setFormData(prev => ({ ...prev, check_in: e.target.value }))}
                                className="w-full h-10 px-3 bg-white border border-outline-variant/30 rounded-lg text-sm font-semibold focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-outline uppercase tracking-wider mb-1.5">{t('attendance:clock_out')}</label>
                            <input
                                type="time"
                                value={formData.check_out}
                                onChange={(e) => setFormData(prev => ({ ...prev, check_out: e.target.value }))}
                                className="w-full h-10 px-3 bg-white border border-outline-variant/30 rounded-lg text-sm font-semibold focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                            />
                            <p className="text-[10px] text-outline mt-1 italic">{t('attendance:optional')}</p>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-outline-variant/10 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-outline hover:bg-surface rounded-lg transition-colors"
                        >
                            {t('common:cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:bg-secondary/90 transition-all flex items-center gap-2"
                        >
                            {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            {t('attendance:save_record')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
