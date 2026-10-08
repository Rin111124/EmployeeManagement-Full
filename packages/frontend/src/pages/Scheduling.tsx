import React, { useMemo } from 'react';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Plus,
    Users,
    Search,
    Filter,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useScheduling } from '../features/scheduling/hooks/useScheduling';
import { ShiftLegend, SHIFT_COLORS } from '../features/scheduling/components/ShiftLegend';
import { ShiftFormModal } from '../features/scheduling/components/ShiftFormModal';
import { AssignModal } from '../features/scheduling/components/AssignModal';
import { BulkAssignModal } from '../features/scheduling/components/BulkAssignModal';
import { Shift } from '../features/scheduling/types';

export default function Scheduling() {
    const {
        t,
        i18n,
        weekOffset,
        setWeekOffset,
        searchQuery,
        setSearchQuery,
        weekDays,
        shifts,
        assignments,
        employees,
        departments,
        timeConfig,
        loadingShifts,
        loadingAssignments,
        createShift,
        updateShift,
        createAssignment,
        bulkAssign,
        showShiftForm,
        setShowShiftForm,
        editingShiftId,
        setEditingShiftId,
        shiftFormData,
        setShiftFormData,
        assignModal,
        setAssignModal,
        assignEmpId,
        setAssignEmpId,
        showBulkModal,
        setShowBulkModal,
        selectedDept,
        bulkData,
        setBulkData,
        handleSaveShift,
        handleEditShift,
        handleDeleteShift,
        handleAssign,
        handleRemoveAssignment,
        handleMoveAssignment,
        handleDeptSelect,
        handleBulkAssign,
        scheduledCount,
    } = useScheduling();

    const dateLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
    const weekLabel = `${weekDays[0].toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const holidayMap = useMemo(() => {
        return new Map<string, string>(
            (timeConfig?.holidays || [])
                .map((holiday: any): [string, string] | null => {
                    const rawDate = typeof holiday === 'string' ? holiday : holiday?.date;
                    if (!rawDate) return null;
                    const dateStr = new Date(rawDate).toISOString().split('T')[0];
                    return [dateStr, holiday?.name || 'Holiday'];
                })
                .filter((entry: [string, string] | null): entry is [string, string] => entry !== null)
        );
    }, [timeConfig?.holidays]);

    const getDayKind = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        const holidayName = holidayMap.get(dateStr);
        if (holidayName) {
            return { type: 'holiday' as const, label: holidayName };
        }
        const dow = date.getDay();
        const weekendDays = timeConfig?.work_week?.weekend_days || [0, 6];
        if (weekendDays.includes(dow)) {
            return { type: 'weekend' as const, label: t('scheduling:weekend') };
        }
        return { type: 'workday' as const, label: t('scheduling:workday') };
    };

    // Filter shifts by search
    const filteredShifts = searchQuery
        ? shifts.filter((s: Shift) => (s.shift_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
        : shifts;

    // Build schedule grid: { [shiftId]: { [dayIndex]: assignments[] } }
    const scheduleGrid = useMemo(() => {
        const grid: Record<string, Record<number, any[]>> = {};
        shifts.forEach((s: Shift) => {
            grid[s._id] = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        });

        assignments.forEach((a: any) => {
            const shiftId = typeof a.shift_id === 'object' ? a.shift_id?._id : a.shift_id;
            const workDate = new Date(a.work_date);
            const dow = workDate.getDay();
            const dayIdx = dow === 0 ? 6 : dow - 1; // 0=Mon, 6=Sun
            if (dayIdx < 7 && grid[shiftId]) {
                grid[shiftId][dayIdx].push(a);
            }
        });
        return grid;
    }, [shifts, assignments]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-primary-container tracking-tight">{t('scheduling:title')}</h1>
                    <p className="text-xs text-outline font-bold mt-1 uppercase tracking-wider">{t('scheduling:subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="px-4 py-2 bg-surface text-primary-container border border-outline-variant/30 hover:bg-surface/80 rounded-xl text-xs font-black shadow-sm flex items-center gap-2 transition-all"
                    >
                        <Users size={14} className="text-secondary" />
                        {t('scheduling:bulk_assign')}
                    </button>
                    <button
                        onClick={() => {
                            setEditingShiftId(null);
                            setShiftFormData({ shift_name: '', start_time: '08:00', end_time: '17:00', standard_hours: 8, break_mins: 30, min_work_mins_for_break: 240 });
                            setShowShiftForm(true);
                        }}
                        className="px-4 py-2 bg-secondary text-white hover:bg-secondary-container rounded-xl text-xs font-black shadow-lg shadow-secondary/20 flex items-center gap-2 transition-all"
                    >
                        <Plus size={14} />
                        {t('scheduling:new_shift')}
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Sidebar: ShiftLegend */}
                <ShiftLegend
                    shifts={shifts}
                    assignments={assignments}
                    loadingShifts={loadingShifts}
                    loadingAssignments={loadingAssignments}
                    scheduledCount={scheduledCount}
                    t={t}
                    onEditShift={handleEditShift}
                    onDeleteShift={handleDeleteShift}
                    onNewShiftClick={() => {
                        setEditingShiftId(null);
                        setShiftFormData({ shift_name: '', start_time: '08:00', end_time: '17:00', standard_hours: 8, break_mins: 30, min_work_mins_for_break: 240 });
                        setShowShiftForm(true);
                    }}
                />

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

                    {/* Grid Table */}
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
                                        <th className="w-32 px-4 py-4 text-[10px] font-black text-outline uppercase tracking-widest text-left border-r border-outline-variant/10">
                                            {t('scheduling:shift')}
                                        </th>
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
                                                            'mt-1 block rounded px-1 py-0.5 text-[8px] font-black uppercase tracking-normal',
                                                            dayKind.type === 'holiday' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700',
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
                                    {filteredShifts.map((shift, sIdx) => (
                                        <tr key={shift._id} className="hover:bg-surface/10 transition-colors">
                                            <td className="p-4 border-r border-outline-variant/10 align-top">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn('w-2 h-2 rounded-full', SHIFT_COLORS[sIdx % SHIFT_COLORS.length].split(' ')[0])} />
                                                    <span className="text-xs font-black text-primary-container truncate">{shift.shift_name}</span>
                                                </div>
                                                <span className="text-[10px] text-outline font-bold mt-1 block">
                                                    {shift.start_time} - {shift.end_time}
                                                </span>
                                            </td>
                                            {weekDays.map((d, dIdx) => {
                                                const dateStr = d.toISOString().split('T')[0];
                                                const dayAssignments = scheduleGrid[shift._id]?.[dIdx] || [];
                                                const dayKind = getDayKind(d);

                                                return (
                                                    <td
                                                        key={dIdx}
                                                        onClick={() => setAssignModal({ shiftId: shift._id, date: dateStr, existing: dayAssignments })}
                                                        className={cn(
                                                            'p-2 border-r border-outline-variant/10 align-top cursor-pointer group/cell relative transition-colors',
                                                            dayKind.type === 'weekend' && 'bg-slate-50/50',
                                                            dayKind.type === 'holiday' && 'bg-rose-50/40',
                                                        )}
                                                    >
                                                        <div
                                                            className={cn(
                                                                'h-full min-h-[72px] rounded-lg p-2 flex flex-col justify-between border border-dashed border-outline-variant/30 group-hover/cell:border-secondary transition-all',
                                                                dayAssignments.length > 0 && 'border-solid border-secondary/20 bg-secondary/5',
                                                                dayKind.type === 'holiday' && dayAssignments.length === 0 && 'border-rose-200 bg-white/70',
                                                            )}
                                                        >
                                                            {dayKind.type !== 'workday' && (
                                                                <span className={cn(
                                                                    'absolute right-2 top-2 rounded px-1.5 py-0.5 text-[8px] font-black uppercase',
                                                                    dayKind.type === 'holiday' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600',
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

            {/* Extracted Modals */}
            <ShiftFormModal
                isOpen={showShiftForm}
                isEditing={Boolean(editingShiftId)}
                isSubmitting={createShift.isPending || updateShift.isPending}
                formData={shiftFormData}
                t={t}
                onChange={setShiftFormData}
                onSubmit={handleSaveShift}
                onClose={() => {
                    setShowShiftForm(false);
                    setEditingShiftId(null);
                }}
            />

            <AssignModal
                assignModal={assignModal}
                shifts={shifts}
                employees={employees}
                assignEmpId={assignEmpId}
                isCreating={createAssignment.isPending}
                dateLocale={dateLocale}
                t={t}
                onAssignEmpIdChange={setAssignEmpId}
                onMoveAssignment={handleMoveAssignment}
                onRemoveAssignment={(id) => {
                    handleRemoveAssignment(id);
                    setAssignModal((m) => (m ? { ...m, existing: m.existing.filter((x) => x._id !== id) } : null));
                }}
                onAssignSubmit={handleAssign}
                onClose={() => setAssignModal(null)}
            />

            <BulkAssignModal
                isOpen={showBulkModal}
                isSubmitting={bulkAssign.isPending}
                selectedDept={selectedDept}
                departments={departments}
                employees={employees}
                shifts={shifts}
                bulkData={bulkData}
                t={t}
                lang={i18n.language}
                onDeptSelect={handleDeptSelect}
                onBulkDataChange={setBulkData}
                onSubmit={handleBulkAssign}
                onClose={() => setShowBulkModal(false)}
            />
        </div>
    );
}
