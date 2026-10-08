export interface PayrollItem {
    _id: string;
    employee_id: {
        _id: string;
        full_name: string;
        employee_code: string;
        department?: string;
    };
    month: number;
    year: number;
    base_salary: number;
    work_hours: number;
    ot_hours?: number;
    allowances?: number;
    deductions?: number;
    net_salary: number;
    status: 'Draft' | 'Approved' | 'Finalized' | 'Paid';
    created_at?: string;
    updated_at?: string;
}

export interface PayrollFilterParams {
    month?: number;
    year?: number;
    department?: string;
    status?: string;
    page?: number;
    limit?: number;
}
