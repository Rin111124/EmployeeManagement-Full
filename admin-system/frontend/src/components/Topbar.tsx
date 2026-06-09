import { Search, Bell, HelpCircle, Settings, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

export default function Topbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

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
