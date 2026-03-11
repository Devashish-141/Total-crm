import React, { useState, useEffect } from 'react';
import {
    CheckSquare, Plus, Search, X, SlidersHorizontal,
    ArrowUpDown, Save, Play, Edit3,
    Calendar, User, Tag, Flag, MoreHorizontal,
    RefreshCw, Download, Columns, CheckCircle2,
    AlertCircle, Bell, ListTodo, Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type TaskView = 'all' | 'due_today' | 'overdue' | 'upcoming';
type TaskType = 'call' | 'email' | 'to_do' | 'linkedin';
type Priority = 'high' | 'medium' | 'low' | 'none';
type TaskStatus = 'open' | 'completed';

interface Task {
    id: string;
    created_at: string;
    title: string;
    notes: string;
    task_type: TaskType;
    priority: Priority;
    status: TaskStatus;
    due_date: string;
    due_time: string;
    assigned_to: string;
    queue: string;
    contact_name: string;
    completed_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const TASK_TYPE_META: Record<TaskType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
    call: { label: 'Call', icon: CheckSquare, color: 'text-blue-700', bg: 'bg-blue-50' },
    email: { label: 'Email', icon: CheckSquare, color: 'text-violet-700', bg: 'bg-violet-50' },
    to_do: { label: 'To-do', icon: CheckSquare, color: 'text-slate-700', bg: 'bg-slate-100' },
    linkedin: { label: 'LinkedIn', icon: CheckSquare, color: 'text-sky-700', bg: 'bg-sky-50' },
};

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
    high: { label: 'High', color: 'text-rose-700', bg: 'bg-rose-50', dot: 'bg-rose-500' },
    medium: { label: 'Medium', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
    low: { label: 'Low', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
    none: { label: 'None', color: 'text-slate-500', bg: 'bg-slate-100', dot: 'bg-slate-300' },
};

const QUEUES = ['No queue', 'Follow-ups', 'Pre-sales', 'Support', 'Renewals'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ic = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white transition-all';

const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const isToday = (d: string) => {
    if (!d) return false;
    const t = new Date(d);
    const now = new Date();
    return t.getDate() === now.getDate() && t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear();
};
const isOverdue = (d: string) => d && new Date(d) < new Date() && !isToday(d);
const isUpcoming = (d: string) => d && new Date(d) > new Date() && !isToday(d);

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ view }: { view: TaskView }) => (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
        <div className="relative mb-6">
            {/* Lounge chair illustration (SVG approximation) */}
            <div className="w-28 h-24 relative">
                <div className="absolute bottom-0 left-4 w-20 h-10 bg-slate-200 rounded-2xl" />
                <div className="absolute bottom-6 left-8 w-14 h-8 bg-slate-300 rounded-xl rotate-12" />
                <div className="absolute bottom-10 left-14 w-6 h-6 bg-slate-300 rounded-full" />
                <div className="absolute bottom-0 left-2 w-2 h-8 bg-slate-300 rounded-full rotate-12" />
                <div className="absolute bottom-0 right-4 w-2 h-6 bg-slate-300 rounded-full -rotate-12" />
            </div>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">
            {view === 'overdue' ? 'No overdue tasks. Great job!' :
                view === 'due_today' ? 'Nothing due today. Enjoy!' :
                    view === 'upcoming' ? 'No upcoming tasks scheduled.' :
                        "You're all caught up on tasks."}
        </h3>
        <p className="text-sm font-semibold" style={{ color: '#F5A623' }}>
            {view === 'all' ? 'Nice work.' : ''}
        </p>
    </div>
);

// ─── Pre-defined Task Templates ───────────────────────────────────────────────
const TASK_TEMPLATES = [
    { label: 'Follow-up Call', task_type: 'call' as TaskType, priority: 'high' as Priority, title: 'Follow-up call with contact' },
    { label: 'Send Proposal', task_type: 'email' as TaskType, priority: 'high' as Priority, title: 'Send proposal/quote to client' },
    { label: 'Schedule Meeting', task_type: 'to_do' as TaskType, priority: 'medium' as Priority, title: 'Schedule meeting with prospect' },
    { label: 'Demo Call', task_type: 'call' as TaskType, priority: 'high' as Priority, title: 'Product demo call' },
    { label: 'Send Invoice', task_type: 'email' as TaskType, priority: 'medium' as Priority, title: 'Send invoice to customer' },
    { label: 'Site Visit', task_type: 'to_do' as TaskType, priority: 'high' as Priority, title: 'Site visit / inspection' },
    { label: 'Check In', task_type: 'call' as TaskType, priority: 'low' as Priority, title: 'Check-in call with existing customer' },
    { label: 'Send Contract', task_type: 'email' as TaskType, priority: 'high' as Priority, title: 'Send contract/agreement for signature' },
    { label: 'Renewal Reminder', task_type: 'to_do' as TaskType, priority: 'medium' as Priority, title: 'Send renewal reminder to client' },
    { label: 'LinkedIn Connect', task_type: 'linkedin' as TaskType, priority: 'low' as Priority, title: 'Connect with prospect on LinkedIn' },
];

// ─── Create Task Modal ────────────────────────────────────────────────────────
const CreateTaskModal = ({ onClose, onSaved }: { onClose(): void; onSaved(): void }) => {
    const { user } = useAuth();
    const [form, setForm] = useState({
        title: '',
        description: '',
        task_type: 'to_do' as TaskType,
        priority: 'none' as Priority,
        due_date: new Date().toISOString().slice(0, 10),
        assign_to_me: true,
    });
    const [saving, setSaving] = useState(false);

    const applyTemplate = (tpl: typeof TASK_TEMPLATES[0]) => {
        setForm(p => ({ ...p, title: tpl.title, task_type: tpl.task_type, priority: tpl.priority }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const dueDateTime = form.due_date ? new Date(`${form.due_date}T09:00:00`).toISOString() : null;
        const { error } = await supabase.from('crm_tasks').insert([{
            title: form.title,
            description: form.description || null,
            task_type: form.task_type,
            priority: form.priority,
            status: 'Pending',
            due_date: dueDateTime,
            assigned_to: form.assign_to_me && user?.id ? user.id : null,
            created_by: user?.id ?? null,
        }]);
        if (error) {
            toast.error('Failed to create task: ' + error.message);
        } else {
            toast.success('Task created!');
            onSaved();
            onClose();
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0 bg-gradient-to-r from-[#0051A5]/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0051A5]/10 flex items-center justify-center">
                            <ListTodo size={17} className="text-[#0051A5]" />
                        </div>
                        <h2 className="text-lg font-extrabold text-slate-900">Create task</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">

                    {/* ── Quick Templates ── */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Quick templates</label>
                        <div className="flex flex-wrap gap-1.5">
                            {TASK_TEMPLATES.map(tpl => (
                                <button key={tpl.label} type="button"
                                    onClick={() => applyTemplate(tpl)}
                                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-[#0051A5]/40 hover:bg-blue-50 hover:text-[#0051A5] transition-all">
                                    {tpl.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-1" />

                    {/* Title */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Task title *</label>
                        <input required type="text" className={ic} placeholder="e.g. Follow up with client"
                            value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                    </div>

                    {/* Task Type */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Task type</label>
                        <div className="grid grid-cols-4 gap-2">
                            {(Object.entries(TASK_TYPE_META) as [TaskType, typeof TASK_TYPE_META[TaskType]][]).map(([k, meta]) => {
                                const active = form.task_type === k;
                                return (
                                    <button key={k} type="button"
                                        onClick={() => setForm(p => ({ ...p, task_type: k }))}
                                        className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-bold transition-all
                                            ${active ? `${meta.bg} ${meta.color} border-current` : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                                        <CheckSquare size={15} />
                                        {meta.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Priority + Due Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
                            <select className={ic} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as Priority }))}>
                                {(Object.entries(PRIORITY_META) as [Priority, typeof PRIORITY_META[Priority]][]).map(([k, m]) =>
                                    <option key={k} value={k}>{m.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Due date</label>
                            <input type="date" className={ic} value={form.due_date}
                                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                        </div>
                    </div>

                    {/* Assigned To */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assign to</label>
                        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
                            <input
                                type="checkbox"
                                id="assign_me"
                                className="w-4 h-4 accent-[#0051A5] rounded cursor-pointer"
                                checked={form.assign_to_me}
                                onChange={e => setForm(p => ({ ...p, assign_to_me: e.target.checked }))}
                            />
                            <label htmlFor="assign_me" className="text-sm text-slate-700 cursor-pointer select-none">
                                Assign to me
                                {user?.email && <span className="text-slate-400 text-xs ml-1">({user.email})</span>}
                            </label>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes / Description</label>
                        <textarea rows={3} className={`${ic} resize-none`} placeholder="Add a note…"
                            value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-sm transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 bg-[#0051A5] text-white rounded-xl font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20 text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                            {saving ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : <><CheckCircle2 size={14} /> Create task</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const CRMTasks = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<TaskView>('all');
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [showBanner, setShowBanner] = useState(true);

    // Filters
    const [filterAssigned, setFilterAssigned] = useState('Admin User'); // default "Assigned to (1)"
    const [filterType, setFilterType] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterQueue, setFilterQueue] = useState('');

    // Sort
    const [sortCol, setSortCol] = useState<keyof Task>('due_date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    // Selected rows
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('crm_tasks').select('*').order('due_date', { ascending: true });
        setTasks(error ? [] : (data ?? []) as Task[]);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSort = (col: keyof Task) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
    };

    const handleComplete = async (id: string) => {
        await supabase.from('crm_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
        toast.success('Task completed!');
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this task?')) return;
        await supabase.from('crm_tasks').delete().eq('id', id);
        toast.success('Task deleted');
        fetchData();
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const clearFilters = () => {
        setFilterAssigned('');
        setFilterType('');
        setFilterPriority('');
        setFilterQueue('');
    };

    const activeFilters = [
        filterAssigned && `Assigned to (1)`,
        filterType && TASK_TYPE_META[filterType as TaskType]?.label,
        filterPriority && PRIORITY_META[filterPriority as Priority]?.label,
        filterQueue && filterQueue,
    ].filter(Boolean);

    // Filter logic
    const displayed = tasks
        .filter(t => {
            if (activeView === 'due_today' && !isToday(t.due_date)) return false;
            if (activeView === 'overdue' && !isOverdue(t.due_date)) return false;
            if (activeView === 'upcoming' && !isUpcoming(t.due_date)) return false;
            if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.notes?.toLowerCase().includes(search.toLowerCase())) return false;
            if (filterAssigned && t.assigned_to !== filterAssigned) return false;
            if (filterType && t.task_type !== filterType) return false;
            if (filterPriority && t.priority !== filterPriority) return false;
            if (filterQueue && t.queue !== filterQueue) return false;
            return true;
        })
        .sort((a, b) => {
            const av = a[sortCol] as string;
            const bv = b[sortCol] as string;
            return sortDir === 'asc' ? av?.localeCompare(bv ?? '') : bv?.localeCompare(av ?? '');
        });

    const dueTodayCount = tasks.filter(t => isToday(t.due_date) && t.status === 'open').length;
    const overdueCount = tasks.filter(t => isOverdue(t.due_date) && t.status === 'open').length;
    const upcomingCount = tasks.filter(t => isUpcoming(t.due_date) && t.status === 'open').length;

    const SortIcon = ({ col }: { col: keyof Task }) => (
        <ArrowUpDown size={11} className={`ml-1 inline-block ${sortCol === col ? 'text-[#0051A5] opacity-100' : 'opacity-25'}`} />
    );

    const VIEWS = [
        { id: 'all' as TaskView, label: 'All', count: null },
        { id: 'due_today' as TaskView, label: 'Due today', count: dueTodayCount },
        { id: 'overdue' as TaskView, label: 'Overdue', count: overdueCount },
        { id: 'upcoming' as TaskView, label: 'Upcoming', count: upcomingCount },
    ];

    return (
        <div className="flex flex-col h-full bg-[#F8FAFB]">

            {/* ── Page Header ── */}
            <div className="px-6 pt-5 pb-0 shrink-0 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#0051A5]/10 flex items-center justify-center">
                                <ListTodo size={18} className="text-[#0051A5]" />
                            </div>
                            <h1 className="text-xl font-extrabold text-slate-900">Tasks</h1>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 pl-12">{tasks.length} record{tasks.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            <Tag size={12} /> Manage queues
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            <Download size={12} /> Import
                        </button>
                        <button onClick={() => setShowCreate(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0051A5] text-white rounded-xl text-sm font-bold hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20">
                            <Plus size={15} /> Create task
                        </button>
                    </div>
                </div>

                {/* View Tabs */}
                <div className="flex items-center gap-0 mt-3">
                    {VIEWS.map(v => (
                        <button key={v.id} onClick={() => setActiveView(v.id)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap
                                ${activeView === v.id
                                    ? 'text-[#0051A5] border-[#0051A5]'
                                    : 'text-slate-500 border-transparent hover:text-slate-700'}`}>
                            {v.label}
                            {v.id === 'overdue' && overdueCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700">{overdueCount}</span>
                            )}
                            {v.id === 'due_today' && dueTodayCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">{dueTodayCount}</span>
                            )}
                            {v.id === 'upcoming' && upcomingCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-100 text-[#0051A5]">{upcomingCount}</span>
                            )}
                        </button>
                    ))}
                    <button className="ml-1 flex items-center gap-1 text-xs text-slate-400 px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap">
                        <Plus size={12} /> Add view (4/5)
                    </button>
                    <button className="ml-auto text-xs font-bold text-[#0051A5] hover:underline px-2">All Views</button>
                </div>
            </div>

            {/* ── Calendar Sync Banner ── */}
            {showBanner && (
                <div className="mx-6 mt-3 shrink-0 flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
                    <Bell size={15} className="text-blue-500 shrink-0" />
                    <p className="text-blue-800 flex-1">
                        <span className="font-semibold">Want to see your tasks on your Google or Outlook calendar?</span>
                        {' '}Connect a new calendar to sync tasks created in HubSpot.{' '}
                        <button className="font-bold underline text-blue-700">Go to settings</button>
                    </p>
                    <button onClick={() => setShowBanner(false)} className="text-blue-400 hover:text-blue-600 transition-colors shrink-0">
                        <X size={15} />
                    </button>
                </div>
            )}

            {/* ── Filter Bar ── */}
            <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-2 flex-wrap shrink-0 mt-2">
                {/* Active filter chips */}
                {filterAssigned && (
                    <span className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                        Assigned to (1)
                        <button onClick={() => setFilterAssigned('')} className="hover:text-red-500 ml-0.5"><X size={11} /></button>
                    </span>
                )}

                {/* Filter dropdowns */}
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 outline-none cursor-pointer text-slate-600 transition-colors">
                    <option value="">Task type</option>
                    {Object.entries(TASK_TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                </select>

                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 outline-none cursor-pointer text-slate-600 transition-colors">
                    <option value="">Due date</option>
                    <option value="">Any date</option>
                </select>

                <select value={filterQueue} onChange={e => setFilterQueue(e.target.value)}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 outline-none cursor-pointer text-slate-600 transition-colors">
                    <option value="">Queue</option>
                    {QUEUES.map(q => <option key={q} value={q}>{q}</option>)}
                </select>

                {activeFilters.length > 0 && (
                    <button onClick={clearFilters}
                        className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        Clear all
                    </button>
                )}

                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0051A5] bg-[#0051A5]/5 border border-[#0051A5]/20 rounded-lg transition-colors">
                    <SlidersHorizontal size={12} /> Advanced filters
                </button>

                {/* Right controls */}
                <div className="ml-auto flex items-center gap-1.5">
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <Save size={12} /> Save view
                    </button>
                    <button onClick={() => { /* Start tasks */ }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0051A5] rounded-lg hover:bg-[#003d7a] transition-colors shadow-md shadow-blue-900/20">
                        <Play size={12} /> Start {selected.size || 0} tasks
                    </button>
                </div>
            </div>

            {/* ── Search Bar ── */}
            <div className="px-6 py-2 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="relative w-72">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search task title and note"
                        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:ring-1 focus:ring-[#0051A5]/30 focus:border-[#0051A5] outline-none"
                        value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={12} /></button>}
                </div>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <Columns size={13} /> Edit columns
                </button>
            </div>

            {/* ── Table ── */}
            <div className="flex-1 overflow-auto bg-white">
                {loading ? (
                    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-[#0051A5] rounded-full animate-spin" />
                        Loading tasks…
                    </div>
                ) : displayed.length === 0 ? (
                    <EmptyState view={activeView} />
                ) : (
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="w-8 px-4 py-3">
                                    <input type="checkbox" className="accent-[#0051A5] rounded"
                                        onChange={e => setSelected(e.target.checked ? new Set(displayed.map(t => t.id)) : new Set())}
                                        checked={selected.size === displayed.length && displayed.length > 0} />
                                </th>
                                <th className="w-10 px-2 py-3"></th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap" onClick={() => handleSort('title')}>
                                    Title <SortIcon col="title" />
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap" onClick={() => handleSort('task_type')}>
                                    Task type <SortIcon col="task_type" />
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap" onClick={() => handleSort('priority')}>
                                    <Flag size={11} className="inline mr-1" /> Priority <SortIcon col="priority" />
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap" onClick={() => handleSort('due_date')}>
                                    <Calendar size={11} className="inline mr-1" /> Due date <SortIcon col="due_date" />
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap" onClick={() => handleSort('assigned_to')}>
                                    <User size={11} className="inline mr-1" /> Assigned to <SortIcon col="assigned_to" />
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap" onClick={() => handleSort('queue')}>
                                    Queue <SortIcon col="queue" />
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap">Contact</th>
                                <th className="w-10 px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.map((task, idx) => {
                                const pm = PRIORITY_META[task.priority] ?? PRIORITY_META.none;
                                const tm = TASK_TYPE_META[task.task_type] ?? TASK_TYPE_META.to_do;
                                const done = task.status === 'completed';
                                const overdue = isOverdue(task.due_date) && !done;
                                return (
                                    <tr key={task.id}
                                        className={`border-b border-slate-100 hover:bg-blue-50/20 transition-colors cursor-pointer ${done ? 'opacity-50' : ''} ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                                        <td className="px-4 py-3">
                                            <input type="checkbox" className="accent-[#0051A5] rounded"
                                                checked={selected.has(task.id)}
                                                onChange={() => toggleSelect(task.id)} />
                                        </td>
                                        {/* Complete button */}
                                        <td className="px-2 py-3">
                                            <button
                                                onClick={() => handleComplete(task.id)}
                                                title="Mark complete"
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                                    ${done
                                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                                        : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50'}`}>
                                                {done && <CheckCircle2 size={12} />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className={`font-semibold text-sm ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</p>
                                            {task.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{task.notes}</p>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${tm.bg} ${tm.color}`}>
                                                <CheckSquare size={10} /> {tm.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${pm.bg} ${pm.color}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${pm.dot}`} />
                                                {pm.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className={`flex items-center gap-1.5 text-xs font-semibold ${overdue ? 'text-rose-600' : 'text-slate-600'}`}>
                                                {overdue && <AlertCircle size={12} className="text-rose-500" />}
                                                {task.due_date ? fmtDate(task.due_date) : '—'}
                                                {task.due_time && <span className="text-slate-400 font-normal">{task.due_time}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-[#0051A5] flex items-center justify-center text-[9px] font-bold text-white">
                                                    {task.assigned_to?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-xs text-slate-600">{task.assigned_to}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{task.queue || '—'}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{task.contact_name || '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button className="p-1.5 text-slate-300 hover:text-[#0051A5] hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit3 size={13} />
                                                </button>
                                                <button onClick={() => handleDelete(task.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                                <button className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                                    <MoreHorizontal size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Pagination ── */}
            {displayed.length > 0 && (
                <div className="border-t border-slate-200 px-6 py-3 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">← Prev</button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Next →</button>
                    </div>
                    <p className="text-xs text-slate-400">{displayed.length} result{displayed.length !== 1 ? 's' : ''}</p>
                    <select className="text-xs text-slate-500 border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-white">
                        <option>25 per page</option>
                        <option>50 per page</option>
                        <option>100 per page</option>
                    </select>
                </div>
            )}

            {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} onSaved={fetchData} />}
        </div>
    );
};

export default CRMTasks;
