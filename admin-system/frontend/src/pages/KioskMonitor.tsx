import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, Camera, CircleDot, Monitor, RefreshCw, WifiOff } from 'lucide-react';
import { API_BASE } from '../lib/api';
import { useDevices } from '../hooks/useDevices';
import deviceService from '../services/device.service';

type KioskFrame = {
  device_id: string;
  device_name: string;
  terminal_id?: string | null;
  location?: string;
  ip_address?: string;
  image: string;
  captured_at: string;
  received_at: string;
};

function getSocketUrl() {
  return API_BASE.replace(/\/api\/v1\/?$/, '');
}

function formatTime(value?: string) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

export default function KioskMonitor() {
  const { id = '' } = useParams();
  const { data: devices } = useDevices();
  const [socketState, setSocketState] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [frame, setFrame] = useState<KioskFrame | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const deviceList = Array.isArray(devices) ? devices : (Array.isArray(devices?.data) ? devices.data : []);
  const device = useMemo(
    () => deviceList.find((item: any) => (item._id || item.id) === id),
    [deviceList, id],
  );

  useEffect(() => {
    if (!id) return;

    const socket: Socket = io(getSocketUrl(), {
      transports: ['polling', 'websocket'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      setSocketState('connected');
      setLastError(null);
      socket.emit('kiosk:join', { deviceId: id });
    });

    socket.on('disconnect', () => {
      setSocketState('offline');
    });

    socket.on('connect_error', (error) => {
      setSocketState('offline');
      setLastError(error.message || 'Không kết nối được WebSocket');
    });

    socket.on('kiosk:frame', (payload: KioskFrame) => {
      if (payload?.device_id === id) {
        setFrame(payload);
      }
    });

    return () => {
      socket.emit('kiosk:leave', { deviceId: id });
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const loadLatestFrame = async () => {
      try {
        const response = await deviceService.getLatestFrame(id);
        const latestFrame = response?.data;
        if (!cancelled && latestFrame?.device_id === id) {
          setFrame(latestFrame);
        }
      } catch (_error) {
        // Socket remains the primary path; polling is a quiet fallback.
      }
    };

    loadLatestFrame();
    const interval = window.setInterval(loadLatestFrame, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [id]);

  const isLive = frame && Date.now() - new Date(frame.received_at).getTime() < 5000;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/10 bg-slate-950/95 px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link to="/devices" className="rounded-xl border border-white/10 p-3 text-slate-300 hover:bg-white/10 hover:text-white">
              <ArrowLeft size={20} />
            </Link>
            <div className="rounded-2xl bg-cyan-400 p-3 text-slate-950">
              <Monitor size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">{device?.device_name || frame?.device_name || 'Kiosk Monitor'}</h1>
              <p className="text-sm font-medium text-slate-400">{device?.location || frame?.location || 'Đang chờ thông tin thiết bị'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest ${
              socketState === 'connected' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'
            }`}>
              {socketState === 'connected' ? <CircleDot size={16} /> : <WifiOff size={16} />}
              {socketState === 'connected' ? 'Socket online' : 'Socket offline'}
            </div>
            <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest ${
              isLive ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              <CircleDot size={16} />
              {isLive ? 'Live' : 'Waiting'}
            </div>
          </div>
        </div>
      </div>

      <main className="grid gap-6 p-6 xl:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          <div className="relative aspect-video w-full">
            {frame?.image ? (
              <img src={frame.image} alt="Kiosk live stream" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-900 text-slate-500">
                <Camera size={64} />
                <div className="text-center">
                  <p className="text-lg font-black uppercase text-slate-300">Chưa có stream</p>
                  <p className="text-sm">Mở kiosk mobile, duyệt thiết bị và giữ camera hoạt động.</p>
                </div>
              </div>
            )}

            <div className="absolute left-4 top-4 rounded-xl bg-black/60 px-4 py-3 font-mono text-xs backdrop-blur">
              <div>{device?.ip_address || frame?.ip_address || 'No IP'}</div>
              <div className="text-cyan-300">{frame?.terminal_id || id}</div>
            </div>

            <div className="absolute bottom-4 right-4 rounded-xl bg-black/60 px-4 py-3 font-mono text-xs backdrop-blur">
              {formatTime(frame?.received_at)}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-400">Thông tin kiosk</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Thiết bị</dt>
                <dd className="font-bold text-right">{device?.device_name || frame?.device_name || '--'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Vị trí</dt>
                <dd className="font-bold text-right">{device?.location || frame?.location || '--'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Trạng thái</dt>
                <dd className="font-bold text-right">{device?.status || '--'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Frame cuối</dt>
                <dd className="font-bold text-right">{formatTime(frame?.captured_at)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-400">Kết nối</h2>
            <p className="text-sm leading-6 text-slate-300">
              Stream dùng Socket.IO snapshot nội bộ. Thiết bị phải được approve, có token, và đang mở màn hình kiosk mobile.
            </p>
            {lastError && <p className="mt-3 rounded-xl bg-rose-500/10 p-3 text-sm font-bold text-rose-300">{lastError}</p>}
            <button
              onClick={() => window.location.reload()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-950 hover:bg-cyan-200"
            >
              <RefreshCw size={16} />
              Tải lại stream
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
