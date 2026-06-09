import React, { useState } from 'react';
import {
    CalendarRange,
    Clock,
    Search,
    CheckCircle,
    XCircle,
    Loader2,
    Plus,
    AlertCircle,
    MoreVertical,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
    useLeaveRequests,
    useCreateLeaveRequest,
    useApproveLeaveRequest,
    useRejectLeaveRequest,
    useDeleteLeaveRequest,
    useOvertimeRequests,
    useCreateOvertime,
    useApproveOvertime,
    useRejectOvertime,
    useDeleteOvertime,
    useCreateBulkOvertime,
    useBiometricRequests,
    useUpdateBiometricRequest,
} from '../hooks/useRequests';
import { useEmployees } from '../features/employees/hooks/useEmployees';
import toast from '../lib/toast';
import { useTranslation } from 'react-i18next';
import Pagination from '../components/ui/Pagination';
import SearchableSelect from '../components/ui/SearchableSelect';

type Tab = 'leave' | 'overtime' | 'biometric';

export default function Requests() {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState<Tab>('leave');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;
    
    // Modals
    const [showLeaveForm, setShowLeaveForm] = useState(false);
    const [showOvertimeForm, setShowOvertimeForm] = useState(false);
    const [showBulkOvertimeForm, setShowBulkOvertimeForm] = useState(false);

    // Queries
    const { data: leavesRes, isLoading: loadingLeaves } = useLeaveRequests({ page, limit });
    const leaves = (leavesRes as any)?.items || [];
    const leavesPagination = (leavesRes as any)?.pagination;

    const { data: overtimesRes, isLoading: loadingOvertimes } = useOvertimeRequests({ page, limit });
    const overtimes = (overtimesRes as any)?.items || [];
    const overtimesPagination = (overtimesRes as any)?.pagination;

    const { data: empData } = useEmployees({ limit: 100 });
    let employees: any[] = [];
    if (Array.isArray(empData)) employees = empData;
    else if (Array.isArray(empData?.items)) employees = empData.items;
    else if (Array.isArray(empData?.data)) employees = empData.data;
    else if (Array.isArray(empData?.data?.items)) employees = empData.data.items;

    // Mutations
    const createLeave = useCreateLeaveRequest();
    const approveLeave = useApproveLeaveRequest();
    const rejectLeave = useRejectLeaveRequest();
    const deleteLeave = useDeleteLeaveRequest();

    const createOvertime = useCreateOvertime();
    const approveOvertime = useApproveOvertime();
    const rejectOvertime = useRejectOvertime();
    const deleteOvertime = useDeleteOvertime();
    const createBulkOvertime = useCreateBulkOvertime();
    
    const { data: biometricRes, isLoading: loadingBiometric } = useBiometricRequests();
    const biometricRequests = (biometricRes as any)?.items || [];
    const biometricPagination = (biometricRes as any)?.pagination;
    const updateBiometric = useUpdateBiometricRequest();

    // Form States
    const [leaveData, setLeaveData] = useState({ employee_id: '', type: 'Annual', start_date: '', end_date: '', total_days: 1 });
    const [overtimeData, setOvertimeData] = useState({ employee_id: '', work_date: '', hours: 1, type: 'Weekday' });
    const [bulkOvertimeData, setBulkOvertimeData] = useState({ employee_ids: [] as string[], work_date: '', hours: 1, type: 'Weekday', reason: '' });

    const dateLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

    const handleCreateLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createLeave.mutateAsync(leaveData);
            toast(t('requests:success_leave'));
            setShowLeaveForm(false);
            setLeaveData({ employee_id: '', type: 'Annual', start_date: '', end_date: '', total_days: 1 });
        } catch (e: any) {
            toast(e.response?.message || t('requests:failed_create'));
        }
    };

    const handleCreateOvertime = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createOvertime.mutateAsync(overtimeData);
            toast(t('requests:success_overtime'));
            setShowOvertimeForm(false);
            setOvertimeData({ employee_id: '', work_date: '', hours: 1, type: 'Weekday' });
        } catch (e: any) {
            toast(e.response?.message || t('requests:failed_create'));
        }
    };

    const handleCreateBulkOvertime = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkOvertimeData.work_date) {
            toast(t('requests:select_date'));
            return;
        }
        if (bulkOvertimeData.employee_ids.length === 0) {
            toast(t('requests:select_at_least_one'));
            return;
        }
        try {
            await createBulkOvertime.mutateAsync(bulkOvertimeData);
            toast(t('requests:success_bulk_overtime'));
            setShowBulkOvertimeForm(false);
            setBulkOvertimeData({ employee_ids: [], work_date: '', hours: 1, type: 'Weekday', reason: '' });
        } catch (e: any) {
            toast(e.response?.message || t('requests:failed_create'));
        }
    };

    const handleAction = async (type: 'leave' | 'overtime', id: string, action: 'approve' | 'reject' | 'delete') => {
        if (action === 'delete' && !confirm(t('common:confirm'))) return;
        try {
            if (type === 'leave') {
                if (action === 'approve') await approveLeave.mutateAsync(id);
                if (action === 'reject') await rejectLeave.mutateAsync(id);
                if (action === 'delete') await deleteLeave.mutateAsync(id);
            } else {
                if (action === 'approve') await approveOvertime.mutateAsync(id);
                if (action === 'reject') await rejectOvertime.mutateAsync(id);
                if (action === 'delete') await deleteOvertime.mutateAsync(id);
            }
            toast(t('requests:success_action'));
        } catch {
            toast(t('requests:failed_action'));
        }
    };

    const filteredLeaves = searchQuery
        ? leaves.filter((r: any) => r.employee_id?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
        : leaves;

    const filteredOvertimes = searchQuery
        ? overtimes.filter((r: any) => r.employee_id?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
        : overtimes;

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        setPage(1);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-primary-container tracking-tight">{t('requests:title')}</h1>
                    <p className="text-sm text-outline font-medium italic">{t('requests:description')}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowOvertimeForm(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/30 rounded-lg text-xs font-bold text-primary-container hover:bg-surface shadow-sm">
                        <Clock size={14} /> {t('requests:record_overtime')}
                    </button>
                    <button onClick={() => setShowBulkOvertimeForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-container text-white rounded-lg text-xs font-bold hover:opacity-90 shadow-sm">
                        <Plus size={14} /> {t('requests:bulk_overtime')}
                    </button>
                    <button onClick={() => setShowLeaveForm(true)} className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:bg-secondary-container shadow-sm">
                        <CalendarRange size={14} /> {t('requests:new_leave')}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-outline-variant/20 pb-2">
                <button
                    onClick={() => handleTabChange('leave')}
                    className={cn(
                        'text-sm font-bold pb-2 border-b-2 transition-colors px-2',
                        activeTab === 'leave' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-primary-container'
                    )}
                >
                    {t('requests:leave_requests')}
                </button>
                <button
                    onClick={() => handleTabChange('overtime')}
                    className={cn(
                        'text-sm font-bold pb-2 border-b-2 transition-colors px-2',
                        activeTab === 'overtime' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-primary-container'
                    )}
                >
                    {t('requests:overtime_records')}
                </button>
                <button
                    onClick={() => handleTabChange('biometric')}
                    className={cn(
                        'text-sm font-bold pb-2 border-b-2 transition-colors px-2',
                        activeTab === 'biometric' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-primary-container'
                    )}
                >
                    {t('requests:biometric_registrations')}
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface/30">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={14} />
                        <input
                            type="text"
                            placeholder={t('requests:search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-9 pr-3 text-xs bg-white border border-outline-variant/20 rounded-lg focus:outline-none focus:border-secondary w-64 shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                    {activeTab === 'leave' ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-surface/50 border-b border-outline-variant/20">
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">{t('requests:employee')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">{t('requests:leave_type')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">{t('requests:duration')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">{t('common:status')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest text-right">{t('requests:actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/10 text-xs font-semibold text-primary-container">
                                {loadingLeaves ? (
                                    <tr><td colSpan={5} className="py-8 text-center"><Loader2 className="animate-spin text-secondary mx-auto" size={24} /></td></tr>
                                ) : filteredLeaves.length === 0 ? (
                                    <tr><td colSpan={5} className="py-8 text-center text-outline">{t('requests:no_leave')}</td></tr>
                                ) : (
                                    filteredLeaves.map((item: any) => (
                                        <tr key={item._id} className="hover:bg-surface/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-sm">{item.employee_id?.full_name || 'Unknown'}</div>
                                                <div className="text-[10px] text-outline font-mono">{item.employee_id?.employee_code}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold">{t(`requests:leave_types.${item.type}`) || item.type}</td>
                                            <td className="px-6 py-4">
                                                <div>{new Date(item.start_date).toLocaleDateString(dateLocale)} to {new Date(item.end_date).toLocaleDateString(dateLocale)}</div>
                                                <div className="text-[10px] text-outline font-mono">{item.total_days} days</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    'px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider',
                                                    item.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                                                    item.status === 'Rejected' ? 'bg-rose-50 text-rose-600' :
                                                    'bg-amber-50 text-amber-600'
                                                )}>
                                                    {item.status ? t(`common:${item.status.toLowerCase()}`) : t('common:pending')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {item.status === 'Pending' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => handleAction('leave', item._id, 'approve')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Approve"><CheckCircle size={16} /></button>
                                                        <button onClick={() => handleAction('leave', item._id, 'reject')} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded" title="Reject"><XCircle size={16} /></button>
                                                    </div>
                                                )}
                                                <button onClick={() => handleAction('leave', item._id, 'delete')} className="p-1.5 text-outline hover:text-rose-600 rounded ml-2" title="Delete"><MoreVertical size={16} /></button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : activeTab === 'overtime' ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-surface/50 border-b border-outline-variant/20">
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">{t('requests:employee')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">{t('requests:work_date')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">{t('requests:hours')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">{t('common:type')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">{t('common:status')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest text-right">{t('requests:actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/10 text-xs font-semibold text-primary-container">
                                {loadingOvertimes ? (
                                    <tr><td colSpan={6} className="py-8 text-center"><Loader2 className="animate-spin text-secondary mx-auto" size={24} /></td></tr>
                                ) : filteredOvertimes.length === 0 ? (
                                    <tr><td colSpan={6} className="py-8 text-center text-outline">{t('requests:no_overtime')}</td></tr>
                                ) : (
                                    filteredOvertimes.map((item: any) => (
                                        <tr key={item._id} className="hover:bg-surface/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-sm">{item.employee_id?.full_name || 'Unknown'}</div>
                                                <div className="text-[10px] text-outline font-mono">{item.employee_id?.employee_code}</div>
                                            </td>
                                            <td className="px-6 py-4 font-mono">{new Date(item.work_date).toLocaleDateString(dateLocale)}</td>
                                            <td className="px-6 py-4 font-bold">{item.hours}h</td>
                                            <td className="px-6 py-4">{t(`requests:overtime_types.${item.type}`) || item.type}</td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    'px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider',
                                                    item.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                                                    item.status === 'Rejected' ? 'bg-rose-50 text-rose-600' :
                                                    'bg-amber-50 text-amber-600'
                                                )}>
                                                    {item.status ? t(`common:${item.status.toLowerCase()}`) : t('common:pending')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {item.status === 'Pending' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => handleAction('overtime', item._id, 'approve')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Approve"><CheckCircle size={16} /></button>
                                                        <button onClick={() => handleAction('overtime', item._id, 'reject')} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded" title="Reject"><XCircle size={16} /></button>
                                                    </div>
                                                )}
                                                <button onClick={() => handleAction('overtime', item._id, 'delete')} className="p-1.5 text-outline hover:text-rose-600 rounded ml-2" title="Delete"><MoreVertical size={16} /></button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-surface/50 border-b border-outline-variant/20">
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">{t('requests:employee')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">{t('requests:device_id')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">{t('requests:requested_at')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">{t('common:status')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest text-right">{t('requests:actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/10 text-xs font-semibold text-primary-container">
                                {loadingBiometric ? (
                                    <tr><td colSpan={5} className="py-8 text-center"><Loader2 className="animate-spin text-secondary mx-auto" size={24} /></td></tr>
                                ) : biometricRequests.length === 0 ? (
                                    <tr><td colSpan={5} className="py-8 text-center text-outline">{t('requests:no_biometric')}</td></tr>
                                ) : (
                                    biometricRequests.map((item: any) => (
                                        <tr key={item._id} className="hover:bg-surface/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-sm">{item.employee_id?.full_name || 'Unknown'}</div>
                                                <div className="text-[10px] text-outline font-mono">{item.employee_id?.employee_code}</div>
                                            </td>
                                            <td className="px-6 py-4 font-mono">{item.device_id}</td>
                                            <td className="px-6 py-4">{new Date(item.requested_at).toLocaleString(dateLocale)}</td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    'px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider',
                                                    item.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                                    item.status === 'rejected' ? 'bg-rose-50 text-rose-600' :
                                                    item.status === 'completed' ? 'bg-blue-50 text-blue-600' :
                                                    'bg-amber-50 text-amber-600'
                                                )}>
                                                    {t(`common:${item.status}`) || item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {item.status === 'pending' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => updateBiometric.mutate({ id: item._id, status: 'approved' })} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Approve"><CheckCircle size={16} /></button>
                                                        <button onClick={() => updateBiometric.mutate({ id: item._id, status: 'rejected' })} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded" title="Reject"><XCircle size={16} /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {activeTab === 'leave' && leavesPagination && (
                    <Pagination 
                        page={leavesPagination.page}
                        limit={leavesPagination.limit}
                        total={leavesPagination.total}
                        totalPages={leavesPagination.total_pages}
                        onPageChange={setPage}
                    />
                )}
                {activeTab === 'overtime' && overtimesPagination && (
                    <Pagination 
                        page={overtimesPagination.page}
                        limit={overtimesPagination.limit}
                        total={overtimesPagination.total}
                        totalPages={overtimesPagination.total_pages}
                        onPageChange={setPage}
                    />
                )}
                {activeTab === 'biometric' && biometricPagination && (
                    <Pagination 
                        page={biometricPagination.page}
                        limit={biometricPagination.limit}
                        total={biometricPagination.total}
                        totalPages={biometricPagination.total_pages}
                        onPageChange={setPage}
                    />
                )}
            </div>

            {/* Modals */}
            {showLeaveForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <form onSubmit={handleCreateLeave} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-lg font-extrabold text-primary-container mb-4">{t('requests:new_leave')}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('requests:employee')} *</label>
                                <SearchableSelect
                                    options={employees.map((emp: any) => ({ value: emp._id, label: `${emp.full_name} (${emp.employee_code})` }))}
                                    value={leaveData.employee_id}
                                    onChange={val => setLeaveData({...leaveData, employee_id: val})}
                                    placeholder={t('requests:select_employee')}
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('requests:leave_type')} *</label>
                                <select required value={leaveData.type} onChange={e => setLeaveData({...leaveData, type: e.target.value})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary">
                                    <option value="Annual">{t('requests:leave_types.Annual')}</option>
                                    <option value="Sick">{t('requests:leave_types.Sick')}</option>
                                    <option value="Unpaid">{t('requests:leave_types.Unpaid')}</option>
                                    <option value="Maternity">{t('requests:leave_types.Maternity')}</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('scheduling:from_date')} *</label>
                                    <input required type="date" value={leaveData.start_date} onChange={e => setLeaveData({...leaveData, start_date: e.target.value})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('scheduling:to_date')} *</label>
                                    <input required type="date" value={leaveData.end_date} onChange={e => setLeaveData({...leaveData, end_date: e.target.value})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('common:total')} {t('common:day_s')} *</label>
                                <input required type="number" min="0.5" step="0.5" value={leaveData.total_days} onChange={e => setLeaveData({...leaveData, total_days: Number(e.target.value)})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setShowLeaveForm(false)} className="px-4 py-2 border border-outline-variant/30 text-outline hover:bg-surface rounded-lg text-xs font-bold transition-colors">{t('common:cancel')}</button>
                            <button type="submit" disabled={createLeave.isPending} className="px-4 py-2 bg-secondary text-white hover:bg-secondary-container rounded-lg text-xs font-bold flex items-center gap-2">
                                {createLeave.isPending ? <Loader2 size={14} className="animate-spin" /> : t('common:save')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showOvertimeForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <form onSubmit={handleCreateOvertime} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-lg font-extrabold text-primary-container mb-4">{t('requests:record_overtime')}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('requests:employee')} *</label>
                                <SearchableSelect
                                    options={employees.map((emp: any) => ({ value: emp._id, label: `${emp.full_name} (${emp.employee_code})` }))}
                                    value={overtimeData.employee_id}
                                    onChange={val => setOvertimeData({...overtimeData, employee_id: val})}
                                    placeholder={t('requests:select_employee')}
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('common:type')} *</label>
                                <select required value={overtimeData.type} onChange={e => setOvertimeData({...overtimeData, type: e.target.value})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary">
                                    <option value="Weekday">{t('requests:overtime_types.Weekday')}</option>
                                    <option value="Weekend">{t('requests:overtime_types.Weekend')}</option>
                                    <option value="Holiday">{t('requests:overtime_types.Holiday')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('requests:work_date')} *</label>
                                <input required type="date" value={overtimeData.work_date} onChange={e => setOvertimeData({...overtimeData, work_date: e.target.value})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('requests:hours')} *</label>
                                <input required type="number" min="0.5" step="0.5" value={overtimeData.hours} onChange={e => setOvertimeData({...overtimeData, hours: Number(e.target.value)})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setShowOvertimeForm(false)} className="px-4 py-2 border border-outline-variant/30 text-outline hover:bg-surface rounded-lg text-xs font-bold transition-colors">{t('common:cancel')}</button>
                            <button type="submit" disabled={createOvertime.isPending} className="px-4 py-2 bg-secondary text-white hover:bg-secondary-container rounded-lg text-xs font-bold flex items-center gap-2">
                                {createOvertime.isPending ? <Loader2 size={14} className="animate-spin" /> : t('common:save')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showBulkOvertimeForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <form onSubmit={handleCreateBulkOvertime} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-lg font-extrabold text-primary-container mb-4">{t('requests:bulk_overtime')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('requests:work_date')} *</label>
                                    <input required type="date" value={bulkOvertimeData.work_date} onChange={e => setBulkOvertimeData({...bulkOvertimeData, work_date: e.target.value})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('common:type')} *</label>
                                    <select required value={bulkOvertimeData.type} onChange={e => setBulkOvertimeData({...bulkOvertimeData, type: e.target.value})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary">
                                        <option value="Weekday">{t('requests:overtime_types.Weekday')}</option>
                                        <option value="Weekend">{t('requests:overtime_types.Weekend')}</option>
                                        <option value="Holiday">{t('requests:overtime_types.Holiday')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('requests:hours')} *</label>
                                    <input required type="number" min="0.5" step="0.5" value={bulkOvertimeData.hours} onChange={e => setBulkOvertimeData({...bulkOvertimeData, hours: Number(e.target.value)})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('common:reason')}</label>
                                    <textarea value={bulkOvertimeData.reason} onChange={e => setBulkOvertimeData({...bulkOvertimeData, reason: e.target.value})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" rows={3}></textarea>
                                </div>
                            </div>
                            
                            <div className="flex flex-col h-full max-h-[400px]">
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-2">{t('requests:select_employees')} ({bulkOvertimeData.employee_ids.length}) *</label>
                                <div className="flex-1 overflow-y-auto border border-outline-variant/30 rounded-lg p-3 space-y-2 bg-surface/20">
                                    {employees.map((emp: any) => (
                                        <label key={emp._id} className="flex items-center gap-3 p-2 hover:bg-white rounded-md cursor-pointer transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={bulkOvertimeData.employee_ids.includes(emp._id)}
                                                onChange={(e) => {
                                                    const ids = e.target.checked 
                                                        ? [...bulkOvertimeData.employee_ids, emp._id]
                                                        : bulkOvertimeData.employee_ids.filter(id => id !== emp._id);
                                                    setBulkOvertimeData({...bulkOvertimeData, employee_ids: ids});
                                                }}
                                                className="w-4 h-4 rounded border-outline-variant/50 text-secondary focus:ring-secondary"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-primary-container">{emp.full_name}</span>
                                                <span className="text-[10px] text-outline font-mono">{emp.employee_code}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setShowBulkOvertimeForm(false)} className="px-4 py-2 border border-outline-variant/30 text-outline hover:bg-surface rounded-lg text-xs font-bold transition-colors">{t('common:cancel')}</button>
                            <button type="submit" disabled={createBulkOvertime.isPending} className="px-4 py-2 bg-secondary text-white hover:bg-secondary-container rounded-lg text-xs font-bold flex items-center gap-2">
                                {createBulkOvertime.isPending ? <Loader2 size={14} className="animate-spin" /> : t('common:save')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
