import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Plus,
  Table as TableIcon,
  LayoutGrid,
  Loader2
} from 'lucide-react';

import { cn } from '../lib/utils';
import EmployeeTable from '../features/employees/components/EmployeeTable';
import EmployeeForm from '../features/employees/components/EmployeeForm';
import { useEmployees } from '../features/employees/hooks/useEmployees';
import { useDepartments } from '../hooks/useDepartments';
import toast from '../lib/toast';

import { useTranslation } from 'react-i18next';
import Pagination from '../components/ui/Pagination';

export default function Employees() {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const navigate = useNavigate();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [deptFilter, statusFilter]);

  const { data: deptData } = useDepartments({ limit: 100 });
  const departments = deptData || [];

  const { data, isLoading, error } = useEmployees({ 
    search: debouncedSearch, 
    department: deptFilter,
    status: statusFilter,
    page,
    limit
  });

  // Normalize response shapes: backend may return array, or { items, pagination }, or { success, data: { items } }
  let items: any[] = [];
  if (Array.isArray(data)) items = data;
  else if (Array.isArray(data?.items)) items = data.items;
  else if (Array.isArray(data?.data)) items = data.data;
  else if (Array.isArray(data?.data?.items)) items = data.data.items;
  else items = [];
  if (!Array.isArray(items)) {
    console.warn('Employees: unexpected data shape', data);
    items = [];
  }

  if (error) {
    toast(t('employees:error_load'));
  }

  if (isLoading) return (
    <div className="flex items-center justify-center p-12">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-secondary" size={32} />
        <p className="text-sm font-bold text-outline">{t('employees:loading')}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-extrabold text-primary-container tracking-tight">{t('employees:title')}</h1>
            <span className="px-2.5 py-0.5 bg-primary-container/10 text-primary-container rounded-full text-[11px] font-bold">{(data as any)?.pagination?.total || items.length} {t('employees:total')}</span>
          </div>
          <p className="text-sm text-outline font-medium italic">{t('employees:description')}</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg text-sm font-bold hover:bg-secondary-container transition-all shadow-sm">
          {showForm ? <Plus className="rotate-45" size={18} /> : <Plus size={18} />}
          {showForm ? t('employees:close') : t('employees:add_new')}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm flex flex-col min-h-[400px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-outline-variant/20 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/30">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full md:w-64 group">
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 transition-colors",
                search ? "text-secondary" : "text-outline"
              )} size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('employees:search_placeholder')}
                className="w-full h-9 pl-9 pr-3 bg-white border border-outline-variant/30 rounded-lg text-xs font-semibold focus:outline-none focus:border-secondary transition-all shadow-sm"
              />
            </div>
            
            <select 
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 px-3 bg-white border border-outline-variant/30 rounded-lg text-xs font-bold text-primary-container shadow-sm focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value="">{t('employees:all_departments')}</option>
              {departments.map((d: any) => (
                <option key={d._id} value={d.department_name}>{d.department_name}</option>
              ))}
            </select>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 bg-white border border-outline-variant/30 rounded-lg text-xs font-bold text-primary-container shadow-sm focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value="">{t('employees:all_status')}</option>
              <option value="Active">{t('common:active')}</option>
              <option value="Inactive">{t('common:inactive')}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter(''); }}
              className="h-9 px-3 bg-white border border-outline-variant/30 rounded-lg text-xs font-bold text-outline hover:text-rose-500 shadow-sm transition-all flex items-center gap-2"
            >
              {t('employees:reset')}
            </button>
            <div className="flex bg-surface p-0.5 rounded-lg border border-outline-variant/30 shadow-inner">
              <button className="p-1.5 bg-white shadow-sm rounded-md text-secondary"><TableIcon size={16} /></button>
              <button className="p-1.5 text-outline"><LayoutGrid size={16} /></button>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="p-4 border-b">
            <EmployeeForm onDone={() => setShowForm(false)} />
          </div>
        )}

        <div className="p-4">
          <EmployeeTable items={items} />
        </div>

        {data && (data as any).pagination && (
          <Pagination 
            page={(data as any).pagination.page}
            limit={(data as any).pagination.limit}
            total={(data as any).pagination.total}
            totalPages={(data as any).pagination.total_pages}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
