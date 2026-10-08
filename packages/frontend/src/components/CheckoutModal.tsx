import React, { useState } from 'react';
import { Clock, X } from 'lucide-react';
import { useUpdateAttendance } from '../hooks/useAttendance';

interface CheckoutModalProps {
    record: any;
    onClose: () => void;
}

export default function CheckoutModal({ record, onClose }: CheckoutModalProps) {
    const { mutate: updateAttendance, isPending } = useUpdateAttendance();
    const [checkOutTime, setCheckOutTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Combine local date and time input
        const date = new Date(record.work_date);
        // Using en-CA locale gives YYYY-MM-DD in local time
        const datePart = date.toLocaleDateString('en-CA'); 
        const fullCheckOut = new Date(`${datePart}T${checkOutTime}:00`);

        updateAttendance({ 
            id: record._id, 
            payload: { check_out: fullCheckOut.toISOString() } 
        }, {
            onSuccess: () => {
                onClose();
                window.location.reload();
            },
            onError: (err: any) => {
                alert(err?.response?.data?.message || 'Failed to update record');
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-outline-variant/10">
                <div className="px-8 py-6 bg-secondary text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Manual Checkout</h3>
                        <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-0.5">
                            For {record.employee_id?.full_name || 'Employee'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="p-4 bg-surface rounded-2xl border border-outline-variant/20 flex items-center gap-4">
                            <div className="p-2 bg-white rounded-xl shadow-sm text-secondary">
                                <Clock size={20} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-outline uppercase tracking-wider mb-1">Check-out Time</label>
                                <input 
                                    type="time" 
                                    required
                                    value={checkOutTime}
                                    onChange={(e) => setCheckOutTime(e.target.value)}
                                    className="w-full bg-transparent text-sm font-bold text-primary-container focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-2xl border border-outline-variant/30 text-outline text-xs font-black uppercase tracking-widest hover:bg-surface transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isPending}
                            className="flex-2 px-8 h-12 bg-secondary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-secondary/25 disabled:opacity-50"
                        >
                            {isPending ? 'Saving...' : 'Confirm Checkout'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
