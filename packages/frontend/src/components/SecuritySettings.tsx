import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    ShieldAlert,
    QrCode,
    Key,
    Copy,
    Check,
    Loader2,
    Lock,
    Smartphone,
    LogOut,
    RefreshCw,
    AlertTriangle,
} from 'lucide-react';
import api from '../lib/api';
import toast from '../lib/toast';

interface SessionItem {
    id: string;
    token_id: string;
    ip: string;
    user_agent: string;
    created_at: string;
    expires_at: string;
}

export default function SecuritySettings() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    // Setup state
    const [setupData, setSetupData] = useState<{ secret: string; qr_code: string } | null>(null);
    const [verifyCode, setVerifyCode] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [copiedSecret, setCopiedSecret] = useState(false);
    const [copiedCodes, setCopiedCodes] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Disable state
    const [showDisableModal, setShowDisableModal] = useState(false);
    const [disablePassword, setDisablePassword] = useState('');
    const [disableCode, setDisableCode] = useState('');

    // Sessions state
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [revokingSessions, setRevokingSessions] = useState(false);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const res = await api.apiGet('/auth/2fa/status');
            setIsEnabled(Boolean(res?.data?.enabled));
        } catch (_err) {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    const fetchSessions = async () => {
        try {
            setLoadingSessions(true);
            const res = await api.apiGet('/auth/sessions');
            setSessions(res?.data || []);
        } catch (_err) {
            // ignore
        } finally {
            setLoadingSessions(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        fetchSessions();
    }, []);

    const handleStartSetup = async () => {
        try {
            setIsSubmitting(true);
            const res = await api.apiPost('/auth/2fa/setup', {});
            setSetupData(res?.data || null);
            setRecoveryCodes([]);
            setVerifyCode('');
        } catch (err: any) {
            toast(err?.message || 'Không thể khởi tạo 2FA');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verifyCode.trim()) return;

        try {
            setIsSubmitting(true);
            const res = await api.apiPost('/auth/2fa/verify-setup', { token: verifyCode.trim() });
            setIsEnabled(true);
            setRecoveryCodes(res?.data?.recovery_codes || []);
            setSetupData(null);
            toast('Kích hoạt xác thực 2 bước (2FA) thành công!');
        } catch (err: any) {
            toast(err?.message || 'Mã xác thực không hợp lệ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDisable2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await api.apiPost('/auth/2fa/disable', {
                password: disablePassword,
                token: disableCode.trim(),
            });
            setIsEnabled(false);
            setShowDisableModal(false);
            setDisablePassword('');
            setDisableCode('');
            toast('Đã tắt xác thực 2 bước');
        } catch (err: any) {
            toast(err?.message || 'Mật khẩu hoặc mã OTP không chính xác');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevokeOtherSessions = async () => {
        if (!window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tất cả các thiết bị khác?')) {
            return;
        }

        try {
            setRevokingSessions(true);
            const res = await api.apiPost('/auth/sessions/revoke-others', {});
            toast(`Đã đăng xuất ${res?.data?.revoked_count || 0} phiên đăng nhập khác`);
            fetchSessions();
        } catch (err: any) {
            toast(err?.message || 'Không thể đăng xuất các phiên khác');
        } finally {
            setRevokingSessions(false);
        }
    };

    const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            {/* TWO-FACTOR AUTHENTICATION CARD */}
            <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
                <div className="border-b border-outline-variant/20 p-6 bg-surface/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isEnabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                            {isEnabled ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-primary-container">
                                Xác thực 2 bước (Two-Factor Authentication - 2FA)
                            </h2>
                            <p className="text-xs text-outline">
                                Bảo vệ tài khoản bằng mã bảo mật 6 số từ Google Authenticator hoặc Authy khi đăng nhập.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {loading ? (
                            <Loader2 className="animate-spin text-outline" size={18} />
                        ) : isEnabled ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full uppercase tracking-wider">
                                Đang bảo vệ
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full uppercase tracking-wider">
                                Chưa kích hoạt
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    {/* CASE 1: RECOVERY CODES DISPLAY AFTER ACTIVATION */}
                    {recoveryCodes.length > 0 && (
                        <div className="mb-6 p-5 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h3 className="text-sm font-black text-amber-900 uppercase tracking-wide">
                                        Lưu lại mã khôi phục dự phòng của bạn
                                    </h3>
                                    <p className="text-xs text-amber-800 mt-1">
                                        Các mã dưới đây là cách duy nhất để đăng nhập nếu bạn bị mất điện thoại. Mỗi mã chỉ dùng được một lần. Hãy sao chép và cất ở nơi an toàn.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-white rounded-lg border border-amber-200 font-mono text-center text-xs font-bold text-slate-800">
                                {recoveryCodes.map((c, i) => (
                                    <div key={i} className="py-1 px-2 bg-slate-50 rounded border border-slate-150">
                                        {c}
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => copyToClipboard(recoveryCodes.join('\n'), setCopiedCodes)}
                                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-black flex items-center gap-1.5 hover:bg-amber-700 transition"
                                >
                                    {copiedCodes ? <Check size={14} /> : <Copy size={14} />}
                                    {copiedCodes ? 'Đã sao chép tất cả' : 'Sao chép 10 mã'}
                                </button>
                                <button
                                    onClick={() => setRecoveryCodes([])}
                                    className="px-4 py-2 bg-white border border-amber-300 text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-100 transition"
                                >
                                    Tôi đã lưu an toàn
                                </button>
                            </div>
                        </div>
                    )}

                    {/* CASE 2: QR CODE SETUP FLOW */}
                    {setupData ? (
                        <div className="p-6 bg-surface/50 border border-outline-variant/30 rounded-xl space-y-6">
                            <h3 className="text-sm font-black text-primary-container uppercase tracking-wide flex items-center gap-2">
                                <QrCode size={18} className="text-secondary" />
                                Quét mã QR vào ứng dụng xác thực
                            </h3>

                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="p-3 bg-white border-2 border-outline-variant/30 rounded-2xl shadow-sm">
                                    <img
                                        src={setupData.qr_code}
                                        alt="2FA QR Code"
                                        className="w-48 h-48 block"
                                    />
                                </div>

                                <div className="space-y-3 flex-1 text-xs">
                                    <p className="text-slate-600 font-medium">
                                        1. Mở ứng dụng <strong>Google Authenticator</strong>, <strong>Authy</strong>, hoặc <strong>Microsoft Authenticator</strong> trên điện thoại.
                                    </p>
                                    <p className="text-slate-600 font-medium">
                                        2. Quét mã QR bên cạnh hoặc nhập khóa bí mật thủ công nếu không thể quét:
                                    </p>
                                    <div className="flex items-center gap-2 p-2.5 bg-white border border-outline-variant/30 rounded-lg font-mono font-bold text-primary-container text-xs">
                                        <Key size={14} className="text-secondary shrink-0" />
                                        <span className="truncate">{setupData.secret}</span>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(setupData.secret, setCopiedSecret)}
                                            className="ml-auto text-secondary hover:text-secondary/80 font-bold flex items-center gap-1 text-[11px]"
                                        >
                                            {copiedSecret ? <Check size={12} /> : <Copy size={12} />}
                                            {copiedSecret ? 'Đã sao chép' : 'Sao chép'}
                                        </button>
                                    </div>
                                    <p className="text-slate-600 font-medium">
                                        3. Nhập mã 6 số hiển thị trên điện thoại vào ô dưới để xác nhận:
                                    </p>

                                    <form onSubmit={handleConfirmSetup} className="flex gap-2 pt-2">
                                        <input
                                            type="text"
                                            maxLength={6}
                                            autoFocus
                                            placeholder="123456"
                                            value={verifyCode}
                                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                                            className="w-36 h-10 px-3 border border-outline-variant/40 rounded-lg text-center font-black text-base tracking-widest text-primary-container focus:outline-none focus:border-secondary"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || verifyCode.length !== 6}
                                            className="px-5 h-10 bg-primary-container text-white rounded-lg font-black text-xs uppercase tracking-wider hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            {isSubmitting && <Loader2 className="animate-spin" size={14} />}
                                            Xác nhận kích hoạt
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSetupData(null)}
                                            className="px-4 h-10 bg-slate-100 text-slate-700 rounded-lg font-bold text-xs hover:bg-slate-200"
                                        >
                                            Hủy
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* CASE 3: NORMAL TOGGLE BUTTONS */
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    {isEnabled
                                        ? 'Tài khoản của bạn đang được bảo vệ an toàn bằng xác thực 2 bước.'
                                        : 'Bạn chưa bật xác thực 2 bước. Hãy kích hoạt ngay để tránh nguy cơ rò rỉ mật khẩu.'}
                                </p>
                                <p className="text-xs text-outline mt-0.5">
                                    Hỗ trợ Google Authenticator, Authy, Apple Keychain và các ứng dụng chuẩn RFC 6238.
                                </p>
                            </div>

                            {isEnabled ? (
                                <button
                                    onClick={() => setShowDisableModal(true)}
                                    className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-black hover:bg-rose-100 transition"
                                >
                                    Tắt 2FA
                                </button>
                            ) : (
                                <button
                                    onClick={handleStartSetup}
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 bg-primary-container text-white rounded-lg text-xs font-black uppercase tracking-wider hover:opacity-95 transition flex items-center gap-1.5 shadow-md shadow-primary-container/10"
                                >
                                    {isSubmitting && <Loader2 className="animate-spin" size={14} />}
                                    Kích hoạt 2FA ngay
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL DISABLE 2FA */}
            {showDisableModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900">Tắt xác thực 2 bước</h3>
                                <p className="text-xs text-slate-500">Nhập mật khẩu và mã OTP để xác nhận bạn là chủ sở hữu.</p>
                            </div>
                        </div>

                        <form onSubmit={handleDisable2FA} className="space-y-3 pt-2">
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase" htmlFor="dis_pwd">
                                    Mật khẩu tài khoản
                                </label>
                                <input
                                    id="dis_pwd"
                                    type="password"
                                    required
                                    value={disablePassword}
                                    onChange={(e) => setDisablePassword(e.target.value)}
                                    className="w-full h-10 px-3 mt-1 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 uppercase" htmlFor="dis_otp">
                                    Mã OTP 6 số hiện tại
                                </label>
                                <input
                                    id="dis_otp"
                                    type="text"
                                    required
                                    maxLength={6}
                                    placeholder="123456"
                                    value={disableCode}
                                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full h-10 px-3 mt-1 border border-slate-300 rounded-lg text-center font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:border-primary"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDisableModal(false)}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !disablePassword || disableCode.length !== 6}
                                    className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-black hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {isSubmitting && <Loader2 className="animate-spin" size={14} />}
                                    Xác nhận tắt
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ACTIVE SESSIONS CARD */}
            <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
                <div className="border-b border-outline-variant/20 p-6 bg-surface/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                            <Smartphone size={22} />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-primary-container">
                                Các phiên đăng nhập đang hoạt động
                            </h2>
                            <p className="text-xs text-outline">
                                Danh sách các trình duyệt và thiết bị đang duy trì quyền truy cập vào tài khoản của bạn.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchSessions}
                            disabled={loadingSessions}
                            title="Làm mới danh sách"
                            className="p-2 text-slate-500 hover:text-primary transition rounded-lg hover:bg-slate-100"
                        >
                            <RefreshCw size={16} className={loadingSessions ? 'animate-spin' : ''} />
                        </button>
                        {sessions.length > 1 && (
                            <button
                                onClick={handleRevokeOtherSessions}
                                disabled={revokingSessions}
                                className="px-3.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-100 flex items-center gap-1.5 transition"
                            >
                                {revokingSessions ? <Loader2 className="animate-spin" size={14} /> : <LogOut size={14} />}
                                Đăng xuất các thiết bị khác
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    {loadingSessions ? (
                        <div className="py-8 flex justify-center">
                            <Loader2 className="animate-spin text-secondary" size={24} />
                        </div>
                    ) : sessions.length === 0 ? (
                        <p className="text-xs text-slate-500 italic text-center py-4">Chưa có phiên đăng nhập nào được ghi nhận.</p>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {sessions.map((s, idx) => (
                                <div key={s.id || idx} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                            <Smartphone size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">
                                                {s.user_agent ? s.user_agent.slice(0, 70) : 'Trình duyệt không xác định'}
                                            </p>
                                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                                IP: {s.ip || '127.0.0.1'} • Đăng nhập: {new Date(s.created_at).toLocaleString('vi-VN')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {idx === 0 && (
                                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-full uppercase">
                                                Phiên gần nhất
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
