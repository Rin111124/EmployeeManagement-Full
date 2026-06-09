import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Briefcase, FileText, Search, Plus, 
    AlertCircle, CheckCircle2, Clock, 
    Calendar, User, CreditCard, Loader2,
    ShieldCheck, Download, ExternalLink,
    ChevronRight, TrendingUp, X, Edit2, Trash2,
    Check, FileCheck, PenTool, History, Printer, Layout
} from 'lucide-react';
import { 
    useContracts, useGenerateContract, useCreateContract, 
    useUpdateContract, useUpdateContractStatus, useGenerateHtmlContract 
} from '../hooks/useContracts';
import { useContractTemplates } from '../hooks/useContractTemplates';
import { cn } from '../lib/utils';
import toast from '../lib/toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useReactToPrint } from 'react-to-print';
import { useEmployees } from '../features/employees/hooks/useEmployees';
import { useTranslation } from 'react-i18next';
import Pagination from '../components/ui/Pagination';
import SearchableSelect from '../components/ui/SearchableSelect';

export default function Contracts() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;

    const { data: contractsRes, isLoading } = useContracts({ search, status: statusFilter, page, limit });
    const contracts = (contractsRes as any)?.items || [];
    const pagination = (contractsRes as any)?.pagination;

    const { data: allContractsRes } = useContracts({ limit: 1000 }); // Dùng để filter selection
    const allContracts = (allContractsRes as any)?.items || [];
    const { generate } = useGenerateContract();
    const { generateUrl } = useGenerateHtmlContract();
    const createContract = useCreateContract();
    const updateContract = useUpdateContract();
    const updateStatus = useUpdateContractStatus();
    const { data: employeesData } = useEmployees({ limit: 1000 });
    const employees = Array.isArray(employeesData) ? employeesData : employeesData?.items || [];

    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const { data: templates = [] } = useContractTemplates();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState<any>(null);
    const [formData, setFormData] = useState({
        employee_id: '',
        type: 'Probation',
        template_id: '',
        start_date: '',
        end_date: '',
        base_salary: '',
        allowances: [] as { name: string, amount: string }[]
    });
    const printRef = React.useRef<HTMLIFrameElement>(null);
    const contractTypeLabels: Record<string, string> = {
        Probation: t('contractsPage:type_probation'),
        'Fixed-term': t('contractsPage:type_fixed_term'),
        Indefinite: t('contractsPage:type_indefinite'),
        Freelance: t('contractsPage:type_freelance'),
    };
    const contractStatusLabels: Record<string, string> = {
        Draft: t('contractsPage:status_draft'),
        Pending: t('common:pending'),
        Approved: t('common:approved'),
        Signed: t('contractsPage:status_signed'),
        Expired: t('employees:expired'),
    };

    const handlePrint = () => {
        if (printRef.current) {
            printRef.current.contentWindow?.print();
        }
    };

    const handleGenerate = (id: string) => {
        setPreviewUrl(generateUrl(id));
    };

    const downloadMarkdown = () => {
        if (!previewUrl) return;
        window.open(previewUrl.replace('generate-html', 'generate-document'), '_blank');
    };

    const resetForm = () => {
        setFormData({
            employee_id: '',
            type: 'Probation',
            template_id: '',
            start_date: '',
            end_date: '',
            base_salary: '',
            allowances: []
        });
        setEditingContract(null);
    };

    const handleOpenModal = (contract?: any) => {
        if (contract) {
            setEditingContract(contract);
            setFormData({
                employee_id: contract.employee_id?._id || contract.employee_id,
                type: contract.type,
                template_id: contract.template_id?._id || contract.template_id || '',
                start_date: contract.start_date ? new Date(contract.start_date).toISOString().split('T')[0] : '',
                end_date: contract.end_date ? new Date(contract.end_date).toISOString().split('T')[0] : '',
                base_salary: contract.base_salary?.toString() || '',
                allowances: contract.allowances || []
            });
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Normalize payload
        const payload = {
            ...formData,
            template_id: formData.template_id || null,
            end_date: formData.end_date || null,
            base_salary: Number(formData.base_salary),
            allowances: formData.allowances.map(a => ({ ...a, amount: Number(a.amount) }))
        };

        try {
            if (editingContract) {
                await updateContract.mutateAsync({ id: editingContract._id, payload });
            } else {
                await createContract.mutateAsync(payload);
            }
            setIsModalOpen(false);
            resetForm();
        } catch (err: any) {
            const data = err.response?.data;
            if (data?.details && Array.isArray(data.details)) {
                const messages = data.details.map((d: any) => `${d.field}: ${d.message}`).join('\n');
                toast(`${data.message}:\n${messages}`);
            } else if (data?.message) {
                toast(data.message);
            } else {
                toast(t('common:error_occurred'));
            }
        }
    };

    const addAllowance = () => {
        setFormData(prev => ({
            ...prev,
            allowances: [...prev.allowances, { name: 'Other', amount: '0' }]
        }));
    };

    const removeAllowance = (index: number) => {
        setFormData(prev => ({
            ...prev,
            allowances: prev.allowances.filter((_, i) => i !== index)
        }));
    };

    const expiringSoon = contracts.filter((c: any) => {
        if (!c.end_date) return false;
        const diff = new Date(c.end_date).getTime() - new Date().getTime();
        return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // 30 days
    });

    const expired = contracts.filter((c: any) => {
        if (!c.end_date) return false;
        return new Date(c.end_date) < new Date();
    });

    return (
        <div className="space-y-7 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-primary-container tracking-tight">{t('contractsPage:title')}</h1>
                    <p className="text-sm text-outline font-medium mt-0.5">{t('contractsPage:description')}</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => navigate('/contract-templates')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/40 rounded-xl text-xs font-bold text-secondary hover:bg-surface transition-colors shadow-sm"
                    >
                        <Layout size={14} /> {t('contractsPage:manage_templates')}
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/40 rounded-xl text-xs font-bold text-primary-container hover:bg-surface transition-colors shadow-sm">
                        <Download size={14} /> {t('employees:export_csv')}
                    </button>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-container text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm shadow-primary-container/20"
                    >
                        <Plus size={14} /> {t('contractsPage:new_contract')}
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Briefcase size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">{t('contractsPage:total_active')}</p>
                        <h3 className="text-xl font-black text-primary-container">{contracts.length - expired.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center gap-4 border-l-4 border-l-amber-400">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Clock size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">{t('contractsPage:expiring_soon')}</p>
                        <h3 className="text-xl font-black text-primary-container text-amber-600">{expiringSoon.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center gap-4 border-l-4 border-l-rose-400">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                        <AlertCircle size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">{t('contractsPage:expired')}</p>
                        <h3 className="text-xl font-black text-primary-container text-rose-600">{expired.length}</h3>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-outline-variant/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
                        <input 
                            type="text" 
                            placeholder={t('contractsPage:search_placeholder')}
                            className="w-full pl-10 pr-4 py-2 bg-surface rounded-xl border border-outline-variant/20 text-xs font-medium focus:outline-none focus:border-secondary/50 transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select 
                            className="h-9 px-3 bg-surface border border-outline-variant/20 rounded-xl text-[10px] font-black text-outline uppercase tracking-widest focus:outline-none focus:border-secondary/50"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">{t('employees:all_status')}</option>
                            <option value="Draft">{t('contractsPage:status_draft')}</option>
                            <option value="Pending">{t('common:pending')}</option>
                            <option value="Approved">{t('common:approved')}</option>
                            <option value="Signed">{t('contractsPage:status_signed')}</option>
                            <option value="Terminated">{t('employees:terminated')}</option>
                        </select>
                        <span className="px-3 py-1 bg-surface text-[10px] font-black text-outline uppercase tracking-widest rounded-lg border border-outline-variant/20">{t('contractsPage:sort_newest_first')}</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-surface/40 border-b border-outline-variant/10 text-outline">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider">{t('common:employee')}</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider">{t('contractsPage:contract_type')}</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider">{t('contractsPage:duration')}</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider">{t('contractsPage:gross_salary')}</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider">{t('common:status')}</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10 font-semibold">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin text-secondary mx-auto" size={24} />
                                    </td>
                                </tr>
                            ) : contracts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-outline">{t('employees:no_contracts')}</td>
                                </tr>
                            ) : contracts.map((c: any) => {
                                const isExpiring = expiringSoon.some(ec => ec._id === c._id);
                                const isExpired = expired.some(ec => ec._id === c._id);
                                
                                return (
                                    <tr key={c._id} className="hover:bg-surface/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] text-indigo-600 font-black">
                                                    {c.employee_id?.full_name?.split(' ').map((w: any) => w[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-primary-container">{c.employee_id?.full_name}</p>
                                                    <p className="text-[10px] text-outline font-mono uppercase tracking-tighter">{c.employee_id?.employee_code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-violet-100">
                                                {contractTypeLabels[c.type] || c.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="text-primary-container">
                                                    <p className="font-black tracking-tight">{new Date(c.start_date).toLocaleDateString()}</p>
                                                    <p className="text-[9px] text-outline uppercase font-bold">{t('contractsPage:start')}</p>
                                                </div>
                                                <ChevronRight size={12} className="text-outline/30" />
                                                <div className={cn(isExpired ? 'text-rose-500' : isExpiring ? 'text-amber-600' : 'text-primary-container')}>
                                                    <p className="font-black tracking-tight">{c.end_date ? new Date(c.end_date).toLocaleDateString() : t('employees:open_ended')}</p>
                                                    <p className="text-[9px] text-outline uppercase font-bold">{t('contractsPage:end')}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-black text-primary-container">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c.base_salary || 0)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border',
                                                c.status === 'Draft' ? 'bg-slate-50 text-slate-500 border-slate-100' :
                                                c.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                c.status === 'Approved' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                c.status === 'Signed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                'bg-rose-50 text-rose-600 border-rose-100'
                                            )}>
                                                {contractStatusLabels[c.status || 'Draft'] || c.status || t('contractsPage:status_draft')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                {c.status === 'Draft' && (
                                                    <button 
                                                        onClick={() => updateStatus.mutate({ id: c._id, status: 'Pending' })}
                                                        title={t('contractsPage:submit_for_approval')}
                                                        className="p-2 text-outline hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <History size={16} />
                                                    </button>
                                                )}
                                                {c.status === 'Pending' && (
                                                    <button 
                                                        onClick={() => updateStatus.mutate({ id: c._id, status: 'Approved' })}
                                                        title={t('contractsPage:approve_contract')}
                                                        className="p-2 text-outline hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <FileCheck size={16} />
                                                    </button>
                                                )}
                                                {c.status === 'Approved' && (
                                                    <button 
                                                        onClick={() => updateStatus.mutate({ id: c._id, status: 'Signed' })}
                                                        title={t('contractsPage:mark_as_signed')}
                                                        className="p-2 text-outline hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <PenTool size={16} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleOpenModal(c)}
                                                    title={t('contractsPage:edit_contract')}
                                                    className="p-2 text-outline hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleGenerate(c._id)}
                                                    disabled={generatingId === c._id}
                                                    title={t('contractsPage:generate_legal_document')}
                                                    className="p-2 text-outline hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                                >
                                                    {generatingId === c._id ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                                                </button>
                                                <button 
                                                    onClick={() => window.open(generateUrl(c._id), '_blank')}
                                                    title={t('contractsPage:professional_print')}
                                                    className="p-2 text-outline hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                                <button className="p-2 text-outline hover:text-secondary hover:bg-secondary/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                    <ExternalLink size={16} />
                                                </button>
                                            </div>
                                        </td>
                                     </tr>
                                 );
                             })}
                         </tbody>
                     </table>
                 </div>

                 {pagination && (
                    <Pagination 
                        page={pagination.page}
                        limit={pagination.limit}
                        total={pagination.total}
                        totalPages={pagination.total_pages}
                        onPageChange={(p) => setPage(p)}
                    />
                 )}
             </div>

             {/* Preview Modal */}
             {previewUrl && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                     <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                         <div className="px-8 py-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface/30">
                             <div>
                                  <h2 className="text-xl font-black text-primary-container uppercase tracking-tight">{t('contractsPage:document_preview')}</h2>
                                 <p className="text-[10px] font-bold text-outline uppercase tracking-widest mt-1">{t('contractsPage:professional_rendering')}</p>
                             </div>
                             <div className="flex gap-3">
                                 <button 
                                     onClick={downloadMarkdown}
                                     className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                                 >
                                      <Download size={16} /> {t('contractsPage:download_markdown')}
                                 </button>
                                 <button 
                                     onClick={() => setPreviewUrl(null)}
                                     className="p-2 hover:bg-surface rounded-lg text-outline transition-colors"
                                 >
                                     <X size={20} />
                                 </button>
                             </div>
                         </div>
                         <div className="flex-1 w-full h-full bg-surface/10 overflow-hidden relative">
                            <div className="absolute inset-0 p-4">
                                <div className="w-full h-full bg-white shadow-md rounded-lg overflow-hidden border border-outline-variant/20">
                                    <iframe 
                                        ref={printRef}
                                        src={previewUrl} 
                                        className="w-full h-full border-none"
                                        title={t('contractsPage:contract_preview')}
                                    />
                                </div>
                            </div>
                         </div>
                     </div>
                 </div>
             )}
             {/* Contract Form Modal */}
             {isModalOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                     <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                         <form onSubmit={handleSubmit}>
                             <div className="px-8 py-6 border-b border-outline-variant/10 flex items-center justify-between">
                                 <h2 className="text-xl font-black text-primary-container uppercase tracking-tight">
                                      {editingContract ? t('contractsPage:edit_contract') : t('contractsPage:new_employment_contract')}
                                 </h2>
                                 <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface rounded-lg text-outline">
                                     <X size={20} />
                                 </button>
                             </div>
                             
                             <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                     <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-outline uppercase tracking-widest">{t('common:employee')}</label>
                                          <SearchableSelect
                                              options={employees
                                                  .filter((emp: any) => {
                                                      if (editingContract && (editingContract.employee_id?._id === emp._id || editingContract.employee_id === emp._id)) {
                                                          return true;
                                                      }
                                                      return !allContracts.some((c: any) => (c.employee_id?._id === emp._id || c.employee_id === emp._id));
                                                  })
                                                  .map((emp: any) => ({ 
                                                      value: emp._id, 
                                                      label: `${emp.full_name} (${emp.employee_code})` 
                                                  }))}
                                              value={formData.employee_id}
                                              onChange={val => setFormData({ ...formData, employee_id: val })}
                                              placeholder={t('contractsPage:select_employee')}
                                          />
                                     </div>
                                     <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-outline uppercase tracking-widest">{t('contractsPage:contract_type')}</label>
                                         <select 
                                             required
                                             className="w-full h-11 px-4 bg-surface rounded-xl border border-outline-variant/30 text-xs font-bold focus:outline-none focus:border-secondary transition-all"
                                             value={formData.type}
                                             onChange={e => setFormData({ ...formData, type: e.target.value })}
                                         >
                                              <option value="Probation">{t('contractsPage:type_probation')}</option>
                                              <option value="Fixed-term">{t('contractsPage:type_fixed_term')}</option>
                                              <option value="Indefinite">{t('contractsPage:type_indefinite')}</option>
                                              <option value="Freelance">{t('contractsPage:type_freelance')}</option>
                                         </select>
                                     </div>
                                 </div>

                                 <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-outline uppercase tracking-widest">{t('contractsPage:document_template_optional')}</label>
                                      <SearchableSelect
                                          options={templates.map((t: any) => ({ 
                                              value: t._id, 
                                              label: `${t.name} (${t.contract_type_match})` 
                                          }))}
                                          value={formData.template_id}
                                          onChange={val => setFormData({ ...formData, template_id: val })}
                                          placeholder={t('contractsPage:default_bilingual_standard')}
                                      />
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                     <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-outline uppercase tracking-widest">{t('contractsPage:start_date')}</label>
                                         <input 
                                             type="date"
                                             required
                                             className="w-full h-11 px-4 bg-surface rounded-xl border border-outline-variant/30 text-xs font-bold focus:outline-none focus:border-secondary transition-all"
                                             value={formData.start_date}
                                             onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                         />
                                     </div>
                                     <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-outline uppercase tracking-widest">{t('contractsPage:end_date_optional')}</label>
                                         <input 
                                             type="date"
                                             className="w-full h-11 px-4 bg-surface rounded-xl border border-outline-variant/30 text-xs font-bold focus:outline-none focus:border-secondary transition-all"
                                             value={formData.end_date}
                                             onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                         />
                                     </div>
                                 </div>

                                 <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-outline uppercase tracking-widest">{t('contractsPage:base_salary_vnd')}</label>
                                     <input 
                                         type="number"
                                         required
                                          placeholder={t('contractsPage:salary_placeholder')}
                                         className="w-full h-11 px-4 bg-surface rounded-xl border border-outline-variant/30 text-xs font-bold focus:outline-none focus:border-secondary transition-all"
                                         value={formData.base_salary}
                                         onChange={e => setFormData({ ...formData, base_salary: e.target.value })}
                                     />
                                 </div>

                                 <div className="space-y-3">
                                     <div className="flex items-center justify-between">
                                          <label className="text-[10px] font-black text-outline uppercase tracking-widest">{t('employees:allowances')}</label>
                                         <button type="button" onClick={addAllowance} className="text-[10px] font-black text-secondary uppercase hover:underline">
                                              + {t('contractsPage:add_allowance')}
                                         </button>
                                     </div>
                                     {formData.allowances.map((allowance, idx) => (
                                         <div key={idx} className="flex gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                             <select 
                                                 className="flex-1 h-10 px-3 bg-surface rounded-lg border border-outline-variant/30 text-xs font-bold"
                                                 value={allowance.name}
                                                 onChange={e => {
                                                     const newAllowances = [...formData.allowances];
                                                     newAllowances[idx].name = e.target.value;
                                                     setFormData({ ...formData, allowances: newAllowances });
                                                 }}
                                             >
                                                  <option value="Meal">{t('contractsPage:allowance_meal')}</option>
                                                  <option value="Transport">{t('contractsPage:allowance_transport')}</option>
                                                  <option value="Position">{t('contractsPage:allowance_position')}</option>
                                                  <option value="Other">{t('contractsPage:allowance_other')}</option>
                                             </select>
                                             <input 
                                                 type="number"
                                                 className="w-32 h-10 px-3 bg-surface rounded-lg border border-outline-variant/30 text-xs font-bold"
                                                  placeholder={t('contractsPage:amount')}
                                                 value={allowance.amount}
                                                 onChange={e => {
                                                     const newAllowances = [...formData.allowances];
                                                     newAllowances[idx].amount = e.target.value;
                                                     setFormData({ ...formData, allowances: newAllowances });
                                                 }}
                                             />
                                             <button type="button" onClick={() => removeAllowance(idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                                                 <Trash2 size={16} />
                                             </button>
                                         </div>
                                     ))}
                                 </div>
                             </div>

                             <div className="px-8 py-6 bg-surface/30 border-t border-outline-variant/10 flex justify-end gap-3">
                                 <button 
                                     type="button" 
                                     onClick={() => setIsModalOpen(false)}
                                     className="px-6 py-2.5 bg-white border border-outline-variant/30 text-outline rounded-xl text-xs font-black hover:bg-surface transition-all"
                                 >
                                      {t('common:cancel')}
                                 </button>
                                 <button 
                                     type="submit"
                                     disabled={createContract.isPending || updateContract.isPending}
                                     className="px-8 py-2.5 bg-primary-container text-white rounded-xl text-xs font-black hover:opacity-90 transition-all shadow-lg shadow-primary-container/20 disabled:opacity-50"
                                 >
                                      {createContract.isPending || updateContract.isPending ? t('employees:saving') : editingContract ? t('contractsPage:update_contract') : t('contractsPage:create_contract')}
                                 </button>
                             </div>
                         </form>
                     </div>
                 </div>
             )}
         </div>
     );
 }
