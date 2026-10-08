import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import deviceService, { Device } from '../services/device.service';

export const useDevices = (params?: any) => {
  return useQuery({
    queryKey: ['devices', params],
    queryFn: () => deviceService.getDevices(params),
  });
};

export const useCreateDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Device>) => deviceService.createDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
};

export const useUpdateDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Device> }) => 
      deviceService.updateDevice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
};

export const useDeleteDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deviceService.deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
};

export const useApproveDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deviceService.approveDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
};

export const useRejectDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deviceService.rejectDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
};

export const useToggleDbAccess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, can_access_db }: { id: string; can_access_db: boolean }) => 
      deviceService.toggleDbAccess(id, can_access_db),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
};

export const useSyncDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deviceService.syncData(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
};

export const useTestConnection = () => {
  return useMutation({
    mutationFn: (id: string) => deviceService.testConnection(id),
  });
};
