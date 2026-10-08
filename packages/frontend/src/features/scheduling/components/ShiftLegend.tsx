import React from 'react';
import { Clock, Users, Edit2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Shift, ShiftAssignment } from '../types';

export const SHIFT_COLORS = [
    'bg-amber-50 text-amber-600 border-amber-100',
    'bg-violet-50 text-violet-600 border-violet-100',
    'bg-slate-50 text-slate-600 border-slate-100',
    'bg-emerald-50 text-emerald-600 border-emerald-100',
    'bg-rose-50 text-rose-600 border-rose-100',
];

interface ShiftLegendProps {
    shifts: Shift[];
    assignments: ShiftAssignment[];
    loadingShifts: boolean;
    loadingAssignments: boolean;
    scheduledCount: number;
    t: (key: string) => string;
    onEditShift: (shift: Shift) => void;
    onDeleteShift: (shiftId: string) => void;
    onNewShiftClick: () => void;
}

export function ShiftLegend({
    shifts,
    assignments,
    loadingShifts,
    loadingAssignments,
    scheduledCount,
    t,
    onEditShift,
    onDeleteShift,
    onNewShiftClick,
}: ShiftLegendProps) {
    return (
        <div className="w-full lg:w-72 flex-shrink-0 space-y-6">
            {/* Shifts list */}
            <div className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[10px] font-black text-outline uppercase tracking-widest">{t('scheduling:shifts_legend')}</h2>
                    <button
                        type="button"
                        onClick={onNewShiftClick}
                        className="text-xs font-bold text-secondary hover:text-secondary-container transition-colors"
                    >
                        + {t('scheduling:new_shift')}
                    </button>
                </div>

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
                        {shifts.map((shift, idx) => (
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
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onEditShift(shift);
                                            }}
                                            className="p-1 hover:text-secondary text-outline"
                                            title={t('common:edit')}
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onDeleteShift(shift._id);
                                            }}
                                            className="p-1 hover:text-rose-600 text-outline"
                                            title={t('common:delete')}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold mt-1 opacity-80">
                                    <Clock size={12} /> {shift.start_time} – {shift.end_time}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-80">
                                    <Users size={12} />
                                    {assignments.filter((a) => (typeof a.shift_id === 'object' ? a.shift_id?._id : a.shift_id) === shift._id).length} {t('scheduling:assigned')}
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
    );
}
