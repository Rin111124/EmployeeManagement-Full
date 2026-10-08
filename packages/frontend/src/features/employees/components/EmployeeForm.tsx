import React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateEmployee, useUpdateEmployee } from '../hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import toast from '@/lib/toast';
import { useTranslation } from 'react-i18next';

const schema = z.object({
    employee_code: z.string().min(1, 'Required').toUpperCase(),
    full_name: z.string().min(2, 'Required'),
    date_of_birth: z.string().min(1, 'Required'),
    gender: z.string().min(1, 'Required'),
    hire_date: z.string().min(1, 'Required'),
    place_of_birth: z.string().optional(),
    identity: z.object({
        number: z.string().optional(),
        issue_date: z.string().optional().or(z.literal('')),
        issue_place: z.string().optional(),
    }).optional(),
    contact: z.object({
        email: z.string().email('Invalid email').or(z.literal('')),
        phone: z.string().optional(),
        permanent_address: z.string().optional(),
        current_address: z.string().optional(),
    }).optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    insurance: z.object({
        tax_code: z.string().optional(),
        social_insurance: z.string().optional(),
        health_insurance: z.string().optional(),
    }).optional(),
    bank_accounts: z.array(z.object({
        bank_name: z.string().min(1, 'Required'),
        account_number: z.string().min(1, 'Required'),
        is_primary: z.boolean().default(false),
    })).optional().default([]),
    status: z.enum(['Active', 'Inactive', 'Terminated']).default('Active'),
    avatar: z.string().optional().nullable(),
    create_account: z.boolean().optional(),
    account: z.object({
        username: z.string().optional(),
        password: z.string().optional(),
        role: z.enum(['Employee', 'HR', 'Manager', 'Admin']).optional(),
    }).optional(),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function EmployeeForm({
    initial,
    onDone,
    onAvatarChange,
}: {
    initial?: any;
    onDone?: (saved?: boolean) => void;
    onAvatarChange?: (avatar: string | null) => void;
}) {
    const { t } = useTranslation();
    const employeeId = initial?._id ? String(initial._id) : null;
    const avatarCacheKey = employeeId ? `employee-avatar:${employeeId}` : null;

    const getCachedAvatar = () => {
        if (!avatarCacheKey) return null;
        try {
            return localStorage.getItem(avatarCacheKey);
        } catch {
            return null;
        }
    };

    const { register, handleSubmit, setValue, watch, control, setError, formState: { errors } } = useForm<FormInput, any, FormOutput>({
        resolver: zodResolver(schema),
        defaultValues: {
            ...initial,
            date_of_birth: initial?.date_of_birth ? new Date(initial.date_of_birth).toISOString().split('T')[0] : '',
            hire_date: initial?.hire_date ? new Date(initial.hire_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            place_of_birth: initial?.place_of_birth || '',
            identity: {
                number: initial?.identity?.number || '',
                issue_date: initial?.identity?.issue_date ? new Date(initial.identity.issue_date).toISOString().split('T')[0] : '',
                issue_place: initial?.identity?.issue_place || '',
            },
            contact: {
                email: initial?.contact?.email || initial?.email || '',
                phone: initial?.contact?.phone || initial?.phone || '',
                permanent_address: initial?.contact?.permanent_address || '',
                current_address: initial?.contact?.current_address || '',
            },
            insurance: {
                tax_code: initial?.insurance?.tax_code || '',
                social_insurance: initial?.insurance?.social_insurance || '',
                health_insurance: initial?.insurance?.health_insurance || '',
            },
            bank_accounts: initial?.bank_accounts || [],
            gender: initial?.gender || 'Male',
            status: initial?.status || 'Active',
            avatar: getCachedAvatar() || initial?.avatar || null,
            create_account: false,
            account: {
                username: '',
                password: '',
                role: 'Employee',
            },
        }
    });

    const { fields: bankFields, append: appendBank, remove: removeBank } = useFieldArray({
        control,
        name: "bank_accounts"
    });

    const create = useCreateEmployee();
    const update = useUpdateEmployee();
    const { data: departments = [], isLoading: departmentsLoading } = useDepartments({ limit: 100 });

    const avatar = watch('avatar');
    const createAccount = watch('create_account');

    React.useEffect(() => {
        setValue('avatar', getCachedAvatar() || initial?.avatar || null);
    }, [employeeId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const nextAvatar = reader.result as string;
                setValue('avatar', nextAvatar);
                if (avatarCacheKey) {
                    try {
                        localStorage.setItem(avatarCacheKey, nextAvatar);
                    } catch {
                        // ignore
                    }
                }
                onAvatarChange?.(nextAvatar);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (data: FormOutput) => {
        try {
            if (initial?._id) {
                const payload = {
                    ...data,
                    date_of_birth: data.date_of_birth || null,
                    hire_date: data.hire_date || null,
                    identity: {
                        ...data.identity,
                        issue_date: data.identity?.issue_date || null
                    }
                };

                await update.mutateAsync({ id: initial._id, payload });
                toast(t('employees:updated_success'));
            } else {
                const { create_account, account, ...employeePayload } = data;
                const payload: any = { 
                    ...employeePayload,
                    date_of_birth: employeePayload.date_of_birth || null,
                    hire_date: employeePayload.hire_date || null,
                    identity: {
                        ...employeePayload.identity,
                        issue_date: employeePayload.identity?.issue_date || null
                    }
                };

                if (create_account) {
                    const username = account?.username?.trim().toLowerCase();
                    const password = account?.password || '';
                    const role = account?.role || 'Employee';

                    if (!username || password.length < 6) {
                        toast(t('employees:account_required'));
                        return;
                    }

                    payload.account = { username, password, roles: [role] };
                }

                await create.mutateAsync(payload);
                toast(t('employees:created_success'));
            }
            onDone && onDone(true);
        } catch (e: any) {
            console.error('Save failed:', e.response || e);
            const data = e.response;
            
            if (e.status === 409 && data?.details) {
                // Highlight specific fields in the form
                Object.keys(data.details).forEach((key) => {
                    // Map backend field names to frontend form paths if necessary
                    let formKey = key;
                    if (key === 'username') formKey = 'account.username';
                    
                    setError(formKey as any, {
                        type: 'manual',
                        message: t('common:duplicate_value')
                    });
                });
                toast(`${t('employees:save_failed')}: ${t('common:duplicate_value')}`);
            } else if (data?.message) {
                toast(data.message);
            } else {
                toast(t('employees:save_failed'));
            }
        }
    };

    const handleCancel = () => {
        onAvatarChange?.(initial?.avatar || null);
        onDone && onDone(false);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-surface/30 p-6 rounded-2xl border border-outline-variant/30 max-h-[85vh] overflow-y-auto custom-scrollbar">
            {/* Header / Avatar */}
            <div className="flex items-center gap-6 mb-2 pb-6 border-b border-outline-variant/10">
                <div className="relative group cursor-pointer w-20 h-20 rounded-2xl bg-white border border-outline-variant/30 overflow-hidden flex items-center justify-center shadow-md">
                    {avatar ? (
                        <img src={avatar} className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-outline-variant uppercase text-[10px] font-black text-center px-2">{t('employees:no_image')}</div>
                    )}
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-[10px] text-white font-black uppercase">{t('employees:upload')}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                </div>
                <div>
                    <h3 className="text-lg font-black text-primary-container leading-none mb-1">
                        {initial ? t('employees:form_edit') : t('employees:form_new')}
                    </h3>
                    <p className="text-[11px] text-outline font-bold uppercase tracking-widest">{t('employees:form_subtitle')}</p>
                </div>
            </div>

            {/* Basic Info Group */}
            <div className="space-y-4">
                <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    {t('employees:personal_info')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('common:employee_code')} *</label>
                        <input {...register('employee_code')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                        {errors.employee_code && <div className="text-rose-600 text-[10px] font-bold mt-1 uppercase">{errors.employee_code.message}</div>}
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('common:full_name')} *</label>
                        <input {...register('full_name')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                        {errors.full_name && <div className="text-rose-600 text-[10px] font-bold mt-1 uppercase">{errors.full_name.message}</div>}
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('employees:gender')} *</label>
                        <select {...register('gender')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all">
                            <option value="Male">{t('employees:gender_male')}</option>
                            <option value="Female">{t('employees:gender_female')}</option>
                            <option value="Other">{t('employees:gender_other')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('employees:dob')} *</label>
                        <input type="date" {...register('date_of_birth')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('employees:pob')}</label>
                        <input {...register('place_of_birth')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('employees:hire_date')} *</label>
                        <input type="date" {...register('hire_date')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('common:departments')}</label>
                        <Controller
                            name="department"
                            control={control}
                            render={({ field }) => (
                                <SearchableSelect
                                    options={departments.map((d: any) => ({ value: d.department_name, label: d.department_name }))}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder={t('employees:select_department')}
                                    disabled={departmentsLoading}
                                    error={errors.department?.message}
                                />
                            )}
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('common:position')}</label>
                        <input {...register('position')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('common:status')}</label>
                        <select {...register('status')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all">
                            <option value="Active">{t('common:active')}</option>
                            <option value="Inactive">{t('common:inactive')}</option>
                            <option value="Terminated">{t('employees:terminated')}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Identity Group */}
            <div className="bg-white/50 p-5 rounded-2xl border border-outline-variant/20 space-y-4">
                <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    {t('employees:identity_residency')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('employees:national_id')}</label>
                        <input {...register('identity.number')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-surface/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('employees:issue_date')}</label>
                        <input type="date" {...register('identity.issue_date')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-surface/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('employees:issue_place')}</label>
                        <input {...register('identity.issue_place')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-surface/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('common:email')}</label>
                        <input {...register('contact.email')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-surface/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                        {errors.contact?.email && <div className="text-rose-600 text-[10px] font-bold mt-1 uppercase">{errors.contact.email.message}</div>}
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('common:phone')}</label>
                        <input {...register('contact.phone')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-surface/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('employees:permanent_address')}</label>
                        <input {...register('contact.permanent_address')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-surface/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('employees:current_address')}</label>
                        <input {...register('contact.current_address')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-surface/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                    </div>
                </div>
            </div>

            {/* Insurance / Tax Group */}
            <div className="bg-white/50 p-5 rounded-2xl border border-outline-variant/20 space-y-4">
                <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    {t('employees:insurance_tax')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('employees:tax_id')}</label>
                        <input {...register('insurance.tax_code')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-surface/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('employees:insurance_book')}</label>
                        <input {...register('insurance.social_insurance')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-surface/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('employees:health_insurance')}</label>
                        <input {...register('insurance.health_insurance')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-surface/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                    </div>
                </div>
            </div>

            {/* Bank Accounts Group */}
            <div className="bg-white/50 p-5 rounded-2xl border border-outline-variant/20 space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-secondary"></span>
                        {t('employees:bank_accounts')}
                    </h4>
                    <button type="button" onClick={() => appendBank({ bank_name: '', account_number: '', is_primary: bankFields.length === 0 })} className="text-[10px] font-black text-secondary uppercase hover:bg-secondary/10 px-3 py-1 rounded-full transition-colors">+ {t('common:add')}</button>
                </div>
                <div className="space-y-3">
                    {bankFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-surface/40 p-4 rounded-xl border border-outline-variant/10 shadow-sm">
                            <div className="md:col-span-5">
                                <label className="text-[9px] font-black text-outline uppercase mb-1.5 block">Ngân hàng</label>
                                <input {...register(`bank_accounts.${index}.bank_name` as const)} className="w-full p-2 border border-outline-variant/20 rounded-lg text-xs" />
                            </div>
                            <div className="md:col-span-5">
                                <label className="text-[9px] font-black text-outline uppercase mb-1.5 block">Số tài khoản</label>
                                <input {...register(`bank_accounts.${index}.account_number` as const)} className="w-full p-2 border border-outline-variant/20 rounded-lg text-xs" />
                            </div>
                            <div className="md:col-span-2 flex items-center justify-between gap-3 px-2">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" {...register(`bank_accounts.${index}.is_primary` as const)} className="w-3.5 h-3.5 rounded border-outline-variant/40 text-secondary" />
                                    <span className="text-[9px] font-black text-outline uppercase group-hover:text-secondary transition-colors">Chính</span>
                                </label>
                                <button type="button" onClick={() => removeBank(index)} className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                    {bankFields.length === 0 && <p className="text-xs text-outline italic text-center py-4">{t('employees:no_bank_accounts')}</p>}
                </div>
            </div>

            {/* Account Creation (New Only) */}
            {!initial?._id && (
                <div className="p-6 rounded-2xl border-2 border-dashed border-outline-variant/30 bg-surface/50 space-y-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" {...register('create_account')} className="w-5 h-5 rounded border-outline-variant/40 text-secondary focus:ring-secondary transition-all" />
                        <span className="text-sm font-black text-primary group-hover:text-secondary transition-colors">{t('employees:create_account_for_employee')}</span>
                    </label>
                    {createAccount && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('auth:username')} *</label>
                                <input {...register('account.username')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('auth:password')} *</label>
                                <input type="password" {...register('account.password')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all" />
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-outline uppercase tracking-wider block mb-1.5">{t('employees:role')}</label>
                                <select {...register('account.role')} className="w-full p-2.5 border border-outline-variant/40 rounded-xl text-sm bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all">
                                    <option value="Employee">{t('common:employee')}</option>
                                    <option value="HR">HR</option>
                                    <option value="Manager">{t('employees:role_manager')}</option>
                                    <option value="Admin">{t('employees:role_admin')}</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-outline-variant/10 sticky bottom-0 bg-surface/90 backdrop-blur-md">
                <button type="button" onClick={handleCancel} className="px-6 py-2.5 border border-outline-variant/40 text-outline hover:bg-white hover:text-primary rounded-xl text-xs font-black uppercase tracking-widest transition-all">{t('common:cancel')}</button>
                <button type="submit" disabled={create.isPending || update.isPending} className="px-8 py-2.5 bg-secondary text-white hover:bg-secondary/90 shadow-lg shadow-secondary/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50">
                    {create.isPending || update.isPending ? t('employees:saving') : t('employees:save_employee')}
                </button>
            </div>
        </form>
    );
}
