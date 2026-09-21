import React from 'react';
import { Loader2 } from 'lucide-react';
import { ShiftFormData } from '../types';

interface ShiftFormModalProps {
    isOpen: boolean;
    isEditing: boolean;
    isSubmitting: boolean;
    formData: ShiftFormData;
    t: (key: string) => string;
    onChange: (data: ShiftFormData) => void;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}

export function ShiftFormModal({
    isOpen,
    isEditing,
    isSubmitting,
    formData,
    t,
    onChange,
    onSubmit,
    onClose,
}: ShiftFormModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <h2 className="text-lg font-extrabold text-primary-container mb-4">
                    {isEditing ? t('scheduling:edit_shift') : t('scheduling:create_shift')}
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">
                            {t('scheduling:shift_name')} *
                        </label>
                        <input
                            required
                            value={formData.shift_name}
                            onChange={(e) => onChange({ ...formData, shift_name: e.target.value })}
                            className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
                            placeholder="Morning Shift"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">
                                {t('scheduling:start_time')} *
                            </label>
                            <input
                                required
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => onChange({ ...formData, start_time: e.target.value })}
                                className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">
                                {t('scheduling:end_time')} *
                            </label>
                            <input
                                required
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => onChange({ ...formData, end_time: e.target.value })}
                                className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">
                            {t('scheduling:std_hours')} *
                        </label>
                        <input
                            required
                            type="number"
                            step="0.5"
                            value={formData.standard_hours}
                            onChange={(e) => onChange({ ...formData, standard_hours: Number(e.target.value) })}
                            className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">
                                {t('scheduling:break_mins')}
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.break_mins}
                                onChange={(e) => onChange({ ...formData, break_mins: Number(e.target.value) })}
                                className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">
                                {t('scheduling:min_work_break')}
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.min_work_mins_for_break}
                                onChange={(e) => onChange({ ...formData, min_work_mins_for_break: Number(e.target.value) })}
                                className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-outline-variant/30 text-outline hover:bg-surface rounded-lg text-xs font-bold transition-colors"
                    >
                        {t('common:cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-secondary text-white hover:bg-secondary-container rounded-lg text-xs font-bold flex items-center gap-2"
                    >
                        {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                        {isEditing ? t('scheduling:save_changes') : t('scheduling:create_shift')}
                    </button>
                </div>
            </form>
        </div>
    );
}
