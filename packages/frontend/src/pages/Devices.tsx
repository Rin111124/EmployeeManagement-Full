import React, { useState } from 'react';
import { 
  Plus, Search, RefreshCw, Wifi, Trash2, Edit3, Settings,
  Database, ShieldCheck, ShieldAlert, Key,
  Activity, Monitor, MapPin, Cpu, Clock, AlertTriangle, Loader2, Ban
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  useDevices, useCreateDevice, useUpdateDevice, 
  useDeleteDevice, useSyncDevice, useTestConnection,
  useApproveDevice, useRejectDevice, useToggleDbAccess
} from '../hooks/useDevices';
import { Device, DeviceStatus } from '../services/device.service';
import DeviceForm from '../components/devices/DeviceForm';
import DeviceLogsModal from '../components/devices/DeviceLogsModal';
import { useTranslation } from 'react-i18next';

const Devices: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [viewLogsDevice, setViewLogsDevice] = useState<any>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const { data: devices, isLoading } = useDevices();
  const createMutation = useCreateDevice();
  const updateMutation = useUpdateDevice();
  const deleteMutation = useDeleteDevice();
  const testMutation = useTestConnection();
  const approveMutation = useApproveDevice();
  const rejectMutation = useRejectDevice();
  const toggleDbMutation = useToggleDbAccess();

  const handleApprove = (id: string) => {
    approveMutation.mutate(id, {
      onSuccess: (response: any) => {
        setGeneratedToken(response.token || response.device?.device_token);
      },
      onError: (err: any) => {
        alert(t('common:error') + ': ' + (err.message || 'Unknown'));
      }
    });
  };

  const handleReject = (id: string) => {
    if (confirm(t('common:confirm'))) {
      rejectMutation.mutate(id, {
        onError: (err: any) => {
          alert(t('common:error') + ': ' + (err.message || 'Unknown'));
        }
      });
    }
  };

  const handleToggleDb = (device: any) => {
    const id = device._id || device.id;
    if (!id) return alert(t('common:error'));
    
    toggleDbMutation.mutate({ 
      id, 
      can_access_db: !device.can_access_db 
    }, {
      onError: (err: any) => {
        alert(t('common:error') + ': ' + (err.message || 'Failed'));
      }
    });
  };

  const deviceList = Array.isArray(devices) ? devices : (Array.isArray(devices?.data) ? devices.data : []);

  const filteredDevices = deviceList.filter((d: any) => {
    const name = d.device_name || '';
    const ip = d.ip_address || '';
    const loc = d.location || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         ip.includes(searchTerm) || loc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="bg-slate-900 p-2.5 rounded-xl shadow-lg">
                <Monitor className="text-white" size={28} />
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{t('devices:title')}</h1>
          </div>
          <p className="text-slate-500 font-medium ml-12">{t('devices:description')}</p>
        </div>
        
        <div className="flex gap-4">
           <button 
             onClick={() => { setEditingDevice(null); setIsModalOpen(true); }}
             className="bg-slate-900 text-white px-6 py-4 rounded-2xl flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
           >
             <Plus size={22} strokeWidth={3} />
             <span className="font-black text-sm uppercase tracking-widest">{t('devices:add_device')}</span>
           </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder={t('devices:search_placeholder')}
            className="w-full pl-14 pr-6 py-5 bg-white rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold text-slate-700 shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
           className="px-6 py-5 bg-white border border-slate-200 rounded-2xl outline-none font-black text-xs text-slate-600 uppercase tracking-widest shadow-sm"
           value={statusFilter}
           onChange={(e) => setStatusFilter(e.target.value)}
         >
           <option value="all">📊 {t('common:all')} {t('common:status')}</option>
           <option value="pending">⏳ {t('common:pending')}</option>
           <option value="approved">✅ {t('common:approved')}</option>
        </select>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDevices.map((device: any) => {
          const deviceId = device._id || device.id;
          const isToggling = toggleDbMutation.isPending && toggleDbMutation.variables?.id === deviceId;
          const isApproving = approveMutation.isPending && approveMutation.variables === deviceId;
          const isRejecting = rejectMutation.isPending && rejectMutation.variables === deviceId;

          return (
            <div key={deviceId} className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative">
              <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-2xl font-black text-[10px] uppercase tracking-widest ${
                device.status === 'approved' ? 'bg-green-500 text-white' : device.status === 'pending' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
              }`}>
                {device.status === 'approved' ? t('common:approved') : (device.status === 'pending' ? t('common:pending') : device.status)}
              </div>

              <div className="flex items-start justify-between mb-8">
                 <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl inline-block group-hover:bg-slate-900 transition-colors">
                       <Cpu className="text-slate-400 group-hover:text-white transition-colors" size={32} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900">{device.device_name}</h3>
                       <div className="flex items-center gap-2 mt-1">
                          <Wifi size={14} className="text-green-500" />
                          <span className="text-xs font-mono font-bold text-slate-400 uppercase">{device.ip_address}</span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex flex-col gap-2">
                    <button onClick={() => setViewLogsDevice(device)} className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900" title="View Logs">
                       <Clock size={20} />
                    </button>
                    <button onClick={() => testMutation.mutate(deviceId)} className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900" title="Test Connection">
                       <Activity size={20} />
                    </button>
                    <button onClick={() => { setEditingDevice(device); setIsModalOpen(true); }} className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900" title="Edit">
                       <Edit3 size={20} />
                    </button>
                 </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                       <MapPin size={16} />
                       <span className="text-[11px] font-black uppercase tracking-wider">{t('devices:location')}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900">{device.location}</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                       <Database size={16} />
                       <span className="text-[11px] font-black uppercase tracking-wider">{t('common:status')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${device.can_access_db ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                       <span className="text-xs font-black text-slate-900">{device.can_access_db ? 'LINKED' : 'ISOLATED'}</span>
                    </div>
                 </div>
              </div>

                 <div className="mt-8 flex gap-3">
                 {device.status === 'approved' && (
                   <Link
                     to={`/devices/${deviceId}/kiosk`}
                     className="px-6 py-4 bg-cyan-50 text-cyan-700 rounded-2xl hover:bg-cyan-500 hover:text-white transition-all flex items-center"
                     title="Open kiosk monitor"
                   >
                     <Monitor size={20} />
                   </Link>
                 )}
                 {device.status === 'pending' ? (
                   <>
                     <button 
                       disabled={isApproving || isRejecting}
                       onClick={() => handleApprove(deviceId)}
                       className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-600 shadow-lg disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                     >
                       {isApproving ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16}/>}
                       {t('common:approved').toUpperCase()}
                     </button>
                     <button 
                       disabled={isApproving || isRejecting}
                       onClick={() => handleReject(deviceId)}
                       className="flex-1 bg-rose-50 text-rose-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white shadow-sm disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                     >
                       {isRejecting ? <Loader2 className="animate-spin" size={16} /> : <Ban size={16}/>}
                       {t('common:rejected').toUpperCase()}
                     </button>
                   </>
                 ) : (
                   <button 
                     disabled={isToggling}
                     onClick={() => handleToggleDb(device)}
                     className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 transition-all ${
                       device.can_access_db 
                       ? 'border-green-200 bg-green-50 text-green-600' 
                       : 'border-slate-200 text-slate-900 bg-white hover:bg-slate-50'
                     }`}
                   >
                     {isToggling ? <Loader2 className="animate-spin mx-auto" size={16} /> : (device.can_access_db ? 'Revoke DB' : 'Enable DB')}
                   </button>
                 )}
                 <button 
                   onClick={() => { if(confirm(t('common:confirm'))) deleteMutation.mutate(deviceId) }}
                   className="px-6 py-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"
                 >
                   <Trash2 size={20} />
                 </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Token Modal */}
      {generatedToken && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
           <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl border border-slate-200 text-center">
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
                 <ShieldCheck size={48} className="text-green-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight">{t('common:approved')}</h3>
              <p className="text-slate-500 font-medium mb-8">Copy this token to the node config if required.</p>
              
              <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 mb-8 select-all">
                 <div className="font-mono font-black text-slate-900 text-sm break-all leading-relaxed">
                    {generatedToken}
                 </div>
              </div>

              <button 
                onClick={() => setGeneratedToken(null)}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                {t('common:save')}
              </button>
           </div>
        </div>
      )}

      {/* Config Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
             <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <div className="flex items-center gap-3">
                  <Settings className="text-slate-900" size={24} />
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Node Config</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-2xl">×</button>
             </div>
             <div className="p-10">
               <DeviceForm 
                 initialData={editingDevice}
                 isLoading={createMutation.isPending || updateMutation.isPending}
                 onCancel={() => setIsModalOpen(false)}
                 onSubmit={(data) => {
                    const id = editingDevice?._id || editingDevice?.id;
                    if(editingDevice) updateMutation.mutate({id, data}, {onSuccess: () => setIsModalOpen(false)});
                    else createMutation.mutate(data, {onSuccess: () => setIsModalOpen(false)});
                 }}
               />
             </div>
           </div>
        </div>
      )}

      {/* Device Logs Modal */}
      {viewLogsDevice && (
        <DeviceLogsModal 
          device={viewLogsDevice} 
          onClose={() => setViewLogsDevice(null)} 
        />
      )}
    </div>
  );
};

export default Devices;
