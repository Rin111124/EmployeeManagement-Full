import { useState, useEffect } from 'react';
import { Search, Bell, HelpCircle, Settings, LogOut, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { API_BASE } from '../lib/api';

export default function Topbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [serverStatus, setServerStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [isRetrying, setIsRetrying] = useState(false);

  const checkServerHealth = async () => {
    try {
      const healthUrl = API_BASE.replace(/\/api\/v1\/?$/, '') + '/health';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(healthUrl, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        setServerStatus('connected');
      } else {
        setServerStatus('disconnected');
      }
    } catch {
      setServerStatus('disconnected');
    }
  };

  useEffect(() => {
    checkServerHealth();
    const interval = setInterval(checkServerHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    setServerStatus('connecting');
    await checkServerHealth();
    setIsRetrying(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 border-b border-outline-variant/30 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center flex-1 max-w-md relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors" size={18} />
        <input
          type="text"
          placeholder={t('common:global_search_placeholder')}
          className="w-full h-10 pl-10 pr-4 bg-surface border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/5 transition-all outline-none"
        />
      </div>

      <div className="flex items-center gap-2 md:gap-4 ml-4">
        {/* Server Connection Status Indicator */}
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          type="button"
          title={
            serverStatus === 'connected'
              ? 'Máy chủ đang hoạt động bình thường'
              : serverStatus === 'connecting'
              ? 'Đang kiểm tra kết nối tới máy chủ...'
              : 'Mất kết nối tới máy chủ! Bấm để thử lại ngay'
          }
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            serverStatus === 'connected'
              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 hover:bg-emerald-500/15'
              : serverStatus === 'connecting'
              ? 'bg-amber-500/10 text-amber-700 border-amber-500/25 animate-pulse'
              : 'bg-rose-500/10 text-rose-700 border-rose-500/30 hover:bg-rose-500/15 shadow-sm'
          }`}
        >
          {serverStatus === 'connected' ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Wifi size={13} className="text-emerald-600" />
              <span>Máy chủ: Trực tuyến</span>
            </>
          ) : serverStatus === 'connecting' ? (
            <>
              <RefreshCw size={13} className="animate-spin text-amber-600" />
              <span>Đang kết nối máy chủ...</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <WifiOff size={13} className="text-rose-600" />
              <span>Mất kết nối máy chủ (Thử lại)</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-1 border-r border-outline-variant/30 pr-4">
          <button className="p-2 text-outline hover:text-secondary hover:bg-surface rounded-full transition-all relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
          </button>
          <button className="p-2 text-outline hover:text-secondary hover:bg-surface rounded-full transition-all">
            <HelpCircle size={20} />
          </button>
          <button className="p-2 text-outline hover:text-secondary hover:bg-surface rounded-full transition-all">
            <Settings size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button onClick={handleLogout} className="p-2 text-outline hover:text-rose-600 rounded-md flex items-center gap-2 transition-colors">
            <LogOut size={16} />
            <span className="text-sm font-bold">{t('common:logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
