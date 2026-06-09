import React, { useState, useEffect } from 'react';
import { useTimeConfig, useUpdateTimeConfig } from '../hooks/useSettings';
import { useDeleteShift, useShifts, useUpdateShift } from '../hooks/useShifts';
import { Loader2, Save, Clock, Moon, CalendarRange, Globe, Plus, Trash2, Download } from 'lucide-react';
import toast from '../lib/toast';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { API_BASE } from '../lib/api';

export default function Settings() {
    const { t, i18n } = useTranslation();
    const { data: config, isLoading: isLoadingConfig } = useTimeConfig();
    const { data: shifts = [], isLoading: isLoadingShifts } = useShifts();
    
    const updateConfig = useUpdateTimeConfig();
    const updateShift = useUpdateShift();
    const deleteShift = useDeleteShift();

    const [formData, setFormData] = useState({
        standardHoursPerDay: 8,
        dayBreakMins: 30,
        nightBreakMins: 45,
        minWorkMinsForBreak: 240,
        nightStartHour: 22,
        nightEndHour: 6,
        holidays: [] as Array<{ date: string; name: string }>,
    });

    const [localShifts, setLocalShifts] = useState<any[]>([]);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);

    useEffect(() => {
        if (config) {
            setFormData(prev => ({ ...prev, ...config }));
        }
    }, [config]);

    useEffect(() => {
        if (shifts.length > 0) {
            setLocalShifts(shifts);
        }
    }, [shifts]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: Number(e.target.value) });
    };

    const handleHolidayChange = (index: number, field: 'date' | 'name', value: string) => {
        const holidays = [...formData.holidays];
        holidays[index] = { ...holidays[index], [field]: value };
        setFormData({ ...formData, holidays });
    };

    const addHoliday = () => {
        setFormData({
            ...formData,
            holidays: [...formData.holidays, { date: new Date().toISOString().slice(0, 10), name: '' }],
        });
    };

    const removeHoliday = (index: number) => {
        setFormData({
            ...formData,
            holidays: formData.holidays.filter((_, i) => i !== index),
        });
    };

    const handleShiftChange = (index: number, field: string, value: any) => {
        const updated = [...localShifts];
        updated[index] = { ...updated[index], [field]: value };
        setLocalShifts(updated);
    };

    const handleDeleteShift = async (shift: any) => {
        const confirmed = window.confirm(`${t('common:confirm')}: ${shift.shift_name}?`);
        if (!confirmed) return;

        try {
            await deleteShift.mutateAsync(shift._id);
            setLocalShifts((current) => current.filter((item) => item._id !== shift._id));
            toast(t('common:success'));
        } catch (err: any) {
            toast(err?.message || t('common:error'));
        }
    };

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
        toast(t('settings:save_success'));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateConfig.mutateAsync(formData);

            if (localShifts.length > 0) {
                await Promise.all(localShifts.map(shift => {
                    return updateShift.mutateAsync({
                        id: shift._id,
                        payload: {
                            start_time: shift.start_time,
                            end_time: shift.end_time,
                            break_mins: shift.break_mins,
                            min_work_mins_for_break: shift.min_work_mins_for_break,
                            standard_hours: shift.standard_hours,
                            shift_name: shift.shift_name,
                            is_night_shift: shift.is_night_shift
                        }
                    });
                }));
            }

            toast(t('settings:save_success'));
        } catch (err) {
            toast(t('settings:save_error'));
        }
    };

    const handleDownloadBackup = async () => {
        setIsBackingUp(true);
        try {
            const response = await fetch(`${API_BASE}/settings/backup`, {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error('Backup failed');
            }

            const blob = await response.blob();
            const disposition = response.headers.get('content-disposition') || '';
            const filenameMatch = disposition.match(/filename="([^"]+)"/);
            const filename = filenameMatch?.[1] || `employee-management-backup-${new Date().toISOString().slice(0, 10)}.json`;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            toast(t('settings:backup_success'));
        } catch (_err) {
            toast(t('settings:backup_error'));
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleRestoreBackup = async () => {
        if (!restoreFile) {
            toast(t('settings:restore_select_file'));
            return;
        }

        const confirmed = window.confirm(t('settings:restore_confirm'));
        if (!confirmed) return;

        setIsRestoring(true);
        try {
            const formData = new FormData();
            formData.append('backup', restoreFile);

            const response = await fetch(`${API_BASE}/settings/restore`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.message || 'Restore failed');
            }

            setRestoreFile(null);
            toast(t('settings:restore_success'));
        } catch (_err) {
            toast(t('settings:restore_error'));
        } finally {
            setIsRestoring(false);
        }
    };

    const isLoading = isLoadingConfig || isLoadingShifts;
    const isSaving = updateConfig.isPending || updateShift.isPending || deleteShift.isPending;

    return (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500 max-w-5xl pb-12">
            <div>
                <h1 className="text-2xl font-extrabold text-primary-container tracking-tight">{t('settings:title')}</h1>
                <p className="text-sm text-outline font-medium italic">{t('settings:description')}</p>
            </div>

            {isLoading ? (
                <div className="p-12 flex justify-center bg-white rounded-xl shadow-sm border border-outline-variant/30">
                    <Loader2 className="animate-spin text-secondary" size={32} />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* LANGUAGE PREFERENCE */}
                    <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
                        <div className="border-b border-outline-variant/20 p-6 bg-surface/30">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                    <Globe size={20} />
                                </div>
                                <h2 className="text-base font-extrabold text-primary-container">{t('settings:language_preference')}</h2>
                            </div>
                            <p className="text-xs text-outline ml-11">{t('settings:language_desc')}</p>
                        </div>
                        
                        <div className="p-6">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleLanguageChange('vi')}
                                    className={cn(
                                        "flex-1 md:flex-none px-6 py-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                                        i18n.language === 'vi' 
                                            ? "border-secondary bg-secondary/5 text-secondary" 
                                            : "border-outline-variant/20 hover:border-outline-variant/50 text-outline"
                                    )}
                                >
                                    <span className="text-2xl">🇻🇳</span>
                                    <span className="text-sm font-bold uppercase tracking-widest">Tiếng Việt</span>
                                </button>
                                <button
                                    onClick={() => handleLanguageChange('en')}
                                    className={cn(
                                        "flex-1 md:flex-none px-6 py-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                                        i18n.language === 'en' 
                                            ? "border-secondary bg-secondary/5 text-secondary" 
                                            : "border-outline-variant/20 hover:border-outline-variant/50 text-outline"
                                    )}
                                >
                                    <span className="text-2xl">🇺🇸</span>
                                    <span className="text-sm font-bold uppercase tracking-widest">English</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
                        <div className="border-b border-outline-variant/20 p-6 bg-surface/30">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                                    <Download size={20} />
                                </div>
                                <h2 className="text-base font-extrabold text-primary-container">{t('settings:backup_title')}</h2>
                            </div>
                            <p className="text-xs text-outline ml-11">{t('settings:backup_desc')}</p>
                        </div>
                        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-primary-container">{t('settings:backup_json')}</p>
                                <p className="text-xs text-outline mt-1">{t('settings:backup_note')}</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleDownloadBackup}
                                disabled={isBackingUp}
                                className="h-10 px-5 flex items-center justify-center gap-2 bg-primary-container text-white rounded-lg text-xs font-black hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                                {isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                {t('settings:backup_download')}
                            </button>
                        </div>
                        <div className="p-6 border-t border-outline-variant/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-primary-container">{t('settings:restore_title')}</p>
                                <p className="text-xs text-outline mt-1">{t('settings:restore_note')}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                                <input
                                    type="file"
                                    accept="application/json,.json"
                                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                                    className="max-w-xs text-xs font-semibold text-outline file:mr-3 file:h-9 file:px-3 file:rounded-lg file:border file:border-outline-variant/30 file:bg-white file:text-primary-container file:text-xs file:font-bold hover:file:bg-surface"
                                />
                                <button
                                    type="button"
                                    onClick={handleRestoreBackup}
                                    disabled={isRestoring || !restoreFile}
                                    className="h-10 px-5 flex items-center justify-center gap-2 bg-white border border-outline-variant/30 text-primary-container rounded-lg text-xs font-black hover:bg-surface disabled:opacity-50 transition-all"
                                >
                                    {isRestoring ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                    {t('settings:restore_upload')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        {/* GLOBAL CONFIGURATION */}
                        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
                            <div className="border-b border-outline-variant/20 p-6 bg-surface/30">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-2 bg-secondary/10 text-secondary rounded-lg">
                                        <Moon size={20} />
                                    </div>
                                    <h2 className="text-base font-extrabold text-primary-container">{t('settings:global_night_shift')}</h2>
                                </div>
                                <p className="text-xs text-outline ml-11">{t('settings:night_shift_desc')}</p>
                            </div>
                            
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('settings:night_start')}</label>
                                            <input 
                                                type="number" min="0" max="23"
                                                name="nightStartHour" value={formData.nightStartHour} onChange={handleChange}
                                                className="w-full p-2.5 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('settings:night_end')}</label>
                                            <input 
                                                type="number" min="0" max="23"
                                                name="nightEndHour" value={formData.nightEndHour} onChange={handleChange}
                                                className="w-full p-2.5 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
                            <div className="border-b border-outline-variant/20 p-6 bg-surface/30 flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg">
                                            <CalendarRange size={20} />
                                        </div>
                                        <h2 className="text-base font-extrabold text-primary-container">Holiday Calendar</h2>
                                    </div>
                                    <p className="text-xs text-outline ml-11">Bulk shift assignment will skip these dates automatically.</p>
                                </div>
                                <button type="button" onClick={addHoliday} className="flex items-center gap-2 px-3 py-2 bg-white border border-outline-variant/30 rounded-lg text-xs font-bold text-primary-container hover:bg-surface">
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                            <div className="p-6 space-y-3">
                                {formData.holidays.length === 0 ? (
                                    <p className="text-sm text-outline italic">No holidays configured.</p>
                                ) : formData.holidays.map((holiday, index) => (
                                    <div key={`${holiday.date}-${index}`} className="grid grid-cols-[160px_1fr_auto] gap-3 items-center">
                                        <input
                                            type="date"
                                            value={holiday.date}
                                            onChange={(e) => handleHolidayChange(index, 'date', e.target.value)}
                                            className="p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
                                        />
                                        <input
                                            type="text"
                                            value={holiday.name}
                                            onChange={(e) => handleHolidayChange(index, 'name', e.target.value)}
                                            placeholder="Holiday name"
                                            className="p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
                                        />
                                        <button type="button" onClick={() => removeHoliday(index)} className="p-2 text-outline hover:text-rose-600">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SHIFT TIMES CONFIGURATION */}
                        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
                            <div className="border-b border-outline-variant/20 p-6 bg-surface/30">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                                        <CalendarRange size={20} />
                                    </div>
                                    <h2 className="text-base font-extrabold text-primary-container">{t('settings:shift_schedules')}</h2>
                                </div>
                                <p className="text-xs text-outline ml-11">{t('settings:shift_schedules_desc')}</p>
                            </div>

                            <div className="p-6">
                                {localShifts.length === 0 ? (
                                    <p className="text-sm text-outline italic">{t('settings:no_shifts')}</p>
                                ) : (
                                    <div className="space-y-6">
                                        {localShifts.map((shift, idx) => (
                                            <div key={shift._id} className="p-4 rounded-xl border border-outline-variant/20 bg-surface/10">
                                                <div className="flex justify-between items-center mb-4 gap-3">
                                                    <h3 className="text-sm font-black text-primary-container flex items-center gap-2">
                                                        <Clock size={16} className="text-secondary" /> 
                                                        {shift.shift_name} 
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-outline-variant/20 text-outline uppercase">
                                                            {shift.standard_hours}{t('settings:standard_hours').charAt(0)} {t('settings:standard_hours').split(' ')[1]}
                                                        </span>
                                                    </h3>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteShift(shift)}
                                                        disabled={deleteShift.isPending}
                                                        className="p-2 rounded-lg text-outline hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                                                        title={t('common:delete')}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                    <div>
                                                        <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('settings:start_time')}</label>
                                                        <input 
                                                            type="time" 
                                                            value={shift.start_time} 
                                                            onChange={(e) => handleShiftChange(idx, 'start_time', e.target.value)}
                                                            className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary bg-white" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('settings:end_time')}</label>
                                                        <input 
                                                            type="time" 
                                                            value={shift.end_time} 
                                                            onChange={(e) => handleShiftChange(idx, 'end_time', e.target.value)}
                                                            className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary bg-white" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('settings:break_duration')}</label>
                                                        <input 
                                                            type="number" min="0" 
                                                            value={shift.break_mins ?? 30} 
                                                            onChange={(e) => handleShiftChange(idx, 'break_mins', Number(e.target.value))}
                                                            className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary bg-white" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('settings:min_work_for_break')}</label>
                                                        <input 
                                                            type="number" min="0" 
                                                            value={shift.min_work_mins_for_break ?? 240} 
                                                            onChange={(e) => handleShiftChange(idx, 'min_work_mins_for_break', Number(e.target.value))}
                                                            className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary bg-white" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-outline-variant/20 bg-surface/30 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-8 py-3 bg-secondary text-white rounded-xl text-sm font-black hover:bg-secondary-container shadow-md disabled:opacity-50 transition-all hover:scale-[1.02]"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {t('settings:save_all')}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
