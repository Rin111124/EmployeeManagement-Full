import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api';

export enum DeviceType {
  FACE = 'face',
  FINGERPRINT = 'fingerprint',
  RFID = 'rfid',
}

export enum DeviceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface Device {
  id: string;
  _id?: string;
  device_name: string;
  ip_address: string;
  port: number;
  location: string;
  device_type: DeviceType;
  status: DeviceStatus;
  can_access_db: boolean;
  last_sync: string;
}

const deviceService = {
  getDevices: async (params?: any) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return apiGet(`/devices${qs ? '?' + qs : ''}`);
  },

  createDevice: async (data: Partial<Device>) => {
    return apiPost('/devices', data);
  },

  updateDevice: async (id: string, data: Partial<Device>) => {
    return apiPatch(`/devices/${id}`, data);
  },

  deleteDevice: async (id: string) => {
    return apiDelete(`/devices/${id}`);
  },

  approveDevice: async (id: string) => {
    return apiPatch(`/devices/${id}/approve`, {});
  },

  rejectDevice: async (id: string) => {
    return apiPatch(`/devices/${id}/reject`, {});
  },

  toggleDbAccess: async (id: string, can_access_db: boolean) => {
    return apiPatch(`/devices/${id}/toggle-db-access`, { can_access_db });
  },

  testConnection: async (id: string) => {
    return apiPost(`/devices/${id}/test-connection`, {});
  },

  syncData: async (id: string) => {
    return apiPost(`/devices/${id}/sync`, {});
  },

  getLatestFrame: async (id: string) => {
    return apiGet(`/devices/${id}/latest-frame`);
  }
};

export default deviceService;
