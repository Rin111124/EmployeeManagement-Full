import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Building,
  ShieldCheck,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { isAuthenticated, register, isLoading, error } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Only admins can create new users
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setPasswordError(null);

    const form = e.target as HTMLFormElement;
    const username = (form.querySelector('#username') as HTMLInputElement).value.trim().toLowerCase();
    const password = (form.querySelector('#password') as HTMLInputElement).value;
    const confirmPassword = (form.querySelector('#confirm') as HTMLInputElement).value;
    const employeeId = (form.querySelector('#employee_id') as HTMLSelectElement).value;

    // Validate passwords match
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    try {
      await register({
        username,
        password,
        employee_id: employeeId,
        roles: ['Employee'], // Default role, can be extended for role selection
      });
      navigate('/employees');
    } catch (err) {
      // Error is already set in auth context
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full bg-white rounded-[2.5rem] shadow-2xl shadow-primary-container/10 border border-outline-variant/30 flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-700">
        {/* Sidebar Info */}
        <div className="hidden md:block w-72 bg-surface/50 border-r border-outline-variant/20 p-10 space-y-12 shrink-0">
          <Link to="/login" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center border-2 border-secondary/20">
              <ShieldCheck className="text-secondary" size={20} strokeWidth={2.5} />
            </div>
            <span className="text-lg font-black text-primary-container tracking-tighter uppercase leading-none">I-HR</span>
          </Link>

          <div className="space-y-8">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-secondary/5 text-secondary flex items-center justify-center font-black">1</div>
              <h3 className="text-xs font-black text-primary-container uppercase tracking-widest">Portal Setup</h3>
              <p className="text-[10px] text-outline font-medium leading-relaxed italic">Configure your manufacturing workspace identity.</p>
            </div>
            <div className="space-y-2 opacity-50">
              <div className="w-8 h-8 rounded-full bg-surface border border-outline-variant/30 text-outline flex items-center justify-center font-black">2</div>
              <h3 className="text-xs font-black text-primary-container uppercase tracking-widest">Team Onboarding</h3>
              <p className="text-[10px] text-outline font-medium leading-relaxed italic">Import employee data and operational shifts.</p>
            </div>
            <div className="space-y-2 opacity-50">
              <div className="w-8 h-8 rounded-full bg-surface border border-outline-variant/30 text-outline flex items-center justify-center font-black">3</div>
              <h3 className="text-xs font-black text-primary-container uppercase tracking-widest">Live Operations</h3>
              <p className="text-[10px] text-outline font-medium leading-relaxed italic">Monitor real-time productivity and attendance.</p>
            </div>
          </div>

          <div className="pt-12">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-emerald-800 italic leading-relaxed">Join 1,200+ factories digitizing their workforce management.</p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 p-8 md:p-14 space-y-10">
          <div className="space-y-2 flex flex-col md:flex-row md:items-end justify-between gap-2">
            <div>
              <h1 className="text-3xl font-black text-primary-container tracking-tight">Onboard Facility</h1>
              <p className="text-sm text-outline font-medium italic">Create an admin account for your industrial hub.</p>
            </div>
            <Link to="/login" className="text-xs font-black text-secondary uppercase tracking-widest hover:underline whitespace-nowrap">Existing user?</Link>
          </div>

          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1" htmlFor="username">Username</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors" size={18} />
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="john.doe"
                  className="w-full h-11 pl-12 pr-4 bg-surface/50 border border-outline-variant/30 rounded-xl text-sm font-bold text-primary-container focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/5 transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1" htmlFor="employee_id">Employee</label>
              <div className="relative group">
                <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors" size={18} />
                <select
                  id="employee_id"
                  required
                  className="w-full h-11 pl-12 pr-4 bg-surface/50 border border-outline-variant/30 rounded-xl text-sm font-bold text-primary-container focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/5 transition-all outline-none"
                >
                  <option value="">Select an employee</option>
                  {/* Note: In a real app, fetch employees from API */}
                  <option value="emp_001">Employee 001</option>
                  <option value="emp_002">Employee 002</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1" htmlFor="password">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors" size={18} />
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Min 8 characters"
                  className="w-full h-11 pl-12 pr-4 bg-surface/50 border border-outline-variant/30 rounded-xl text-sm font-bold text-primary-container focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/5 transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1" htmlFor="confirm">Confirm Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors" size={18} />
                <input
                  id="confirm"
                  type="password"
                  required
                  placeholder="Re-enter password"
                  className="w-full h-11 pl-12 pr-4 bg-surface/50 border border-outline-variant/30 rounded-xl text-sm font-bold text-primary-container focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/5 transition-all outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-secondary text-white rounded-xl font-black uppercase tracking-widest hover:bg-secondary-container transition-all shadow-xl shadow-secondary/10 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-wait"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Create User Account
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

            {(error || formError || passwordError) && (
              <div className="md:col-span-2">
                <div className="flex items-start gap-3 p-4 bg-rose-50 rounded-xl border border-rose-200">
                  <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-600 font-bold">
                    {error || formError || passwordError}
                  </p>
                </div>
              </div>
            )}
          </form>

          <footer className="pt-6 border-t border-outline-variant/10 text-center">
            <p className="text-[10px] font-bold text-outline-variant italic leading-relaxed max-w-lg mx-auto">
              By initiating this portal, your facility enters the next generation of workforce optimization. We ensure data redundancy and enterprise-grade security for all employee records.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
