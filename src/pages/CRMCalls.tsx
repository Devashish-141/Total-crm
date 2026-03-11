import React, { useState, useEffect } from 'react';
import {
    Phone, Search, Plus, MoreHorizontal, SlidersHorizontal,
    ChevronDown, Download, Save, Settings2, Columns,
    Clock, User, Calendar, Mic, X, CheckCircle2,
    PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff,
    PlayCircle, ArrowUpDown, Filter, RefreshCw, FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type CallType = 'inbound' | 'outbound' | 'missed' | 'no_answer';
type CallTab = 'recorded' | 'all';

interface Call {
    id: string;
    created_at: string;
    contact_name: string;
    contact_phone: string;
    assigned_to: string;
    call_type: CallType;
    duration_seconds: number;
    notes: string;
    recorded: boolean;
    transcript_available: boolean;
    outcome: string;
    activity_date: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDuration = (s: number): string => {
    if (!s) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
};

const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CALL_TYPE_META: Record<CallType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    inbound: { label: 'Inbound', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: PhoneIncoming },
    outbound: { label: 'Outbound', color: 'text-blue-700', bg: 'bg-blue-50', icon: PhoneOutgoing },
    missed: { label: 'Missed', color: 'text-rose-700', bg: 'bg-rose-50', icon: PhoneMissed },
    no_answer: { label: 'No Answer', color: 'text-amber-700', bg: 'bg-amber-50', icon: PhoneOff },
};

const OUTCOMES = ['Connected', 'Left voicemail', 'No answer', 'Busy', 'Wrong number', 'Follow up needed'];
const AGENTS = ['Admin User', 'Sales Executive', 'Manager', 'Coordinator'];

// ─── Shared input style ────────────────────────────────────────────────────────
const ic = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white transition-all';

// ─── Empty State ─────────────────────────────────────────────────────────────
const EmptyState = ({ filtered }: { filtered: boolean }) => (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <div className="relative mb-6">
            {/* Magnifying glass illustration matching HubSpot */}
            <div className="w-28 h-28 bg-slate-100 rounded-full flex items-center justify-center">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                    <Search size={28} className="text-slate-400" />
                </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center">
                <Phone size={14} className="text-slate-400" />
            </div>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">
            {filtered ? 'No matches for the current filters.' : 'No calls logged yet.'}
        </h3>
        <p className="text-sm text-slate-400 max-w-sm">
            {filtered
                ? 'Expecting to see a new item? Try adjusting your filters.'
                : 'Log your first call to start tracking customer conversations.'}
        </p>
    </div>
);

// ─── Log Call Modal ───────────────────────────────────────────────────────────
const LogCallModal = ({ onClose, onSaved }: { onClose(): void; onSaved(): void }) => {
    const [form, setForm] = useState({
        contact_name: '',
        contact_phone: '',
        assigned_to: 'Admin User',
        call_type: 'outbound' as CallType,
        duration_seconds: 0,
        notes: '',
        recorded: false,
        transcript_available: false,
        outcome: 'Connected',
        activity_date: new Date().toISOString().slice(0, 10),
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { error } = await supabase.from('crm_calls').insert([{
            ...form,
            created_at: new Date().toISOString(),
        }]);
        if (error) toast.error('Failed to log call');
        else { toast.success('Call logged successfully!'); onSaved(); onClose(); }
        setSaving(false);
    };

    const durationMinutes = Math.floor(form.duration_seconds / 60);
    const durationSecs = form.duration_seconds % 60;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0 bg-gradient-to-r from-[#0051A5]/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0051A5]/10 flex items-center justify-center">
                            <Phone size={17} className="text-[#0051A5]" />
                        </div>
                        <h2 className="text-lg font-extrabold text-slate-900">Log a Call</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {/* Contact */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Name *</label>
                            <input required type="text" className={ic} placeholder="John Doe"
                                value={form.contact_name}
                                onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                            <input type="tel" className={ic} placeholder="+91 99999 99999"
                                value={form.contact_phone}
                                onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} />
                        </div>
                    </div>

                    {/* Call Type */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Call Type</label>
                        <div className="grid grid-cols-4 gap-2">
                            {(Object.entries(CALL_TYPE_META) as [CallType, typeof CALL_TYPE_META[CallType]][]).map(([k, meta]) => {
                                const Icon = meta.icon;
                                const active = form.call_type === k;
                                return (
                                    <button key={k} type="button"
                                        onClick={() => setForm(p => ({ ...p, call_type: k }))}
                                        className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-bold transition-all
                                            ${active ? `${meta.bg} ${meta.color} border-current` : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                                        <Icon size={16} />
                                        {meta.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Outcome + Assigned */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Outcome</label>
                            <select className={ic} value={form.outcome} onChange={e => setForm(p => ({ ...p, outcome: e.target.value }))}>
                                {OUTCOMES.map(o => <option key={o}>{o}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assigned To</label>
                            <select className={ic} value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}>
                                {AGENTS.map(a => <option key={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Date + Duration */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Activity Date</label>
                            <input type="date" className={ic} value={form.activity_date}
                                onChange={e => setForm(p => ({ ...p, activity_date: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Duration (mm:ss)</label>
                            <div className="flex items-center gap-2">
                                <input type="number" min={0} max={999} placeholder="mm" className={`${ic} text-center`}
                                    value={durationMinutes || ''}
                                    onChange={e => setForm(p => ({ ...p, duration_seconds: (+e.target.value) * 60 + durationSecs }))} />
                                <span className="text-slate-400 font-bold">:</span>
                                <input type="number" min={0} max={59} placeholder="ss" className={`${ic} text-center`}
                                    value={durationSecs || ''}
                                    onChange={e => setForm(p => ({ ...p, duration_seconds: durationMinutes * 60 + (+e.target.value) }))} />
                            </div>
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 accent-[#0051A5] rounded"
                                checked={form.recorded}
                                onChange={e => setForm(p => ({ ...p, recorded: e.target.checked }))} />
                            <span className="text-sm text-slate-600 font-medium flex items-center gap-1.5"><Mic size={13} /> Recorded</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 accent-[#0051A5] rounded"
                                checked={form.transcript_available}
                                onChange={e => setForm(p => ({ ...p, transcript_available: e.target.checked }))} />
                            <span className="text-sm text-slate-600 font-medium flex items-center gap-1.5"><FileText size={13} /> Transcript</span>
                        </label>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                        <textarea rows={3} className={`${ic} resize-none`} placeholder="What was discussed on this call…"
                            value={form.notes}
                            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-sm transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 bg-[#0051A5] text-white rounded-xl font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20 text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                            {saving ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : <><CheckCircle2 size={14} /> Log Call</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const CRMCalls = () => {
    const [calls, setCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<CallTab>('all');
    const [search, setSearch] = useState('');
    const [showLogModal, setShowLogModal] = useState(false);

    // Filters
    const [filterTranscript, setFilterTranscript] = useState('');
    const [filterAssigned, setFilterAssigned] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterDuration, setFilterDuration] = useState('');
    const [filterType, setFilterType] = useState('');

    // Sort
    const [sortCol, setSortCol] = useState<keyof Call>('activity_date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('crm_calls').select('*').order('activity_date', { ascending: false });
        setCalls(error ? [] : (data ?? []) as Call[]);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSort = (col: keyof Call) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
    };

    // Derived: filter + tab + search
    const displayed = calls
        .filter(c => {
            if (activeTab === 'recorded' && !c.recorded) return false;
            if (search && !c.contact_name.toLowerCase().includes(search.toLowerCase()) && !c.contact_phone?.includes(search)) return false;
            if (filterAssigned && c.assigned_to !== filterAssigned) return false;
            if (filterTranscript === 'yes' && !c.transcript_available) return false;
            if (filterTranscript === 'no' && c.transcript_available) return false;
            if (filterType && c.call_type !== filterType) return false;
            return true;
        })
        .sort((a, b) => {
            const av = a[sortCol] as string | number;
            const bv = b[sortCol] as string | number;
            return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });

    const recordedCount = calls.filter(c => c.recorded).length;
    const activeFiltersCount = [filterTranscript, filterAssigned, filterDate, filterDuration, filterType].filter(Boolean).length;

    const clearFilters = () => {
        setFilterTranscript('');
        setFilterAssigned('');
        setFilterDate('');
        setFilterDuration('');
        setFilterType('');
    };

    const SortIcon = ({ col }: { col: keyof Call }) => (
        <ArrowUpDown size={12} className={`ml-1 inline-block opacity-${sortCol === col ? '100' : '30'} ${sortCol === col ? 'text-[#0051A5]' : ''}`} />
    );

    return (
        <div className="flex flex-col h-full bg-[#F8FAFB]">

            {/* ── Page Header ── */}
            <div className="px-6 pt-5 pb-0 shrink-0 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0051A5]/10 flex items-center justify-center">
                            <Phone size={18} className="text-[#0051A5]" />
                        </div>
                        <h1 className="text-xl font-extrabold text-slate-900">Calls</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchData}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            <RefreshCw size={12} />
                        </button>
                        <button onClick={() => setShowLogModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0051A5] text-white rounded-xl text-sm font-bold hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20">
                            <Plus size={15} /> Log a call
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-0">
                    {([
                        { id: 'recorded', label: `Recorded calls`, count: recordedCount },
                        { id: 'all', label: 'All calls', count: null },
                    ] as { id: CallTab; label: string; count: number | null }[]).map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-all
                                ${activeTab === tab.id
                                    ? 'text-[#0051A5] border-[#0051A5]'
                                    : 'text-slate-500 border-transparent hover:text-slate-700'}`}>
                            {tab.label}
                            {tab.count !== null && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                                    ${activeTab === tab.id ? 'bg-[#0051A5]/10 text-[#0051A5]' : 'bg-slate-100 text-slate-500'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                    <button className="ml-2 flex items-center gap-1 text-xs text-slate-400 px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors">
                        <Plus size={12} />
                    </button>
                </div>
            </div>

            {/* ── Filters Toolbar ── */}
            <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-2 flex-wrap shrink-0">
                {/* Search */}
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search"
                        className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:ring-1 focus:ring-[#0051A5]/30 focus:border-[#0051A5] outline-none w-40"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {/* Filter pills */}
                <select value={filterTranscript} onChange={e => setFilterTranscript(e.target.value)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 outline-none cursor-pointer text-slate-600 transition-colors">
                    <option value="">Transcript avail…</option>
                    <option value="yes">Has transcript</option>
                    <option value="no">No transcript</option>
                </select>

                <select value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 outline-none cursor-pointer text-slate-600 transition-colors">
                    <option value="">Activity assigned to</option>
                    {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>

                <select value={filterDate} onChange={e => setFilterDate(e.target.value)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 outline-none cursor-pointer text-slate-600 transition-colors">
                    <option value="">Activity date</option>
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                    <option value="month">This month</option>
                </select>

                <select value={filterDuration} onChange={e => setFilterDuration(e.target.value)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 outline-none cursor-pointer text-slate-600 transition-colors">
                    <option value="">Call duration</option>
                    <option value="under1">Under 1 min</option>
                    <option value="1to5">1–5 min</option>
                    <option value="over5">Over 5 min</option>
                </select>

                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 outline-none cursor-pointer text-slate-600 transition-colors">
                    <option value="">Call type</option>
                    {Object.entries(CALL_TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                </select>

                {/* More/Advanced toggle */}
                <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">
                    <Plus size={12} /> More
                </button>

                {activeFiltersCount > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0051A5]/10 text-[#0051A5] rounded-lg text-xs font-bold">
                        <Filter size={11} />
                        Advanced filters
                        <button onClick={clearFilters} className="ml-0.5 hover:text-red-500 transition-colors">
                            <X size={11} />
                        </button>
                    </span>
                )}

                <div className="ml-auto flex items-center gap-1.5">
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">
                        <Columns size={13} /> Table view <ChevronDown size={11} />
                    </button>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">
                        <Settings2 size={13} />
                    </button>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">
                        <Columns size={13} /> Edit columns
                    </button>
                    {activeFiltersCount > 0 && (
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#0051A5] bg-[#0051A5]/5 border border-[#0051A5]/20 rounded-lg transition-colors">
                            <SlidersHorizontal size={13} /> Filter ({activeFiltersCount})
                        </button>
                    )}
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">
                        <ArrowUpDown size={13} /> Sort
                    </button>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">
                        <Download size={13} /> Export
                    </button>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">
                        <Save size={13} /> Save
                    </button>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-[#0051A5] rounded-full animate-spin" />
                        Loading calls…
                    </div>
                ) : displayed.length === 0 ? (
                    <EmptyState filtered={activeFiltersCount > 0 || !!search || activeTab === 'recorded'} />
                ) : (
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="w-8 px-4 py-3"><input type="checkbox" className="accent-[#0051A5] rounded" /></th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-700" onClick={() => handleSort('contact_name')}>
                                    <User size={12} className="inline mr-1" /> Contact <SortIcon col="contact_name" />
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-700" onClick={() => handleSort('call_type')}>
                                    Call type <SortIcon col="call_type" />
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-700" onClick={() => handleSort('outcome')}>
                                    Outcome <SortIcon col="outcome" />
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-700" onClick={() => handleSort('duration_seconds')}>
                                    <Clock size={12} className="inline mr-1" /> Duration <SortIcon col="duration_seconds" />
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-700" onClick={() => handleSort('activity_date')}>
                                    <Calendar size={12} className="inline mr-1" /> Activity date <SortIcon col="activity_date" />
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-700" onClick={() => handleSort('assigned_to')}>
                                    <User size={12} className="inline mr-1" /> Assigned to <SortIcon col="assigned_to" />
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap">Recording</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap">Transcript</th>
                                <th className="w-10 px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.map((call, idx) => {
                                const meta = CALL_TYPE_META[call.call_type];
                                const Icon = meta.icon;
                                return (
                                    <tr key={call.id}
                                        className={`border-b border-slate-100 hover:bg-blue-50/30 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                                        <td className="px-4 py-3"><input type="checkbox" className="accent-[#0051A5] rounded" /></td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-semibold text-slate-800 hover:text-[#0051A5] transition-colors">{call.contact_name}</p>
                                                {call.contact_phone && <p className="text-xs text-slate-400 mt-0.5">{call.contact_phone}</p>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${meta.bg} ${meta.color}`}>
                                                <Icon size={11} /> {meta.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 text-xs">{call.outcome || '—'}</td>
                                        <td className="px-4 py-3 text-slate-600 text-xs font-mono">{fmtDuration(call.duration_seconds)}</td>
                                        <td className="px-4 py-3 text-slate-600 text-xs">{fmtDate(call.activity_date)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white">
                                                    {call.assigned_to?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-xs text-slate-600">{call.assigned_to}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {call.recorded
                                                ? <button className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"><PlayCircle size={13} /> Play</button>
                                                : <span className="text-xs text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {call.transcript_available
                                                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full"><FileText size={10} /> Available</span>
                                                : <span className="text-xs text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                                <MoreHorizontal size={14} />
                                            </button>
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
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors">
                            ← Prev
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors">
                            Next →
                        </button>
                    </div>
                    <p className="text-xs text-slate-400">{displayed.length} result{displayed.length !== 1 ? 's' : ''}</p>
                    <select className="text-xs text-slate-500 border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-white">
                        <option>25 per page</option>
                        <option>50 per page</option>
                        <option>100 per page</option>
                    </select>
                </div>
            )}

            {showLogModal && <LogCallModal onClose={() => setShowLogModal(false)} onSaved={fetchData} />}
        </div>
    );
};

export default CRMCalls;
