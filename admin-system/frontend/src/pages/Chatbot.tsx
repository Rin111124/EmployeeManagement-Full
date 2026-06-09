import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
    Bot,
    CheckCircle2,
    Cloud,
    Database,
    Loader2,
    MessageSquareText,
    Search,
    Send,
    ShieldCheck,
    Sparkles,
    UserRound,
} from 'lucide-react';
import { apiPost } from '../lib/api';
import { cn } from '../lib/utils';

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
    intent?: string;
    provider?: string;
};

const suggestions = [
    'Tìm nhân viên không đi làm trong ngày hôm nay',
    'Ai đã đi làm hôm nay?',
    'Nhân viên nào chưa check-out hôm nay?',
    'Tìm nhân viên đi làm muộn ngày 30 tháng 4 năm 2026',
    'Bộ phận Production có bao nhiêu nhân viên?',
    'Hiển thị toàn bộ thông tin của các nhân viên bộ phận IT support',
    'Tổng lương tháng 5/2026',
    'Hợp đồng sắp hết hạn',
    'Tài sản đang bảo trì',
];

const capabilities = [
    'Nhân viên và bộ phận',
    'Chấm công, đi muộn, vắng mặt, chưa check-out',
    'Lương, nghỉ phép, tăng ca',
    'Hợp đồng, tài sản, đào tạo',
];

const statusCards = [
    { icon: Cloud, label: 'AI', value: 'Gemini / OpenAI' },
    { icon: Database, label: 'Dữ liệu', value: 'MongoDB tools' },
    { icon: ShieldCheck, label: 'An toàn', value: 'Context đã lọc' },
];

function formatIntent(intent?: string) {
    const labels: Record<string, string> = {
        asset_stats: 'Tài sản',
        attendance_stats: 'Chấm công',
        contract_stats: 'Hợp đồng',
        department_stats: 'Bộ phận',
        employee_search: 'Nhân viên',
        help: 'Trợ giúp',
        leave_stats: 'Nghỉ phép',
        overtime_stats: 'Tăng ca',
        payroll_stats: 'Lương',
        training_stats: 'Đào tạo',
        overview: 'Tổng quan',
        error: 'Lỗi',
    };
    return intent ? labels[intent] || intent : 'Trợ lý';
}

function formatProvider(provider?: string) {
    if (!provider) return 'Database';
    if (provider.startsWith('gemini')) return provider.replace('gemini:', 'Gemini ');
    if (provider.startsWith('openai')) return provider.replace('openai:', 'OpenAI ');
    if (provider === 'database') return 'Database';
    if (provider === 'fallback') return 'Database dự phòng';
    return provider;
}

export default function Chatbot() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: 'Tôi có thể tìm kiếm và thống kê dữ liệu nhân sự nội bộ. Bạn có thể hỏi bằng tiếng Việt có dấu hoặc không dấu.',
            intent: 'overview',
            provider: 'database',
        },
    ]);
    const [question, setQuestion] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const canSend = useMemo(() => question.trim().length > 0 && !isSending, [question, isSending]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, isSending]);

    const ask = async (value?: string) => {
        const text = String(value ?? question).trim();
        if (!text || isSending) return;

        setMessages((prev) => [...prev, { role: 'user', content: text }]);
        setQuestion('');
        setIsSending(true);

        try {
            const response = await apiPost('/chatbot/ask', { question: text });
            const data = response?.data || {};
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: data.answer || 'Không có phản hồi.',
                    intent: data.intent,
                    provider: data.provider,
                },
            ]);
        } catch (error: any) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: error?.message || 'Không thể kết nối chatbot.',
                    intent: 'error',
                    provider: 'error',
                },
            ]);
        } finally {
            setIsSending(false);
        }
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        void ask();
    };

    return (
        <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col gap-3">
            <header className="shrink-0 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-secondary mb-1">
                        <Sparkles size={15} />
                        <span className="text-[10px] font-black uppercase tracking-[0.18em]">Cloud AI Assistant</span>
                    </div>
                    <h1 className="text-xl font-extrabold text-primary-container tracking-tight">Chatbot thống kê</h1>
                    <p className="text-xs text-outline font-medium mt-1 max-w-3xl leading-5">
                        Hỏi dữ liệu HR bằng ngôn ngữ tự nhiên. Các câu nghiệp vụ quan trọng được truy vấn trực tiếp từ database trước khi cần AI diễn giải.
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full xl:w-[500px]">
                    {statusCards.map(({ icon: Icon, label, value }) => (
                        <div key={label} className="bg-white border border-outline-variant/30 rounded-lg px-3 py-2 shadow-sm min-w-0">
                            <div className="flex items-center gap-1.5 text-secondary">
                                <Icon size={13} />
                                <span className="text-[10px] font-black uppercase tracking-wider truncate">{label}</span>
                            </div>
                            <p className="text-[11px] font-extrabold text-primary-container truncate mt-0.5">{value}</p>
                        </div>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-3 flex-1 min-h-0 overflow-hidden">
                <aside className="min-h-0 overflow-hidden flex flex-col gap-3">
                    <section className="bg-white border border-outline-variant/30 rounded-lg p-3 shadow-sm flex-1 min-h-0 flex flex-col">
                        <div className="flex items-center gap-2 mb-2 shrink-0">
                            <Search size={16} className="text-secondary" />
                            <h2 className="text-sm font-extrabold text-primary-container">Câu hỏi nhanh</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2 overflow-y-auto pr-1">
                            {suggestions.map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => void ask(item)}
                                    disabled={isSending}
                                    className="group w-full text-left px-3 py-2 rounded-lg border border-outline-variant/25 text-[11px] font-semibold text-primary-container hover:border-secondary/40 hover:bg-secondary/5 transition-colors disabled:opacity-60"
                                >
                                    <span className="flex items-start gap-2">
                                        <MessageSquareText size={14} className="mt-0.5 text-outline group-hover:text-secondary shrink-0" />
                                        <span className="leading-4">{item}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white border border-outline-variant/30 rounded-lg p-3 shadow-sm shrink-0">
                        <h2 className="text-sm font-extrabold text-primary-container mb-2">Phạm vi hỗ trợ</h2>
                        <div className="space-y-1.5">
                            {capabilities.map((item) => (
                                <div key={item} className="flex items-start gap-2 text-[11px] font-semibold text-outline">
                                    <CheckCircle2 size={14} className="text-secondary mt-0.5 shrink-0" />
                                    <span className="leading-4">{item}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>

                <section className="bg-white border border-outline-variant/30 rounded-lg shadow-sm flex flex-col h-full min-h-0 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-outline-variant/20 flex items-center justify-between gap-3 bg-white shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                                <Bot size={18} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm font-extrabold text-primary-container truncate">Trợ lý dữ liệu nội bộ</h2>
                                <p className="text-[11px] text-outline font-semibold truncate">
                                    Cloud model không truy cập DB trực tiếp; backend chỉ gửi context đã lọc.
                                </p>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Sẵn sàng</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-surface/25">
                        {messages.map((message, index) => (
                            <div key={`${message.role}-${index}`} className={cn('flex gap-3', message.role === 'user' && 'justify-end')}>
                                {message.role === 'assistant' && (
                                    <div className="w-7 h-7 rounded-lg bg-secondary text-white flex items-center justify-center shrink-0">
                                        <Bot size={15} />
                                    </div>
                                )}

                                <div
                                    className={cn(
                                        'max-w-[92%] md:max-w-[78%] rounded-lg px-4 py-3 border text-sm leading-6 whitespace-pre-wrap break-words',
                                        message.role === 'user'
                                            ? 'bg-primary-container text-white border-primary-container'
                                            : 'bg-white text-primary-container border-outline-variant/30 shadow-sm',
                                    )}
                                >
                                    {message.role === 'assistant' && (
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 rounded-md bg-secondary/10 text-secondary text-[10px] font-black uppercase tracking-wider">
                                                {formatIntent(message.intent)}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-md bg-surface text-outline text-[10px] font-black uppercase tracking-wider">
                                                {formatProvider(message.provider)}
                                            </span>
                                        </div>
                                    )}
                                    {message.content}
                                </div>

                                {message.role === 'user' && (
                                    <div className="w-7 h-7 rounded-lg bg-primary-container text-white flex items-center justify-center shrink-0">
                                        <UserRound size={15} />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isSending && (
                            <div className="flex gap-3">
                                <div className="w-7 h-7 rounded-lg bg-secondary text-white flex items-center justify-center shrink-0">
                                    <Bot size={15} />
                                </div>
                                <div className="bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-outline flex items-center gap-2 shadow-sm">
                                    <Loader2 size={16} className="animate-spin" />
                                    Đang truy vấn dữ liệu...
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>

                    <form onSubmit={handleSubmit} className="p-3 border-t border-outline-variant/20 bg-white shrink-0">
                        <div className="flex items-end gap-3">
                            <textarea
                                value={question}
                                onChange={(event) => setQuestion(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && !event.shiftKey) {
                                        event.preventDefault();
                                        void ask();
                                    }
                                }}
                                placeholder="Hỏi: tìm nhân viên đi làm muộn ngày 30 tháng 4 năm 2026..."
                                className="flex-1 min-h-10 max-h-24 rounded-lg border border-outline-variant/40 px-4 py-2.5 text-sm font-medium text-primary-container resize-none focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                                maxLength={1000}
                                rows={1}
                            />
                            <button
                                type="submit"
                                disabled={!canSend}
                                title="Gửi câu hỏi"
                                className="h-10 w-10 rounded-lg bg-secondary text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary-container transition-colors shrink-0"
                            >
                                {isSending ? <Loader2 size={19} className="animate-spin" /> : <Send size={19} />}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}
