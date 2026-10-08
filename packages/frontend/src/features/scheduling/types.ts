export interface Shift {
    _id: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    standard_hours: number;
    break_mins?: number;
    min_work_mins_for_break?: number;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ShiftAssignment {
    _id: string;
    employee_id: {
        _id: string;
        full_name?: string;
        employee_code?: string;
        department?: string;
    };
    shift_id: Shift | string;
    work_date: string;
    note?: string;
}

export interface ShiftFormData {
    shift_name: string;
    start_time: string;
    end_time: string;
    standard_hours: number;
    break_mins: number;
    min_work_mins_for_break: number;
}

export interface BulkAssignData {
    employee_ids: string[];
    shift_id: string;
    start_date: string;
    end_date: string;
    days_of_week: number[];
    create_holiday_overtime: boolean;
}
