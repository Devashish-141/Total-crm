import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Search, X, Filter, ArrowUpDown, Download,
    Columns, ChevronLeft, ChevronRight, MoreHorizontal,
    Check, RefreshCw, Ticket, Clock,
    CheckCircle2, MessageSquare, User, Calendar,
    Tag, Inbox, SlidersHorizontal,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────
type TicketStatus = 'new' | 'waiting_contact' | 'waiting_us' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TabId = 'all' | 'my_open' | 'unassigned';

interface TicketRecord {
    id: string;
    created_at: string;
    updated_at: string;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    owner: string;
    contact_name: string;
    contact_email: string;
    description: string;
    pipeline: string;
    category: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    new: { label: 'New', color: 'text-blue-700', bg: 'bg-blue-100', icon: Inbox },
    waiting_contact: { label: 'Waiting on contact', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
    waiting_us: { label: 'Waiting on us', color: 'text-violet-700', bg: 'bg-violet-100', icon: MessageSquare },
    closed: { label: 'Closed', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; dot: string }> = {
    low: { label: 'Low', color: 'text-slate-500', dot: 'bg-slate-400' },
    medium: { label: 'Medium', color: 'text-blue-600', dot: 'bg-blue-500' },
    high: { label: 'High', color: 'text-amber-600', dot: 'bg-amber-500' },
    urgent: { label: 'Urgent', color: 'text-red-600', dot: 'bg-red-500' },
};

const CATEGORIES = ['Technical', 'Billing', 'Installation', 'Maintenance', 'Warranty', 'General', 'Other'];
const OWNERS = ['Admin User', 'Sales Executive', 'Support Agent', 'Manager'];
const PIPELINES = ['Support Pipeline', 'Technical Pipeline'];

interface ColDef { id: string; label: string; visible: boolean }
const DEFAULT_COLS: ColDef[] = [
    { id: 'subject', label: 'Ticket name', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'created_at', label: 'Create date', visible: true },
    { id: 'updated_at', label: 'Last activity date', visible: true },
    { id: 'priority', label: 'Priority', visible: true },
    { id: 'owner', label: 'Ticket owner', visible: true },
    { id: 'contact_name', label: 'Contact', visible: true },
    { id: 'pipeline', label: 'Pipeline', visible: false },
    { id: 'category', label: 'Category', visible: false },
];

const PER_PAGE = 25;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (s: string) =>
    s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const ago = (s: string) => {
    const diff = Date.now() - new Date(s).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Av = ({ name }: { name: string }) => {
    const init = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const palette = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
    return (
        <span className={`w-7 h-7 rounded-full ${palette[name.charCodeAt(0) % palette.length]} inline-flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
            {init}
        </span>
    );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: TicketStatus }) => {
    const cfg = STATUS_CONFIG[status];
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.color} whitespace-nowrap`}>
            <Icon size={11} /> {cfg.label}
        </span>
    );
};

// ─── Priority Badge ───────────────────────────────────────────────────────────
const PriBadge = ({ priority }: { priority: TicketPriority }) => {
    const cfg = PRIORITY_CONFIG[priority];
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${cfg.color}`}>
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {cfg.label}
        </span>
    );
};

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
interface ModalProps { ticket?: TicketRecord | null; onClose(): void; onSaved(): void; currentUser?: string }

const TicketModal = ({ ticket, onClose, onSaved, currentUser = 'Admin User' }: ModalProps) => {
    const [form, setForm] = useState<Omit<TicketRecord, 'id' | 'created_at' | 'updated_at'>>({
        subject: ticket?.subject ?? '',
        status: ticket?.status ?? 'new',
        priority: ticket?.priority ?? 'medium',
        owner: ticket?.owner ?? currentUser,
        contact_name: ticket?.contact_name ?? '',
        contact_email: ticket?.contact_email ?? '',
        description: ticket?.description ?? '',
        pipeline: ticket?.pipeline ?? 'Support Pipeline',
        category: ticket?.category ?? 'General',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload = { ...form, updated_at: new Date().toISOString() };
        if (ticket) {
            const { error } = await supabase.from('crm_tickets').update(payload).eq('id', ticket.id);
            if (error) { toast.error('Failed to update ticket'); setSaving(false); return; }
            toast.success('Ticket updated');
        } else {
            const { error } = await supabase.from('crm_tickets').insert([{ ...payload, created_at: new Date().toISOString() }]);
            if (error) { toast.error('Failed to create ticket'); setSaving(false); return; }
            toast.success('Ticket created');
        }
        onSaved(); onClose();
    };

    const field = (label: string, children: React.ReactNode) => (
        <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
            {children}
        </div>
    );

    const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white transition-all";

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{ticket ? 'Edit Ticket' : 'Add Ticket'}</h2>
                        <p className="text-slate-400 text-xs mt-0.5">{ticket ? 'Update ticket details' : 'Create a new support ticket'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {field('Ticket Name *', (
                        <input required type="text" className={inputCls} placeholder="e.g. Inverter not working" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
                    ))}
                    <div className="grid grid-cols-2 gap-4">
                        {field('Status', (
                            <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TicketStatus })}>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        ))}
                        {field('Priority', (
                            <select className={inputCls} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TicketPriority })}>
                                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {field('Contact Name', (
                            <input type="text" className={inputCls} placeholder="Customer name" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
                        ))}
                        {field('Contact Email', (
                            <input type="email" className={inputCls} placeholder="email@example.com" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {field('Owner', (
                            <select className={inputCls} value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })}>
                                {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        ))}
                        {field('Category', (
                            <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        ))}
                    </div>
                    {field('Pipeline', (
                        <select className={inputCls} value={form.pipeline} onChange={e => setForm({ ...form, pipeline: e.target.value })}>
                            {PIPELINES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    ))}
                    {field('Description', (
                        <textarea rows={3} className={`${inputCls} resize-none`} placeholder="Describe the issue..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    ))}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#0051A5] text-white rounded-xl font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20 text-sm disabled:opacity-60">
                            {saving ? 'Saving…' : ticket ? 'Save Changes' : 'Add Ticket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────
const TicketDrawer = ({ ticket, onClose, onEdit }: { ticket: TicketRecord; onClose(): void; onEdit(): void }) => {
    return (
        <div className="fixed inset-0 z-[1500]" onClick={onClose}>
            <div className="absolute right-0 top-0 h-full w-[360px] bg-white shadow-2xl border-l border-slate-200 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Ticket size={16} className="text-[#0051A5]" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket</span>
                        </div>
                        <h2 className="font-bold text-slate-900 text-base leading-tight">{ticket.subject}</h2>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <StatusBadge status={ticket.status} />
                            <PriBadge priority={ticket.priority} />
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors shrink-0"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Key info */}
                    <div className="bg-gradient-to-br from-[#0051A5] to-[#0066cc] rounded-2xl p-4 text-white space-y-1">
                        <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider">Pipeline</p>
                        <p className="font-bold text-sm">{ticket.pipeline}</p>
                        <p className="text-blue-200 text-[10px] font-medium mt-1">Category: {ticket.category}</p>
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                        {([
                            { icon: User, label: 'Ticket Owner', val: ticket.owner },
                            { icon: User, label: 'Contact', val: ticket.contact_name || '--' },
                            { icon: Tag, label: 'Category', val: ticket.category },
                            { icon: Calendar, label: 'Created', val: fmtDate(ticket.created_at) },
                            { icon: Clock, label: 'Last Activity', val: ago(ticket.updated_at) },
                        ] as { icon: React.ElementType; label: string; val: string }[]).map(({ icon: Icon, label, val }) => (
                            <div key={label} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                    <Icon size={14} className="text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                                    <p className="text-sm text-slate-700 font-medium">{val}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Description */}
                    {ticket.description && (
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Description</p>
                            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 leading-relaxed">{ticket.description}</p>
                        </div>
                    )}

                    {/* Pipeline stages */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pipeline stages</p>
                        <div className="space-y-1">
                            {(Object.keys(STATUS_CONFIG) as TicketStatus[]).map((s, i) => {
                                const cfg = STATUS_CONFIG[s];
                                const Icon = cfg.icon;
                                const stageIdx = (Object.keys(STATUS_CONFIG) as TicketStatus[]).indexOf(ticket.status);
                                const isCompleted = i < stageIdx;
                                const isCurrent = i === stageIdx;
                                return (
                                    <div key={s} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isCurrent ? `${cfg.bg} ${cfg.color}` : ''}`}>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500' : isCurrent ? 'ring-2 ring-current' : 'bg-slate-200'}`}>
                                            {isCompleted ? <Check size={11} className="text-white" /> : <Icon size={11} className={isCurrent ? cfg.color : 'text-slate-400'} />}
                                        </div>
                                        <span className={`text-sm font-medium ${isCurrent ? cfg.color : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>{cfg.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex gap-3">
                    <button onClick={onEdit} className="flex-1 py-2.5 bg-[#0051A5] text-white rounded-xl font-bold text-sm hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20">
                        Edit Ticket
                    </button>
                    <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Column Picker ────────────────────────────────────────────────────────────
const ColPicker = ({ cols, onChange, onClose }: { cols: ColDef[]; onChange(c: ColDef[]): void; onClose(): void }) => (
    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3">
        <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Toggle Columns</p>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
        </div>
        {cols.map(col => (
            <button key={col.id} onClick={() => onChange(cols.map(c => c.id === col.id ? { ...c, visible: !c.visible } : c))}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${col.visible ? 'bg-[#0051A5] border-[#0051A5]' : 'border-slate-300'}`}>
                    {col.visible && <Check size={11} className="text-white" />}
                </span>
                <span className="text-sm text-slate-700">{col.label}</span>
            </button>
        ))}
    </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string }[] = [
    { id: 'all', label: 'All tickets' },
    { id: 'my_open', label: 'My open tickets' },
    { id: 'unassigned', label: 'Unassigned tickets' },
];

const CRMTickets = () => {
    const [tickets, setTickets] = useState<TicketRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const currentUser = 'Admin User';

    const [tab, setTab] = useState<TabId>('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'created_at', dir: 'desc' });
    const [cols, setCols] = useState<ColDef[]>(DEFAULT_COLS);

    // Panel state
    const [showFilters, setShowFilters] = useState(false);
    const [showColPicker, setShowColPicker] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterOwner, setFilterOwner] = useState('all');
    const [filterPipeline, setFilterPipeline] = useState('all');

    // Modals
    const [showAdd, setShowAdd] = useState(false);
    const [editT, setEditT] = useState<TicketRecord | null>(null);
    const [viewT, setViewT] = useState<TicketRecord | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('crm_tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            // Table doesn't exist yet — show empty state gracefully
            setTickets([]);
        } else {
            setTickets((data ?? []) as TicketRecord[]);
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // ── Filtered ────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return tickets.filter(t => {
            const q = search.toLowerCase();
            if (q && !t.subject.toLowerCase().includes(q) && !t.contact_name?.toLowerCase().includes(q)) return false;
            if (tab === 'my_open' && (t.owner !== currentUser || t.status === 'closed')) return false;
            if (tab === 'unassigned' && t.owner !== '') return false;
            if (filterStatus !== 'all' && t.status !== filterStatus) return false;
            if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
            if (filterOwner !== 'all' && t.owner !== filterOwner) return false;
            if (filterPipeline !== 'all' && t.pipeline !== filterPipeline) return false;
            return true;
        });
    }, [tickets, search, tab, filterStatus, filterPriority, filterOwner, filterPipeline]);

    const sorted = useMemo(() => [...filtered].sort((a, b) => {
        const aV = (a as any)[sort.key] ?? '';
        const bV = (b as any)[sort.key] ?? '';
        return (sort.dir === 'asc' ? 1 : -1) * (aV < bV ? -1 : aV > bV ? 1 : 0);
    }), [filtered, sort]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
    const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const handleSort = (key: string) => setSort(p => p.key === key ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
    const allSelected = paginated.length > 0 && paginated.every(t => selectedIds.has(t.id));

    const handleDeleteSelected = async () => {
        if (!window.confirm(`Delete ${selectedIds.size} ticket(s)?`)) return;
        for (const id of selectedIds) await supabase.from('crm_tickets').delete().eq('id', id);
        toast.success(`Deleted ${selectedIds.size} ticket(s)`);
        setSelectedIds(new Set());
        fetchData();
    };

    const handleExport = () => {
        const visCols = cols.filter(c => c.visible);
        const rows = filtered.map(t => visCols.map(c => {
            const v = (t as any)[c.id] ?? '';
            return `"${String(v).replace(/"/g, '""')}"`;
        }).join(',')).join('\n');
        const csv = [visCols.map(c => c.label).join(','), rows].join('\n');
        const a = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
            download: 'crm-tickets.csv',
        });
        a.click();
        toast.success('Tickets exported');
    };

    const visibleCols = cols.filter(c => c.visible);
    const hasFilter = filterStatus !== 'all' || filterPriority !== 'all' || filterOwner !== 'all' || filterPipeline !== 'all';

    const tabCount = (id: TabId) => {
        if (id === 'all') return tickets.length;
        if (id === 'my_open') return tickets.filter(t => t.owner === currentUser && t.status !== 'closed').length;
        if (id === 'unassigned') return tickets.filter(t => !t.owner).length;
        return 0;
    };

    return (
        <div className="flex flex-col h-full bg-[#F8FAFB] overflow-hidden">

            {/* ── Tab + Action strip ── */}
            <div className="bg-white border-b border-slate-200 px-5 py-0 flex items-center gap-0 flex-wrap shrink-0">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); setPage(1); setSelectedIds(new Set()); }}
                        className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap
                            ${tab === t.id ? 'border-[#0051A5] text-[#0051A5]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        {t.label}
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-[#0051A5] text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {tabCount(t.id)}
                        </span>
                        {tab === t.id && <X size={13} className="ml-1 opacity-50 hover:opacity-100" onClick={e => { e.stopPropagation(); setTab('all'); }} />}
                    </button>
                ))}
                <button className="px-3 py-3.5 text-slate-400 hover:text-slate-600 transition-colors" title="Add view"><Plus size={15} /></button>
                <div className="flex-1" />
                <div className="flex items-center gap-2 pr-1 py-2">
                    {selectedIds.size > 0 && (
                        <button onClick={handleDeleteSelected}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                            <X size={13} /> Delete ({selectedIds.size})
                        </button>
                    )}
                    <button onClick={() => { setShowAdd(true); }}
                        className="flex items-center gap-2 bg-[#0051A5] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20">
                        <Plus size={15} /> Add tickets
                    </button>
                </div>
            </div>

            {/* ── Toolbar ── */}
            <div className="bg-white border-b border-slate-100 px-5 py-2 flex items-center gap-2 flex-wrap shrink-0">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search..."
                        className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none transition-all"
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>}
                </div>

                <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                    {/* Pipeline selector */}
                    <select
                        className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 text-slate-600 bg-white outline-none hover:bg-slate-50 transition-all"
                        value={filterPipeline} onChange={e => { setFilterPipeline(e.target.value); setPage(1); }}>
                        <option value="all">All Pipelines</option>
                        {PIPELINES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    {/* Filters */}
                    <button onClick={() => { setShowFilters(!showFilters); setShowColPicker(false); }}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all
                            ${showFilters || hasFilter ? 'bg-[#0051A5]/10 border-[#0051A5]/30 text-[#0051A5]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Filter size={13} /> Filters {hasFilter && <span className="w-1.5 h-1.5 rounded-full bg-[#0051A5]" />}
                    </button>

                    {/* Sort */}
                    <button onClick={() => setSort(p => ({ ...p, dir: p.dir === 'asc' ? 'desc' : 'asc' }))}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all">
                        <ArrowUpDown size={13} /> Sort
                    </button>

                    {/* Export */}
                    <button onClick={handleExport}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all">
                        <Download size={13} /> Export
                    </button>

                    {/* Columns */}
                    <div className="relative">
                        <button onClick={() => { setShowColPicker(!showColPicker); setShowFilters(false); }}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border rounded-lg transition-all
                                ${showColPicker ? 'bg-[#0051A5]/10 border-[#0051A5]/30 text-[#0051A5]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <Columns size={13} /> Edit columns
                        </button>
                        {showColPicker && <ColPicker cols={cols} onChange={setCols} onClose={() => setShowColPicker(false)} />}
                    </div>

                    {/* Refresh */}
                    <button onClick={fetchData} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* ── Active filter pills ── */}
            <div className="bg-white border-b border-slate-100 px-5 py-1.5 flex items-center gap-2 flex-wrap shrink-0">
                {(['Ticket owner', 'Create date', 'Last activity date', 'Priority'] as const).map(label => (
                    <button key={label}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 transition-colors">
                        {label} <ChevronLeft size={12} className="rotate-[-90deg]" />
                    </button>
                ))}
                <button className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                    <Plus size={12} /> More
                </button>
                <span className="text-slate-200">|</span>
                <button className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-500 hover:text-[#0051A5] transition-colors">
                    <SlidersHorizontal size={12} /> Advanced filters
                </button>
            </div>

            {/* ── Filters Panel ── */}
            {showFilters && (
                <div className="bg-blue-50/40 border-b border-blue-100 px-5 py-3 flex items-end gap-4 flex-wrap shrink-0">
                    {[
                        { label: 'Status', val: filterStatus, set: setFilterStatus, options: [['all', 'All Statuses'], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])] },
                        { label: 'Priority', val: filterPriority, set: setFilterPriority, options: [['all', 'All Priorities'], ...Object.entries(PRIORITY_CONFIG).map(([k, v]) => [k, v.label])] },
                        { label: 'Owner', val: filterOwner, set: setFilterOwner, options: [['all', 'All Owners'], ...OWNERS.map(o => [o, o])] },
                    ].map(({ label, val, set, options }) => (
                        <div key={label}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                            <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5]"
                                value={val} onChange={e => { (set as any)(e.target.value); setPage(1); }}>
                                {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                            </select>
                        </div>
                    ))}
                    {hasFilter && (
                        <button onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setFilterOwner('all'); setPage(1); }}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <X size={13} /> Clear all
                        </button>
                    )}
                </div>
            )}

            {/* ── Table ── */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
                        <tr>
                            <th className="w-10 px-4 py-3 text-left">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-[#0051A5] cursor-pointer"
                                    checked={allSelected}
                                    onChange={e => setSelectedIds(e.target.checked ? new Set(paginated.map(t => t.id)) : new Set())} />
                            </th>
                            {visibleCols.map(col => (
                                <th key={col.id} onClick={() => handleSort(col.id)}
                                    className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-[#0051A5] select-none group">
                                    <span className="flex items-center gap-1">
                                        {col.label}
                                        <ArrowUpDown size={11} className={`opacity-0 group-hover:opacity-100 transition-opacity ${sort.key === col.id ? '!opacity-100 text-[#0051A5]' : ''}`} />
                                        {sort.key === col.id && <span className="text-[8px] text-[#0051A5]">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                                    </span>
                                </th>
                            ))}
                            <th className="w-10 px-4 py-3" />
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr><td colSpan={visibleCols.length + 2} className="py-20 text-center">
                                <div className="flex items-center justify-center gap-3 text-slate-400">
                                    <div className="w-5 h-5 border-2 border-slate-200 border-t-[#0051A5] rounded-full animate-spin" />
                                    Loading tickets…
                                </div>
                            </td></tr>
                        ) : paginated.length === 0 ? (
                            <tr><td colSpan={visibleCols.length + 2} className="py-20">
                                <div className="flex flex-col items-center gap-4 max-w-sm mx-auto text-center">
                                    {/* HubSpot-style illustration placeholder */}
                                    <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-violet-50 rounded-3xl flex items-center justify-center shadow-inner">
                                        <div className="relative">
                                            <Ticket size={40} className="text-[#0051A5]/30" />
                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center">
                                                <Check size={11} className="text-white" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-base mb-1">Keep track of issues with your customers</h3>
                                        <p className="text-slate-400 text-sm leading-relaxed">
                                            Create tickets and assign them to a member of your team so they can offer the right help at the right time.
                                        </p>
                                    </div>
                                    <button onClick={() => setShowAdd(true)}
                                        className="flex items-center gap-2 bg-[#0051A5] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20">
                                        <Plus size={15} /> Add Ticket
                                    </button>
                                </div>
                            </td></tr>
                        ) : paginated.map((ticket, idx) => (
                            <tr key={ticket.id} onClick={() => setViewT(ticket)}
                                className={`border-b border-slate-100 hover:bg-blue-50/30 cursor-pointer transition-colors group
                                    ${selectedIds.has(ticket.id) ? 'bg-blue-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-[#0051A5] cursor-pointer"
                                        checked={selectedIds.has(ticket.id)}
                                        onChange={e => {
                                            const s = new Set(selectedIds);
                                            e.target.checked ? s.add(ticket.id) : s.delete(ticket.id);
                                            setSelectedIds(s);
                                        }} />
                                </td>

                                {visibleCols.map(col => (
                                    <td key={col.id} className="px-4 py-3 whitespace-nowrap max-w-[240px]">
                                        {col.id === 'subject' && (
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-[#0051A5]/10 flex items-center justify-center shrink-0">
                                                    <Ticket size={13} className="text-[#0051A5]" />
                                                </div>
                                                <span className="font-semibold text-[#0051A5] hover:underline truncate">{ticket.subject}</span>
                                            </div>
                                        )}
                                        {col.id === 'status' && <StatusBadge status={ticket.status} />}
                                        {col.id === 'priority' && <PriBadge priority={ticket.priority} />}
                                        {col.id === 'created_at' && <span className="text-slate-500 text-xs">{fmtDate(ticket.created_at)}</span>}
                                        {col.id === 'updated_at' && <span className="text-slate-400 text-xs">{ago(ticket.updated_at)}</span>}
                                        {col.id === 'owner' && (
                                            ticket.owner ? (
                                                <div className="flex items-center gap-2">
                                                    <Av name={ticket.owner} />
                                                    <span className="text-slate-600 text-xs truncate">{ticket.owner}</span>
                                                </div>
                                            ) : <span className="text-slate-300 text-xs italic">Unassigned</span>
                                        )}
                                        {col.id === 'contact_name' && (
                                            ticket.contact_name ? (
                                                <div className="flex items-center gap-2">
                                                    <Av name={ticket.contact_name} />
                                                    <span className="text-slate-600 text-xs truncate">{ticket.contact_name}</span>
                                                </div>
                                            ) : <span className="text-slate-300 text-xs">--</span>
                                        )}
                                        {col.id === 'pipeline' && <span className="text-slate-500 text-xs">{ticket.pipeline}</span>}
                                        {col.id === 'category' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-full">
                                                <Tag size={10} /> {ticket.category}
                                            </span>
                                        )}
                                    </td>
                                ))}

                                <td className="px-4 py-3">
                                    <button onClick={e => { e.stopPropagation(); setEditT(ticket); }}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Pagination ── */}
            <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-between gap-4 flex-wrap shrink-0">
                <span className="text-sm text-slate-500">
                    {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
                    {selectedIds.size > 0 && <span className="ml-2 text-[#0051A5] font-medium">• {selectedIds.size} selected</span>}
                </span>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{PER_PAGE} per page</span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <span className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 rounded-lg border border-slate-200">
                            {page} / {totalPages}
                        </span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Modals ── */}
            {showAdd && <TicketModal currentUser={currentUser} onClose={() => setShowAdd(false)} onSaved={fetchData} />}
            {editT && <TicketModal ticket={editT} currentUser={currentUser} onClose={() => setEditT(null)} onSaved={fetchData} />}
            {viewT && !editT && (
                <TicketDrawer ticket={viewT} onClose={() => setViewT(null)} onEdit={() => { setEditT(viewT); setViewT(null); }} />
            )}
            {showColPicker && <div className="fixed inset-0 z-40" onClick={() => setShowColPicker(false)} />}
        </div>
    );
};

export default CRMTickets;
