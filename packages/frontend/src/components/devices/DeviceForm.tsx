import React from 'react';
import { useForm } from 'react-hook-form';
import { Device, DeviceType } from '../../services/device.service';

interface Props {
  initialData?: Device;
  onSubmit: (data: Partial<Device>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const DeviceForm: React.FC<Props> = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: initialData || {
      device_name: '',
      ip_address: '',
      port: 8080,
      location: '',
      device_type: DeviceType.FACE
    }
  });

  const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Device Name</label>
        <input
          {...register('device_name', { required: 'Name is required' })}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border ${errors.device_name ? 'border-red-500' : ''}`}
        />
        {errors.device_name && <p className="mt-1 text-xs text-red-500">{errors.device_name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">IP Address</label>
          <input
            {...register('ip_address', { 
              required: 'IP is required',
              pattern: { value: ipPattern, message: 'Invalid IP address format' }
            })}
            placeholder="192.168.1.1"
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border ${errors.ip_address ? 'border-red-500' : ''}`}
          />
          {errors.ip_address && <p className="mt-1 text-xs text-red-500">{errors.ip_address.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Port</label>
          <input
            type="number"
            {...register('port', { required: 'Port is required', min: 1, max: 65535 })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Location</label>
        <input
          {...register('location', { required: 'Location is required' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Device Type</label>
        <select
          {...register('device_type')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        >
          <option value={DeviceType.FACE}>Face Recognition</option>
          <option value={DeviceType.FINGERPRINT}>Fingerprint</option>
          <option value={DeviceType.RFID}>RFID Reader</option>
        </select>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : initialData ? 'Update Device' : 'Add Device'}
        </button>
      </div>
    </form>
  );
};

export default DeviceForm;
