import React from 'react';
import { X, Clock, User, Calendar, MapPin, Activity } from 'lucide-react';
import { useAttendanceHistory } from '../../hooks/useAttendance';
import { format } from 'date-fns';

interface DeviceLogsModalProps {
  device: any;
  onClose: () => void;
}

export default function DeviceLogsModal({ device, onClose }: DeviceLogsModalProps) {
  const deviceId = device?._id || device?.id;
  const { data: logs, isLoading } = useAttendanceHistory({ device_id: deviceId, limit: 50 });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
       <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">
         
         {/* Header */}
         <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
           <div>
             <div className="flex items-center gap-3">
               <Activity className="text-blue-500" size={24} />
               <h3 className="font-black text-slate-900 uppercase tracking-widest text-lg">
                 Terminal Logs
               </h3>
             </div>
             <p className="text-slate-500 text-sm mt-1 font-medium">
               Real-time attendance events for {device?.device_name}
             </p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-900">
             <X size={24} />
           </button>
         </div>

         {/* Content */}
         <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
           {isLoading ? (
             <div className="flex flex-col items-center justify-center h-48 space-y-4">
               <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
               <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Loading Logs...</p>
             </div>
           ) : !logs || logs.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-48 space-y-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                 <Clock className="text-slate-300" size={32} />
               </div>
               <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No attendance events recorded</p>
             </div>
           ) : (
             <div className="space-y-4">
               {logs.map((log: any, index: number) => {
                 const emp = log.employee_id || {};
                 const isCheckIn = log.status === 'CheckedIn';
                 
                 return (
                   <div key={log._id || index} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
                     
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                         {emp.avatar ? (
                           <img src={emp.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
                         ) : (
                           <User className="text-slate-400" size={24} />
                         )}
                       </div>
                       <div>
                         <h4 className="font-bold text-slate-900">{emp.full_name || 'Unknown Employee'}</h4>
                         <p className="text-xs text-slate-500 font-medium">ID: {emp.employee_code || 'N/A'} • {emp.department || 'No Dept'}</p>
                       </div>
                     </div>

                     <div className="flex items-center gap-6">
                       <div className="flex flex-col items-end">
                         <div className="flex items-center gap-2">
                           <Calendar size={14} className="text-slate-400" />
                           <span className="text-sm font-bold text-slate-700">
                             {format(new Date(log.work_date), 'dd MMM yyyy')}
                           </span>
                         </div>
                         <div className="flex items-center gap-2 mt-1">
                           <Clock size={14} className="text-slate-400" />
                           <span className="text-xs font-mono font-medium text-slate-500">
                             IN: {log.check_in ? format(new Date(log.check_in), 'HH:mm') : '--:--'} 
                             {' '}|{' '} 
                             OUT: {log.check_out ? format(new Date(log.check_out), 'HH:mm') : '--:--'}
                           </span>
                         </div>
                       </div>
                       
                       <div className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shrink-0 ${
                         log.status === 'CheckedOut' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'
                       }`}>
                         {log.status === 'CheckedIn' ? 'In Progress' : 'Completed'}
                       </div>
                     </div>
                     
                   </div>
                 );
               })}
             </div>
           )}
         </div>

       </div>
    </div>
  );
}
