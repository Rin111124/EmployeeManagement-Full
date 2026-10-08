import React, { useMemo, useState } from 'react';
import {
    Laptop, Tablet, Smartphone, HardDrive, Monitor, Printer, Search, Plus,
    User, Calendar, AlertCircle, Loader2, Trash2, Edit2, X, MapPin, BadgeDollarSign,
} from 'lucide-react';
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '../hooks/useAssets';
import { useEmployees } from '../features/employees/hooks/useEmployees';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import SearchableSelect from '../components/ui/SearchableSelect';


const CATEGORIES = ['Laptop', 'Desktop', 'Mobile', 'Tablet', 'Storage', 'Peripherals', 'Other'];
const STATUSES = ['Available', 'Assigned', 'Maintenance', 'Broken', 'Lost', 'Retired'];

const CATEGORY_ICONS: Record<string, any> = {
    Laptop,
    Desktop: Monitor,
    Mobile: Smartphone,
    Tablet,
    Storage: HardDrive,
    Peripherals: Printer,
    Other: HardDrive,
};

const STATUS_COLORS: Record<string, string> = {
    Available: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    Assigned: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    Maintenance: 'bg-amber-50 text-amber-600 border-amber-100',
    Broken: 'bg-rose-50 text-rose-600 border-rose-100',
    Lost: 'bg-slate-50 text-slate-600 border-slate-100',
    Retired: 'bg-zinc-50 text-zinc-600 border-zinc-100',
};

const emptyForm = {
    asset_name: '',
    category: 'Laptop',
    serial_number: '',
    status: 'Available',
    assigned_to: '',
    assigned_date: '',
    purchase_date: '',
    purchase_cost: 0,
    warranty_until: '',
    location: '',
    notes: '',
};

function toDateInput(value?: string) {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 10);
}

function normalizeAssetForm(asset: any) {
    return {
        asset_name: asset.asset_name || asset.name || '',
        category: asset.category || 'Other',
        serial_number: asset.serial_number || '',
        status: asset.status || 'Available',
        assigned_to: asset.assigned_to?._id || asset.assigned_to || '',
        assigned_date: toDateInput(asset.assigned_date),
        purchase_date: toDateInput(asset.purchase_date),
        purchase_cost: asset.purchase_cost || 0,
        warranty_until: toDateInput(asset.warranty_until),
        location: asset.location || '',
        notes: asset.notes || '',
    };
}

function cleanPayload(form: typeof emptyForm) {
    return {
        ...form,
        serial_number: form.serial_number || null,
        assigned_to: form.assigned_to || null,
        assigned_date: form.assigned_to ? (form.assigned_date || new Date().toISOString()) : null,
        purchase_date: form.purchase_date || null,
        warranty_until: form.warranty_until || null,
        purchase_cost: Number(form.purchase_cost || 0),
        location: form.location || null,
        notes: form.notes || null,
    };
}

export default function Assets() {
    const { t, i18n } = useTranslation();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<any>(null);
    const [form, setForm] = useState(emptyForm);

    const { data: assets = [], isLoading } = useAssets({ search, category, status, limit: 100 });
    const { data: employeePayload } = useEmployees({ limit: 200 });
    const createAsset = useCreateAsset();
    const updateAsset = useUpdateAsset();
    const deleteAsset = useDeleteAsset();

    const employees = useMemo(() => {
        if (Array.isArray(employeePayload)) return employeePayload;
        if (Array.isArray(employeePayload?.items)) return employeePayload.items;
        if (Array.isArray(employeePayload?.data)) return employeePayload.data;
        if (Array.isArray(employeePayload?.data?.items)) return employeePayload.data.items;
        return [];
    }, [employeePayload]);

    const dateLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

    const openCreate = () => {
        setEditingAsset(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (asset: any) => {
        setEditingAsset(asset);
        setForm(normalizeAssetForm(asset));
        setModalOpen(true);
    };

    const setField = (field: keyof typeof emptyForm, value: string | number) => {
        setForm((prev) => {
            const next = { ...prev, [field]: value };
            if (field === 'assigned_to') {
                next.status = value ? 'Assigned' : 'Available';
                if (value && !next.assigned_date) next.assigned_date = new Date().toISOString().slice(0, 10);
            }
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = cleanPayload(form);
        if (editingAsset) {
            await updateAsset.mutateAsync({ id: editingAsset._id, payload });
        } else {
            await createAsset.mutateAsync(payload);
        }
        setModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm(t('assets:delete_confirm'))) {
            deleteAsset.mutate(id);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-primary-container tracking-tight">{t('assets:title')}</h1>
                    <p className="text-sm text-outline font-medium mt-0.5">{t('assets:description')}</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-container text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all shadow-sm shadow-primary-container/20">
                    <Plus size={14} /> {t('assets:add_asset')}
                </button>
            </div>

            <div className="bg-white p-4 rounded-lg border border-outline-variant/30 shadow-sm flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
                    <input
                        type="text"
                        placeholder={t('assets:search_placeholder')}
                        className="w-full pl-10 pr-4 py-2 bg-surface rounded-lg border border-outline-variant/20 text-xs font-medium focus:outline-none focus:border-secondary/50 transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select className="px-4 py-2 bg-surface rounded-lg border border-outline-variant/20 text-xs font-bold text-primary-container focus:outline-none" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">{t('assets:all_categories')}</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{t(`assets:categories.${c.toLowerCase()}`, c)}</option>)}
                </select>
                <select className="px-4 py-2 bg-surface rounded-lg border border-outline-variant/20 text-xs font-bold text-primary-container focus:outline-none" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">{t('assets:all_statuses')}</option>
                    {STATUSES.map(s => <option key={s} value={s}>{t(`assets:statuses.${s.toLowerCase()}`, s)}</option>)}
                </select>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-secondary" size={32} /></div>
            ) : assets.length === 0 ? (
                <div className="bg-white rounded-lg border border-outline-variant/30 p-20 text-center">
                    <div className="w-16 h-16 bg-surface rounded-lg flex items-center justify-center mx-auto mb-4 border border-outline-variant/20">
                        <AlertCircle className="text-outline/40" size={32} />
                    </div>
                    <h3 className="text-lg font-extrabold text-primary-container">{t('assets:no_assets')}</h3>
                    <p className="text-sm text-outline font-medium mt-1">{t('assets:try_adjust')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {assets.map((asset: any) => {
                        const Icon = CATEGORY_ICONS[asset.category] || HardDrive;
                        return (
                            <div key={asset._id} className="bg-white rounded-lg border border-outline-variant/30 shadow-sm hover:shadow-md transition-all group">
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg"><Icon size={20} /></div>
                                        <div className="flex gap-1">
                                            <button onClick={() => openEdit(asset)} className="p-1.5 text-outline hover:text-secondary transition-colors" title="Edit"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(asset._id)} className="p-1.5 text-outline hover:text-rose-500 transition-colors" title="Delete"><Trash2 size={14} /></button>
                                        </div>
                                    </div>

                                    <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border', STATUS_COLORS[asset.status] || 'bg-surface text-outline border-outline-variant/20')}>
                                        {String(t(`assets:statuses.${String(asset.status || '').toLowerCase()}`, asset.status))}
                                    </span>
                                    <h3 className="text-base font-extrabold text-primary-container mt-2">{asset.asset_name || asset.name}</h3>
                                    <p className="text-[10px] font-mono text-outline uppercase tracking-widest mt-0.5">SN: {asset.serial_number || 'UNKNOWN'}</p>

                                    <div className="mt-6 pt-4 border-t border-outline-variant/10 space-y-3">
                                        <InfoRow icon={User} label={t('assets:assigned_to')} value={asset.assigned_to?.full_name || t('assets:unassigned')} />
                                        <InfoRow icon={Calendar} label={t('assets:purchase_date')} value={asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString(dateLocale) : '-'} />
                                        <InfoRow icon={MapPin} label="Location" value={asset.location || '-'} />
                                        <InfoRow icon={BadgeDollarSign} label="Cost" value={asset.purchase_cost ? new Intl.NumberFormat(dateLocale).format(asset.purchase_cost) : '-'} />
                                    </div>
                                </div>
                                <div className="px-5 py-3 bg-surface/30 border-t border-outline-variant/10 flex justify-between items-center rounded-b-lg">
                                    <span className="text-[10px] font-bold text-outline-variant">{String(t(`assets:categories.${String(asset.category || '').toLowerCase()}`, asset.category || 'Other'))}</span>
                                    <span className="text-[10px] font-black text-secondary uppercase tracking-widest">{asset.assigned_to?.employee_code || 'UNASSIGNED'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {modalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-outline-variant/20 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-extrabold text-primary-container">{editingAsset ? 'Edit Asset' : t('assets:add_asset')}</h2>
                            <button type="button" onClick={() => setModalOpen(false)} className="p-2 hover:bg-surface rounded-lg text-outline"><X size={18} /></button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Asset name" required value={form.asset_name} onChange={(v) => setField('asset_name', v)} />
                            <FormField label="Serial number" value={form.serial_number} onChange={(v) => setField('serial_number', v)} />
                            <SelectField label="Category" value={form.category} onChange={(v) => setField('category', v)} options={CATEGORIES} />
                            <SelectField label="Status" value={form.status} onChange={(v) => setField('status', v)} options={STATUSES} />
                            <div className="md:col-span-1">
                                <label className="block text-[11px] font-bold text-outline uppercase tracking-wider mb-1">Assigned employee</label>
                                <SearchableSelect
                                    options={employees.map((emp: any) => ({ value: emp._id, label: `${emp.full_name} (${emp.employee_code})` }))}
                                    value={form.assigned_to}
                                    onChange={(v) => setField('assigned_to', v)}
                                    placeholder={t('assets:unassigned')}
                                />
                            </div>
                            <FormField label="Assigned date" type="date" value={form.assigned_date} onChange={(v) => setField('assigned_date', v)} />
                            <FormField label="Purchase date" type="date" value={form.purchase_date} onChange={(v) => setField('purchase_date', v)} />
                            <FormField label="Purchase cost" type="number" value={form.purchase_cost} onChange={(v) => setField('purchase_cost', Number(v))} />
                            <FormField label="Warranty until" type="date" value={form.warranty_until} onChange={(v) => setField('warranty_until', v)} />
                            <FormField label="Location" value={form.location} onChange={(v) => setField('location', v)} />
                            <label className="md:col-span-2">
                                <span className="block text-[11px] font-bold text-outline uppercase tracking-wider mb-1">Notes</span>
                                <textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} rows={3} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                            </label>
                        </div>

                        <div className="px-6 py-4 border-t border-outline-variant/20 flex justify-end gap-3">
                            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-outline-variant/30 text-outline hover:bg-surface rounded-lg text-xs font-bold">Cancel</button>
                            <button type="submit" disabled={createAsset.isPending || updateAsset.isPending} className="px-5 py-2 bg-secondary text-white hover:bg-secondary-container rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50">
                                {(createAsset.isPending || updateAsset.isPending) && <Loader2 size={14} className="animate-spin" />}
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2.5 text-xs">
            <Icon size={14} className="text-outline shrink-0" />
            <div className="min-w-0">
                <p className="text-[10px] font-black text-outline uppercase tracking-tighter">{label}</p>
                <p className="font-bold text-primary-container truncate">{value}</p>
            </div>
        </div>
    );
}

function FormField({ label, value, onChange, type = 'text', required = false }: any) {
    return (
        <label>
            <span className="block text-[11px] font-bold text-outline uppercase tracking-wider mb-1">{label}{required ? ' *' : ''}</span>
            <input
                required={required}
                type={type}
                value={value}
                min={type === 'number' ? 0 : undefined}
                onChange={(e) => onChange(e.target.value)}
                className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
            />
        </label>
    );
}

function SelectField({ label, value, onChange, options, emptyLabel }: any) {
    return (
        <label>
            <span className="block text-[11px] font-bold text-outline uppercase tracking-wider mb-1">{label}</span>
            <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary">
                {emptyLabel && <option value="">{emptyLabel}</option>}
                {options.map((option: any) => {
                    const normalized = typeof option === 'string' ? { value: option, label: option } : option;
                    return <option key={normalized.value} value={normalized.value}>{normalized.label}</option>;
                })}
            </select>
        </label>
    );
}
