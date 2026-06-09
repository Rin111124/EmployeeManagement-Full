import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
    Building2, Plus, ChevronRight, ChevronDown, Users, Edit2,
    Trash2, ArrowRightLeft, X, Loader2, Search, AlertTriangle,
    ExternalLink, User,
} from 'lucide-react';
import { cn } from '../lib/utils';
import toast from '../lib/toast';
import {
    useDepartmentTree, useDepartments, useCreateDepartment,
    useUpdateDepartment, useDeleteDepartment, useTransferEmployees,
} from '../hooks/useDepartments';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useEmployees } from '../features/employees/hooks/useEmployees';


// ── Level badges ────────────────────────────────────────────────────────────
// Note: LEVEL_META is now defined inside the main Departments component to use the translation hook.

// ── Empty form states ────────────────────────────────────────────────────────
const emptyForm = () => ({
    department_name: '', department_code: '', parent_id: '', level: 0,
    description: '', default_allowances: [] as { name: string; amount: number }[],
});

// ── Tree Node ────────────────────────────────────────────────────────────────
function TreeNode({ node, depth = 0, onEdit, onDelete, onTransfer, onViewEmployees, t, levelMeta }: any) {
    const [open, setOpen] = useState(depth < 2);
    
    // Auto-open when searching
    useEffect(() => {
        if (node.forceOpen) setOpen(true);
    }, [node.forceOpen]);

    const hasChildren = node.children?.length > 0;
    const meta = levelMeta[node.level] || { label: `${t('departments:level')} ${node.level}`, color: 'bg-slate-100 text-slate-600' };

    return (
        <div>
            <div
                className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl group hover:bg-surface/60 transition-colors cursor-pointer',
                    depth > 0 && 'ml-5 border-l border-outline-variant/20 pl-4 rounded-l-none'
                )}
            >
                <button onClick={() => setOpen(!open)} className="p-0.5 text-outline shrink-0">
                    {hasChildren
                        ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />)
                        : <span className="w-4 h-4 block" />}
                </button>
                <Building2 size={16} className="text-secondary shrink-0" />
                <div className="flex-1 min-w-0" onClick={() => onViewEmployees(node)}>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-primary-container truncate">{node.department_name}</span>
                        {node.department_code && (
                            <span className="font-mono text-[10px] bg-surface border border-outline-variant/20 px-1.5 py-0.5 rounded text-outline">
                                {node.department_code}
                            </span>
                        )}
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', meta.color)}>{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                        {node.manager_id && (
                            <p className="text-[10px] font-black text-secondary flex items-center gap-1 bg-secondary/5 px-1.5 py-0.5 rounded uppercase">
                                <User size={10} /> {node.manager_id.full_name}
                            </p>
                        )}
                        {node.description && (
                            <p className="text-[11px] text-outline truncate">{node.description}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button 
                        onClick={() => onViewEmployees(node)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-outline hover:text-secondary px-2 py-1 rounded-lg hover:bg-secondary/5 transition-colors"
                    >
                        <Users size={12} /> {node.employee_count ?? 0}
                    </button>
                    <div className="hidden group-hover:flex items-center gap-1">
                        <button onClick={() => onTransfer(node)} className="p-1 hover:bg-secondary/10 text-secondary rounded-lg" title={t('departments:transfer_button')}>
                            <ArrowRightLeft size={14} />
                        </button>
                        <button onClick={() => onEdit(node)} className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-lg" title={t('common:edit')}>
                            <Edit2 size={14} />
                        </button>
                        <button onClick={() => onDelete(node)} className="p-1 hover:bg-red-50 text-red-500 rounded-lg" title={t('common:delete')}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            </div>
            {open && hasChildren && node.children.map((child: any) => (
                <TreeNode key={child._id} node={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} onTransfer={onTransfer} onViewEmployees={onViewEmployees} t={t} levelMeta={levelMeta} />
            ))}
        </div>
    );
}

// ── Employee List Modal ───────────────────────────────────────────────────────
function EmployeeListModal({ department, onClose, t }: { department: any; onClose: () => void; t: any }) {
    const { data: empData, isLoading } = useQuery({
        queryKey: ['employees', 'department', department.department_name],
        queryFn: async () => {
            const res = await api.apiGet(`/employees?limit=100&department=${encodeURIComponent(department.department_name)}`);
            const data = res?.data || res || {};
            return data?.items || data?.data || [];
        },
    });

    const employees: any[] = empData ?? [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-start p-6 border-b border-outline-variant/20">
                    <div>
                        <h2 className="text-lg font-extrabold text-primary-container">{t('departments:view_employees_title')}</h2>
                        <p className="text-sm font-bold text-secondary mt-0.5">{department.department_name}</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-surface rounded-lg text-outline">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-secondary" size={28} /></div>
                    ) : employees.length === 0 ? (
                        <div className="text-center py-16 text-outline">
                            <User size={40} className="mx-auto mb-3 opacity-20" />
                            <p className="font-semibold">{t('departments:no_employees_in_dept')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {employees.map((emp: any) => (
                                <div key={emp._id} className="p-4 rounded-xl border border-outline-variant/20 flex items-center gap-4 hover:border-secondary/30 transition-colors group">
                                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-black text-xs shrink-0">
                                        {emp.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-primary-container truncate">{emp.full_name}</h4>
                                        <p className="text-[11px] text-outline font-mono">{emp.employee_code} · {emp.position || t('common:employee')}</p>
                                    </div>
                                    <Link 
                                        to={`/employees/${emp._id}`}
                                        className="p-2 text-outline hover:text-secondary hover:bg-secondary/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <ExternalLink size={16} />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t border-outline-variant/20 bg-surface/30 text-right">
                    <p className="text-xs font-bold text-outline">{t('departments:total_employees_count', { count: employees.length })}</p>
                </div>
            </div>
        </div>
    );
}

// ── Transfer Modal ────────────────────────────────────────────────────────────
function TransferModal({ targetDept, onClose, t }: { targetDept: any; onClose: () => void; t: any }) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const [reason, setReason] = useState('');
    const transfer = useTransferEmployees();

    const { data: empData, isLoading } = useQuery({
        queryKey: ['employees', 'transfer-picker', search],
        queryFn: async () => {
            const q = search ? `&search=${encodeURIComponent(search)}` : '';
            const res = await api.apiGet(`/employees?limit=50${q}`);
            const data = res?.data || res || {};
            return data?.items || data?.data || [];
        },
        staleTime: 30_000,
    });

    const employees: any[] = empData ?? [];

    const toggle = (id: string) =>
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleTransfer = async () => {
        if (selected.length === 0) { toast(t('common:no_data')); return; }
        try {
            const res: any = await transfer.mutateAsync({ deptId: targetDept._id, employee_ids: selected, reason });
            toast(t('departments:success_transfer', { count: res?.data?.transferred?.length ?? 0 }));
            onClose();
        } catch {
            toast(t('common:error'));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-start p-6 border-b border-outline-variant/20">
                    <div>
                        <h2 className="text-lg font-extrabold text-primary-container">{t('departments:transfer_title')}</h2>
                        <p className="text-xs text-outline mt-0.5">
                            → <span className="font-bold text-secondary">{targetDept.department_name}</span>
                            {targetDept.department_code && ` (${targetDept.department_code})`}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-surface rounded-lg text-outline">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-auto space-y-4">
                    {targetDept.default_allowances?.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                            <p className="font-bold mb-1">⚙ {t('departments:auto_allowances')}</p>
                            {targetDept.default_allowances.map((a: any, i: number) => (
                                <span key={i} className="inline-block bg-amber-100 rounded px-2 py-0.5 mr-1 mb-1 font-semibold">
                                    {a.name}: {a.amount.toLocaleString()} VND
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={t('departments:search_employees')}
                            className="w-full pl-9 pr-4 py-2.5 border border-outline-variant/30 rounded-xl text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
                        />
                    </div>

                    <div className="border border-outline-variant/20 rounded-xl overflow-hidden">
                        {isLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-secondary" size={24} /></div>
                        ) : employees.length === 0 ? (
                            <p className="text-center py-8 text-outline text-sm">{t('common:no_data')}</p>
                        ) : (
                            <div className="divide-y divide-outline-variant/10 max-h-60 overflow-y-auto">
                                {employees.map((emp: any) => (
                                    <label key={emp._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface/50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(emp._id)}
                                            onChange={() => toggle(emp._id)}
                                            className="accent-secondary w-4 h-4"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-primary-container truncate">{emp.full_name}</p>
                                            <p className="text-[11px] text-outline">{emp.employee_code} · {emp.department || t('common:no_data')}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('departments:transfer_reason')}</label>
                        <input
                            value={reason} onChange={e => setReason(e.target.value)}
                            placeholder={t('departments:transfer_reason_placeholder')}
                            className="w-full p-2.5 border border-outline-variant/30 rounded-xl text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
                        />
                    </div>
                </div>

                <div className="p-5 border-t border-outline-variant/20 flex justify-between items-center">
                    <span className="text-xs font-bold text-outline">
                        {t('departments:selected_count', { count: selected.length })}
                    </span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 border border-outline-variant/30 rounded-xl text-sm font-bold text-outline hover:bg-surface transition-colors">
                            {t('common:cancel')}
                        </button>
                        <button
                            onClick={handleTransfer}
                            disabled={transfer.isPending || selected.length === 0}
                            className="flex items-center gap-2 px-6 py-2 bg-secondary text-white rounded-xl text-sm font-black hover:bg-secondary-container disabled:opacity-50 transition-all shadow-sm"
                        >
                            {transfer.isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                            {t('departments:transfer_button')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Department Form Modal ─────────────────────────────────────────────────────
function DeptFormModal({ initial, onClose, t, levelMeta, flatDepts }: { initial?: any; onClose: () => void; t: any; levelMeta: any; flatDepts: any[] }) {
    const isEdit = !!initial?._id;
    const [form, setForm] = useState(initial ? {
        department_name: initial.department_name ?? '',
        department_code: initial.department_code ?? '',
        parent_id: initial.parent_id?._id ?? initial.parent_id ?? '',
        manager_id: initial.manager_id?._id ?? initial.manager_id ?? '',
        level: initial.level ?? 0,
        description: initial.description ?? '',
        default_allowances: initial.default_allowances ?? [],
    } : {
        department_name: '', department_code: '', parent_id: '', level: 0,
        description: '', default_allowances: [] as { name: string; amount: number }[],
        manager_id: ''
    });

    const [empSearch, setEmpSearch] = useState('');
    const [showEmpPicker, setShowEmpPicker] = useState(false);
    const [newAllowance, setNewAllowance] = useState({ name: '', amount: '' });

    const create = useCreateDepartment();
    const update = useUpdateDepartment();
    const isPending = create.isPending || update.isPending;

    const { data: empPickerData } = useEmployees({ limit: 200 });
    const employees = Array.isArray(empPickerData) ? empPickerData : (empPickerData as any)?.items || (empPickerData as any)?.data || [];

    const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

    const addAllowance = () => {
        if (!newAllowance.name || !newAllowance.amount) return;
        set('default_allowances', [...form.default_allowances, { name: newAllowance.name, amount: Number(newAllowance.amount) }]);
        setNewAllowance({ name: '', amount: '' });
    };
    const removeAllowance = (i: number) =>
        set('default_allowances', form.default_allowances.filter((_: any, idx: number) => idx !== i));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...form,
            parent_id: form.parent_id || null,
            manager_id: form.manager_id || null,
            department_code: form.department_code || undefined,
        };
        try {
            if (isEdit) await update.mutateAsync({ id: initial._id, payload });
            else await create.mutateAsync(payload);
            toast(t('common:success'));
            onClose();
        } catch {
            toast(t('common:error'));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">
                <div className="flex justify-between items-center p-6 border-b border-outline-variant/20">
                    <h2 className="text-lg font-extrabold text-primary-container">
                        {isEdit ? t('departments:form_edit') : t('departments:form_new')}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-surface rounded-lg text-outline"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('departments:dept_name')} *</label>
                            <input required value={form.department_name} onChange={e => set('department_name', e.target.value)}
                                placeholder="VD: Phân xưởng Lắp ráp SMT"
                                className="w-full p-2.5 border border-outline-variant/30 rounded-xl text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('departments:dept_code')}</label>
                            <input value={form.department_code} onChange={e => set('department_code', e.target.value.toUpperCase())}
                                placeholder="VD: SMT"
                                className="w-full p-2.5 border border-outline-variant/30 rounded-xl text-sm focus:border-secondary focus:ring-1 focus:ring-secondary font-mono" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('departments:level')}</label>
                            <select value={form.level} onChange={e => set('level', Number(e.target.value))}
                                className="w-full p-2.5 border border-outline-variant/30 rounded-xl text-sm focus:border-secondary bg-white">
                                {Object.entries(levelMeta).map(([k, v]: any) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Manager Selection */}
                        <div className="col-span-2">
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('departments:manager')}</label>
                            <SearchableSelect
                                options={employees.map((emp: any) => ({
                                    value: emp._id,
                                    label: `${emp.full_name} (${emp.employee_code})`
                                }))}
                                value={form.manager_id}
                                onChange={(val) => set('manager_id', val)}
                                placeholder={t('departments:manager_placeholder')}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('departments:parent_dept')}</label>
                            <select value={form.parent_id} onChange={e => set('parent_id', e.target.value)}
                                className="w-full p-2.5 border border-outline-variant/30 rounded-xl text-sm focus:border-secondary bg-white">
                                <option value="">{t('departments:none_top_level')}</option>
                                {flatDepts.filter((d: any) => d._id !== initial?._id).map((d: any) => (
                                    <option key={d._id} value={d._id}>{d.department_name}{d.department_code ? ` (${d.department_code})` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">{t('departments:dept_description')}</label>
                            <input value={form.description} onChange={e => set('description', e.target.value)}
                                placeholder={t('departments:dept_desc_placeholder')}
                                className="w-full p-2.5 border border-outline-variant/30 rounded-xl text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                        </div>
                    </div>

                    {/* Default Allowances */}
                    <div>
                        <label className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-2">{t('departments:default_allowances')}</label>
                        <div className="space-y-1.5 mb-2">
                            {form.default_allowances.map((a: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 bg-surface/60 rounded-lg px-3 py-1.5 text-sm">
                                    <span className="flex-1 font-semibold text-primary-container">{a.name}</span>
                                    <span className="font-bold text-secondary">{a.amount.toLocaleString()} VND</span>
                                    <button type="button" onClick={() => removeAllowance(i)} className="text-red-400 hover:text-red-600 p-0.5">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={newAllowance.name} onChange={e => setNewAllowance(p => ({ ...p, name: e.target.value }))}
                                placeholder={t('departments:allowance_name')} className="flex-1 p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                            <input type="number" value={newAllowance.amount} onChange={e => setNewAllowance(p => ({ ...p, amount: e.target.value }))}
                                placeholder={t('departments:allowance_amount')} className="w-32 p-2 border border-outline-variant/30 rounded-lg text-sm focus:border-secondary focus:ring-1 focus:ring-secondary" />
                            <button type="button" onClick={addAllowance}
                                className="px-3 py-2 bg-secondary/10 text-secondary rounded-lg text-sm font-bold hover:bg-secondary/20 transition-colors">
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </form>

                <div className="p-5 border-t border-outline-variant/20 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 border border-outline-variant/30 rounded-xl text-sm font-bold text-outline hover:bg-surface">{t('common:cancel')}</button>
                    <button onClick={handleSubmit as any} disabled={isPending}
                        className="flex items-center gap-2 px-6 py-2 bg-secondary text-white rounded-xl text-sm font-black hover:bg-secondary-container disabled:opacity-50 shadow-sm transition-all">
                        {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                        {isEdit ? t('departments:save_changes') : t('departments:add_department')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Departments() {
    const { t } = useTranslation();
    
    const LEVEL_META: Record<number, { label: string; color: string }> = {
        0: { label: t('departments:level_0'), color: 'bg-indigo-100 text-indigo-700' },
        1: { label: t('departments:level_1'), color: 'bg-emerald-100 text-emerald-700' },
        2: { label: t('departments:level_2'), color: 'bg-amber-100 text-amber-700' },
        3: { label: t('departments:level_3'), color: 'bg-rose-100 text-rose-700' },
    };

    const location = useLocation();
    const { data: tree = [], isLoading } = useDepartmentTree();
    const { data: flatDepts = [] } = useDepartments({ limit: 100 });
    const deleteDept = useDeleteDepartment();

    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editTarget, setEditTarget] = useState<any>(null);
    const [transferTarget, setTransferTarget] = useState<any>(null);
    const [viewEmployeesTarget, setViewEmployeesTarget] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

    // Xử lý highlightDept từ navigation state
    useEffect(() => {
        const highlight = location.state?.highlightDept;
        if (highlight && flatDepts.length > 0) {
            const found = flatDepts.find((d: any) => d.department_name === highlight);
            if (found) {
                setViewEmployeesTarget(found);
            }
        }
    }, [location.state, flatDepts]);

    const totalDepts = flatDepts.length;

    const handleDelete = async () => {
        try {
            await deleteDept.mutateAsync(deleteConfirm._id);
            toast(t('common:success'));
            setDeleteConfirm(null);
        } catch {
            toast(t('departments:delete_error'));
        }
    };

    // Recursive search filter
    const filterTree = (nodes: any[], query: string): any[] => {
        if (!query) return nodes;
        return nodes.reduce((acc: any[], node: any) => {
            const matches = node.department_name.toLowerCase().includes(query.toLowerCase()) || 
                          node.department_code?.toLowerCase().includes(query.toLowerCase());
            const filteredChildren = filterTree(node.children || [], query);
            
            if (matches || filteredChildren.length > 0) {
                acc.push({ ...node, children: filteredChildren, forceOpen: !!query });
            }
            return acc;
        }, []);
    };

    const filteredTree = filterTree(tree, searchQuery);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-extrabold text-primary-container tracking-tight">{t('departments:title')}</h1>
                    <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-sm text-outline font-medium">{t('departments:description', { count: totalDepts })}</p>
                        <div className="h-4 w-[1px] bg-outline-variant/30 hidden md:block" />
                        <div className="relative group hidden md:block flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors" size={14} />
                            <input 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder={t('departments:search_placeholder')}
                                className="w-full h-8 pl-9 pr-3 bg-white border border-outline-variant/30 rounded-lg text-xs focus:outline-none focus:border-secondary transition-all"
                            />
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => { setEditTarget(null); setShowForm(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-white rounded-xl text-sm font-black hover:bg-secondary-container shadow-sm hover:shadow-md transition-all"
                >
                    <Plus size={18} /> {t('departments:add_department')}
                </button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2">
                {Object.entries(LEVEL_META).map(([k, v]) => (
                    <span key={k} className={cn('text-[11px] font-bold px-3 py-1 rounded-full', v.color)}>
                        {t('departments:level')} {k}: {v.label}
                    </span>
                ))}
            </div>

            {/* Tree */}
            <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/20 bg-surface/40">
                    <h2 className="text-sm font-extrabold text-primary-container flex items-center gap-2">
                        <Building2 size={16} className="text-secondary" /> {t('departments:org_chart')}
                    </h2>
                </div>
                <div className="p-4">
                    {isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-secondary" size={28} /></div>
                    ) : filteredTree.length === 0 ? (
                        <div className="text-center py-16 text-outline">
                            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="font-semibold">{t('departments:no_matching')}</p>
                            <p className="text-sm mt-1">{t('departments:try_another')}</p>
                        </div>
                    ) : (
                        filteredTree.map((node: any) => (
                            <TreeNode key={node._id} node={node}
                                t={t} levelMeta={LEVEL_META}
                                onEdit={(n: any) => { setEditTarget(n); setShowForm(true); }}
                                onDelete={(n: any) => setDeleteConfirm(n)}
                                onTransfer={(n: any) => setTransferTarget(n)}
                                onViewEmployees={(n: any) => setViewEmployeesTarget(n)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Modals */}
            {showForm && (
                <DeptFormModal
                    initial={editTarget}
                    t={t} levelMeta={LEVEL_META}
                    flatDepts={flatDepts}
                    onClose={() => { setShowForm(false); setEditTarget(null); }}
                />
            )}
            {transferTarget && (
                <TransferModal targetDept={transferTarget} t={t} onClose={() => setTransferTarget(null)} />
            )}
            {viewEmployeesTarget && (
                <EmployeeListModal department={viewEmployeesTarget} t={t} onClose={() => setViewEmployeesTarget(null)} />
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <AlertTriangle size={40} className="text-red-400 mx-auto mb-3" />
                        <h3 className="text-base font-extrabold text-primary-container mb-1">{t('departments:delete_confirm_title')}</h3>
                        <p className="text-sm text-outline mb-5">
                            {t('departments:delete_confirm_desc', { name: deleteConfirm.department_name })}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 border border-outline-variant/30 rounded-xl text-sm font-bold text-outline hover:bg-surface">{t('common:cancel')}</button>
                            <button onClick={handleDelete} disabled={deleteDept.isPending}
                                className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 disabled:opacity-50">
                                {deleteDept.isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : t('common:delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
