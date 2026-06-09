import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Employee } from '../types';
import { useDeleteEmployee } from '../hooks/useEmployees';
import toast from '@/lib/toast';
import { useTranslation } from 'react-i18next';

function downloadCSV(items: Employee[], header: string[]) {
    const rows = items.map((it) => [it.employee_code, it.full_name, it.department, it.position, it.status, it.email, it.phone]);
    const csv = [header, ...rows]
        .map((r) => r.map((c) => `"${(c || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    URL.revokeObjectURL(url);
}

export default function EmployeeTable({ items = [] }: { items: Employee[] }) {
    const navigate = useNavigate();
    const del = useDeleteEmployee();
    const { t } = useTranslation();

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Không trigger row click
        if (!confirm(t('employees:delete_confirm'))) return;
        del.mutate(id, {
            onSuccess: () => toast(t('employees:deleted_success')),
            onError: () => toast(t('employees:delete_failed')),
        });
    };

    const handleViewDetail = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        navigate(`/employees/${id}`);
    };

    const getAvatar = (emp: Employee) => {
        try {
            const key = `employee-avatar:${emp._id}`;
            const cached = localStorage.getItem(key);
            if (cached) return cached;
        } catch (e) {
            // ignore localStorage errors
        }
        return emp.avatar;
    };

    return (
        <div className="overflow-x-auto">
            <div className="flex justify-end mb-3">
                <button
                    onClick={() => downloadCSV(items, [
                        t('common:employee_code'),
                        t('common:full_name'),
                        t('common:departments'),
                        t('common:position'),
                        t('common:status'),
                        t('common:email'),
                        t('common:phone'),
                    ])}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-outline-variant/30 rounded-lg text-xs font-bold text-outline hover:text-secondary hover:border-secondary/30 shadow-sm transition-all"
                >
                    <Download size={13} /> {t('employees:export_csv')}
                </button>
            </div>

            <table className="w-full text-left">
                <thead>
                    <tr className="bg-surface/60 border-b border-outline-variant/20">
                        <th className="px-4 py-3 text-[10px] font-black text-outline uppercase tracking-widest">{t('common:employee')}</th>
                        <th className="px-4 py-3 text-[10px] font-black text-outline uppercase tracking-widest">{t('common:departments')}</th>
                        <th className="px-4 py-3 text-[10px] font-black text-outline uppercase tracking-widest">{t('common:position')}</th>
                        <th className="px-4 py-3 text-[10px] font-black text-outline uppercase tracking-widest text-center">{t('common:status')}</th>
                        <th className="px-4 py-3 text-[10px] font-black text-outline uppercase tracking-widest">{t('employees:contact')}</th>
                        <th className="px-4 py-3 text-[10px] font-black text-outline uppercase tracking-widest text-center">{t('common:actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-outline text-sm font-semibold">
                                {t('employees:no_employees_found')}
                            </td>
                        </tr>
                    ) : (
                        items.map((emp) => {
                            const initials = (emp.full_name || '?')
                                .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

                            return (
                                <tr
                                    key={emp._id}
                                    onClick={() => navigate(`/employees/${emp._id}`)}
                                    className="group hover:bg-secondary/5 transition-colors cursor-pointer"
                                >
                                    {/* Employee */}
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center text-xs font-black text-secondary shrink-0 border border-outline-variant/10 overflow-hidden">
                                                {getAvatar(emp) ? (
                                                    <img src={getAvatar(emp) as string} className="w-full h-full object-cover" alt={emp.full_name} />
                                                ) : (
                                                    initials
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-extrabold text-primary-container group-hover:text-secondary transition-colors">
                                                    {emp.full_name || '—'}
                                                </p>
                                                <p className="text-[10px] font-mono text-outline uppercase tracking-wider mt-0.5">
                                                    {emp.employee_code || '—'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Department */}
                                    <td className="px-4 py-3.5 text-xs font-semibold text-primary-container">
                                        {emp.department || '—'}
                                    </td>

                                    {/* Position */}
                                    <td className="px-4 py-3.5 text-xs font-semibold text-outline">
                                        {emp.position || '—'}
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3.5 text-center">
                                        <span className={cn(
                                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border',
                                            emp.status === 'Active'
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : emp.status === 'Inactive'
                                                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                    : 'bg-rose-50 text-rose-600 border-rose-100',
                                        )}>
                                            {emp.status === 'Active'
                                                ? t('common:active')
                                                : emp.status === 'Inactive'
                                                    ? t('common:inactive')
                                                    : emp.status === 'Terminated'
                                                        ? t('employees:terminated')
                                                        : t('common:no_data')}
                                        </span>
                                    </td>

                                    {/* Contact */}
                                    <td className="px-4 py-3.5">
                                        <p className="text-xs font-semibold text-primary-container">{emp.contact?.email || emp.email || '—'}</p>
                                        <p className="text-[10px] text-outline mt-0.5">{emp.contact?.phone || emp.phone || '—'}</p>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3.5 text-center">
                                        <div
                                            className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={(e) => handleViewDetail(e, String(emp._id))}
                                                title={t('employees:view_details')}
                                                className="p-1.5 rounded-lg hover:bg-secondary/10 text-outline hover:text-secondary transition-colors"
                                            >
                                                <Eye size={15} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, String(emp._id))}
                                                title={t('employees:delete_employee')}
                                                className="p-1.5 rounded-lg hover:bg-rose-50 text-outline hover:text-rose-600 transition-colors"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}
