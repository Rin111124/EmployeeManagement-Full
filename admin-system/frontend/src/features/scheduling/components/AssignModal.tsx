import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import SearchableSelect from '../../../components/ui/SearchableSelect';
import { Shift, ShiftAssignment } from '../types';

interface AssignModalProps {
    assignModal: { shiftId: string; date: string; existing: ShiftAssignment[] } | null;
    shifts: Shift[];
    employees: any[];
    assignEmpId: string;
    isCreating: boolean;
    dateLocale: string;
    t: (key: string) => string;
    onAssignEmpIdChange: (val: string) => void;
    onMoveAssignment: (assignmentId: string, targetShiftId: string) => void;
    onRemoveAssignment: (assignmentId: string) => void;
    onAssignSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}

export function AssignModal({
    assignModal,
    shifts,
    employees,
    assignEmpId,
    isCreating,
    dateLocale,
    t,
    onAssignEmpIdChange,
    onMoveAssignment,
    onRemoveAssignment,
    onAssignSubmit,
    onClose,
}: AssignModalProps) {
    if (!assignModal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-extrabold text-primary-container">{t('scheduling:manage_assignments')}</h2>
                    <p className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-1 rounded-md">
                        {new Date(assignModal.date).toLocaleDateString(dateLocale, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                </div>

                <div className="mb-6">
                    <h3 className="text-[10px] font-black text-outline uppercase tracking-widest mb-2">
                        {t('scheduling:current_assignments')}
                    </h3>
                    {assignModal.existing.length === 0 ? (
                        <p className="text-xs text-outline italic">{t('scheduling:no_emp_assigned')}</p>
                    ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {assignModal.existing.map((a: any) => (
                                <div key={a._id} className="flex justify-between items-center p-2 bg-surface/50 rounded-lg border border-outline-variant/20">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-primary-container">
                                            {a.employee_id?.full_name || 'Unknown'}
                                        </span>
                                        <select
                                            value={typeof a.shift_id === 'object' ? a.shift_id?._id : a.shift_id}
                                            onChange={(e) => onMoveAssignment(a._id, e.target.value)}
                                            className="text-[10px] bg-transparent border-none text-secondary font-bold focus:ring-0 p-0"
                                        >
                                            {shifts.map((s) => (
                                                <option key={s._id} value={s._id}>{s.shift_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveAssignment(a._id)}
                                        className="text-rose-500 hover:text-rose-700 p-1"
                                    >
                                        <AlertCircle size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <form onSubmit={onAssignSubmit} className="border-t border-outline-variant/10 pt-4">
                    <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-2">
                        {t('scheduling:assign_employee')}
                    </label>
                    <div className="flex gap-2">
                        <SearchableSelect
                            options={employees
                                .filter((emp: any) => !assignModal.existing.some((item: any) => (item.employee_id?._id || item.employee_id) === emp._id))
                                .map((emp: any) => ({
                                    value: emp._id,
                                    label: `${emp.full_name} (${emp.employee_code})`,
                                }))}
                            value={assignEmpId}
                            onChange={onAssignEmpIdChange}
                            placeholder={t('scheduling:select_employee')}
                            className="flex-1"
                        />
                        <button
                            type="submit"
                            disabled={!assignEmpId || isCreating}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center"
                        >
                            {isCreating ? <Loader2 size={16} className="animate-spin" /> : t('scheduling:assign_employee')}
                        </button>
                    </div>
                </form>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 bg-surface text-primary-container border border-outline-variant/20 hover:bg-surface/80 rounded-lg text-xs font-bold"
                    >
                        {t('scheduling:done')}
                    </button>
                </div>
            </div>
        </div>
    );
}
