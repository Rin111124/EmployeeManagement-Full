export type Employee = {
    _id?: string;
    employee_code?: string;
    full_name: string;
    // Flat fields (mapped từ contact object của backend)
    email?: string;
    phone?: string;
    // Nested contact object từ backend
    contact?: {
        phone?: string;
        email?: string;
        permanent_address?: string;
        current_address?: string;
    };
    department?: string;
    position?: string;
    status?: 'Active' | 'Inactive' | 'Terminated';
    hire_date?: string;
    gender?: string;
    avatar?: string;
    // Allow any extra backend fields
    [key: string]: any;
};
