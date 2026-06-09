import React, { useState, useCallback } from 'react';
import {
    GraduationCap,
    PlayCircle,
    FileCheck,
    Clock,
    Users,
    Search,
    ChevronRight,
    TrendingUp,
    Award,
    Loader2,
    Plus,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTrainingList, useCreateTraining } from '../hooks/useTraining';
import toast from '../lib/toast';

type Session = { start_date: string; end_date: string };
type TrainingFormData = { course_name: string; sessions: Session[] };

const EMPTY_FORM: TrainingFormData = { course_name: '', sessions: [] };

export default function Training() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<TrainingFormData>(EMPTY_FORM);

    const { data: courses = [], isLoading } = useTrainingList({ limit: 100 });
    const createTraining = useCreateTraining();

    // Tính stats từ dữ liệu thật
    const totalParticipants = courses.reduce((sum: number, c: any) => sum + (c.participants || c.total_participants || 0), 0);
    const activeCourses = courses.filter((c: any) => c.status === 'active' || !c.status).length;

    // Filter search
    const filtered = searchQuery
        ? courses.filter((c: any) => {
              const title = (c.course_name || c.title || '').toLowerCase();
              const cat = (c.category || '').toLowerCase();
              return title.includes(searchQuery.toLowerCase()) || cat.includes(searchQuery.toLowerCase());
          })
        : courses;

    const addSession = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        setFormData(f => ({ ...f, sessions: [...f.sessions, { start_date: today, end_date: today }] }));
    }, []);

    const removeSession = useCallback((index: number) => {
        setFormData(f => ({ ...f, sessions: f.sessions.filter((_, i) => i !== index) }));
    }, []);

    const updateSession = useCallback((index: number, field: keyof Session, value: string) => {
        setFormData(f => {
            const sessions = [...f.sessions];
            sessions[index] = { ...sessions[index], [field]: value };
            return { ...f, sessions };
        });
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createTraining.mutateAsync(formData);
            toast('Course created successfully');
            setShowForm(false);
            setFormData(EMPTY_FORM);
        } catch {
            toast('Failed to create course');
        }
    };

    return (
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-primary-container tracking-tight">E-Learning &amp; Training</h1>
                    <p className="text-sm text-outline font-medium italic">Monitor workforce skills development and certification progress.</p>
                </div>
                <button
                    onClick={() => setShowForm((s) => !s)}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:bg-secondary-container shadow-sm transition-all"
                >
                    <Award size={16} />
                    {showForm ? 'Cancel' : 'Create New Course'}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm animate-in slide-in-from-top-2 duration-300">
                    <h2 className="text-sm font-black text-primary-container mb-4">New Training Course</h2>
                    <form onSubmit={handleCreate} className="space-y-5">
                        {/* Course Name */}
                        <div>
                            <label className="text-[10px] font-black text-outline uppercase tracking-wider mb-1 block">Course Name *</label>
                            <input
                                required
                                value={formData.course_name}
                                onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                                className="w-full h-9 px-3 border border-outline-variant/30 rounded-lg text-xs focus:outline-none focus:border-secondary"
                                placeholder="e.g. Safety Training 2026"
                            />
                        </div>

                        {/* Sessions */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-black text-outline uppercase tracking-wider">Sessions</label>
                                <button
                                    type="button"
                                    onClick={addSession}
                                    className="flex items-center gap-1 px-3 py-1 bg-surface border border-outline-variant/30 rounded-lg text-[10px] font-bold text-secondary hover:bg-secondary/5 transition-all"
                                >
                                    <Plus size={12} /> Add Session
                                </button>
                            </div>

                            {formData.sessions.length === 0 && (
                                <p className="text-[11px] text-outline-variant italic py-2">No sessions yet — click "Add Session" to schedule a training date.</p>
                            )}

                            <div className="space-y-2">
                                {formData.sessions.map((s, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-surface/50 rounded-lg border border-outline-variant/20">
                                        <span className="text-[10px] font-black text-outline w-16 shrink-0">Session {i + 1}</span>
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className="flex-1">
                                                <label className="text-[9px] font-bold text-outline-variant uppercase block mb-0.5">Start Date</label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={s.start_date}
                                                    onChange={(e) => updateSession(i, 'start_date', e.target.value)}
                                                    className="w-full h-8 px-2 border border-outline-variant/30 rounded text-xs focus:outline-none focus:border-secondary"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[9px] font-bold text-outline-variant uppercase block mb-0.5">End Date</label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={s.end_date}
                                                    min={s.start_date}
                                                    onChange={(e) => updateSession(i, 'end_date', e.target.value)}
                                                    className="w-full h-8 px-2 border border-outline-variant/30 rounded text-xs focus:outline-none focus:border-secondary"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeSession(i)}
                                            className="p-1.5 text-outline hover:text-error transition-colors shrink-0"
                                            title="Remove session"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end pt-2 border-t border-outline-variant/10">
                            <button
                                type="submit"
                                disabled={createTraining.isPending}
                                className="flex items-center gap-2 px-6 py-2 bg-primary-container text-white rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50 shadow-sm"
                            >
                                {createTraining.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                Create Course
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Stats Cards – dữ liệu thật */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary shrink-0">
                        <GraduationCap size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">Active Courses</p>
                        <div className="flex items-baseline gap-2">
                            {isLoading ? (
                                <Loader2 size={18} className="animate-spin text-outline-variant" />
                            ) : (
                                <>
                                    <h4 className="text-xl font-black text-primary-container">{activeCourses}</h4>
                                    <span className="text-[10px] font-bold text-outline-variant italic">of {courses.length} total</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">Total Enrolled</p>
                        <div className="flex items-baseline gap-2">
                            {isLoading ? (
                                <Loader2 size={18} className="animate-spin text-outline-variant" />
                            ) : (
                                <h4 className="text-xl font-black text-primary-container">{totalParticipants}</h4>
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-outline-variant/30 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 shrink-0">
                        <FileCheck size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">Completed Courses</p>
                        <div className="flex items-baseline gap-2">
                            {isLoading ? (
                                <Loader2 size={18} className="animate-spin text-outline-variant" />
                            ) : (
                                <h4 className="text-xl font-black text-primary-container">
                                    {courses.filter((c: any) => c.status === 'completed').length}
                                </h4>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Course Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black text-primary-container uppercase tracking-widest flex items-center gap-2">
                        <PlayCircle size={18} className="text-secondary" />
                        All Courses
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={14} />
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-9 pr-3 text-xs bg-white border border-outline-variant/20 rounded-lg focus:outline-none focus:border-secondary w-48 shadow-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-full flex items-center justify-center py-16">
                            <Loader2 className="animate-spin text-secondary" size={32} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 gap-4">
                            <GraduationCap size={48} className="text-outline-variant opacity-30" />
                            <p className="text-outline font-semibold">
                                {searchQuery ? 'No courses match your search' : 'No training courses yet'}
                            </p>
                            {!searchQuery && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold"
                                >
                                    <Plus size={14} /> Create First Course
                                </button>
                            )}
                        </div>
                    ) : (
                        filtered.map((course: any) => {
                            // Tính tổng participants từ sessions
                            const totalParticipantsInCourse = (course.sessions || []).reduce(
                                (sum: number, s: any) => sum + (s.employees?.length || 0), 0
                            );
                            const completedCount = (course.sessions || []).reduce(
                                (sum: number, s: any) => sum + (s.employees?.filter((e: any) => e.status === 'completed').length || 0), 0
                            );
                            const completion = course.completion_percentage
                                ?? (totalParticipantsInCourse > 0 ? Math.round((completedCount / totalParticipantsInCourse) * 100) : 0);
                            const displayName = course.course_name || course.title || 'Untitled Course';
                            return (
                                <div key={course._id} className="bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden group cursor-pointer hover:border-secondary/30 transition-all flex flex-col">
                                    <div className="h-40 overflow-hidden relative bg-gradient-to-br from-secondary/20 to-primary/20">
                                        {course.image ? (
                                            <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <GraduationCap size={48} className="text-secondary/40" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="h-8 bg-secondary text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg">View Details</button>
                                        </div>
                                        {course.category && (
                                            <span className="absolute top-3 right-3 px-2 py-0.5 bg-white/90 backdrop-blur shadow-sm rounded-full text-[10px] font-black text-primary-container uppercase tracking-widest">
                                                {course.category}
                                            </span>
                                        )}
                                        {course.status && (
                                            <span className={cn(
                                                'absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest',
                                                course.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-secondary text-white',
                                            )}>
                                                {course.status}
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="text-sm font-black text-primary-container mb-1 group-hover:text-secondary transition-colors">
                                            {displayName}
                                        </h3>
                                        <div className="flex items-center gap-4 text-[11px] font-bold text-outline mb-4 italic">
                                            {course.duration && (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} /> {course.duration}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Users size={12} /> {totalParticipantsInCourse} Enrolled
                                            </span>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-outline-variant/10 space-y-2">
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-[10px] font-black text-outline-variant uppercase">Completion</span>
                                                <span className="text-[11px] font-black text-primary-container">{completion}%</span>
                                            </div>
                                            <div className="h-1.5 bg-surface rounded-full overflow-hidden shadow-inner border border-outline-variant/10">
                                                <div
                                                    className="h-full bg-secondary rounded-full"
                                                    style={{ width: `${completion}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-bold text-outline italic pt-1">
                                                <span>{completedCount} Completed</span>
                                                <ChevronRight size={14} className="opacity-40 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
