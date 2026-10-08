import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Shift, BulkAssignData } from '../types';

interface BulkAssignModalProps {
    isOpen: boolean;
    isSubmitting: boolean;
    selectedDept: string;
    departments: any[];
    employees: any[];
    shifts: Shift[];
    bulkData: BulkAssignData;
    t: (key: string) => string;
    lang: string;
    onDeptSelect: (dept: string) => void;
    onBulkDataChange: (data: BulkAssignData) => void;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}

export function BulkAssignModal({
    isOpen,
    isSubmitting,
    selectedDept,
    departments,
    employees,
    shifts,
    bulkData,
    t,
    lang,
    onDeptSelect,
    onBulkDataChange,
    onSubmit,
    onClose,
}: BulkAssignModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-in zoom-in-95 duration-200">
                <h2 className="text-lg font-extrabold text-primary-container mb-4">{t('scheduling:bulk_title')}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">
                                {t('scheduling:select_dept_auto')}
                            </label>
                            <select
                                value={selectedDept}
                                onChange={(e) => onDeptSelect(e.target.value)}
                                className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary shadow-sm mb-3 bg-surface/10"
                            >
                                <option value="">{t('scheduling:all_depts_manual')}</option>
                                {departments.map((d: any) => (
                                    <option key={d._id} value={d.department_name}>{d.department_name}</option>
                                ))}
                            </select>

                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block">
                                    {t('common:employees')} *
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onBulkDataChange({ ...bulkData, employee_ids: employees.map((e: any) => e._id) })}
                                        className="text-[9px] font-bold text-secondary hover:underline"
                                    >
                                        {t('scheduling:select_all')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onBulkDataChange({ ...bulkData, employee_ids: [] })}
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
                                                    : bulkData.employee_ids.filter((id) => id !== emp._id);
                                                onBulkDataChange({ ...bulkData, employee_ids: ids });
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
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">
                                {t('scheduling:target_shift')}
                            </label>
                            <select
                                required
                                value={bulkData.shift_id}
                                onChange={(e) => onBulkDataChange({ ...bulkData, shift_id: e.target.value })}
                                className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary shadow-sm"
                            >
                                <option value="">{t('scheduling:select_employee')}</option>
                                {shifts.map((s) => (
                                    <option key={s._id} value={s._id}>{s.shift_name} ({s.start_time}-{s.end_time})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">
                                    {t('scheduling:from_date')} *
                                </label>
                                <input
                                    required
                                    type="date"
                                    value={bulkData.start_date}
                                    onChange={(e) => onBulkDataChange({ ...bulkData, start_date: e.target.value })}
                                    className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">
                                    {t('scheduling:to_date')} *
                                </label>
                                <input
                                    required
                                    type="date"
                                    value={bulkData.end_date}
                                    onChange={(e) => onBulkDataChange({ ...bulkData, end_date: e.target.value })}
                                    className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary shadow-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">
                                {t('scheduling:days_of_week')}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                            const days = bulkData.days_of_week.includes(i)
                                                ? bulkData.days_of_week.filter((d) => d !== i)
                                                : [...bulkData.days_of_week, i];
                                            onBulkDataChange({ ...bulkData, days_of_week: days });
                                        }}
                                        className={cn(
                                            'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border',
                                            bulkData.days_of_week.includes(i)
                                                ? 'bg-secondary text-white border-secondary shadow-sm'
                                                : 'bg-surface text-outline border-outline-variant/20 hover:border-outline-variant/50',
                                        )}
                                    >
                                        {lang === 'vi' ? (['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][i]) : day}
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
                                onChange={(e) => onBulkDataChange({ ...bulkData, create_holiday_overtime: e.target.checked })}
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
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 border border-outline-variant/30 text-outline hover:bg-surface rounded-lg text-xs font-bold transition-all"
                    >
                        {t('common:cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || bulkData.employee_ids.length === 0 || !bulkData.shift_id}
                        className="px-8 py-2 bg-secondary text-white hover:bg-secondary-container rounded-lg text-xs font-black shadow-lg shadow-secondary/20 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                    >
                        {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                        {t('scheduling:apply_schedule')}
                    </button>
                </div>
            </form>
        </div>
    );
}
