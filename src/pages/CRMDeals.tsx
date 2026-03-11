import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Plus, Search, LayoutGrid, List, Filter,
    X, MoreHorizontal, TrendingUp, Calendar,
    Phone, Mail, ArrowUpDown,
    ChevronLeft, ChevronRight, RefreshCw, Check,
    CircleDot, Zap, Target, Trophy, AlertTriangle,
    Clock, Building2,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { Lead } from '../types';
import { toast } from 'react-hot-toast';

// ─── Deal Stage Config ────────────────────────────────────────────────────────
interface Stage {
    id: string;
    label: string;
    color: string;
    bgColor: string;
    headerBg: string;
    icon: React.ElementType;
    probability: number;
}

const STAGES: Stage[] = [
    { id: 'new', label: 'Appointment Scheduled', color: 'text-slate-600', bgColor: 'bg-slate-100', headerBg: 'bg-slate-50 border-slate-200', icon: Clock, probability: 10 },
    { id: 'contacted', label: 'Contacted', color: 'text-blue-600', bgColor: 'bg-blue-100', headerBg: 'bg-blue-50 border-blue-200', icon: Phone, probability: 25 },
    { id: 'site_visit_scheduled', label: 'Site Visit / Proposal', color: 'text-violet-600', bgColor: 'bg-violet-100', headerBg: 'bg-violet-50 border-violet-200', icon: Zap, probability: 50 },
    { id: 'follow_up', label: 'Negotiation', color: 'text-amber-600', bgColor: 'bg-amber-100', headerBg: 'bg-amber-50 border-amber-200', icon: Target, probability: 75 },
    { id: 'closed_won', label: 'Closed Won', color: 'text-emerald-600', bgColor: 'bg-emerald-100', headerBg: 'bg-emerald-50 border-emerald-200', icon: Trophy, probability: 100 },
    { id: 'closed_lost', label: 'Closed Lost', color: 'text-red-600', bgColor: 'bg-red-100', headerBg: 'bg-red-50 border-red-200', icon: AlertTriangle, probability: 0 },
];

const STAGE_MAP: Record<string, Stage> = Object.fromEntries(STAGES.map(s => [s.id, s]));

// Random deal values for display (since leads don't have amounts)
const seedValue = (id: string) => {
    let h = 0;
    for (const c of id) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
    const bases = [50000, 75000, 100000, 150000, 200000, 250000, 300000, 500000];
    return bases[Math.abs(h) % bases.length];
};

const formatINR = (n: number) =>
    n >= 100000
        ? `₹${(n / 100000).toFixed(1)}L`
        : `₹${(n / 1000).toFixed(0)}K`;

const formatINRFull = (n: number) =>
    `₹${n.toLocaleString('en-IN')}`;

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) => {
    const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500'];
    const color = colors[name.charCodeAt(0) % colors.length];
    const cls = size === 'md' ? 'w-9 h-9 text-[13px]' : 'w-7 h-7 text-[11px]';
    return (
        <span className={`${cls} ${color} inline-flex items-center justify-center rounded-full text-white font-bold shrink-0`}>
            {initials}
        </span>
    );
};

// ─── Deal Card (Kanban) ───────────────────────────────────────────────────────
interface DealCardProps {
    deal: Lead;
    stage: Stage;
    onStageChange: (id: string, stage: string) => void;
    onClick: (deal: Lead) => void;
}

const DealCard = ({ deal, stage, onStageChange, onClick }: DealCardProps) => {
    const [menu, setMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const value = seedValue(deal.id);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div
            onClick={() => onClick(deal)}
            className="bg-white rounded-xl border border-slate-200 p-3.5 cursor-pointer hover:border-[#0051A5]/40 hover:shadow-md hover:shadow-blue-900/5 transition-all duration-150 group relative"
        >
            {/* Stage indicator bar */}
            <div className={`absolute top-0 left-0 w-1 h-full ${stage.bgColor.replace('bg-', 'bg-')} rounded-l-xl`}
                style={{ background: stage.id === 'closed_won' ? '#10b981' : stage.id === 'closed_lost' ? '#ef4444' : stage.id === 'follow_up' ? '#f59e0b' : stage.id === 'site_visit_scheduled' ? '#8b5cf6' : stage.id === 'contacted' ? '#3b82f6' : '#94a3b8' }}
            />

            <div className="pl-1">
                {/* Deal name */}
                <p className="font-semibold text-slate-800 text-sm leading-tight mb-2 pr-6 group-hover:text-[#0051A5] transition-colors line-clamp-2">
                    {deal.name}
                </p>

                {/* Value */}
                <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-base font-bold text-slate-900">{formatINR(value)}</span>
                    <span className="text-[10px] text-slate-400 font-medium">• {stage.probability}% prob.</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                    {deal.source && (
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium">
                            {deal.source}
                        </span>
                    )}
                    {deal.is_converted && (
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold">
                            Customer
                        </span>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Avatar name={deal.name} />
                        {deal.phone && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{deal.phone}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={e => { e.stopPropagation(); setMenu(!menu); }}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <MoreHorizontal size={14} />
                            </button>
                            {menu && (
                                <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-sm">
                                    {STAGES.filter(s => s.id !== deal.status).map(s => (
                                        <button
                                            key={s.id}
                                            onClick={e => { e.stopPropagation(); onStageChange(deal.id, s.id); setMenu(false); }}
                                            className="w-full px-3 py-2 text-left text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                        >
                                            <s.icon size={13} className={s.color} />
                                            Move to {s.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Close date */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Calendar size={10} />
                    <span>
                        {deal.created_at
                            ? `Created ${new Date(deal.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                            : '--'}
                    </span>
                </div>
            </div>
        </div>
    );
};

// ─── Add / Edit Deal Modal ────────────────────────────────────────────────────
interface DealModalProps {
    deal?: Lead | null;
    initialStage?: string;
    onClose: () => void;
    onSaved: () => void;
}

const DealModal = ({ deal, initialStage = 'new', onClose, onSaved }: DealModalProps) => {
    const [form, setForm] = useState({
        name: deal?.name ?? '',
        email: deal?.email ?? '',
        phone: deal?.phone ?? '',
        source: deal?.source ?? 'Direct',
        status: (deal?.status ?? initialStage) as any,
        notes: deal?.notes ?? '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (deal) {
            const { error } = await dataService.updateLead(deal.id, form);
            if (error) { toast.error('Failed to update deal'); return; }
            toast.success('Deal updated');
        } else {
            const { error } = await dataService.addLead(form);
            if (error) { toast.error('Failed to create deal'); return; }
            toast.success('Deal created');
        }
        onSaved();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{deal ? 'Edit Deal' : 'Create Deal'}</h2>
                        <p className="text-slate-400 text-sm mt-0.5">
                            {deal ? 'Update deal details' : 'Add a new deal to your pipeline'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Deal Name *</label>
                        <input required type="text"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none text-sm"
                            placeholder="e.g. Sharma Residence - 5kW Solar"
                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Pipeline Stage</label>
                        <select
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white text-sm"
                            value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}
                        >
                            {STAGES.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Email</label>
                            <input type="email"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none text-sm"
                                placeholder="email@example.com"
                                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Phone</label>
                            <input type="tel"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none text-sm"
                                placeholder="+91 99999 99999"
                                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Source</label>
                        <select
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white text-sm"
                            value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                        >
                            {['Direct', 'Website', 'Facebook', 'Referral', 'WhatsApp', 'Cold Call', 'Exhibition', 'Other'].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Notes</label>
                        <textarea rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none resize-none text-sm"
                            placeholder="Deal notes, requirements..."
                            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm">
                            Cancel
                        </button>
                        <button type="submit"
                            className="flex-1 py-3 bg-[#0051A5] text-white rounded-xl font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20 text-sm">
                            {deal ? 'Save Changes' : 'Create Deal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Deal Detail Drawer ───────────────────────────────────────────────────────
const DealDrawer = ({ deal, onClose, onEdit, stage }: { deal: Lead; onClose: () => void; onEdit: () => void; stage: Stage }) => {
    const value = seedValue(deal.id);
    const Icon = stage.icon;

    return (
        <div className="fixed inset-0 z-[1500]" onClick={onClose}>
            <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl border-l border-slate-200 flex flex-col"
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <h2 className="font-bold text-slate-900 text-lg leading-tight">{deal.name}</h2>
                            <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold ${stage.bgColor} ${stage.color}`}>
                                <Icon size={11} /> {stage.label}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Value */}
                    <div className="bg-gradient-to-br from-[#0051A5] to-[#0066cc] rounded-2xl p-4 text-white">
                        <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">Deal Value</p>
                        <p className="text-3xl font-extrabold">{formatINRFull(value)}</p>
                        <p className="text-blue-200 text-xs mt-1">{stage.probability}% probability of closing</p>
                    </div>

                    {/* Info grid */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Info</h3>
                        {[
                            { icon: Mail, label: 'Email', val: deal.email },
                            { icon: Phone, label: 'Phone', val: deal.phone },
                            { icon: Building2, label: 'Source', val: deal.source },
                        ].map(({ icon: Icon, label, val }) => val ? (
                            <div key={label} className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                    <Icon size={14} className="text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                                    <p className="text-slate-700 font-medium">{val}</p>
                                </div>
                            </div>
                        ) : null)}
                    </div>

                    {/* Timeline */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline Progress</h3>
                        <div className="space-y-1">
                            {STAGES.map((s, i) => {
                                const stageIdx = STAGES.findIndex(x => x.id === deal.status);
                                const isCompleted = i < stageIdx;
                                const isCurrent = i === stageIdx;
                                return (
                                    <div key={s.id} className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-colors ${isCurrent ? `${s.bgColor} ${s.color}` : ''}`}>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500' : isCurrent ? 'ring-2 ring-current' : 'bg-slate-200'}`}>
                                            {isCompleted ? <Check size={11} className="text-white" /> : <CircleDot size={11} className={isCurrent ? s.color : 'text-slate-400'} />}
                                        </div>
                                        <span className={`text-sm font-medium ${isCurrent ? s.color : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {s.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notes */}
                    {deal.notes && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notes</h3>
                            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 leading-relaxed">{deal.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 flex gap-3">
                    <button onClick={onEdit}
                        className="flex-1 py-2.5 bg-[#0051A5] text-white rounded-xl font-bold text-sm hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20">
                        Edit Deal
                    </button>
                    <button onClick={onClose}
                        className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
type ViewMode = 'board' | 'list';

const CRMDeals = () => {
    const [deals, setDeals] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('board');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStage, setFilterStage] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [sortKey] = useState('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const perPage = 20;

    // Modals
    const [showAdd, setShowAdd] = useState(false);
    const [addStage, setAddStage] = useState('new');
    const [editDeal, setEditDeal] = useState<Lead | null>(null);
    const [viewDeal, setViewDeal] = useState<Lead | null>(null);

    const fetch = async () => {
        setLoading(true);
        const data = await dataService.getLeads();
        setDeals(data);
        setLoading(false);
    };

    useEffect(() => { fetch(); }, []);

    const filtered = useMemo(() => {
        return deals.filter(d => {
            const q = searchQuery.toLowerCase();
            return (
                (!q || d.name.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.phone?.includes(q)) &&
                (filterStage === 'all' || d.status === filterStage)
            );
        });
    }, [deals, searchQuery, filterStage]);

    const sorted = useMemo(() => [...filtered].sort((a, b) => {
        const aVal = (a as any)[sortKey] ?? '';
        const bVal = (b as any)[sortKey] ?? '';
        const c = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === 'asc' ? c : -c;
    }), [filtered, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    const paginated = sorted.slice((page - 1) * perPage, page * perPage);

    const handleStageChange = async (id: string, newStage: string) => {
        await dataService.updateLead(id, { status: newStage as any });
        toast.success('Deal stage updated');
        fetch();
    };

    const stageGroups = useMemo(() => {
        const g: Record<string, Lead[]> = {};
        STAGES.forEach(s => { g[s.id] = []; });
        filtered.forEach(d => {
            if (g[d.status] !== undefined) g[d.status].push(d);
        });
        return g;
    }, [filtered]);

    const totalValue = useMemo(() => filtered.reduce((s, d) => s + seedValue(d.id), 0), [filtered]);
    const closedWonValue = useMemo(() =>
        (stageGroups['closed_won'] || []).reduce((s, d) => s + seedValue(d.id), 0),
        [stageGroups]
    );

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#F8FAFB]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-[#0051A5] rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Loading deals...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#F8FAFB] overflow-hidden">

            {/* ── Top Bar ── */}
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 flex-wrap shrink-0">
                {/* View toggle */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
                    <button
                        onClick={() => setViewMode('board')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'board' ? 'bg-white shadow text-[#0051A5]' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <LayoutGrid size={13} /> Board
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white shadow text-[#0051A5]' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <List size={13} /> List
                    </button>
                </div>

                {/* Search */}
                <div className="relative flex-1 min-w-0 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text" placeholder="Search deals..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-slate-50 transition-all"
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    )}
                </div>

                {viewMode === 'list' && (
                    <>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all
                                ${showFilters || filterStage !== 'all' ? 'bg-[#0051A5]/10 border-[#0051A5]/30 text-[#0051A5]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Filter size={13} /> Filters
                            {filterStage !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-[#0051A5]" />}
                        </button>
                        <button
                            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all"
                        >
                            <ArrowUpDown size={13} /> Sort
                        </button>
                    </>
                )}

                <div className="flex-1" />

                <button onClick={() => fetch()} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh">
                    <RefreshCw size={16} />
                </button>
                <button
                    onClick={() => { setAddStage('new'); setShowAdd(true); }}
                    className="flex items-center gap-2 bg-[#0051A5] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20"
                >
                    <Plus size={16} /> Add deal
                </button>
            </div>

            {/* ── Summary Stats Bar ── */}
            <div className="bg-white border-b border-slate-100 px-5 py-2.5 flex items-center gap-6 flex-wrap shrink-0">
                {[
                    { label: 'Total Deals', val: filtered.length.toString(), icon: CircleDot, color: 'text-slate-600' },
                    { label: 'Pipeline Value', val: formatINRFull(totalValue), icon: TrendingUp, color: 'text-[#0051A5]' },
                    { label: 'Closed Won', val: formatINRFull(closedWonValue), icon: Trophy, color: 'text-emerald-600' },
                    {
                        label: 'This Month', val: filtered.filter(d => {
                            const m = new Date(); const c = new Date(d.created_at);
                            return c.getMonth() === m.getMonth() && c.getFullYear() === m.getFullYear();
                        }).length.toString(), icon: Calendar, color: 'text-violet-600'
                    },
                ].map(({ label, val, icon: Icon, color }) => (
                    <div key={label} className="flex items-center gap-2">
                        <Icon size={14} className={color} />
                        <span className="text-xs text-slate-500">{label}:</span>
                        <span className={`text-sm font-bold ${color}`}>{val}</span>
                    </div>
                ))}
            </div>

            {/* ── List Filters (only in list mode) ── */}
            {viewMode === 'list' && showFilters && (
                <div className="bg-blue-50/50 border-b border-blue-100 px-5 py-3 flex items-end gap-4 flex-wrap shrink-0">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Stage</label>
                        <select
                            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5]"
                            value={filterStage} onChange={e => { setFilterStage(e.target.value); setPage(1); }}
                        >
                            <option value="all">All Stages</option>
                            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                    </div>
                    {filterStage !== 'all' && (
                        <button onClick={() => { setFilterStage('all'); setPage(1); }}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <X size={13} /> Clear
                        </button>
                    )}
                </div>
            )}

            {/* ── Board View ── */}
            {viewMode === 'board' && (
                <div className="flex-1 overflow-x-auto overflow-y-hidden">
                    <div className="flex h-full gap-3 p-4 min-w-max">
                        {STAGES.map(stage => {
                            const stageDeals = stageGroups[stage.id] || [];
                            const stageValue = stageDeals.reduce((s, d) => s + seedValue(d.id), 0);
                            const Icon = stage.icon;
                            return (
                                <div key={stage.id} className="flex flex-col w-[272px] shrink-0">
                                    {/* Column Header */}
                                    <div className={`px-3 py-3 rounded-t-xl border ${stage.headerBg} mb-0`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <Icon size={14} className={stage.color} />
                                                <span className={`text-xs font-bold ${stage.color}`}>{stage.label}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold bg-white/60 px-1.5 py-0.5 rounded-full text-slate-600">
                                                    {stageDeals.length}
                                                </span>
                                                <button
                                                    onClick={() => { setAddStage(stage.id); setShowAdd(true); }}
                                                    className="w-5 h-5 flex items-center justify-center rounded-md text-slate-500 hover:bg-white/60 hover:text-slate-700 transition-colors"
                                                    title={`Add deal to ${stage.label}`}
                                                >
                                                    <Plus size={13} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className={`text-[11px] font-semibold ${stage.color}`}>{formatINRFull(stageValue)}</p>
                                    </div>

                                    {/* Cards */}
                                    <div className="flex-1 overflow-y-auto rounded-b-xl border border-t-0 border-slate-200 bg-slate-50 p-2 space-y-2 min-h-[200px]">
                                        {stageDeals.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                                                    <Icon size={18} className="text-slate-300" />
                                                </div>
                                                <p className="text-xs text-slate-400">No deals</p>
                                                <button
                                                    onClick={() => { setAddStage(stage.id); setShowAdd(true); }}
                                                    className="mt-2 text-xs text-[#0051A5] hover:underline font-medium"
                                                >
                                                    + Add deal
                                                </button>
                                            </div>
                                        ) : stageDeals.map(deal => (
                                            <DealCard
                                                key={deal.id}
                                                deal={deal}
                                                stage={stage}
                                                onStageChange={handleStageChange}
                                                onClick={d => setViewDeal(d)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── List View ── */}
            {viewMode === 'list' && (
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
                            <tr>
                                {['Deal Name', 'Stage', 'Value', 'Source', 'Phone', 'Created'].map(col => (
                                    <th key={col} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                        {col}
                                    </th>
                                ))}
                                <th className="w-10 px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <TrendingUp size={32} className="text-slate-300" />
                                            <p className="text-slate-500 font-medium">No deals found</p>
                                            <button onClick={() => setShowAdd(true)}
                                                className="flex items-center gap-2 px-4 py-2 bg-[#0051A5] text-white rounded-lg text-sm font-bold hover:bg-[#003d7a] transition-all">
                                                <Plus size={14} /> Add Deal
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginated.map((deal, idx) => {
                                const stage = STAGE_MAP[deal.status] ?? STAGES[0];
                                const Icon = stage.icon;
                                return (
                                    <tr key={deal.id}
                                        onClick={() => setViewDeal(deal)}
                                        className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors cursor-pointer group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <Avatar name={deal.name} />
                                                <span className="font-semibold text-[#0051A5] hover:underline truncate max-w-[200px]">{deal.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${stage.bgColor} ${stage.color}`}>
                                                <Icon size={11} /> {stage.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-semibold text-slate-800">{formatINR(seedValue(deal.id))}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 text-xs">{deal.source ?? '--'}</td>
                                        <td className="px-4 py-3 text-slate-600 text-xs">{deal.phone ?? '--'}</td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                            {deal.created_at ? new Date(deal.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={e => { e.stopPropagation(); setEditDeal(deal); }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* List Pagination */}
                    <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                        <span className="text-sm text-slate-500">{filtered.length} deal{filtered.length !== 1 ? 's' : ''}</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg border border-slate-200">
                                {page} / {totalPages}
                            </span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modals ── */}
            {showAdd && (
                <DealModal
                    initialStage={addStage}
                    onClose={() => setShowAdd(false)}
                    onSaved={fetch}
                />
            )}
            {editDeal && (
                <DealModal
                    deal={editDeal}
                    onClose={() => setEditDeal(null)}
                    onSaved={fetch}
                />
            )}
            {viewDeal && !editDeal && (
                <DealDrawer
                    deal={viewDeal}
                    stage={STAGE_MAP[viewDeal.status] ?? STAGES[0]}
                    onClose={() => setViewDeal(null)}
                    onEdit={() => { setEditDeal(viewDeal); setViewDeal(null); }}
                />
            )}
        </div>
    );
};

export default CRMDeals;
