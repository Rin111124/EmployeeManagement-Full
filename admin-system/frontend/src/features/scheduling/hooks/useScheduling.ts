import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    useShifts,
    useShiftAssignments,
    useCreateShift,
    useUpdateShift,
    useDeleteShift,
    useCreateShiftAssignment,
    useDeleteShiftAssignment,
    useBulkAssignShifts,
    useUpdateShiftAssignment,
} from '../../../hooks/useShifts';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { useDepartments } from '../../../hooks/useDepartments';
import { useTimeConfig } from '../../../hooks/useSettings';
import toast from '../../../lib/toast';
import { Shift, ShiftFormData, BulkAssignData, ShiftAssignment } from '../types';

export function getWeekDays(baseDate: Date) {
    const dow = baseDate.getDay();
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

export function useScheduling() {
    const { t, i18n } = useTranslation();
    const [weekOffset, setWeekOffset] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);
    const weekDays = getWeekDays(baseDate);

    const weekStart = weekDays[0].toISOString().split('T')[0];
    const weekEnd = weekDays[6].toISOString().split('T')[0];

    const { data: rawShifts = [], isLoading: loadingShifts } = useShifts({ limit: 50 });
    const shifts: Shift[] = Array.isArray(rawShifts) ? rawShifts : ((rawShifts as any)?.items || []);

    const { data: rawAssignments = [], isLoading: loadingAssignments } = useShiftAssignments({
        from: weekStart,
        to: weekEnd,
        limit: 100,
    });
    const assignments: ShiftAssignment[] = Array.isArray(rawAssignments)
        ? rawAssignments
        : ((rawAssignments as any)?.items || []);

    const createShift = useCreateShift();
    const updateShift = useUpdateShift();
    const deleteShift = useDeleteShift();
    const createAssignment = useCreateShiftAssignment();
    const updateAssignment = useUpdateShiftAssignment();
    const deleteAssignment = useDeleteShiftAssignment();
    const bulkAssign = useBulkAssignShifts();

    const { data: empData } = useEmployees({ limit: 100 });
    const { data: rawDepts = [] } = useDepartments({ limit: 100 });
    const departments: any[] = Array.isArray(rawDepts) ? rawDepts : ((rawDepts as any)?.items || []);
    const { data: timeConfig } = useTimeConfig();

    let employees: any[] = [];
    if (Array.isArray(empData)) employees = empData;
    else if (Array.isArray(empData?.items)) employees = empData.items;
    else if (Array.isArray(empData?.data)) employees = empData.data;
    else if (Array.isArray(empData?.data?.items)) employees = empData.data.items;

    const [showShiftForm, setShowShiftForm] = useState(false);
    const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
    const [shiftFormData, setShiftFormData] = useState<ShiftFormData>({
        shift_name: '',
        start_time: '08:00',
        end_time: '17:00',
        standard_hours: 8,
        break_mins: 30,
        min_work_mins_for_break: 240,
    });

    const [assignModal, setAssignModal] = useState<{ shiftId: string; date: string; existing: ShiftAssignment[] } | null>(null);
    const [assignEmpId, setAssignEmpId] = useState('');

    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedDept, setSelectedDept] = useState('');
    const [bulkData, setBulkData] = useState<BulkAssignData>({
        employee_ids: [],
        shift_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
        days_of_week: [1, 2, 3, 4, 5],
        create_holiday_overtime: false,
    });

    const handleSaveShift = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingShiftId) {
                await updateShift.mutateAsync({ id: editingShiftId, payload: shiftFormData });
                toast(t('common:success'), 'success');
            } else {
                await createShift.mutateAsync(shiftFormData);
                toast(t('common:success'), 'success');
            }
            setShowShiftForm(false);
            setEditingShiftId(null);
            setShiftFormData({ shift_name: '', start_time: '08:00', end_time: '17:00', standard_hours: 8, break_mins: 30, min_work_mins_for_break: 240 });
        } catch (err: any) {
            toast(err?.response?.data?.message || err?.message || t('common:error'), 'error');
        }
    };

    const handleEditShift = (shift: Shift) => {
        setEditingShiftId(shift._id);
        setShiftFormData({
            shift_name: shift.shift_name,
            start_time: shift.start_time,
            end_time: shift.end_time,
            standard_hours: shift.standard_hours,
            break_mins: shift.break_mins ?? 30,
            min_work_mins_for_break: shift.min_work_mins_for_break ?? 240,
        });
        setShowShiftForm(true);
    };

    const handleDeleteShift = async (shiftId: string) => {
        if (!confirm(t('common:confirm'))) return;
        try {
            await deleteShift.mutateAsync(shiftId);
            toast(t('common:success'), 'success');
        } catch (err: any) {
            toast(err?.response?.data?.message || err?.message || t('common:error'), 'error');
        }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignModal || !assignEmpId) return;
        if (assignModal.existing.some((item: any) => (item.employee_id?._id || item.employee_id) === assignEmpId)) {
            toast(t('scheduling:emp_already_assigned') || 'Employee already assigned', 'error');
            return;
        }
        try {
            const res = await createAssignment.mutateAsync({
                employee_id: assignEmpId,
                shift_id: assignModal.shiftId,
                work_date: assignModal.date,
            });
            toast(t('common:success'), 'success');
            const newAssignment = res?.data || res;
            setAssignModal({
                ...assignModal,
                existing: [...assignModal.existing, newAssignment],
            });
            setAssignEmpId('');
        } catch (err: any) {
            toast(err?.response?.data?.message || err?.message || t('common:error'), 'error');
        }
    };

    const handleRemoveAssignment = async (assignmentId: string) => {
        if (!confirm(t('common:confirm'))) return;
        try {
            await deleteAssignment.mutateAsync(assignmentId);
            toast(t('common:success'), 'success');
        } catch (err: any) {
            toast(err?.response?.data?.message || err?.message || t('common:error'), 'error');
        }
    };

    const handleMoveAssignment = async (assignmentId: string, targetShiftId: string) => {
        try {
            await updateAssignment.mutateAsync({ id: assignmentId, payload: { shift_id: targetShiftId } });
            toast(t('common:success'), 'success');
            if (assignModal) {
                setAssignModal({
                    ...assignModal,
                    existing: assignModal.existing.map((item: any) =>
                        item._id === assignmentId ? { ...item, shift_id: targetShiftId } : item
                    ),
                });
            }
        } catch (err: any) {
            toast(err?.response?.data?.message || err?.message || t('common:error'), 'error');
        }
    };

    const handleDeptSelect = (deptName: string) => {
        setSelectedDept(deptName);
        if (!deptName) {
            setBulkData({ ...bulkData, employee_ids: employees.map((e) => e._id) });
        } else {
            const deptEmps = employees.filter((e) => e.department === deptName || e.department?.name === deptName);
            setBulkData({ ...bulkData, employee_ids: deptEmps.map((e) => e._id) });
        }
    };

    const handleBulkAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await bulkAssign.mutateAsync(bulkData);
            const data = res?.data || res;
            const count = data?.count ?? 0;
            const holidaysSkipped = data?.holidays_skipped ?? 0;
            const holidayOtCreated = data?.holiday_overtime_created ?? 0;
            const holidayDetails = holidaysSkipped > 0
                ? ` (${holidaysSkipped} holiday dates skipped${holidayOtCreated > 0 ? `, ${holidayOtCreated} holiday OT created` : ''})`
                : '';
            toast(t('common:success') + holidayDetails, 'success');
            setShowBulkModal(false);
            setBulkData({
                employee_ids: [],
                shift_id: '',
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
                days_of_week: [1, 2, 3, 4, 5],
                create_holiday_overtime: false,
            });
            setSelectedDept('');
        } catch (err: any) {
            toast(err?.response?.data?.message || err?.message || t('common:error'), 'error');
        }
    };

    const scheduledCount = useMemo(() => {
        const uniqueEmps = new Set(
            assignments.map((a: any) => a.employee_id?._id || a.employee_id).filter(Boolean)
        );
        return uniqueEmps.size;
    }, [assignments]);

    return {
        t,
        i18n,
        weekOffset,
        setWeekOffset,
        searchQuery,
        setSearchQuery,
        weekDays,
        weekStart,
        weekEnd,
        shifts,
        assignments,
        employees,
        departments,
        timeConfig,
        loadingShifts,
        loadingAssignments,
        createShift,
        updateShift,
        deleteShift,
        createAssignment,
        deleteAssignment,
        bulkAssign,
        showShiftForm,
        setShowShiftForm,
        editingShiftId,
        setEditingShiftId,
        shiftFormData,
        setShiftFormData,
        assignModal,
        setAssignModal,
        assignEmpId,
        setAssignEmpId,
        showBulkModal,
        setShowBulkModal,
        selectedDept,
        bulkData,
        setBulkData,
        handleSaveShift,
        handleEditShift,
        handleDeleteShift,
        handleAssign,
        handleRemoveAssignment,
        handleMoveAssignment,
        handleDeptSelect,
        handleBulkAssign,
        scheduledCount,
    };
}
