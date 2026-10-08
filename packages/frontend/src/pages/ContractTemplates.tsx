import React, { useState } from 'react';
import { 
    FileCode, Plus, Search, Trash2, Edit2, 
    Save, FileText, Layout, Info, CheckCircle2,
    ArrowLeft, Code2, Eye
} from 'lucide-react';
import { 
    useContractTemplates, 
    useCreateContractTemplate, 
    useUpdateContractTemplate, 
    useDeleteContractTemplate 
} from '../hooks/useContractTemplates';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export default function ContractTemplates() {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const { data: templates = [], isLoading } = useContractTemplates({ search });
    const createTemplate = useCreateContractTemplate();
    const updateTemplate = useUpdateContractTemplate();
    const deleteTemplate = useDeleteContractTemplate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [previewMode, setPreviewMode] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        contract_type_match: 'All',
        html_content: '',
        is_default: false
    });

    const handleOpenModal = (template?: any) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                name: template.name,
                description: template.description || '',
                contract_type_match: template.contract_type_match || 'All',
                html_content: template.html_content,
                is_default: template.is_default || false
            });
        } else {
            setEditingTemplate(null);
            setFormData({
                name: '',
                description: '',
                contract_type_match: 'All',
                html_content: defaultTemplateHtml,
                is_default: false
            });
        }
        setIsModalOpen(true);
        setPreviewMode(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTemplate) {
            await updateTemplate.mutateAsync({ id: editingTemplate._id, payload: formData });
        } else {
            await createTemplate.mutateAsync(formData);
        }
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm(t('contractTemplates:delete_confirm'))) {
            await deleteTemplate.mutateAsync(id);
        }
    };

    return (
        <div className="space-y-7 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-primary-container tracking-tight flex items-center gap-2">
                        <FileCode className="text-secondary" size={28} />
                        {t('common:contract_templates')}
                    </h1>
                    <p className="text-sm text-outline font-medium mt-0.5">{t('contractTemplates:description')}</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-container text-white rounded-xl text-xs font-black hover:opacity-90 transition-all shadow-lg shadow-primary-container/20"
                >
                    <Plus size={16} /> {t('contractTemplates:create_template')}
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="px-6 py-5 border-b border-outline-variant/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
                        <input 
                            type="text" 
                            placeholder={t('contractTemplates:search_placeholder')}
                            className="w-full pl-10 pr-4 py-2 bg-surface rounded-xl border border-outline-variant/20 text-xs font-medium focus:outline-none focus:border-secondary/50 transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template: any) => (
                        <div key={template._id} className="group relative bg-surface/30 rounded-2xl border border-outline-variant/20 p-5 hover:border-secondary/30 transition-all hover:shadow-md">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 bg-white rounded-xl shadow-sm border border-outline-variant/10">
                                    <Layout size={20} className="text-secondary" />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(template)} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(template._id)} className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            
                            <h3 className="font-black text-primary-container mb-1">{template.name}</h3>
                            <p className="text-[10px] text-outline font-medium line-clamp-2 mb-4 h-8">{template.description || t('contractTemplates:no_description')}</p>
                            
                            <div className="flex items-center gap-2 mt-auto">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                                    {template.contract_type_match}
                                </span>
                                {template.is_default && (
                                    <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600">
                                        <CheckCircle2 size={10} /> {t('contractTemplates:default')}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {templates.length === 0 && !isLoading && (
                        <div className="col-span-full py-20 text-center flex flex-col items-center">
                            <div className="p-4 bg-surface rounded-full mb-4">
                                <FileText size={40} className="text-outline/30" />
                            </div>
                            <p className="text-sm font-bold text-outline">{t('contractTemplates:no_templates')}</p>
                            <button onClick={() => handleOpenModal()} className="mt-2 text-xs font-black text-secondary hover:underline">
                                {t('contractTemplates:create_first_template')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface/30">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface rounded-lg text-outline">
                                    <ArrowLeft size={20} />
                                </button>
                                <div>
                                    <h2 className="text-lg font-black text-primary-container uppercase tracking-tight">
                                        {editingTemplate ? t('contractTemplates:edit_template') : t('contractTemplates:new_template')}
                                    </h2>
                                    <p className="text-[9px] font-bold text-outline uppercase tracking-widest">{t('contractTemplates:html_builder')}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setPreviewMode(!previewMode)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all",
                                        previewMode ? "bg-secondary text-white shadow-lg" : "bg-white border border-outline-variant/40 text-outline hover:bg-surface"
                                    )}
                                >
                                    {previewMode ? <Code2 size={16} /> : <Eye size={16} />}
                                    {previewMode ? t('contractTemplates:view_code') : t('contractTemplates:preview')}
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    className="flex items-center gap-2 px-6 py-2 bg-primary-container text-white rounded-xl text-xs font-black hover:opacity-90 transition-all shadow-lg"
                                >
                                    <Save size={16} /> {t('contractTemplates:save_template')}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Form Sidebar */}
                            {!previewMode && (
                                <div className="w-80 border-r border-outline-variant/10 p-6 space-y-5 overflow-y-auto bg-surface/10">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-outline uppercase tracking-widest">{t('contractTemplates:template_name')}</label>
                                        <input 
                                            type="text" 
                                            className="w-full h-10 px-3 bg-white rounded-xl border border-outline-variant/30 text-xs font-bold focus:outline-none focus:border-secondary transition-all"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder={t('contractTemplates:name_placeholder')}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-outline uppercase tracking-widest">{t('contractTemplates:form_description')}</label>
                                        <textarea 
                                            className="w-full h-20 px-3 py-2 bg-white rounded-xl border border-outline-variant/30 text-xs font-bold focus:outline-none focus:border-secondary transition-all resize-none"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder={t('contractTemplates:description_placeholder')}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-outline uppercase tracking-widest">{t('contractTemplates:target_contract_type')}</label>
                                        <select 
                                            className="w-full h-10 px-3 bg-white rounded-xl border border-outline-variant/30 text-xs font-bold focus:outline-none focus:border-secondary transition-all"
                                            value={formData.contract_type_match}
                                            onChange={e => setFormData({ ...formData, contract_type_match: e.target.value })}
                                        >
                                            <option value="All">{t('contractTemplates:all_types')}</option>
                                            <option value="Probation">{t('contractTemplates:probation_only')}</option>
                                            <option value="Fixed-term">{t('contractTemplates:fixed_term_only')}</option>
                                            <option value="Indefinite">{t('contractTemplates:indefinite_only')}</option>
                                            <option value="Freelance">{t('contractTemplates:freelance_only')}</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                        <input 
                                            type="checkbox" 
                                            id="is_default"
                                            className="w-4 h-4 rounded text-secondary"
                                            checked={formData.is_default}
                                            onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                                        />
                                        <label htmlFor="is_default" className="text-[10px] font-black text-indigo-700 uppercase tracking-tight cursor-pointer">{t('contractTemplates:set_as_default')}</label>
                                    </div>

                                    <div className="pt-4 mt-4 border-t border-outline-variant/10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Info size={14} className="text-secondary" />
                                            <span className="text-[10px] font-black text-primary-container uppercase">{t('contractTemplates:available_variables')}</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1">
                                            {['EMPLOYEE_NAME', 'BASE_SALARY', 'START_DATE', 'COMPANY_NAME', 'CONTRACT_NUMBER'].map(v => (
                                                <div key={v} className="px-2 py-1 bg-white border border-outline-variant/20 rounded-md text-[9px] font-mono text-outline-variant flex justify-between group">
                                                    <span>{'{{'}{v}{'}}'}</span>
                                                    <button onClick={() => {
                                                        const ta = document.getElementById('template-editor') as HTMLTextAreaElement;
                                                        if (ta) {
                                                            const start = ta.selectionStart;
                                                            const end = ta.selectionEnd;
                                                            const text = ta.value;
                                                            const before = text.substring(0, start);
                                                            const after = text.substring(end);
                                                            const newValue = before + `{{${v}}}` + after;
                                                            setFormData({ ...formData, html_content: newValue });
                                                        }
                                                    }} className="text-secondary opacity-0 group-hover:opacity-100">+ {t('common:add')}</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Main Workspace */}
                            <div className="flex-1 h-full bg-white relative">
                                {previewMode ? (
                                    <div className="w-full h-full p-8 bg-surface/30 overflow-y-auto">
                                        <div className="w-full h-full bg-white shadow-2xl rounded-lg mx-auto overflow-hidden">
                                            <iframe 
                                                srcDoc={formData.html_content} 
                                                sandbox=""
                                                className="w-full h-full border-none"
                                                title={t('contractTemplates:template_preview')}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <textarea 
                                        id="template-editor"
                                        className="w-full h-full p-8 font-mono text-xs text-primary-container bg-white focus:outline-none resize-none leading-relaxed"
                                        value={formData.html_content}
                                        onChange={e => setFormData({ ...formData, html_content: e.target.value })}
                                        placeholder={t('contractTemplates:html_placeholder')}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const defaultTemplateHtml = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: serif; padding: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .title { text-align: center; text-transform: uppercase; font-weight: bold; font-size: 20px; }
        .section { margin-top: 20px; font-weight: bold; }
        .signature { margin-top: 50px; display: flex; justify-content: space-between; }
    </style>
</head>
<body>
    <div class="header">
        <div>C\u1ed8NG H\u00d2A X\u00c3 H\u1ed8I CH\u1ee6 NGH\u0128A VI\u1ec6T NAM</div>
        <div>\u0110\u1ed9c l\u1eadp - T\u1ef1 do - H\u1ea1nh ph\u00fac</div>
        <hr style="width: 150px;">
    </div>
    
    <div class="title">H\u1ee2P \u0110\u1ed2NG LAO \u0110\u1ed8NG</div>
    <div style="text-align: center; margin-bottom: 20px;">S\u1ed1: {{CONTRACT_NUMBER}}</div>

    <p>Ch\u00fang t\u00f4i g\u1ed3m:</p>
    <p><strong>B\u00caN A (NG\u01af\u1edcI S\u1eec D\u1ee4NG LAO \u0110\u1ed8NG):</strong> {{COMPANY_NAME}}</p>
    <p>\u0110\u1ea1i di\u1ec7n b\u1edfi: {{COMPANY_REPRESENTATIVE}} - Ch\u1ee9c v\u1ee5: {{COMPANY_POSITION}}</p>

    <p><strong>B\u00caN B (NG\u01af\u1edcI LAO \u0110\u1ed8NG):</strong> \u00d4ng/B\u00e0 <strong>{{EMPLOYEE_NAME}}</strong></p>
    <p>Ng\u00e0y sinh: {{EMPLOYEE_DOB}} - CCCD s\u1ed1: {{EMPLOYEE_ID}}</p>

    <div class="section">\u0110i\u1ec1u 1: Th\u1eddi h\u1ea1n v\u00e0 c\u00f4ng vi\u1ec7c</div>
    <p>- Ng\u00e0y b\u1eaft \u0111\u1ea7u: {{START_DATE}}</p>
    <p>- Ng\u00e0y k\u1ebft th\u00fac: {{END_DATE}}</p>

    <div class="section">\u0110i\u1ec1u 2: Ti\u1ec1n l\u01b0\u01a1ng</div>
    <p>- M\u1ee9c l\u01b0\u01a1ng c\u01a1 b\u1ea3n: {{BASE_SALARY}} ({{BASE_SALARY_WORDS}})</p>

    <div class="signature">
        <div style="text-align: center;"><strong>B\u00caN A</strong><br><br><br><br>{{COMPANY_REPRESENTATIVE}}</div>
        <div style="text-align: center;"><strong>B\u00caN B</strong><br><br><br><br>{{EMPLOYEE_NAME}}</div>
    </div>
</body>
</html>`;
