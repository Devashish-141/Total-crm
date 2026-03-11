import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, X, Search, Filter, ArrowUpDown, Download,
    Users, Building2, TrendingUp, ShoppingCart,
    MoreHorizontal, RefreshCw, Copy, Trash2,
    Sparkles, Play, ChevronDown, ChevronRight,
    BarChart3, PieChart, Activity, Target,
    Edit3, Eye, ToggleLeft, ToggleRight, Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────
type SegType = 'contacts' | 'companies' | 'deals' | 'orders';
type SegStatus = 'active' | 'draft' | 'archived';
type TabId = 'intro' | 'manage' | 'analyze';

interface Segment {
    id: string;
    created_at: string;
    updated_at: string;
    name: string;
    description: string;
    type: SegType;
    status: SegStatus;
    criteria: string;      // JSON string of rules
    contact_count: number;
    owner: string;
    tags: string;          // comma-separated
}

// ─── Config ──────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<SegType, { label: string; plural: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
    contacts: { label: 'Contact', plural: 'Contact segments', icon: Users, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    companies: { label: 'Company', plural: 'Company segments', icon: Building2, color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
    deals: { label: 'Deal', plural: 'Deal segments', icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    orders: { label: 'Order', plural: 'Order segments', icon: ShoppingCart, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
};

const STATUS_CONFIG: Record<SegStatus, { label: string; color: string; bg: string }> = {
    active: { label: 'Active', color: 'text-emerald-700', bg: 'bg-emerald-100' },
    draft: { label: 'Draft', color: 'text-slate-500', bg: 'bg-slate-100' },
    archived: { label: 'Archived', color: 'text-slate-400', bg: 'bg-slate-50' },
};

const SAMPLE_CRITERIA = [
    'Customers from Chennai with system size above 5kW',
    'Leads created in the last 30 days from Facebook',
    'Deals worth more than ₹2 lakhs in negotiation stage',
    'Contacts who haven\'t been contacted in 7+ days',
    'Companies with 5+ employees in the manufacturing sector',
    'Orders pending installation for more than 2 weeks',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (s: string) =>
    s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Av = ({ name }: { name: string }) => {
    const init = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const p = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500'];
    return (
        <span className={`w-7 h-7 rounded-full ${p[name.charCodeAt(0) % p.length]} inline-flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
            {init}
        </span>
    );
};

// ─── Create Segment Modal ─────────────────────────────────────────────────────
const SegmentModal = ({ seg, onClose, onSaved }: { seg?: Segment | null; onClose(): void; onSaved(): void }) => {
    const [form, setForm] = useState({
        name: seg?.name ?? '',
        description: seg?.description ?? '',
        type: seg?.type ?? 'contacts' as SegType,
        status: seg?.status ?? 'active' as SegStatus,
        criteria: seg?.criteria ?? '',
        contact_count: seg?.contact_count ?? 0,
        owner: seg?.owner ?? 'Admin User',
        tags: seg?.tags ?? '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const now = new Date().toISOString();
        if (seg) {
            const { error } = await supabase.from('crm_segments').update({ ...form, updated_at: now }).eq('id', seg.id);
            if (error) { toast.error('Failed to update segment'); setSaving(false); return; }
            toast.success('Segment updated');
        } else {
            const { error } = await supabase.from('crm_segments').insert([{ ...form, created_at: now, updated_at: now }]);
            if (error) { toast.error('Failed to create segment'); setSaving(false); return; }
            toast.success('Segment created');
        }
        onSaved(); onClose();
    };

    const ic = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white transition-all";
    const L = (label: string, node: React.ReactNode) => (
        <div><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>{node}</div>
    );

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{seg ? 'Edit Segment' : 'Create Segment'}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Define rules to group your {form.type}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {L('Segment Name *', (
                        <input required type="text" className={ic} placeholder="e.g. High Value Chennai Leads" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    ))}
                    <div className="grid grid-cols-2 gap-4">
                        {L('Segment Type', (
                            <select className={ic} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as SegType })}>
                                {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}s</option>)}
                            </select>
                        ))}
                        {L('Status', (
                            <select className={ic} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as SegStatus })}>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        ))}
                    </div>
                    {L('Description', (
                        <textarea rows={2} className={`${ic} resize-none`} placeholder="What does this segment represent?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    ))}
                    {L('Segment Criteria / Rules', (
                        <textarea rows={3} className={`${ic} resize-none`}
                            placeholder="e.g. City = Chennai AND System Size >= 5kW AND Lead Source = Facebook"
                            value={form.criteria} onChange={e => setForm({ ...form, criteria: e.target.value })} />
                    ))}
                    <div className="grid grid-cols-2 gap-4">
                        {L('Est. Count', (
                            <input type="number" min={0} className={ic} value={form.contact_count} onChange={e => setForm({ ...form, contact_count: parseInt(e.target.value) || 0 })} />
                        ))}
                        {L('Owner', (
                            <select className={ic} value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })}>
                                {['Admin User', 'Sales Executive', 'Manager'].map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        ))}
                    </div>
                    {L('Tags (comma separated)', (
                        <input type="text" className={ic} placeholder="e.g. high-value, chennai, solar" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
                    ))}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-sm">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#0051A5] text-white rounded-xl font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20 text-sm disabled:opacity-60">
                            {saving ? 'Saving…' : seg ? 'Save Changes' : 'Create Segment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Insight Card ─────────────────────────────────────────────────────────────
const InsightCard = ({ type, count, total, onClick }: { type: SegType; count: number; total: number; onClick(): void }) => {
    const cfg = TYPE_CONFIG[type];
    const Icon = cfg.icon;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <button onClick={onClick}
            className={`flex-1 min-w-[160px] border ${cfg.border} ${cfg.bg} rounded-2xl p-5 text-left hover:shadow-md transition-all group`}>
            <div className="flex items-center justify-between mb-3">
                <Icon size={18} className={cfg.color} />
                <ChevronRight size={14} className={`${cfg.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </div>
            <p className="text-3xl font-extrabold text-slate-900">{count}</p>
            <p className="text-xs font-bold text-slate-500 mt-1">{cfg.plural}</p>
            <p className={`text-xs font-semibold mt-2 ${cfg.color}`}>{pct}% of all segments</p>
        </button>
    );
};

// ─── Segment Row ──────────────────────────────────────────────────────────────
const SegRow = ({ seg, onEdit, onDelete, onClone, onToggle }: {
    seg: Segment;
    onEdit(): void;
    onDelete(): void;
    onClone(): void;
    onToggle(): void;
}) => {
    const [menu, setMenu] = useState(false);
    const tc = TYPE_CONFIG[seg.type];
    const sc = STATUS_CONFIG[seg.status];
    const TIcon = tc.icon;
    const tags = seg.tags ? seg.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    return (
        <tr className="border-b border-slate-100 hover:bg-blue-50/20 transition-colors group">
            <td className="px-5 py-3.5">
                <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl ${tc.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <TIcon size={16} className={tc.color} />
                    </div>
                    <div>
                        <button onClick={onEdit} className={`font-bold text-sm text-slate-800 hover:text-[#0051A5] hover:underline leading-tight`}>{seg.name}</button>
                        {seg.description && <p className="text-xs text-slate-400 mt-0.5 max-w-[280px] truncate">{seg.description}</p>}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                {tags.slice(0, 3).map(t => (
                                    <span key={t} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md font-medium">{t}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-4 py-3.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${tc.bg} ${tc.color}`}>
                    <TIcon size={11} /> {tc.label}s
                </span>
            </td>
            <td className="px-4 py-3.5">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${sc.bg} ${sc.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${seg.status === 'active' ? 'bg-emerald-500' : seg.status === 'draft' ? 'bg-slate-400' : 'bg-slate-300'}`} />
                    {sc.label}
                </span>
            </td>
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Users size={13} className="text-blue-500" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">{seg.contact_count.toLocaleString()}</span>
                </div>
            </td>
            <td className="px-4 py-3.5">
                {seg.owner && <div className="flex items-center gap-2"><Av name={seg.owner} /><span className="text-xs text-slate-500 truncate max-w-[100px]">{seg.owner}</span></div>}
            </td>
            <td className="px-4 py-3.5 text-xs text-slate-400">{fmtDate(seg.updated_at)}</td>
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-[#0051A5] hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Edit3 size={14} /></button>
                    <button onClick={onToggle} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Toggle status">
                        {seg.status === 'active' ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                    </button>
                    <div className="relative">
                        <button onClick={() => setMenu(!menu)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <MoreHorizontal size={14} />
                        </button>
                        {menu && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-sm">
                                <button onClick={() => { onClone(); setMenu(false); }} className="w-full px-3 py-2 text-left text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Copy size={13} /> Clone</button>
                                <button onClick={() => { onEdit(); setMenu(false); }} className="w-full px-3 py-2 text-left text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Edit3 size={13} /> Edit</button>
                                <hr className="my-1 border-slate-100" />
                                <button onClick={() => { onDelete(); setMenu(false); }} className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={13} /> Delete</button>
                            </div>
                        )}
                    </div>
                </div>
            </td>
        </tr>
    );
};

// ─── Analyze Tab ──────────────────────────────────────────────────────────────
const AnalyzeTab = ({ segments }: { segments: Segment[] }) => {
    const byType = useMemo(() => {
        const m: Record<string, number> = {};
        segments.forEach(s => { m[s.type] = (m[s.type] || 0) + 1; });
        return m;
    }, [segments]);

    const byStatus = useMemo(() => {
        const m: Record<string, number> = {};
        segments.forEach(s => { m[s.status] = (m[s.status] || 0) + 1; });
        return m;
    }, [segments]);

    const totalContacts = segments.reduce((s, seg) => s + (seg.contact_count || 0), 0);

    const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) => (
        <div className={`bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4`}>
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                <Icon size={18} className="text-white" />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{value}</p>
                {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );

    const BarRow = ({ label, val, max, color }: { label: string; val: number; max: number; color: string }) => (
        <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-28 truncate text-right shrink-0">{label}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: max > 0 ? `${(val / max) * 100}%` : '0%' }} />
            </div>
            <span className="text-xs font-bold text-slate-700 w-8 shrink-0">{val}</span>
        </div>
    );

    const maxType = Math.max(...Object.values(byType), 1);
    const maxStat = Math.max(...Object.values(byStatus), 1);

    return (
        <div className="flex-1 overflow-auto p-6 space-y-6">
            {segments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-violet-50 rounded-3xl flex items-center justify-center">
                        <BarChart3 size={36} className="text-[#0051A5]/30" />
                    </div>
                    <p className="text-slate-500 text-sm max-w-xs">Create your first segment to see analytics here</p>
                </div>
            ) : (
                <>
                    {/* KPI row */}
                    <div className="grid grid-cols-4 gap-4">
                        <StatCard icon={Target} label="Total Segments" value={segments.length} color="bg-[#0051A5]" />
                        <StatCard icon={Activity} label="Active Segments" value={byStatus['active'] || 0} sub={`${Math.round(((byStatus['active'] || 0) / segments.length) * 100)}% of total`} color="bg-emerald-500" />
                        <StatCard icon={Users} label="Total Contacts" value={totalContacts.toLocaleString()} sub="across all segments" color="bg-violet-500" />
                        <StatCard icon={Zap} label="Draft Segments" value={byStatus['draft'] || 0} color="bg-amber-500" />
                    </div>

                    {/* Charts side-by-side */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* By type */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <PieChart size={16} className="text-slate-500" />
                                <p className="font-bold text-slate-800 text-sm">Segments by Type</p>
                            </div>
                            <div className="space-y-3">
                                {(Object.entries(TYPE_CONFIG) as [SegType, any][]).map(([k, v]) => (
                                    <BarRow key={k} label={v.plural} val={byType[k] || 0} max={maxType}
                                        color={k === 'contacts' ? 'bg-blue-500' : k === 'companies' ? 'bg-violet-500' : k === 'deals' ? 'bg-emerald-500' : 'bg-amber-500'} />
                                ))}
                            </div>
                        </div>

                        {/* By status */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 size={16} className="text-slate-500" />
                                <p className="font-bold text-slate-800 text-sm">Segments by Status</p>
                            </div>
                            <div className="space-y-3">
                                {(Object.entries(STATUS_CONFIG) as [SegStatus, any][]).map(([k, v]) => (
                                    <BarRow key={k} label={v.label} val={byStatus[k] || 0} max={maxStat}
                                        color={k === 'active' ? 'bg-emerald-500' : k === 'draft' ? 'bg-slate-400' : 'bg-slate-200'} />
                                ))}
                            </div>
                        </div>

                        {/* Top segments table */}
                        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Target size={16} className="text-slate-500" />
                                <p className="font-bold text-slate-800 text-sm">Top Segments by Size</p>
                            </div>
                            <div className="space-y-2">
                                {[...segments].sort((a, b) => b.contact_count - a.contact_count).slice(0, 5).map((s, i) => {
                                    const tc = TYPE_CONFIG[s.type];
                                    const TIcon = tc.icon;
                                    return (
                                        <div key={s.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                                            <span className="text-xs font-bold text-slate-300 w-5 text-right">{i + 1}</span>
                                            <div className={`w-7 h-7 rounded-lg ${tc.bg} flex items-center justify-center`}>
                                                <TIcon size={13} className={tc.color} />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700 flex-1">{s.name}</span>
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[s.status].bg} ${STATUS_CONFIG[s.status].color}`}>{STATUS_CONFIG[s.status].label}</span>
                                            <span className="text-sm font-bold text-slate-900">{s.contact_count.toLocaleString()}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const CRMSegments = () => {
    const [segments, setSegments] = useState<Segment[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabId>('intro');
    const [showIntro, setShowIntro] = useState(true);

    // AI input
    const [aiType, setAiType] = useState<SegType>('contacts');
    const [aiText, setAiText] = useState('');
    const [aiPlhIdx, setAiPlhIdx] = useState(0);

    // Manage state
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'updated_at', dir: 'desc' });

    // Modals
    const [showCreate, setShowCreate] = useState(false);
    const [editSeg, setEditSeg] = useState<Segment | null>(null);

    useEffect(() => {
        const t = setInterval(() => setAiPlhIdx(p => (p + 1) % SAMPLE_CRITERIA.length), 4000);
        return () => clearInterval(t);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('crm_segments').select('*').order('created_at', { ascending: false });
        setSegments(error ? [] : (data ?? []) as Segment[]);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = useMemo(() => segments.filter(s => {
        const q = search.toLowerCase();
        if (q && !s.name.toLowerCase().includes(q) && !s.description?.toLowerCase().includes(q)) return false;
        if (filterType !== 'all' && s.type !== filterType) return false;
        if (filterStatus !== 'all' && s.status !== filterStatus) return false;
        return true;
    }), [segments, search, filterType, filterStatus]);

    const sorted = useMemo(() => [...filtered].sort((a, b) => {
        const av = (a as any)[sort.key] ?? '';
        const bv = (b as any)[sort.key] ?? '';
        return (sort.dir === 'asc' ? 1 : -1) * (av < bv ? -1 : av > bv ? 1 : 0);
    }), [filtered, sort]);

    const countByType = (t: SegType) => segments.filter(s => s.type === t).length;
    const hasFilter = filterType !== 'all' || filterStatus !== 'all';

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this segment?')) return;
        await supabase.from('crm_segments').delete().eq('id', id);
        toast.success('Segment deleted');
        fetchData();
    };

    const handleClone = async (seg: Segment) => {
        const { id: _, ...rest } = seg;
        const now = new Date().toISOString();
        await supabase.from('crm_segments').insert([{ ...rest, name: `${seg.name} (Copy)`, created_at: now, updated_at: now }]);
        toast.success('Segment cloned');
        fetchData();
    };

    const handleToggle = async (seg: Segment) => {
        const newStatus = seg.status === 'active' ? 'draft' : 'active';
        await supabase.from('crm_segments').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', seg.id);
        toast.success(`Segment set to ${newStatus}`);
        fetchData();
    };

    const handleAIGenerate = async () => {
        if (!aiText.trim()) { toast.error('Please describe your segment'); return; }
        const now = new Date().toISOString();
        const auto = {
            name: aiText.length > 60 ? aiText.slice(0, 60) + '…' : aiText,
            description: aiText,
            type: aiType,
            status: 'draft' as SegStatus,
            criteria: aiText,
            contact_count: 0,
            owner: 'Admin User',
            tags: aiType,
            created_at: now,
            updated_at: now,
        };
        const { error } = await supabase.from('crm_segments').insert([auto]);
        if (error) { toast.error('Could not generate segment'); return; }
        toast.success('Segment generated as Draft!');
        setAiText('');
        setTab('manage');
        fetchData();
    };

    const handleExport = () => {
        const csv = ['Name,Type,Status,Count,Owner,Updated', ...segments.map(s => `"${s.name}","${s.type}","${s.status}",${s.contact_count},"${s.owner}","${s.updated_at}"`)].join('\n');
        Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'segments.csv' }).click();
        toast.success('Segments exported');
    };

    return (
        <div className="flex flex-col h-full bg-[#F8FAFB] overflow-hidden">

            {/* ── Header ── */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-900">Segments</h1>
                    <p className="text-xs text-slate-400 mt-0.5">{segments.length} segment{segments.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-1" />
                <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all">
                    <Download size={13} /> Export
                </button>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 bg-[#0051A5] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20">
                    <Plus size={15} /> Create segment
                </button>
            </div>

            {/* ── Tabs ── */}
            <div className="bg-white border-b border-slate-200 px-6 flex items-center gap-0 shrink-0">
                {([
                    { id: 'intro', label: 'Intro' },
                    { id: 'manage', label: 'Manage' },
                    { id: 'analyze', label: 'Analyze' },
                ] as { id: TabId; label: string }[]).map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap
                            ${tab === t.id ? 'border-[#0051A5] text-[#0051A5]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── INTRO TAB ── */}
            {tab === 'intro' && (
                <div className="flex-1 overflow-auto p-6 space-y-6">

                    {/* Hero banner */}
                    {showIntro && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex gap-6 items-center relative overflow-hidden">
                            <button onClick={() => setShowIntro(false)}
                                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={16} />
                            </button>
                            <div className="flex-1 max-w-[480px]">
                                <h2 className="text-2xl font-extrabold text-slate-900 leading-tight mb-3">
                                    Connect with the right audience with segments
                                </h2>
                                <p className="text-sm text-slate-500 leading-relaxed mb-5">
                                    Understand your audience and{' '}
                                    <span className="text-[#0051A5] font-semibold underline">tailor</span>
                                    {' '}your marketing efforts more precisely, improving customer brand awareness,
                                    {' '}<span className="text-[#0051A5] font-semibold underline">engagement</span>
                                    {' '}and{' '}
                                    <span className="text-[#0051A5] font-semibold underline">ROI</span>.
                                </p>
                                <button className="flex items-center gap-2 px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-xl text-sm font-bold hover:border-[#0051A5] hover:text-[#0051A5] transition-all">
                                    <Play size={14} /> Watch intro video
                                </button>
                            </div>

                            {/* Visual cards illustration */}
                            <div className="shrink-0 w-64 h-36 relative hidden md:block">
                                <div className="absolute left-0 top-4 w-48 bg-white border border-slate-200 rounded-xl p-3 shadow-lg rotate-[-4deg]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center"><Users size={13} className="text-blue-600" /></div>
                                        <p className="text-[11px] font-bold text-slate-700">CRM contacts segment</p>
                                    </div>
                                    <div className="flex -space-x-2">
                                        {['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500'].map((c, i) => (
                                            <div key={i} className={`w-6 h-6 rounded-full ${c} border-2 border-white flex items-center justify-center text-[8px] font-bold text-white`}>A</div>
                                        ))}
                                        <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500">+20</div>
                                    </div>
                                </div>
                                <div className="absolute right-0 bottom-0 w-48 bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-3 shadow-lg rotate-[3deg]">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target market</p>
                                    <div className="grid grid-cols-5 gap-1">
                                        {Array.from({ length: 15 }).map((_, i) => (
                                            <div key={i} className={`w-4 h-4 rounded-full ${i < 8 ? 'bg-violet-400' : 'bg-violet-200'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI segment creator */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <h3 className="text-base font-bold text-slate-800 mb-4">What would you like to segment?</h3>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm text-slate-500">Create a segment of</span>
                            <button className="flex items-center gap-1.5 text-[#0051A5] font-bold text-sm hover:underline">
                                <select
                                    className="text-[#0051A5] font-bold text-sm bg-transparent border-none outline-none cursor-pointer"
                                    value={aiType} onChange={e => setAiType(e.target.value as SegType)}>
                                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}s</option>)}
                                </select>
                                <ChevronDown size={14} />
                            </button>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 rounded-xl"
                                style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.15) 0%, rgba(59,130,246,0.15) 100%)', padding: '1px', display: 'flex', borderRadius: '12px' }}>
                                <div className="absolute inset-[1px] bg-white rounded-[11px]" />
                            </div>
                            <div className="relative flex items-center gap-2 border-2 border-violet-200 rounded-xl focus-within:border-[#0051A5] transition-colors">
                                <Sparkles size={16} className="text-violet-400 ml-3 shrink-0" />
                                <input
                                    type="text"
                                    className="flex-1 py-3 pr-2 text-sm outline-none bg-transparent placeholder-slate-400"
                                    placeholder={SAMPLE_CRITERIA[aiPlhIdx]}
                                    value={aiText}
                                    onChange={e => setAiText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAIGenerate()}
                                />
                                <button onClick={handleAIGenerate}
                                    className="flex items-center gap-1.5 px-4 py-2 m-1 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-all shadow-md shadow-violet-900/20 shrink-0">
                                    <Sparkles size={12} /> Generate
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Segment insights */}
                    <div>
                        <h3 className="text-base font-bold text-slate-800 mb-4">Your segment insights</h3>
                        <div className="flex gap-4 flex-wrap">
                            {(Object.keys(TYPE_CONFIG) as SegType[]).map(type => (
                                <InsightCard key={type} type={type} count={countByType(type)} total={segments.length} onClick={() => setTab('manage')} />
                            ))}
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="bg-gradient-to-br from-[#0051A5] to-[#0066cc] rounded-2xl p-6 text-white">
                        <h3 className="font-bold text-lg mb-1">Ready to build your first segment?</h3>
                        <p className="text-blue-200 text-sm mb-4">Start by creating a segment to group your contacts and run targeted campaigns.</p>
                        <div className="flex gap-3 flex-wrap">
                            <button onClick={() => setShowCreate(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-[#0051A5] rounded-xl text-sm font-bold hover:bg-blue-50 transition-all shadow-md">
                                <Plus size={14} /> Create segment
                            </button>
                            <button onClick={() => setTab('manage')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-400/30 text-white border border-blue-400/30 rounded-xl text-sm font-bold hover:bg-blue-400/40 transition-all">
                                <Eye size={14} /> View all segments
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MANAGE TAB ── */}
            {tab === 'manage' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Manage toolbar */}
                    <div className="bg-white border-b border-slate-100 px-5 py-2 flex items-center gap-2 flex-wrap shrink-0">
                        <div className="relative flex-1 min-w-[200px] max-w-xs">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search segments..."
                                className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none transition-all"
                                value={search} onChange={e => setSearch(e.target.value)} />
                            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X size={13} /></button>}
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto">
                            <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 text-slate-600 bg-white outline-none hover:bg-slate-50">
                                <option value="all">All Types</option>
                                {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.plural}</option>)}
                            </select>
                            <button onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all
                                    ${showFilters || hasFilter ? 'bg-[#0051A5]/10 border-[#0051A5]/30 text-[#0051A5]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                <Filter size={13} /> Filters {hasFilter && <span className="w-1.5 h-1.5 rounded-full bg-[#0051A5]" />}
                            </button>
                            <button onClick={() => setSort(p => ({ ...p, dir: p.dir === 'asc' ? 'desc' : 'asc' }))}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50">
                                <ArrowUpDown size={13} /> Sort
                            </button>
                            <button onClick={fetchData} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                <RefreshCw size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Inline filters */}
                    {showFilters && (
                        <div className="bg-blue-50/40 border-b border-blue-100 px-5 py-3 flex items-end gap-4 flex-wrap shrink-0">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none">
                                    <option value="all">All Statuses</option>
                                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                            </div>
                            {hasFilter && (
                                <button onClick={() => { setFilterType('all'); setFilterStatus('all'); }}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg">
                                    <X size={13} /> Clear
                                </button>
                            )}
                        </div>
                    )}

                    {/* Table */}
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
                                <tr>
                                    {[
                                        { key: 'name', label: 'Segment' },
                                        { key: 'type', label: 'Type' },
                                        { key: 'status', label: 'Status' },
                                        { key: 'contact_count', label: 'Size' },
                                        { key: 'owner', label: 'Owner' },
                                        { key: 'updated_at', label: 'Updated' },
                                    ].map(col => (
                                        <th key={col.key} onClick={() => setSort(p => p.key === col.key ? { key: col.key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key: col.key, dir: 'asc' })}
                                            className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-[#0051A5] select-none whitespace-nowrap group">
                                            <span className="flex items-center gap-1">
                                                {col.label}
                                                <ArrowUpDown size={11} className={`opacity-0 group-hover:opacity-100 transition-opacity ${sort.key === col.key ? '!opacity-100 text-[#0051A5]' : ''}`} />
                                            </span>
                                        </th>
                                    ))}
                                    <th className="w-10 px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="py-20 text-center">
                                        <div className="flex items-center justify-center gap-3 text-slate-400">
                                            <div className="w-5 h-5 border-2 border-slate-200 border-t-[#0051A5] rounded-full animate-spin" />
                                            Loading segments…
                                        </div>
                                    </td></tr>
                                ) : sorted.length === 0 ? (
                                    <tr><td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-violet-50 rounded-2xl flex items-center justify-center">
                                                <Target size={28} className="text-[#0051A5]/30" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700">No segments found</p>
                                                <p className="text-slate-400 text-sm mt-1">Create your first segment to get started</p>
                                            </div>
                                            <button onClick={() => setShowCreate(true)}
                                                className="flex items-center gap-2 bg-[#0051A5] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20">
                                                <Plus size={14} /> Create segment
                                            </button>
                                        </div>
                                    </td></tr>
                                ) : sorted.map(seg => (
                                    <SegRow key={seg.id} seg={seg}
                                        onEdit={() => setEditSeg(seg)}
                                        onDelete={() => handleDelete(seg.id)}
                                        onClone={() => handleClone(seg)}
                                        onToggle={() => handleToggle(seg)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* foot */}
                    <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
                        <span className="text-sm text-slate-500">{filtered.length} segment{filtered.length !== 1 ? 's' : ''}</span>
                        <button onClick={() => setShowCreate(true)}
                            className="flex items-center gap-2 bg-[#0051A5] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20">
                            <Plus size={14} /> Create segment
                        </button>
                    </div>
                </div>
            )}

            {/* ── ANALYZE TAB ── */}
            {tab === 'analyze' && <AnalyzeTab segments={segments} />}

            {/* ── Modals ── */}
            {showCreate && <SegmentModal onClose={() => setShowCreate(false)} onSaved={fetchData} />}
            {editSeg && <SegmentModal seg={editSeg} onClose={() => setEditSeg(null)} onSaved={fetchData} />}
        </div>
    );
};

export default CRMSegments;
