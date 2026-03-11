import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    Plus,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Download,
    Columns,
    X,
    Check,
    Filter,
    RefreshCw,
    Building2,
    Trash2,
    Phone,
    MapPin,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────
type TabId = 'all' | 'mine';

interface Column {
    id: string;
    label: string;
    visible: boolean;
    sortable: boolean;
}

interface SortConfig {
    key: string;
    dir: 'asc' | 'desc';
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-slate-100 text-slate-500',
    lead: 'bg-blue-100 text-blue-700',
};

// ─── Company Avatar ──────────────────────────────────────────────────────────
const CompanyAvatar = ({ name }: { name: string }) => {
    const initials = name
        .split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();

    const colors = [
        'bg-violet-500', 'bg-cyan-500', 'bg-teal-500',
        'bg-fuchsia-500', 'bg-sky-500', 'bg-amber-500',
    ];
    const color = colors[name.charCodeAt(0) % colors.length];

    return (
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-white text-[11px] font-bold shrink-0 shadow-sm ${color}`}>
            {initials || <Building2 size={14} />}
        </span>
    );
};

// ─── Add Company Modal ───────────────────────────────────────────────────────
interface AddCompanyModalProps {
    onClose: () => void;
    onSaved: () => void;
}

const AddCompanyModal = ({ onClose, onSaved }: AddCompanyModalProps) => {
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        industry: '',
        website: '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { error } = await supabase.from('crm_companies').insert([{
            name: form.name,
            email: form.email || null,
            phone: form.phone || null,
            address: form.address || null,
            industry: form.industry || null,
            website: form.website || null,
        }]);
        setSaving(false);
        if (error) {
            toast.error('Failed to add company: ' + error.message);
        } else {
            toast.success('Company added!');
            onSaved();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Add New Company</h2>
                        <p className="text-slate-400 text-sm mt-0.5">Create a new CRM company record</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Company Name *</label>
                        <input required type="text"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none text-sm"
                            placeholder="e.g. ABC Solar Pvt Ltd"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Email</label>
                            <input type="email"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none text-sm"
                                placeholder="company@email.com"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Phone</label>
                            <input type="tel"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none text-sm"
                                placeholder="+91 99999 99999"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Industry</label>
                            <input type="text"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none text-sm"
                                placeholder="e.g. Solar Energy"
                                value={form.industry}
                                onChange={e => setForm({ ...form, industry: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Website</label>
                            <input type="text"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none text-sm"
                                placeholder="https://example.com"
                                value={form.website}
                                onChange={e => setForm({ ...form, website: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Address / City</label>
                        <input type="text"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none text-sm"
                            placeholder="123 Main St, Chennai"
                            value={form.address}
                            onChange={e => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-sm">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-3 bg-[#0051A5] text-white rounded-xl font-bold hover:bg-[#003d7a] shadow-lg shadow-blue-900/20 text-sm disabled:opacity-60">
                            {saving ? 'Saving...' : 'Add Company'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const CRMCompanies = () => {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<TabId>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sort, setSort] = useState<SortConfig>({ key: 'name', dir: 'asc' });
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [showFilters, setShowFilters] = useState(false);
    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    const [showAddModal, setShowAddModal] = useState(false);

    const [columns, setColumns] = useState<Column[]>([
        { id: 'name', label: 'Company Name', visible: true, sortable: true },
        { id: 'contact_person', label: 'Company Owner', visible: true, sortable: true },
        { id: 'created_at', label: 'Create Date', visible: true, sortable: true },
        { id: 'phone', label: 'Phone Number', visible: true, sortable: false },
        { id: 'address', label: 'City / Address', visible: true, sortable: true },
        { id: 'status', label: 'Status', visible: true, sortable: true },
        { id: 'account_balance', label: 'Balance', visible: false, sortable: true },
        { id: 'email', label: 'Email', visible: false, sortable: true },
    ]);

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('crm_companies')
            .select('*')
            .order('name', { ascending: true });
        if (error) toast.error('Failed to load companies');
        else setCompanies(data ?? []);
        setLoading(false);
    };

    // ─── Derived ─────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return companies.filter(c => {
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                !q ||
                c.name.toLowerCase().includes(q) ||
                c.contact_person?.toLowerCase().includes(q) ||
                c.address?.toLowerCase().includes(q) ||
                c.phone?.includes(q);
            const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [companies, searchQuery, filterStatus]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const aVal = (a as any)[sort.key] ?? '';
            const bVal = (b as any)[sort.key] ?? '';
            const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sort.dir === 'asc' ? cmp : -cmp;
        });
    }, [filtered, sort]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    const paginated = sorted.slice((page - 1) * perPage, page * perPage);

    // ─── Handlers ────────────────────────────────────────────────────────────
    const handleSort = (key: string) => {
        setSort(prev => prev.key === key
            ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
            : { key, dir: 'asc' }
        );
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? new Set(paginated.map(c => c.id)) : new Set());
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        const updated = new Set(selectedIds);
        checked ? updated.add(id) : updated.delete(id);
        setSelectedIds(updated);
    };

    const handleDeleteSelected = async () => {
        if (!window.confirm(`Delete ${selectedIds.size} company/companies?`)) return;
        const { error } = await supabase.from('crm_companies').delete().in('id', [...selectedIds]);
        if (error) {
            toast.error('Failed to delete companies');
        } else {
            toast.success(`Deleted ${selectedIds.size} company/companies`);
            setSelectedIds(new Set());
            fetchCompanies();
        }
    };

    const handleExport = () => {
        const visibleCols = columns.filter(c => c.visible);
        const header = visibleCols.map(c => c.label).join(',');
        const rows = filtered.map(c =>
            visibleCols.map(col => {
                const val = (c as any)[col.id] ?? '';
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(',')
        );
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'crm-companies.csv';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Companies exported');
    };

    const toggleColumn = (id: string) => {
        setColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
    };

    const visibleColumns = columns.filter(c => c.visible);
    const allOnPageSelected = paginated.length > 0 && paginated.every(c => selectedIds.has(c.id));
    const someSelected = selectedIds.size > 0;

    const tabs = [
        { id: 'all' as TabId, label: 'All companies', count: companies.length },
        { id: 'mine' as TabId, label: 'My companies', count: 0 },
    ];

    return (
        <div className="flex flex-col h-full bg-[#F8FAFB]">

            {/* ── Header bar ── */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-2 flex-wrap">
                {/* Tab strip */}
                <div className="flex items-center gap-1 flex-wrap">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setPage(1); setSelectedIds(new Set()); }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                ${activeTab === tab.id
                                    ? 'bg-[#0051A5] text-white shadow'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {tab.label}
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full
                                ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                    <button className="ml-1 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="Add view">
                        <Plus size={16} />
                    </button>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                    <button onClick={fetchCompanies} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh">
                        <RefreshCw size={16} />
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-[#0051A5] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20"
                    >
                        <Plus size={16} />
                        Add companies
                    </button>
                </div>
            </div>

            {/* ── Toolbar ── */}
            <div className="bg-white border-b border-slate-100 px-6 py-2.5 flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                        type="text"
                        placeholder="Search companies..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-slate-50 transition-all"
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    )}
                </div>

                {someSelected && (
                    <button
                        onClick={handleDeleteSelected}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        <Trash2 size={14} /> Delete ({selectedIds.size})
                    </button>
                )}

                <div className="flex items-center gap-1.5 ml-auto">
                    <button
                        onClick={() => { setShowFilters(!showFilters); setShowColumnPicker(false); }}
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-all
                            ${showFilters || filterStatus !== 'all'
                                ? 'bg-[#0051A5]/10 border-[#0051A5]/30 text-[#0051A5]'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <Filter size={14} />
                        Filters
                        {filterStatus !== 'all' && <span className="w-2 h-2 rounded-full bg-[#0051A5]" />}
                    </button>

                    <button
                        onClick={() => handleSort(sort.key)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all"
                    >
                        <ArrowUpDown size={14} /> Sort
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all"
                    >
                        <Download size={14} /> Export
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => { setShowColumnPicker(!showColumnPicker); setShowFilters(false); }}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-all
                                ${showColumnPicker ? 'bg-[#0051A5]/10 border-[#0051A5]/30 text-[#0051A5]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Columns size={14} /> Edit columns
                        </button>

                        {showColumnPicker && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Toggle Columns</p>
                                {columns.map(col => (
                                    <button
                                        key={col.id}
                                        onClick={() => toggleColumn(col.id)}
                                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                                            ${col.visible ? 'bg-[#0051A5] border-[#0051A5]' : 'border-slate-300'}`}>
                                            {col.visible && <Check size={11} className="text-white" />}
                                        </span>
                                        <span className="text-sm text-slate-700">{col.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Filters Panel ── */}
            {showFilters && (
                <div className="bg-blue-50/50 border-b border-blue-100 px-6 py-3 flex items-end gap-4 flex-wrap">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Status</label>
                        <select
                            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5]"
                            value={filterStatus}
                            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="lead">Lead</option>
                        </select>
                    </div>
                    {filterStatus !== 'all' && (
                        <button
                            onClick={() => { setFilterStatus('all'); setPage(1); }}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <X size={14} /> Clear filters
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
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-slate-300 accent-[#0051A5] cursor-pointer"
                                    checked={allOnPageSelected}
                                    onChange={e => handleSelectAll(e.target.checked)}
                                />
                            </th>
                            {visibleColumns.map(col => (
                                <th
                                    key={col.id}
                                    className={`px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap
                                        ${col.sortable ? 'cursor-pointer hover:text-[#0051A5] select-none group' : ''}`}
                                    onClick={() => col.sortable && handleSort(col.id)}
                                >
                                    <span className="flex items-center gap-1">
                                        {col.label}
                                        {col.sortable && (
                                            <ArrowUpDown size={12} className={`opacity-0 group-hover:opacity-100 transition-opacity ${sort.key === col.id ? '!opacity-100 text-[#0051A5]' : ''}`} />
                                        )}
                                        {sort.key === col.id && (
                                            <span className="text-[8px] text-[#0051A5]">{sort.dir === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                    </span>
                                </th>
                            ))}
                            <th className="w-10 px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={visibleColumns.length + 2} className="py-20 text-center text-slate-400">
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-5 h-5 border-2 border-slate-200 border-t-[#0051A5] rounded-full animate-spin" />
                                        Loading companies...
                                    </div>
                                </td>
                            </tr>
                        ) : paginated.length === 0 ? (
                            <tr>
                                <td colSpan={visibleColumns.length + 2} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                                            <Building2 size={28} className="text-slate-400" />
                                        </div>
                                        <p className="text-slate-500 font-semibold">No companies found</p>
                                        <p className="text-slate-400 text-xs">Try adjusting your search or filters</p>
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="mt-2 flex items-center gap-2 px-4 py-2 bg-[#0051A5] text-white rounded-lg text-sm font-bold hover:bg-[#003d7a] transition-all"
                                        >
                                            <Plus size={14} /> Add Company
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : paginated.map((company, idx) => (
                            <tr
                                key={company.id}
                                className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors group
                                    ${selectedIds.has(company.id) ? 'bg-blue-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                            >
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 accent-[#0051A5] cursor-pointer"
                                        checked={selectedIds.has(company.id)}
                                        onChange={e => handleSelectRow(company.id, e.target.checked)}
                                    />
                                </td>

                                {visibleColumns.map(col => (
                                    <td key={col.id} className="px-4 py-3 whitespace-nowrap max-w-[240px] truncate">
                                        {col.id === 'name' && (
                                            <div className="flex items-center gap-2.5">
                                                <CompanyAvatar name={company.name} />
                                                <span className="font-semibold text-[#0051A5] hover:underline cursor-pointer truncate">
                                                    {company.name}
                                                </span>
                                            </div>
                                        )}
                                        {col.id === 'contact_person' && (
                                            <span className="text-slate-600">
                                                {company.contact_person || <span className="text-slate-300 italic text-xs">No owner</span>}
                                            </span>
                                        )}
                                        {col.id === 'created_at' && (
                                            <span className="text-slate-500 text-xs">
                                                {company.created_at ? new Date(company.created_at).toLocaleDateString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric'
                                                }) : '--'}
                                            </span>
                                        )}
                                        {col.id === 'phone' && (
                                            company.phone
                                                ? <span className="flex items-center gap-1.5 text-slate-600">
                                                    <Phone size={12} className="text-slate-400 shrink-0" />
                                                    {company.phone}
                                                </span>
                                                : <span className="text-slate-300">--</span>
                                        )}
                                        {col.id === 'address' && (
                                            company.address
                                                ? <span className="flex items-center gap-1.5 text-slate-600">
                                                    <MapPin size={12} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{company.address}</span>
                                                </span>
                                                : <span className="text-slate-300">--</span>
                                        )}
                                        {col.id === 'status' && (
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider
                                                ${STATUS_COLORS[company.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {company.status}
                                            </span>
                                        )}
                                        {col.id === 'account_balance' && (
                                            <span className={`font-semibold text-sm ${company.account_balance > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                ₹{company.account_balance.toLocaleString()}
                                            </span>
                                        )}
                                        {col.id === 'email' && (
                                            company.email
                                                ? <a href={`mailto:${company.email}`} className="text-slate-600 hover:text-[#0051A5] transition-colors truncate">
                                                    {company.email}
                                                </a>
                                                : <span className="text-slate-300">--</span>
                                        )}
                                    </td>
                                ))}

                                <td className="px-4 py-3">
                                    <button className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="h-px bg-slate-200" />

            {/* ── Pagination ── */}
            <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span>{filtered.length} compan{filtered.length !== 1 ? 'ies' : 'y'}</span>
                    {someSelected && <span className="text-[#0051A5] font-medium">• {selectedIds.size} selected</span>}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>Per page:</span>
                        <select
                            className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white outline-none focus:ring-2 focus:ring-[#0051A5]/20"
                            value={perPage}
                            onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                        >
                            {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg border border-slate-200">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Add Modal ── */}
            {showAddModal && (
                <AddCompanyModal onClose={() => setShowAddModal(false)} onSaved={fetchCompanies} />
            )}

            {showColumnPicker && (
                <div className="fixed inset-0 z-40" onClick={() => setShowColumnPicker(false)} />
            )}
        </div>
    );
};

export default CRMCompanies;
