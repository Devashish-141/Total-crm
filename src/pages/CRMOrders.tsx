import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Search, X, Filter, ArrowUpDown, Download,
    Columns, ChevronLeft, ChevronRight, MoreHorizontal,
    Check, RefreshCw, ShoppingCart, PackageCheck,
    Clock, Truck, Wrench, AlertTriangle, User,
    Calendar, Tag, Hash, IndianRupee, Building2,
    SlidersHorizontal, FileText, ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────
type OrderStatus = 'pending' | 'confirmed' | 'in_production' | 'dispatched' | 'installed' | 'cancelled';
type OrderPriority = 'low' | 'medium' | 'high' | 'urgent';
type TabId = 'all' | 'my_orders' | 'open';

interface OrderRecord {
    id: string;
    created_at: string;
    updated_at: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    system_type: string;
    capacity_kw: number;
    amount: number;
    status: OrderStatus;
    priority: OrderPriority;
    assigned_to: string;
    address: string;
    notes: string;
    pipeline: string;
    installation_date: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ElementType; step: number }> = {
    pending: { label: 'Pending', color: 'text-slate-600', bg: 'bg-slate-100', icon: Clock, step: 0 },
    confirmed: { label: 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-100', icon: Check, step: 1 },
    in_production: { label: 'In Production', color: 'text-violet-700', bg: 'bg-violet-100', icon: Wrench, step: 2 },
    dispatched: { label: 'Dispatched', color: 'text-amber-700', bg: 'bg-amber-100', icon: Truck, step: 3 },
    installed: { label: 'Installed', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: PackageCheck, step: 4 },
    cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100', icon: AlertTriangle, step: -1 },
};

const PRIORITY_CONFIG: Record<OrderPriority, { label: string; color: string; dot: string }> = {
    low: { label: 'Low', color: 'text-slate-500', dot: 'bg-slate-400' },
    medium: { label: 'Medium', color: 'text-blue-600', dot: 'bg-blue-500' },
    high: { label: 'High', color: 'text-amber-600', dot: 'bg-amber-500' },
    urgent: { label: 'Urgent', color: 'text-red-600', dot: 'bg-red-500' },
};

const SYSTEM_TYPES = ['On-Grid 3kW', 'On-Grid 5kW', 'On-Grid 10kW', 'Off-Grid 3kW', 'Off-Grid 5kW', 'Hybrid 5kW', 'Hybrid 10kW', 'Custom'];
const PIPELINES = ['Standard Sales Pipeline', 'Government Subsidy Pipeline', 'Commercial Pipeline'];
const ASSIGNED_TO = ['Admin User', 'Sales Executive', 'Manager', 'Installation Team'];
const PER_PAGE = 25;

interface ColDef { id: string; label: string; visible: boolean }
const DEFAULT_COLS: ColDef[] = [
    { id: 'order_number', label: 'Order #', visible: true },
    { id: 'customer_name', label: 'Customer', visible: true },
    { id: 'system_type', label: 'System', visible: true },
    { id: 'amount', label: 'Amount', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'priority', label: 'Priority', visible: true },
    { id: 'created_at', label: 'Created Date', visible: true },
    { id: 'updated_at', label: 'Modified Date', visible: true },
    { id: 'assigned_to', label: 'Owner', visible: true },
    { id: 'installation_date', label: 'Install Date', visible: false },
    { id: 'pipeline', label: 'Pipeline', visible: false },
    { id: 'address', label: 'Address', visible: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (s: string) =>
    s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const fmtAmt = (n: number) =>
    n ? `₹${n.toLocaleString('en-IN')}` : '--';

const ago = (s: string) => {
    if (!s) return '--';
    const d = Date.now() - new Date(s).getTime();
    const m = Math.floor(d / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Av = ({ name }: { name: string }) => {
    const init = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const p = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
    return (
        <span className={`w-7 h-7 rounded-full ${p[name.charCodeAt(0) % p.length]} inline-flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
            {init}
        </span>
    );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = c.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${c.bg} ${c.color} whitespace-nowrap`}>
            <Icon size={11} /> {c.label}
        </span>
    );
};

// ─── Priority Badge ───────────────────────────────────────────────────────────
const PriBadge = ({ priority }: { priority: OrderPriority }) => {
    const c = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${c.color}`}>
            <span className={`w-2 h-2 rounded-full ${c.dot}`} /> {c.label}
        </span>
    );
};

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
const OrderModal = ({ order, onClose, onSaved, currentUser = 'Admin User' }:
    { order?: OrderRecord | null; onClose(): void; onSaved(): void; currentUser?: string }) => {

    const [form, setForm] = useState({
        customer_name: order?.customer_name ?? '',
        customer_email: order?.customer_email ?? '',
        customer_phone: order?.customer_phone ?? '',
        system_type: order?.system_type ?? 'On-Grid 5kW',
        capacity_kw: order?.capacity_kw ?? 5,
        amount: order?.amount ?? 0,
        status: order?.status ?? 'pending' as OrderStatus,
        priority: order?.priority ?? 'medium' as OrderPriority,
        assigned_to: order?.assigned_to ?? currentUser,
        address: order?.address ?? '',
        notes: order?.notes ?? '',
        pipeline: order?.pipeline ?? 'Standard Sales Pipeline',
        installation_date: order?.installation_date ?? '',
    });
    const [saving, setSaving] = useState(false);

    const nowIso = new Date().toISOString();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload = { ...form, updated_at: nowIso };
        if (order) {
            const { error } = await supabase.from('crm_orders').update(payload).eq('id', order.id);
            if (error) { toast.error('Failed to update order'); setSaving(false); return; }
            toast.success('Order updated');
        } else {
            const orderNum = `ORD-${Date.now().toString().slice(-6)}`;
            const { error } = await supabase.from('crm_orders').insert([{
                ...payload,
                order_number: orderNum,
                created_at: nowIso,
            }]);
            if (error) { toast.error('Failed to create order'); setSaving(false); return; }
            toast.success('Order created');
        }
        onSaved(); onClose();
    };

    const F = (label: string, node: React.ReactNode) => (
        <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
            {node}
        </div>
    );
    const ic = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white transition-all";

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{order ? 'Edit Order' : 'Add Order'}</h2>
                        <p className="text-slate-400 text-xs mt-0.5">{order ? `Editing ${order.order_number}` : 'Create a new customer order'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {F('Customer Name *', (
                        <input required type="text" className={ic} placeholder="e.g. Ramesh Sharma" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
                    ))}
                    <div className="grid grid-cols-2 gap-4">
                        {F('Email', <input type="email" className={ic} placeholder="email@example.com" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} />)}
                        {F('Phone', <input type="tel" className={ic} placeholder="+91 99999 99999" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} />)}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {F('Status', (
                            <select className={ic} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as OrderStatus })}>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        ))}
                        {F('Priority', (
                            <select className={ic} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as OrderPriority })}>
                                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {F('System Type', (
                            <select className={ic} value={form.system_type} onChange={e => setForm({ ...form, system_type: e.target.value })}>
                                {SYSTEM_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        ))}
                        {F('Capacity (kW)', (
                            <input type="number" min={0} step={0.5} className={ic} value={form.capacity_kw} onChange={e => setForm({ ...form, capacity_kw: parseFloat(e.target.value) })} />
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {F('Order Amount (₹)', (
                            <input type="number" min={0} className={ic} placeholder="e.g. 250000" value={form.amount || ''} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
                        ))}
                        {F('Installation Date', (
                            <input type="date" className={ic} value={form.installation_date} onChange={e => setForm({ ...form, installation_date: e.target.value })} />
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {F('Assigned To', (
                            <select className={ic} value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                                {ASSIGNED_TO.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        ))}
                        {F('Pipeline', (
                            <select className={ic} value={form.pipeline} onChange={e => setForm({ ...form, pipeline: e.target.value })}>
                                {PIPELINES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        ))}
                    </div>
                    {F('Address', <input type="text" className={ic} placeholder="Installation address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />)}
                    {F('Notes', <textarea rows={2} className={`${ic} resize-none`} placeholder="Order notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />)}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-sm transition-colors">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#0051A5] text-white rounded-xl font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20 text-sm disabled:opacity-60">
                            {saving ? 'Saving…' : order ? 'Save Changes' : 'Create Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────
const OrderDrawer = ({ order, onClose, onEdit }: { order: OrderRecord; onClose(): void; onEdit(): void }) => {
    const statusSteps = (Object.keys(STATUS_CONFIG) as OrderStatus[]).filter(k => k !== 'cancelled');
    const currentStep = (STATUS_CONFIG[order.status] || STATUS_CONFIG.pending).step;

    return (
        <div className="fixed inset-0 z-[1500]" onClick={onClose}>
            <div className="absolute right-0 top-0 h-full w-[380px] bg-white shadow-2xl border-l border-slate-200 flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <ShoppingCart size={16} className="text-[#0051A5]" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{order.order_number}</span>
                        </div>
                        <h2 className="font-bold text-slate-900 text-base">{order.customer_name}</h2>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <StatusBadge status={order.status} />
                            <PriBadge priority={order.priority} />
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors shrink-0"><X size={18} /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Amount card */}
                    <div className="bg-gradient-to-br from-[#0051A5] to-[#0066cc] rounded-2xl p-4 text-white">
                        <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Order Value</p>
                        <p className="text-3xl font-extrabold">{fmtAmt(order.amount)}</p>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-blue-200 text-xs">{order.system_type}</span>
                            <span className="text-blue-200 text-xs">•</span>
                            <span className="text-blue-200 text-xs">{order.capacity_kw} kW</span>
                        </div>
                    </div>

                    {/* Pipeline progress */}
                    {order.status !== 'cancelled' && (
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Order Progress</p>
                            <div className="relative">
                                {/* Progress line */}
                                <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-slate-200" />
                                <div className="absolute left-[9px] top-2 w-0.5 bg-emerald-400 transition-all" style={{ height: `${Math.max(0, (currentStep / (statusSteps.length - 1)) * 100)}%` }} />
                                <div className="space-y-1 relative">
                                    {statusSteps.map(s => {
                                        const cfg = STATUS_CONFIG[s];
                                        const Icon = cfg.icon;
                                        const done = cfg.step < currentStep;
                                        const curr = cfg.step === currentStep;
                                        return (
                                            <div key={s} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${curr ? `${cfg.bg} ${cfg.color}` : ''}`}>
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 ${done ? 'bg-emerald-500' : curr ? 'ring-2 ring-current bg-white' : 'bg-slate-100'}`}>
                                                    {done ? <Check size={11} className="text-white" /> : <Icon size={11} className={curr ? cfg.color : 'text-slate-400'} />}
                                                </div>
                                                <span className={`text-sm font-medium ${curr ? cfg.color : done ? 'text-emerald-600' : 'text-slate-400'}`}>{cfg.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Details */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Details</p>
                        {([
                            { icon: User, label: 'Assigned To', val: order.assigned_to },
                            { icon: Building2, label: 'Pipeline', val: order.pipeline },
                            { icon: Calendar, label: 'Created', val: fmtDate(order.created_at) },
                            { icon: Calendar, label: 'Install Date', val: fmtDate(order.installation_date) },
                            { icon: Tag, label: 'System', val: `${order.system_type} • ${order.capacity_kw}kW` },
                        ] as { icon: React.ElementType; label: string; val: string }[]).filter(r => r.val && r.val !== '--').map(({ icon: Icon, label, val }) => (
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

                    {order.address && (
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Address</p>
                            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{order.address}</p>
                        </div>
                    )}

                    {order.notes && (
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
                            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 leading-relaxed">{order.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex gap-3">
                    <button onClick={onEdit} className="flex-1 py-2.5 bg-[#0051A5] text-white rounded-xl font-bold text-sm hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20">Edit Order</button>
                    <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">Close</button>
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
            <button onClick={onClose}><X size={14} className="text-slate-400" /></button>
        </div>
        {cols.map(col => (
            <button key={col.id} onClick={() => onChange(cols.map(c => c.id === col.id ? { ...c, visible: !c.visible } : c))}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <span className={`w-4 h-4 rounded border flex items-center justify-center ${col.visible ? 'bg-[#0051A5] border-[#0051A5]' : 'border-slate-300'}`}>
                    {col.visible && <Check size={11} className="text-white" />}
                </span>
                <span className="text-sm text-slate-700">{col.label}</span>
            </button>
        ))}
    </div>
);

// ─── Integration Card ─────────────────────────────────────────────────────────
const IntCard = ({ icon, name, by, desc, tag }: { icon: React.ReactNode; name: string; by: string; desc: string; tag: string }) => (
    <div className="border border-slate-200 rounded-2xl p-4 hover:border-[#0051A5]/40 hover:shadow-md transition-all cursor-pointer group bg-white">
        <div className="mb-3">{icon}</div>
        <p className="font-bold text-slate-800 text-sm group-hover:text-[#0051A5] transition-colors">{name}</p>
        <p className="text-[11px] text-slate-400 mb-2">{by}</p>
        <p className="text-xs text-slate-500 leading-relaxed mb-3">{desc}</p>
        <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-full">{tag}</span>
    </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string }[] = [
    { id: 'all', label: 'All orders' },
    { id: 'my_orders', label: 'My orders' },
    { id: 'open', label: 'Open orders' },
];

const CRMOrders = () => {
    const currentUser = 'Admin User';
    const [orders, setOrders] = useState<OrderRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const [tab, setTab] = useState<TabId>('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'created_at', dir: 'desc' });
    const [cols, setCols] = useState<ColDef[]>(DEFAULT_COLS);

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [showColPicker, setShowColPicker] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterAssigned, setFilterAssigned] = useState('all');
    const [filterPipeline, setFilterPipeline] = useState('all');

    // Modals
    const [showAdd, setShowAdd] = useState(false);
    const [editO, setEditO] = useState<OrderRecord | null>(null);
    const [viewO, setViewO] = useState<OrderRecord | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('crm_orders').select('*').order('created_at', { ascending: false });
        setOrders(error ? [] : (data ?? []) as OrderRecord[]);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = useMemo(() => orders.filter(o => {
        const q = search.toLowerCase();
        if (q && !(String(o.customer_name || '').toLowerCase().includes(q)) && !(String(o.order_number || '').toLowerCase().includes(q)) && !(String(o.system_type || '').toLowerCase().includes(q))) return false;
        if (tab === 'my_orders' && o.assigned_to !== currentUser) return false;
        if (tab === 'open' && (o.status === 'installed' || o.status === 'cancelled')) return false;
        if (filterStatus !== 'all' && o.status !== filterStatus) return false;
        if (filterPriority !== 'all' && o.priority !== filterPriority) return false;
        if (filterAssigned !== 'all' && o.assigned_to !== filterAssigned) return false;
        if (filterPipeline !== 'all' && o.pipeline !== filterPipeline) return false;
        return true;
    }), [orders, search, tab, filterStatus, filterPriority, filterAssigned, filterPipeline]);

    const sorted = useMemo(() => [...filtered].sort((a, b) => {
        const aV = (a as any)[sort.key] ?? '';
        const bV = (b as any)[sort.key] ?? '';
        return (sort.dir === 'asc' ? 1 : -1) * (aV < bV ? -1 : aV > bV ? 1 : 0);
    }), [filtered, sort]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
    const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const allSel = paginated.length > 0 && paginated.every(o => selectedIds.has(o.id));
    const hasFilter = filterStatus !== 'all' || filterPriority !== 'all' || filterAssigned !== 'all' || filterPipeline !== 'all';
    const visibleCols = cols.filter(c => c.visible);

    const tabCount = (id: TabId) => {
        if (id === 'all') return orders.length;
        if (id === 'my_orders') return orders.filter(o => o.assigned_to === currentUser).length;
        if (id === 'open') return orders.filter(o => o.status !== 'installed' && o.status !== 'cancelled').length;
        return 0;
    };

    const handleSort = (key: string) => setSort(p => p.key === key ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });

    const handleDeleteSelected = async () => {
        if (!window.confirm(`Delete ${selectedIds.size} order(s)?`)) return;
        for (const id of selectedIds) await supabase.from('crm_orders').delete().eq('id', id);
        toast.success(`Deleted ${selectedIds.size} order(s)`);
        setSelectedIds(new Set());
        fetchData();
    };

    const handleExport = () => {
        const vc = cols.filter(c => c.visible);
        const csv = [vc.map(c => c.label).join(','),
        ...filtered.map(o => vc.map(c => `"${String((o as any)[c.id] ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
            download: 'crm-orders.csv',
        }).click();
        toast.success('Orders exported');
    };

    // Revenue totals
    const totalRevenue = useMemo(() => filtered.reduce((s, o) => s + (o.amount || 0), 0), [filtered]);
    const wonRevenue = useMemo(() => filtered.filter(o => o.status === 'installed').reduce((s, o) => s + (o.amount || 0), 0), [filtered]);

    return (
        <div className="flex flex-col h-full bg-[#F8FAFB] overflow-hidden">

            {/* ── Tabs ── */}
            <div className="bg-white border-b border-slate-200 px-5 flex items-center gap-0 flex-wrap shrink-0">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); setPage(1); setSelectedIds(new Set()); }}
                        className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap
                            ${tab === t.id ? 'border-[#0051A5] text-[#0051A5]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'}`}>
                        {t.label}
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-[#0051A5] text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {tabCount(t.id)}
                        </span>
                        {tab === t.id && (
                            <X size={13} className="opacity-50 hover:opacity-100"
                                onClick={e => { e.stopPropagation(); setTab('all'); }} />
                        )}
                    </button>
                ))}
                <button className="px-3 py-3.5 text-slate-400 hover:text-slate-600"><Plus size={15} /></button>
                <div className="flex-1" />
                <div className="flex items-center gap-2 py-2">
                    {selectedIds.size > 0 && (
                        <button onClick={handleDeleteSelected}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                            <X size={13} /> Delete ({selectedIds.size})
                        </button>
                    )}
                    <button onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 bg-[#0051A5] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20">
                        <Plus size={15} /> Add orders
                    </button>
                </div>
            </div>

            {/* ── Toolbar ── */}
            <div className="bg-white border-b border-slate-100 px-5 py-2 flex items-center gap-2 flex-wrap shrink-0">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search orders..."
                        className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none transition-all"
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X size={13} /></button>}
                </div>

                <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                    <select value={filterPipeline} onChange={e => { setFilterPipeline(e.target.value); setPage(1); }}
                        className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 text-slate-600 bg-white outline-none hover:bg-slate-50">
                        <option value="all">All Pipelines</option>
                        {PIPELINES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    <button onClick={() => { setShowFilters(!showFilters); setShowColPicker(false); }}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all
                            ${showFilters || hasFilter ? 'bg-[#0051A5]/10 border-[#0051A5]/30 text-[#0051A5]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Filter size={13} /> Filters {hasFilter && <span className="w-1.5 h-1.5 rounded-full bg-[#0051A5]" />}
                    </button>

                    <button onClick={() => setSort(p => ({ ...p, dir: p.dir === 'asc' ? 'desc' : 'asc' }))}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50">
                        <ArrowUpDown size={13} /> Sort
                    </button>

                    <button onClick={handleExport}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50">
                        <Download size={13} /> Export
                    </button>

                    <div className="relative">
                        <button onClick={() => { setShowColPicker(!showColPicker); setShowFilters(false); }}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border rounded-lg transition-all
                                ${showColPicker ? 'bg-[#0051A5]/10 border-[#0051A5]/30 text-[#0051A5]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <Columns size={13} /> Edit columns
                        </button>
                        {showColPicker && <ColPicker cols={cols} onChange={setCols} onClose={() => setShowColPicker(false)} />}
                    </div>

                    <button onClick={fetchData} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* ── Filter pills ── */}
            <div className="bg-white border-b border-slate-100 px-5 py-1.5 flex items-center gap-2 flex-wrap shrink-0">
                {(['Created Date', 'Modified Date'] as const).map(l => (
                    <button key={l} className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 transition-colors">
                        {l} <ChevronLeft size={12} className="-rotate-90" />
                    </button>
                ))}
                <button className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700">
                    <Plus size={12} /> More
                </button>
                <span className="text-slate-200">|</span>
                <button className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-500 hover:text-[#0051A5] transition-colors">
                    <SlidersHorizontal size={12} /> Advanced filters
                </button>

                {/* Revenue summary */}
                {filtered.length > 0 && (
                    <div className="ml-auto flex items-center gap-4 text-xs">
                        <span className="text-slate-500">Total: <strong className="text-[#0051A5]">{fmtAmt(totalRevenue)}</strong></span>
                        <span className="text-slate-500">Installed: <strong className="text-emerald-600">{fmtAmt(wonRevenue)}</strong></span>
                    </div>
                )}
            </div>

            {/* ── Filter panel ── */}
            {showFilters && (
                <div className="bg-blue-50/40 border-b border-blue-100 px-5 py-3 flex items-end gap-4 flex-wrap shrink-0">
                    {[
                        { label: 'Status', val: filterStatus, set: setFilterStatus, options: [['all', 'All Statuses'], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])] },
                        { label: 'Priority', val: filterPriority, set: setFilterPriority, options: [['all', 'All Priorities'], ...Object.entries(PRIORITY_CONFIG).map(([k, v]) => [k, v.label])] },
                        { label: 'Owner', val: filterAssigned, set: setFilterAssigned, options: [['all', 'All Owners'], ...ASSIGNED_TO.map(a => [a, a])] },
                    ].map(({ label, val, set, options }) => (
                        <div key={label}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                            <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0051A5]/20"
                                value={val} onChange={e => { (set as any)(e.target.value); setPage(1); }}>
                                {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                            </select>
                        </div>
                    ))}
                    {hasFilter && (
                        <button onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setFilterAssigned('all'); setPage(1); }}
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
                                    checked={allSel}
                                    onChange={e => setSelectedIds(e.target.checked ? new Set(paginated.map(o => o.id)) : new Set())} />
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
                                    Loading orders…
                                </div>
                            </td></tr>
                        ) : paginated.length === 0 ? (
                            <tr><td colSpan={visibleCols.length + 2} className="py-12">
                                <div className="max-w-xl mx-auto px-6">
                                    {/* HubSpot-style empty state */}
                                    <div className="flex items-center gap-8 bg-white rounded-2xl p-8 border border-slate-200 mb-8">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800 text-xl mb-3">See all of your orders in one place</h3>
                                            <ul className="space-y-2 mb-6">
                                                {[
                                                    'Track the status of your orders through the solar installation pipeline',
                                                    'Manage your orders and assigned them to team members',
                                                ].map(txt => (
                                                    <li key={txt} className="flex items-start gap-2 text-sm text-slate-600">
                                                        <Check size={15} className="text-[#0051A5] mt-0.5 shrink-0" />
                                                        {txt}
                                                    </li>
                                                ))}
                                            </ul>
                                            <button onClick={() => setShowAdd(true)}
                                                className="flex items-center gap-2 bg-[#0051A5] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20">
                                                <Plus size={15} /> Add orders
                                            </button>
                                        </div>
                                        <div className="w-32 h-32 shrink-0 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl flex items-center justify-center shadow-inner">
                                            <div className="relative">
                                                <FileText size={48} className="text-[#0051A5]/25" />
                                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#0051A5] rounded-xl flex items-center justify-center shadow-lg">
                                                    <ShoppingCart size={16} className="text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Integration tiles */}
                                    <p className="text-sm font-bold text-slate-700 mb-4">Sync your orders with</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { icon: <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center"><ShoppingCart size={20} className="text-white" /></div>, name: 'WooCommerce', by: 'Third-party App', desc: 'Sync customer orders from your online store.', tag: 'App' },
                                            { icon: <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><IndianRupee size={20} className="text-white" /></div>, name: 'Tally Prime', by: 'Integration', desc: 'Import your accounting orders into CRM.', tag: 'Integration' },
                                            { icon: <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center"><ExternalLink size={20} className="text-white" /></div>, name: 'WhatsApp', by: 'Lead Capture', desc: 'Convert WhatsApp chats into orders.', tag: 'App' },
                                        ].map(card => <IntCard key={card.name} {...card} />)}
                                    </div>
                                </div>
                            </td></tr>
                        ) : paginated.map((order, idx) => (
                            <tr key={order.id} onClick={() => setViewO(order)}
                                className={`border-b border-slate-100 hover:bg-blue-50/30 cursor-pointer transition-colors group
                                    ${selectedIds.has(order.id) ? 'bg-blue-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-[#0051A5] cursor-pointer"
                                        checked={selectedIds.has(order.id)}
                                        onChange={e => {
                                            const s = new Set(selectedIds);
                                            e.target.checked ? s.add(order.id) : s.delete(order.id);
                                            setSelectedIds(s);
                                        }} />
                                </td>

                                {visibleCols.map(col => (
                                    <td key={col.id} className="px-4 py-3 whitespace-nowrap max-w-[220px]">
                                        {col.id === 'order_number' && (
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-[#0051A5]/10 flex items-center justify-center shrink-0">
                                                    <Hash size={13} className="text-[#0051A5]" />
                                                </div>
                                                <span className="font-mono font-bold text-[#0051A5] text-xs hover:underline">{order.order_number}</span>
                                            </div>
                                        )}
                                        {col.id === 'customer_name' && (
                                            <div className="flex items-center gap-2">
                                                {order.customer_name && <Av name={order.customer_name} />}
                                                <span className="font-semibold text-slate-800 truncate">{order.customer_name || '--'}</span>
                                            </div>
                                        )}
                                        {col.id === 'system_type' && <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-full font-medium">{order.system_type}</span>}
                                        {col.id === 'amount' && <span className="font-bold text-slate-800">{fmtAmt(order.amount)}</span>}
                                        {col.id === 'status' && <StatusBadge status={order.status} />}
                                        {col.id === 'priority' && <PriBadge priority={order.priority} />}
                                        {col.id === 'created_at' && <span className="text-slate-500 text-xs">{fmtDate(order.created_at)}</span>}
                                        {col.id === 'updated_at' && <span className="text-slate-400 text-xs">{ago(order.updated_at)}</span>}
                                        {col.id === 'assigned_to' && (
                                            order.assigned_to ? (
                                                <div className="flex items-center gap-2">
                                                    <Av name={order.assigned_to} />
                                                    <span className="text-slate-600 text-xs truncate">{order.assigned_to}</span>
                                                </div>
                                            ) : <span className="text-slate-300 text-xs italic">Unassigned</span>
                                        )}
                                        {col.id === 'installation_date' && <span className="text-slate-500 text-xs">{fmtDate(order.installation_date)}</span>}
                                        {col.id === 'pipeline' && <span className="text-slate-500 text-xs truncate">{order.pipeline}</span>}
                                        {col.id === 'address' && <span className="text-slate-500 text-xs truncate max-w-[160px] block">{order.address}</span>}
                                    </td>
                                ))}

                                <td className="px-4 py-3">
                                    <button onClick={e => { e.stopPropagation(); setEditO(order); }}
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
                    {filtered.length} order{filtered.length !== 1 ? 's' : ''}
                    {selectedIds.size > 0 && <span className="ml-2 text-[#0051A5] font-medium">• {selectedIds.size} selected</span>}
                </span>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{PER_PAGE} per page</span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <span className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 rounded-lg border border-slate-200">
                            {page} / {totalPages}
                        </span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Modals ── */}
            {showAdd && <OrderModal currentUser={currentUser} onClose={() => setShowAdd(false)} onSaved={fetchData} />}
            {editO && <OrderModal order={editO} currentUser={currentUser} onClose={() => setEditO(null)} onSaved={fetchData} />}
            {viewO && !editO && <OrderDrawer order={viewO} onClose={() => setViewO(null)} onEdit={() => { setEditO(viewO); setViewO(null); }} />}
            {showColPicker && <div className="fixed inset-0 z-40" onClick={() => setShowColPicker(false)} />}
        </div>
    );
};

export default CRMOrders;
