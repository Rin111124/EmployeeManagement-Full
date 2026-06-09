import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Wallet,
  GraduationCap,
  CalendarDays,
  Settings,
  HelpCircle,
  LogOut,
  Plus,
  Factory,
  FileText,
  Building2,
  Monitor,
  Briefcase,
  UserRound,
  Bot,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const managementRoles = ['Admin', 'HR', 'Manager'];
  const isEmployeeOnly = user?.roles?.includes('Employee')
    && !user.roles.some((role) => managementRoles.includes(role));

  const adminNavGroups = [
    {
      label: t('common:overview'),
      items: [
        { icon: LayoutDashboard, label: t('common:dashboard'), path: '/dashboard' },
        { icon: Bot, label: t('common:chatbot'), path: '/chatbot' },
      ]
    },
    {
      label: t('common:organization'),
      items: [
        { icon: Building2, label: t('common:departments'), path: '/departments' },
        { icon: Users, label: t('common:employees'), path: '/employees' },
        { icon: Briefcase, label: t('common:contracts'), path: '/contracts' },
      ]
    },
    {
      label: t('common:operations'),
      items: [
        { icon: CalendarCheck, label: t('common:attendance'), path: '/attendance' },
        { icon: CalendarDays, label: t('common:scheduling'), path: '/scheduling' },
        { icon: FileText, label: t('common:requests'), path: '/requests' },
        { icon: Monitor, label: t('common:assets'), path: '/assets' },
        { icon: Monitor, label: t('common:devices'), path: '/devices' },
      ]
    },
    {
      label: t('common:development'),
      items: [
        { icon: Wallet, label: t('common:payroll'), path: '/payroll' },
        { icon: GraduationCap, label: t('common:training'), path: '/training' },
      ]
    },
  ];
  const employeeNavGroups = [
    {
      label: t('common:overview'),
      items: [
        { icon: UserRound, label: t('common:my_portal'), path: '/me' },
      ],
    },
  ];
  const navGroups = isEmployeeOnly ? employeeNavGroups : adminNavGroups;

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside 
      className={cn(
        "fixed top-0 left-0 bottom-0 z-[100] bg-white border-r border-outline-variant/30 flex flex-col shrink-0 shadow-xl transition-[width] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] group/sidebar",
        "w-[60px] hover:w-[240px]"
      )}
    >
      {/* Brand / Logo */}
      <div className="h-16 flex items-center px-4 overflow-hidden shrink-0">
        <div className="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm shadow-primary/20">
          <Factory size={18} />
        </div>
        <div className="ml-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[120ms] delay-[60ms] whitespace-nowrap">
          <h1 className="font-black text-primary-container text-sm leading-tight">IndustrialHR</h1>
          <p className="text-[9px] text-outline font-black uppercase tracking-widest">Portal</p>
        </div>
      </div>

      {/* Quick Action Button (Add) */}
      {!isEmployeeOnly && (
        <div className="px-3 mb-4 overflow-hidden shrink-0">
          <NavLink
            to="/employees"
            className="flex items-center justify-center w-full h-10 bg-secondary hover:bg-secondary-container text-white rounded-xl transition-all shadow-sm shadow-secondary/20"
          >
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <Plus size={20} />
            </div>
            <span className="ml-1 text-xs font-black opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[120ms] delay-[60ms] whitespace-nowrap pr-2">
              {t('common:add_employee')}
            </span>
          </NavLink>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-4 overflow-y-auto overflow-x-hidden scrollbar-hide py-2">
        {navGroups.map((group, gIdx) => (
          <div key={group.label} className="space-y-1">
            {/* Divider/Label */}
            <div className="flex items-center h-4 px-2 mb-1">
              <div className="w-6 h-[1px] bg-outline-variant/30 shrink-0" />
              <p className="ml-3 text-[9px] font-black text-outline/40 uppercase tracking-[0.2em] opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[120ms] delay-[60ms] whitespace-nowrap">
                {group.label}
              </p>
            </div>

            <div className="space-y-0.5">
              {navGroups[gIdx].items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    "flex items-center h-10 px-1 rounded-xl text-xs font-bold transition-all group/item overflow-hidden",
                    isActive
                      ? "bg-secondary/5 text-secondary"
                      : "text-outline hover:bg-surface hover:text-primary-container"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <div className={cn(
                        "w-8 h-8 ml-0.5 flex items-center justify-center rounded-lg transition-all shrink-0",
                        isActive ? "bg-white shadow-sm border border-secondary/10" : "group-hover/item:bg-white"
                      )}>
                        <item.icon size={18} className={cn("transition-colors", isActive ? "text-secondary" : "group-hover/item:text-secondary")} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <span className="ml-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[120ms] delay-[60ms] whitespace-nowrap">
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User / Settings Footer */}
      <div className="p-2 border-t border-outline-variant/20 bg-surface/10 overflow-hidden shrink-0">
        {user && (
          <div className="flex items-center h-12 px-2 mb-2 bg-white/50 rounded-xl border border-outline-variant/10 transition-all">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-md overflow-hidden">
              {(user as any).employee_id?.avatar ? (
                <img src={(user as any).employee_id.avatar} className="w-full h-full object-cover" alt={user.username} />
              ) : (
                user.username.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="ml-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[120ms] delay-[60ms] whitespace-nowrap min-w-0">
              <p className="text-[11px] font-black text-primary-container truncate">{user.username}</p>
              <p className="text-[9px] text-outline truncate font-bold uppercase tracking-tighter">
                {user.roles?.[0] || t('common:member')}
              </p>
            </div>
          </div>
        )}
        
        {!isEmployeeOnly && (
          <NavLink to="/settings" className="flex items-center h-10 px-1 rounded-xl text-xs font-bold text-outline hover:bg-white hover:text-primary transition-all group/foot">
            <div className="w-8 h-8 ml-0.5 flex items-center justify-center rounded-lg shrink-0 group-hover/foot:bg-white">
              <Settings size={18} />
            </div>
            <span className="ml-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[120ms] delay-[60ms] whitespace-nowrap">
              {t('common:settings')}
            </span>
          </NavLink>
        )}
        
        <button
          onClick={handleSignOut}
          className="w-full flex items-center h-10 px-1 rounded-xl text-xs font-bold text-outline hover:bg-rose-50 hover:text-error transition-all group/out"
        >
          <div className="w-8 h-8 ml-0.5 flex items-center justify-center rounded-lg shrink-0 group-hover/out:bg-white">
            <LogOut size={18} />
          </div>
          <span className="ml-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[120ms] delay-[60ms] whitespace-nowrap">
            {t('common:logout')}
          </span>
        </button>
      </div>
    </aside>
  );
}
