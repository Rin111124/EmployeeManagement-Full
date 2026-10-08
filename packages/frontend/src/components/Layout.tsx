import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 md:pl-[60px]">
        <Topbar />
        {user?.require_2fa_setup && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-300 font-medium">
              <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 animate-pulse" />
              <span>
                <strong>Yêu cầu bảo mật:</strong> Tài khoản của bạn thuộc nhóm Quản trị / Nhân sự và bắt buộc kích hoạt Xác thực 2 yếu tố (2FA).
              </span>
            </div>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
            >
              Cài đặt ngay <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
