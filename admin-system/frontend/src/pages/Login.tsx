import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const username = (form.querySelector('#username') as HTMLInputElement).value.trim().toLowerCase();
    const password = (form.querySelector('#password') as HTMLInputElement).value;

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      // Error is already set in auth context
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Left Decoration - Industrial Aesthetic */}
      <div className="hidden md:flex md:w-1/2 bg-primary-container relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        </div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute right-0 top-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary to-transparent" />

        <div className="relative z-10 p-16 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-3 mb-12 animate-in slide-in-from-left duration-700">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border-4 border-secondary shadow-2xl shadow-secondary/20">
                <ShieldCheck className="text-secondary" size={28} strokeWidth={2.5} />
              </div>
              <span className="text-3xl font-black text-white tracking-widest uppercase">Industrial<span className="text-secondary">HR</span></span>
            </div>

            <div className="max-w-md space-y-6 animate-in slide-in-from-left duration-1000 delay-150">
              <h2 className="text-5xl font-black text-white leading-tight tracking-tight">{t('auth:marketing_headline')}</h2>
              <p className="text-white/60 text-lg font-medium leading-relaxed italic">{t('auth:marketing_desc')}</p>
            </div>
          </div>

          <div className="flex items-center gap-8 text-white/40 font-black text-[10px] uppercase tracking-[0.2em] animate-in slide-in-from-bottom duration-700 delay-300">
            <span>{t('auth:iso_certified')}</span>
            <span>{t('auth:gdpr_compliant')}</span>
            <span>{t('auth:encrypted')}</span>
          </div>
        </div>
      </div>

      {/* Right Content - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-16 bg-white">
        <div className="w-full max-w-sm space-y-10 animate-in fade-in slide-in-from-right duration-700">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-primary-container tracking-tight">{t('auth:system_login')}</h1>
            <p className="text-outline font-medium italic">{t('auth:credentials_hint')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1" htmlFor="username">{t('auth:username')}</label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors" size={18} />
                  <input
                    id="username"
                    type="text"
                    required
                    placeholder="admin"
                    className="w-full h-12 pl-12 pr-4 bg-surface/50 border border-outline-variant/30 rounded-xl text-sm font-bold text-primary-container focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/5 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-end mb-0.5 px-1">
                  <label className="text-[10px] font-black text-outline uppercase tracking-widest" htmlFor="password">{t('auth:password')}</label>
                  <Link to="#" className="text-[10px] font-black text-secondary tracking-widest uppercase hover:underline">{t('auth:lost_access')}</Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors" size={18} />
                  <input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full h-12 pl-12 pr-4 bg-surface/50 border border-outline-variant/30 rounded-xl text-sm font-bold text-primary-container focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/5 transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-outline-variant/30 text-secondary focus:ring-secondary cursor-pointer" />
              <label htmlFor="remember" className="text-xs font-bold text-outline cursor-pointer select-none">{t('auth:remember_me')}</label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-primary-container text-white rounded-xl font-black uppercase tracking-widest hover:opacity-95 transition-all shadow-xl shadow-primary-container/20 flex items-center justify-center gap-2 group relative overflow-hidden disabled:opacity-70 disabled:cursor-wait"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {t('auth:login_button')}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="text-sm text-rose-600 font-bold text-center">{error}</div>
          )}

          <p className="text-center text-xs font-bold text-outline">
            {t('auth:unauthorized')} <Link to="/register" className="text-secondary hover:underline ml-1">{t('auth:create_account')}</Link>
          </p>

          <div className="pt-8 border-t border-outline-variant/20">
            <div className="flex items-start gap-3 p-4 bg-surface rounded-xl border border-outline-variant/20 italic">
              <AlertCircle size={18} className="text-outline shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-outline-variant">
                {t('auth:protocol_notice')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
