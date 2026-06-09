import React, { useState } from 'react';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    Users,
    Search,
    Filter,
    Loader2,
    AlertCircle,
    Edit2,
    Trash2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useShifts, useShiftAssignments, useCreateShift, useUpdateShift, useDeleteShift, useCreateShiftAssignment, useDeleteShiftAssignment, useBulkAssignShifts, useUpdateShiftAssignment } from '../hooks/useShifts';
import { useEmployees } from '../features/employees/hooks/useEmployees';
import { useDepartments } from '../hooks/useDepartments';
import { useTimeConfig } from '../hooks/useSettings';
import toast from '../lib/toast';
import { useTranslation } from 'react-i18next';
import SearchableSelect from '../components/ui/SearchableSelect';

// Màu cho mỗi ca
const SHIFT_COLORS = [
    'bg-amber-50 text-amber-600 border-amber-100',
    'bg-violet-50 text-violet-600 border-violet-100',
    'bg-slate-50 text-slate-600 border-slate-100',
    'bg-emerald-50 text-emerald-600 border-emerald-100',
    'bg-rose-50 text-rose-600 border-rose-100',
];

const CELL_COLORS = [
    'bg-secondary/5 border-secondary/10 text-secondary',
    'bg-primary/5 border-primary/10 text-primary',
    'bg-amber-50/50 border-amber-100 text-amber-700',
    'bg-emerald-50/50 border-emerald-100 text-emerald-700',
];

function getWeekDays(baseDate: Date) {
    const dow = baseDate.getDay();
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

export default function Scheduling() {
    const { t, i18n } = useTranslation();
    const [weekOffset, setWeekOffset] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);
    const weekDays = getWeekDays(baseDate);

    const weekStart = weekDays[0].toISOString().split('T')[0];
    const weekEnd = weekDays[6].toISOString().split('T')[0];

    const { data: shifts = [], isLoading: loadingShifts } = useShifts({ limit: 50 });
    const { data: assignments = [], isLoading: loadingAssignments } = useShiftAssignments({
        from: weekStart,
        to: weekEnd,
        limit: 100,
    });

    const createShift = useCreateShift();
    const updateShift = useUpdateShift();
    const deleteShift = useDeleteShift();
    const createAssignment = useCreateShiftAssignment();
    const updateAssignment = useUpdateShiftAssignment();
    const deleteAssignment = useDeleteShiftAssignment();

    const { data: empData } = useEmployees({ limit: 100 });
    const { data: departments = [] } = useDepartments({ limit: 100 });
    const { data: timeConfig } = useTimeConfig();
    let employees: any[] = [];
    if (Array.isArray(empData)) employees = empData;
    else if (Array.isArray(empData?.items)) employees = empData.items;
    else if (Array.isArray(empData?.data)) employees = empData.data;
    else if (Array.isArray(empData?.data?.items)) employees = empData.data.items;

    const [showShiftForm, setShowShiftForm] = useState(false);
    const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
    const [shiftFormData, setShiftFormData] = useState({ shift_name: '', start_time: '08:00', end_time: '17:00', standard_hours: 8, break_mins: 30, min_work_mins_for_break: 240 });

    const [assignModal, setAssignModal] = useState<{ shiftId: string; date: string; existing: any[] } | null>(null);
    const [assignEmpId, setAssignEmpId] = useState('');

    const bulkAssign = useBulkAssignShifts();
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedDept, setSelectedDept] = useState('');
    const [bulkData, setBulkData] = useState({
        employee_ids: [] as string[],
        shift_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        days_of_week: [1, 2, 3, 4, 5], // Mon-Fri
        create_holiday_overtime: false,
    });

    const handleDeptSelect = (deptName: string) => {
        setSelectedDept(deptName);
        if (!deptName) {
            setBulkData(prev => ({ ...prev, employee_ids: [] }));
            return;
        }
        
        const deptEmps = employees
            .filter(emp => emp.department === deptName)
            .map(emp => emp._id);
            
        setBulkData(prev => ({ ...prev, employee_ids: deptEmps }));
    };

    const handleBulkAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await bulkAssign.mutateAsync(bulkData);
            const data = res?.data || res;
            const holidayOt = data?.holiday_overtime_created || 0;
            toast(holidayOt > 0 ? `${t('common:success')} - created ${holidayOt} holiday OT records` : t('common:success'));
            setShowBulkModal(false);
        } catch (error) {
            toast(t('common:error'));
        }
    };

    const handleMoveAssignment = async (assignmentId: string, newShiftId: string) => {
        try {
            await updateAssignment.mutateAsync({ id: assignmentId, payload: { shift_id: newShiftId } });
            toast(t('common:success'));
            setAssignModal(m => m ? {...m, existing: m.existing.map(a => a._id === assignmentId ? {...a, shift_id: newShiftId} : a)} : null);
        } catch (error) {
            toast(t('common:error'));
        }
    };

    const handleSaveShift = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingShiftId) {
                await updateShift.mutateAsync({ id: editingShiftId, payload: shiftFormData });
                toast(t('common:success'));
            } else {
                await createShift.mutateAsync(shiftFormData);
                toast(t('common:success'));
            }
            setShowShiftForm(false);
            setEditingShiftId(null);
            setShiftFormData({ shift_name: '', start_time: '08:00', end_time: '17:00', standard_hours: 8, break_mins: 30, min_work_mins_for_break: 240 });
        } catch (error) {
            toast(t('common:error'));
        }
    };

    const handleEditShift = (shift: any) => {
        setEditingShiftId(shift._id);
        setShiftFormData({
            shift_name: shift.shift_name,
            start_time: shift.start_time,
            end_time: shift.end_time,
            standard_hours: shift.standard_hours,
            break_mins: shift.break_mins,
            min_work_mins_for_break: shift.min_work_mins_for_break
        });
        setShowShiftForm(true);
    };

    const handleDeleteShift = async (id: string) => {
        if (!confirm(t('common:confirm'))) return;
        try {
            await deleteShift.mutateAsync(id);
            toast(t('common:success'));
        } catch (error) {
            toast((error as any)?.message || t('common:error'));
        }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignModal || !assignEmpId) return;
        if (assignModal.existing.some((item: any) => (item.employee_id?._id || item.employee_id) === assignEmpId)) {
            toast('Nhan vien da co ca trong ngay nay');
            return;
        }
        try {
            await createAssignment.mutateAsync({
                shift_id: assignModal.shiftId,
                employee_id: assignEmpId,
                work_date: assignModal.date
            });
            toast(t('common:success'));
            setAssignEmpId('');
        } catch (error) {
            toast(t('common:error'));
        }
    };

    const handleRemoveAssignment = async (id: string) => {
        if (!confirm(t('common:confirm'))) return;
        try {
            await deleteAssignment.mutateAsync(id);
            toast(t('common:success'));
        } catch (error) {
            toast(t('common:error'));
        }
    };

    // Build schedule grid: { [shiftId]: { [dayIndex]: assignments[] } }
    const scheduleGrid: Record<string, Record<number, any[]>> = {};
    shifts.forEach((s: any) => {
        scheduleGrid[s._id] = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    });

    assignments.forEach((a: any) => {
        const shiftId = a.shift_id?._id || a.shift_id;
        const workDate = new Date(a.work_date);
        const dow = workDate.getDay();
        const dayIdx = dow === 0 ? 6 : dow - 1; // 0=Mon, 6=Sun
        if (dayIdx < 7 && scheduleGrid[shiftId]) {
            scheduleGrid[shiftId][dayIdx].push(a);
        }
    });

    // Filter shifts by search
    const filteredShifts = searchQuery
        ? shifts.filter((s: any) => (s.shift_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
        : shifts;

    // Tính stats từ assignments tuần này
    const scheduledCount = new Set(assignments.map((a: any) => a.employee_id?._id || a.employee_id)).size;

    const dateLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
    const weekLabel = `${weekDays[0].toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const assignmentsForDate = (date: Date) => {
        const key = date.toDateString();
        return assignments.filter((assignment: any) => new Date(assignment.work_date).toDateString() === key);
    };

    const holidayMap = new Map<string, string>(
        (timeConfig?.holidays || [])
            .map((holiday: any): [string, string] | null => {
                const rawDate = typeof holiday === 'string' ? holiday : holiday?.date;
                if (!rawDate) return null;

                const parsedDate = new Date(rawDate);
                if (Number.isNaN(parsedDate.getTime())) return null;

                return [
                    parsedDate.toISOString().slice(0, 10),
                    typeof holiday === 'string' ? 'Holiday' : (holiday.name || 'Holiday'),
                ];
            })
            .filter((item): item is [string, string] => Boolean(item))
    );

    const dateKey = (date: Date) => date.toISOString().slice(0, 10);
    const getDayKind = (date: Date) => {
        const holidayName = holidayMap.get(dateKey(date));
        if (holidayName) return { type: 'holiday', label: holidayName };
        if (date.getDay() === 0 || date.getDay() === 6) return { type: 'weekend', label: 'Weekend' };
        return { type: 'workday', label: '' };
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-primary-container tracking-tight">{t('scheduling:title')}</h1>
                    <p className="text-sm text-outline font-medium italic">{t('scheduling:description')}</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowBulkModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/30 rounded-lg text-xs font-bold text-primary-container hover:bg-surface shadow-sm"
                    >
                        {t('scheduling:bulk_assign')}
                    </button>
                    <button onClick={() => setShowShiftForm(true)} className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:bg-secondary-container shadow-sm">
                        <Plus size={16} />
                        {t('scheduling:add_new_shift')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Active Shifts */}
                    <div className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm">
                        <h2 className="text-[10px] font-black text-outline uppercase tracking-widest mb-4">{t('scheduling:active_shifts')}</h2>
                        {loadingShifts ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="animate-spin text-secondary" size={22} />
                            </div>
                        ) : shifts.length === 0 ? (
                            <div className="text-center py-4">
                                <AlertCircle size={24} className="text-outline-variant mx-auto mb-2 opacity-40" />
                                <p className="text-xs text-outline">{t('scheduling:no_shifts')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {shifts.map((shift: any, idx: number) => (
                                    <div
                                        key={shift._id}
                                        className={cn(
                                            'p-4 rounded-xl border flex flex-col gap-1 transition-transform cursor-pointer hover:scale-[1.02]',
                                            SHIFT_COLORS[idx % SHIFT_COLORS.length],
                                        )}
                                    >
                                        <div className="flex justify-between items-center group/shift">
                                            <span className="text-xs font-black uppercase tracking-tight">{shift.shift_name}</span>
                                            <div className="flex gap-1 opacity-0 group-hover/shift:opacity-100 transition-all">
                                                <button type="button" onClick={(event) => { event.stopPropagation(); handleEditShift(shift); }} className="p-1 hover:text-secondary text-outline" title={t('common:edit')}>
                                                    <Edit2 size={12} />
                                                </button>
                                                <button type="button" onClick={(event) => { event.stopPropagation(); handleDeleteShift(shift._id); }} className="p-1 hover:text-rose-600 text-outline" title={t('common:delete')}>
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold mt-1 opacity-80">
                                            <Clock size={12} /> {shift.start_time} – {shift.end_time}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-80">
                                            <Users size={12} />
                                            {assignments.filter((a: any) => (a.shift_id?._id || a.shift_id) === shift._id).length} {t('scheduling:assigned')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Week Stats */}
                    <div className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm">
                        <h2 className="text-[10px] font-black text-outline uppercase tracking-widest mb-4">{t('scheduling:week_stats')}</h2>
                        {loadingAssignments ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="animate-spin text-secondary" size={18} />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-primary-container">{t('scheduling:total_assignments')}</span>
                                    <span className="text-xs font-black text-primary-fixed">{assignments.length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-primary-container">{t('scheduling:employees_scheduled')}</span>
                                    <span className="text-xs font-black text-emerald-600">{scheduledCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-primary-container">{t('scheduling:shifts_available')}</span>
                                    <span className="text-xs font-black text-secondary">{shifts.length}</span>
                                </div>
                                {assignments.length > 0 && (
                                    <div className="h-2 bg-surface rounded-full overflow-hidden mt-2 border border-outline-variant/10 shadow-inner">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all"
                                            style={{ width: `${Math.min(100, (scheduledCount / Math.max(1, assignments.length)) * 100)}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="lg:col-span-3 bg-white border border-outline-variant/30 rounded-xl shadow-sm flex flex-col overflow-hidden">
                    {/* Calendar Toolbar */}
                    <div className="p-4 border-b border-outline-variant/10 bg-surface/30 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex bg-white border border-outline-variant/20 rounded-lg shadow-sm">
                                <button
                                    onClick={() => setWeekOffset((w) => w - 1)}
                                    className="p-2 border-r border-outline-variant/10 hover:bg-surface text-outline transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <div className="px-4 py-2 text-xs font-black text-primary-container uppercase tracking-widest whitespace-nowrap">
                                    {weekLabel}
                                </div>
                                <button
                                    onClick={() => setWeekOffset((w) => w + 1)}
                                    className="p-2 border-l border-outline-variant/10 hover:bg-surface text-outline transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                            <button
                                onClick={() => setWeekOffset(0)}
                                className="h-9 px-4 bg-white border border-outline-variant/20 rounded-lg text-xs font-black text-primary-container shadow-sm hover:bg-surface transition-all flex items-center gap-2"
                            >
                                <Calendar size={14} />
                                {t('scheduling:today')}
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={14} />
                                <input
                                    type="text"
                                    placeholder={t('scheduling:filter_shift')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9 pl-9 pr-3 text-xs bg-white border border-outline-variant/20 rounded-lg focus:outline-none focus:border-secondary w-40 shadow-sm"
                                />
                            </div>
                            <button className="h-9 w-9 bg-white border border-outline-variant/20 rounded-lg flex items-center justify-center text-outline hover:text-secondary shadow-sm transition-all">
                                <Filter size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="flex-1 overflow-x-auto min-h-[400px]">
                        {loadingShifts || loadingAssignments ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="animate-spin text-secondary" size={32} />
                            </div>
                        ) : filteredShifts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <AlertCircle size={32} className="text-outline-variant opacity-30" />
                                <p className="text-outline text-sm">{t('scheduling:no_shifts_display')}</p>
                            </div>
                        ) : (
                            <table className="w-full h-full table-fixed">
                                <thead>
                                    <tr className="bg-surface/50 border-b border-outline-variant/20">
                                        <th className="w-32 px-4 py-4 text-[10px] font-black text-outline uppercase tracking-widest text-left border-r border-outline-variant/10">{t('scheduling:shift')}</th>
                                        {weekDays.map((d, i) => {
                                            const isToday = d.toDateString() === new Date().toDateString();
                                            const dayKind = getDayKind(d);
                                            return (
                                                <th
                                                    key={i}
                                                    className={cn(
                                                        'px-3 py-3 text-[10px] font-black uppercase tracking-widest text-center',
                                                        isToday ? 'text-secondary' : 'text-primary-container',
                                                        dayKind.type === 'weekend' && 'bg-slate-100 text-slate-600',
                                                        dayKind.type === 'holiday' && 'bg-rose-50 text-rose-700',
                                                    )}
                                                >
                                                    <span className="block">{d.toLocaleDateString(dateLocale, { weekday: 'short' })}</span>
                                                    <span className={cn(
                                                        'inline-block mt-1 px-1.5 py-0.5 rounded text-[9px]',
                                                        isToday ? 'bg-secondary text-white' : '',
                                                    )}>
                                                        {d.getDate()}
                                                    </span>
                                                    {dayKind.type !== 'workday' && (
                                                        <span className={cn(
                                                            'mt-1 mx-auto block max-w-[86px] truncate rounded border px-1.5 py-0.5 text-[8px] font-black normal-case tracking-normal',
                                                            dayKind.type === 'holiday'
                                                                ? 'border-rose-200 bg-white text-rose-700'
                                                                : 'border-slate-200 bg-white text-slate-600'
                                                        )}>
                                                            {dayKind.label}
                                                        </span>
                                                    )}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/10">
                                    {filteredShifts.map((shift: any, shiftIdx: number) => (
                                        <tr key={shift._id} className="group">
                                            <td className="px-4 py-4 border-r border-outline-variant/10 bg-surface/10 align-top">
                                                <p className="text-[11px] font-black text-primary-container">{shift.shift_name}</p>
                                                <p className="text-[10px] text-outline font-mono mt-0.5">{shift.start_time}–{shift.end_time}</p>
                                                <p className="text-[10px] text-outline italic mt-0.5">{shift.standard_hours}h {t('scheduling:std_hours')}</p>
                                            </td>
                                            {weekDays.map((day, dayIdx) => {
                                                const dayAssignments = scheduleGrid[shift._id]?.[dayIdx] || [];
                                                const dayKind = getDayKind(day);
                                                return (
                                                    <td
                                                        key={dayIdx}
                                                        className={cn(
                                                            'p-2 border-r border-outline-variant/10 last:border-r-0 align-top group-hover:bg-surface/20 transition-colors',
                                                            dayKind.type === 'weekend' && 'bg-slate-50/70',
                                                            dayKind.type === 'holiday' && 'bg-rose-50/60'
                                                        )}
                                                    >
                                                        <div 
                                                            onClick={() => setAssignModal({ shiftId: shift._id, date: weekDays[dayIdx].toISOString().split('T')[0], existing: assignmentsForDate(weekDays[dayIdx]) })}
                                                            className={cn(
                                                                'p-3 rounded-xl border flex flex-col min-h-[80px] transition-all hover:shadow-md cursor-pointer relative group/cell',
                                                                dayAssignments.length > 0 ? CELL_COLORS[shiftIdx % CELL_COLORS.length] : 'border-dashed border-outline-variant/20 hover:border-secondary/30 bg-transparent',
                                                                dayKind.type === 'weekend' && dayAssignments.length === 0 && 'border-slate-200 bg-white/60',
                                                                dayKind.type === 'holiday' && dayAssignments.length === 0 && 'border-rose-200 bg-white/70'
                                                            )}
                                                        >
                                                            {dayKind.type !== 'workday' && (
                                                                <span className={cn(
                                                                    'absolute right-2 top-2 rounded px-1.5 py-0.5 text-[8px] font-black uppercase',
                                                                    dayKind.type === 'holiday' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                                                                )}>
                                                                    {dayKind.type === 'holiday' ? 'Holiday' : 'Weekend'}
                                                                </span>
                                                            )}
                                                            {dayAssignments.length > 0 ? (
                                                                <>
                                                                    <span className="text-[10px] font-black uppercase tracking-widest mb-2">
                                                                        {dayAssignments.length} {t('scheduling:assigned')}
                                                                    </span>
                                                                <div className="flex -space-x-2 mt-auto flex-wrap gap-y-1">
                                                                    {dayAssignments.slice(0, 3).map((a: any, i: number) => {
                                                                        const name = a.employee_id?.full_name || '?';
                                                                        const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                                                                        return (
                                                                            <div
                                                                                key={i}
                                                                                className="w-6 h-6 rounded-full border-2 border-white bg-white flex items-center justify-center text-[8px] font-bold shadow-sm text-primary-container"
                                                                                title={name}
                                                                            >
                                                                                {initials}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {dayAssignments.length > 3 && (
                                                                        <div className="w-6 h-6 rounded-full border-2 border-white bg-primary-container text-white flex items-center justify-center text-[8px] font-bold shadow-sm">
                                                                            +{dayAssignments.length - 3}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex flex-1 items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                                                    <Plus size={14} className="text-outline-variant" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showShiftForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <form onSubmit={handleSaveShift} className="bg-white rounded-2xl shadow-2xl w-full max-md p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-lg font-extrabold text-primary-container mb-4">{editingShiftId ? t('scheduling:edit_shift') : t('scheduling:create_shift')}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('scheduling:shift_name')} *</label>
                                <input required value={shiftFormData.shift_name} onChange={(e) => setShiftFormData({...shiftFormData, shift_name: e.target.value})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" placeholder="Morning Shift" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('scheduling:start_time')} *</label>
                                    <input required type="time" value={shiftFormData.start_time} onChange={(e) => setShiftFormData({...shiftFormData, start_time: e.target.value})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('scheduling:end_time')} *</label>
                                    <input required type="time" value={shiftFormData.end_time} onChange={(e) => setShiftFormData({...shiftFormData, end_time: e.target.value})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('scheduling:std_hours')} *</label>
                                <input required type="number" step="0.5" value={shiftFormData.standard_hours} onChange={(e) => setShiftFormData({...shiftFormData, standard_hours: Number(e.target.value)})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('scheduling:break_mins')}</label>
                                    <input type="number" min="0" value={shiftFormData.break_mins} onChange={(e) => setShiftFormData({...shiftFormData, break_mins: Number(e.target.value)})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('scheduling:min_work_break')}</label>
                                    <input type="number" min="0" value={shiftFormData.min_work_mins_for_break} onChange={(e) => setShiftFormData({...shiftFormData, min_work_mins_for_break: Number(e.target.value)})} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => { setShowShiftForm(false); setEditingShiftId(null); }} className="px-4 py-2 border border-outline-variant/30 text-outline hover:bg-surface rounded-lg text-xs font-bold transition-colors">{t('common:cancel')}</button>
                            <button type="submit" disabled={createShift.isPending || updateShift.isPending} className="px-4 py-2 bg-secondary text-white hover:bg-secondary-container rounded-lg text-xs font-bold flex items-center gap-2">
                                {(createShift.isPending || updateShift.isPending) && <Loader2 size={14} className="animate-spin" />}
                                {editingShiftId ? t('scheduling:save_changes') : t('scheduling:create_shift')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {assignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-extrabold text-primary-container">{t('scheduling:manage_assignments')}</h2>
                            <p className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-1 rounded-md">{new Date(assignModal.date).toLocaleDateString(dateLocale, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                        </div>
                        
                        <div className="mb-6">
                            <h3 className="text-[10px] font-black text-outline uppercase tracking-widest mb-2">{t('scheduling:current_assignments')}</h3>
                            {assignModal.existing.length === 0 ? (
                                <p className="text-xs text-outline italic">{t('scheduling:no_emp_assigned')}</p>
                            ) : (
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {assignModal.existing.map((a: any) => (
                                        <div key={a._id} className="flex justify-between items-center p-2 bg-surface/50 rounded-lg border border-outline-variant/20">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-primary-container">{a.employee_id?.full_name || 'Unknown'}</span>
                                                <select 
                                                    value={a.shift_id?._id || a.shift_id}
                                                    onChange={(e) => handleMoveAssignment(a._id, e.target.value)}
                                                    className="text-[10px] bg-transparent border-none text-secondary font-bold focus:ring-0 p-0"
                                                >
                                                    {shifts.map((s: any) => (
                                                        <option key={s._id} value={s._id}>{s.shift_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button onClick={() => { handleRemoveAssignment(a._id); setAssignModal(m => m ? {...m, existing: m.existing.filter(x => x._id !== a._id)} : null); }} className="text-rose-500 hover:text-rose-700 p-1">
                                                <AlertCircle size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleAssign} className="border-t border-outline-variant/10 pt-4">
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-2">{t('scheduling:assign_employee')}</label>
                            <div className="flex gap-2">
                                <SearchableSelect
                                    options={employees
                                        .filter((emp: any) => !assignModal.existing.some((item: any) => (item.employee_id?._id || item.employee_id) === emp._id))
                                        .map((emp: any) => ({ 
                                            value: emp._id, 
                                            label: `${emp.full_name} (${emp.employee_code})` 
                                        }))}
                                    value={assignEmpId}
                                    onChange={setAssignEmpId}
                                    placeholder={t('scheduling:select_employee')}
                                    className="flex-1"
                                />
                                <button type="submit" disabled={!assignEmpId || createAssignment.isPending} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center">
                                    {createAssignment.isPending ? <Loader2 size={16} className="animate-spin" /> : t('scheduling:assign_employee')}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 flex justify-end">
                            <button type="button" onClick={() => setAssignModal(null)} className="px-6 py-2 bg-surface text-primary-container border border-outline-variant/20 hover:bg-surface/80 rounded-lg text-xs font-bold">{t('scheduling:done')}</button>
                        </div>
                    </div>
                </div>
            )}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <form onSubmit={handleBulkAssign} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-lg font-extrabold text-primary-container mb-4">{t('scheduling:bulk_title')}</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('scheduling:select_dept_auto')}</label>
                                    <select 
                                        value={selectedDept} 
                                        onChange={(e) => handleDeptSelect(e.target.value)}
                                        className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary shadow-sm mb-3 bg-surface/10"
                                    >
                                        <option value="">{t('scheduling:all_depts_manual')}</option>
                                        {departments.map((d: any) => (
                                            <option key={d._id} value={d.department_name}>{d.department_name}</option>
                                        ))}
                                    </select>
                                    
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[11px] font-bold text-outline uppercase tracking-wider block">{t('common:employees')} *</label>
                                        <div className="flex gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => setBulkData({...bulkData, employee_ids: employees.map(e => e._id)})}
                                                className="text-[9px] font-bold text-secondary hover:underline"
                                            >
                                                {t('scheduling:select_all')}
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setBulkData({...bulkData, employee_ids: []})}
                                                className="text-[9px] font-bold text-outline hover:underline"
                                            >
                                                {t('scheduling:clear')}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="border border-outline-variant/30 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1 bg-surface/20">
                                        {employees.map((emp: any) => (
                                            <label key={emp._id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    checked={bulkData.employee_ids.includes(emp._id)}
                                                    onChange={(e) => {
                                                        const ids = e.target.checked 
                                                            ? [...bulkData.employee_ids, emp._id]
                                                            : bulkData.employee_ids.filter(id => id !== emp._id);
                                                        setBulkData({...bulkData, employee_ids: ids});
                                                    }}
                                                    className="rounded border-outline-variant/30 text-secondary focus:ring-secondary"
                                                />
                                                <span className="text-xs font-medium text-primary-container">{emp.full_name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-outline mt-1">{bulkData.employee_ids.length} {t('scheduling:selected')}</p>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('scheduling:target_shift')}</label>
                                    <select 
                                        required 
                                        value={bulkData.shift_id} 
                                        onChange={(e) => setBulkData({...bulkData, shift_id: e.target.value})}
                                        className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary shadow-sm"
                                    >
                                        <option value="">{t('scheduling:select_employee')}</option>
                                        {shifts.map((s: any) => (
                                            <option key={s._id} value={s._id}>{s.shift_name} ({s.start_time}-{s.end_time})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('scheduling:from_date')} *</label>
                                        <input 
                                            required 
                                            type="date" 
                                            value={bulkData.start_date} 
                                            onChange={(e) => setBulkData({...bulkData, start_date: e.target.value})}
                                            className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('scheduling:to_date')} *</label>
                                        <input 
                                            required 
                                            type="date" 
                                            value={bulkData.end_date} 
                                            onChange={(e) => setBulkData({...bulkData, end_date: e.target.value})}
                                            className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('scheduling:days_of_week')}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => {
                                                    const days = bulkData.days_of_week.includes(i)
                                                        ? bulkData.days_of_week.filter(d => d !== i)
                                                        : [...bulkData.days_of_week, i];
                                                    setBulkData({...bulkData, days_of_week: days});
                                                }}
                                                className={cn(
                                                    'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border',
                                                    bulkData.days_of_week.includes(i)
                                                        ? 'bg-secondary text-white border-secondary shadow-sm'
                                                        : 'bg-surface text-outline border-outline-variant/20 hover:border-outline-variant/50'
                                                )}
                                            >
                                                {i18n.language === 'vi' ? (['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][i]) : day}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg">
                                    <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                                        <AlertCircle size={12} className="inline mr-1 -mt-0.5" />
                                        {t('scheduling:bulk_skip_notice')} Holiday dates configured in Settings are skipped automatically.
                                    </p>
                                </div>

                                <label className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={bulkData.create_holiday_overtime}
                                        onChange={(e) => setBulkData({ ...bulkData, create_holiday_overtime: e.target.checked })}
                                        className="mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>
                                        <span className="block text-[11px] font-black uppercase tracking-wider text-emerald-700">Create Holiday OT</span>
                                        <span className="block text-[10px] text-emerald-700 leading-relaxed">
                                            For skipped holidays, create approved Holiday overtime records using the target shift's standard hours.
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 border-t border-outline-variant/10 pt-6">
                            <button type="button" onClick={() => setShowBulkModal(false)} className="px-6 py-2 border border-outline-variant/30 text-outline hover:bg-surface rounded-lg text-xs font-bold transition-all">{t('common:cancel')}</button>
                            <button 
                                type="submit" 
                                disabled={bulkAssign.isPending || bulkData.employee_ids.length === 0 || !bulkData.shift_id} 
                                className="px-8 py-2 bg-secondary text-white hover:bg-secondary-container rounded-lg text-xs font-black shadow-lg shadow-secondary/20 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                            >
                                {bulkAssign.isPending && <Loader2 size={14} className="animate-spin" />}
                                {t('scheduling:apply_schedule')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
