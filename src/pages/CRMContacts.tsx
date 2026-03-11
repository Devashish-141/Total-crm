import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, Plus, MoreHorizontal, ChevronLeft, ChevronRight,
    ArrowUpDown, Download, Columns, X, Check, User,
    Filter, RefreshCw, ExternalLink, Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Contact {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    company_id: string | null;
    job_title: string | null;
    lead_status: string;
    source: string | null;
    owner_id: string | null;
    notes: string | null;
    tags: string[] | null;
    created_at: string;
    updated_at: string;
}

type TabId = 'all' | 'mine' | 'unassigned';

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

const STATUS_COLORS: Record<string, string> = {
    New: 'bg-blue-100 text-blue-700',
    Contacted: 'bg-amber-100 text-amber-700',
    Qualified: 'bg-purple-100 text-purple-700',
    Lost: 'bg-red-100 text-red-700',
    Customer: 'bg-emerald-100 text-emerald-700',
};

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

// ─── Avatar ─────────────────────────────────────────────────────────────────
const Avatar = ({ name }: { name: string }) => {
    const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-rose-500', 'bg-indigo-500'];
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-[11px] font-bold shrink-0 ${color}`}>
            {initials}
        </span>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const CRMContacts = () => {
    const { user } = useAuth();

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sort, setSort] = useState<SortConfig>({ key: 'created_at', dir: 'desc' });
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(false);
    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterSource, setFilterSource] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newContact, setNewContact] = useState({
        first_name: '', last_name: '', email: '', phone: '',
        job_title: '', source: 'Web', lead_status: 'New', notes: '',
    });

    const [columns, setColumns] = useState<Column[]>([
        { id: 'name', label: 'Name', visible: true, sortable: true },
        { id: 'email', label: 'Email', visible: true, sortable: true },
        { id: 'phone', label: 'Phone', visible: true, sortable: false },
        { id: 'job_title', label: 'Job Title', visible: true, sortable: false },
        { id: 'source', label: 'Source', visible: true, sortable: true },
        { id: 'lead_status', label: 'Status', visible: true, sortable: true },
        { id: 'created_at', label: 'Created', visible: true, sortable: true },
        { id: 'notes', label: 'Notes', visible: false, sortable: false },
    ]);

    // ─── Fetch ───────────────────────────────────────────────────────────────
    const fetchContacts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('crm_contacts')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            toast.error('Failed to load contacts');
        } else {
            setContacts(data ?? []);
        }
        setLoading(false);
    };

    useEffect(() => { fetchContacts(); }, []);

    // ─── Derived ─────────────────────────────────────────────────────────────
    const currentUserId = user?.id;

    const tabFiltered = useMemo(() => {
        switch (activeTab) {
            case 'mine': return contacts.filter(c => c.owner_id === currentUserId);
            case 'unassigned': return contacts.filter(c => !c.owner_id);
            default: return contacts;
        }
    }, [contacts, activeTab, currentUserId]);

    const filtered = useMemo(() => {
        return tabFiltered.filter(c => {
            const fullName = `${c.first_name ?? ''} ${c.last_name ?? ''}`.toLowerCase();
            const q = searchQuery.toLowerCase();
            const matchSearch = !q || fullName.includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
            const matchStatus = filterStatus === 'all' || c.lead_status === filterStatus;
            const matchSource = filterSource === 'all' || c.source === filterSource;
            return matchSearch && matchStatus && matchSource;
        });
    }, [tabFiltered, searchQuery, filterStatus, filterSource]);

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

    const tabCounts = useMemo(() => ({
        all: contacts.length,
        mine: contacts.filter(c => c.owner_id === currentUserId).length,
        unassigned: contacts.filter(c => !c.owner_id).length,
    }), [contacts, currentUserId]);

    const uniqueSources = useMemo(() =>
        Array.from(new Set(contacts.map(c => c.source).filter(Boolean))),
        [contacts]);

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
        if (!window.confirm(`Delete ${selectedIds.size} contact(s)?`)) return;
        const { error } = await supabase.from('crm_contacts').delete().in('id', [...selectedIds]);
        if (error) {
            toast.error('Failed to delete contacts');
        } else {
            toast.success(`Deleted ${selectedIds.size} contact(s)`);
            setSelectedIds(new Set());
            fetchContacts();
        }
    };

    const handleExport = () => {
        const header = 'Name,Email,Phone,Job Title,Source,Status,Created';
        const rows = filtered.map(c =>
            [`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(), c.email, c.phone, c.job_title, c.source, c.lead_status, c.created_at]
                .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
                .join(',')
        );
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'crm-contacts.csv'; a.click();
        URL.revokeObjectURL(url);
        toast.success('Contacts exported');
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { error } = await supabase.from('crm_contacts').insert([{
            first_name: newContact.first_name || null,
            last_name: newContact.last_name || null,
            email: newContact.email || null,
            phone: newContact.phone || null,
            job_title: newContact.job_title || null,
            source: newContact.source || null,
            lead_status: newContact.lead_status,
            notes: newContact.notes || null,
            owner_id: user?.id ?? null,
        }]);
        setSaving(false);
        if (error) {
            toast.error('Failed to add contact: ' + error.message);
        } else {
            toast.success('Contact added!');
            setShowAddModal(false);
            setNewContact({ first_name: '', last_name: '', email: '', phone: '', job_title: '', source: 'Web', lead_status: 'New', notes: '' });
            fetchContacts();
        }
    };

    const toggleColumn = (id: string) => {
        setColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
    };

    const visibleColumns = columns.filter(c => c.visible);
    const allOnPageSelected = paginated.length > 0 && paginated.every(c => selectedIds.has(c.id));
    const someSelected = selectedIds.size > 0;

    const getFullName = (c: Contact) => `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—';

    return (
        <div className="flex flex-col min-h-0 bg-[#F8FAFB]">

            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 flex-wrap">
                    {(['all', 'mine', 'unassigned'] as TabId[]).map(tab => (
                        <button key={tab}
                            onClick={() => { setActiveTab(tab); setPage(1); setSelectedIds(new Set()); }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                ${activeTab === tab ? 'bg-[#0051A5] text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            {tab === 'all' ? 'All contacts' : tab === 'mine' ? 'My contacts' : 'Unassigned'}
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full
                                ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {tabCounts[tab]}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                    <button onClick={fetchContacts} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh">
                        <RefreshCw size={16} />
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-[#0051A5] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20"
                    >
                        <Plus size={16} /> Add Contact
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white border-b border-slate-100 px-6 py-2.5 flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input type="text" placeholder="Search contacts..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-slate-50"
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
                    <button onClick={handleDeleteSelected}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                        <Trash2 size={14} /> Delete ({selectedIds.size})
                    </button>
                )}

                <div className="flex items-center gap-1.5 ml-auto">
                    <button onClick={() => { setShowFilters(!showFilters); setShowColumnPicker(false); }}
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-all
                            ${showFilters || filterStatus !== 'all' || filterSource !== 'all'
                                ? 'bg-[#0051A5]/10 border-[#0051A5]/30 text-[#0051A5]'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Filter size={14} /> Filters
                    </button>
                    <button onClick={() => handleSort(sort.key)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50">
                        <ArrowUpDown size={14} /> Sort
                    </button>
                    <button onClick={handleExport}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50">
                        <Download size={14} /> Export
                    </button>
                    <div className="relative">
                        <button onClick={() => { setShowColumnPicker(!showColumnPicker); setShowFilters(false); }}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-all
                                ${showColumnPicker ? 'bg-[#0051A5]/10 border-[#0051A5]/30 text-[#0051A5]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <Columns size={14} /> Columns
                        </button>
                        {showColumnPicker && (
                            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3">
                                {columns.map(col => (
                                    <button key={col.id} onClick={() => toggleColumn(col.id)}
                                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                                        <span className={`w-4 h-4 rounded border flex items-center justify-center ${col.visible ? 'bg-[#0051A5] border-[#0051A5]' : 'border-slate-300'}`}>
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

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-blue-50/50 border-b border-blue-100 px-6 py-3 flex items-end gap-4 flex-wrap">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Status</label>
                        <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none"
                            value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                            <option value="all">All Statuses</option>
                            {['New', 'Contacted', 'Qualified', 'Lost', 'Customer'].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Source</label>
                        <select className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none"
                            value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(1); }}>
                            <option value="all">All Sources</option>
                            {uniqueSources.map(s => <option key={s} value={s!}>{s}</option>)}
                        </select>
                    </div>
                    {(filterStatus !== 'all' || filterSource !== 'all') && (
                        <button onClick={() => { setFilterStatus('all'); setFilterSource('all'); setPage(1); }}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">
                            <X size={14} /> Clear
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
                        <tr>
                            <th className="w-10 px-4 py-3">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-[#0051A5] cursor-pointer"
                                    checked={allOnPageSelected} onChange={e => handleSelectAll(e.target.checked)} />
                            </th>
                            {visibleColumns.map(col => (
                                <th key={col.id}
                                    className={`px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap
                                        ${col.sortable ? 'cursor-pointer hover:text-[#0051A5] select-none group' : ''}`}
                                    onClick={() => col.sortable && handleSort(col.id)}>
                                    <span className="flex items-center gap-1">
                                        {col.label}
                                        {col.sortable && sort.key === col.id && (
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
                            <tr><td colSpan={visibleColumns.length + 2} className="py-20 text-center text-slate-400">
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-2 border-slate-200 border-t-[#0051A5] rounded-full animate-spin" />
                                    Loading contacts...
                                </div>
                            </td></tr>
                        ) : paginated.length === 0 ? (
                            <tr><td colSpan={visibleColumns.length + 2} className="py-20 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                                        <User size={24} className="text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 font-medium">No contacts found</p>
                                    <button onClick={() => setShowAddModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#0051A5] text-white rounded-lg text-sm font-bold hover:bg-[#003d7a]">
                                        <Plus size={14} /> Add Contact
                                    </button>
                                </div>
                            </td></tr>
                        ) : paginated.map((contact, idx) => (
                            <tr key={contact.id}
                                className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors group
                                    ${selectedIds.has(contact.id) ? 'bg-blue-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                <td className="px-4 py-3">
                                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-[#0051A5] cursor-pointer"
                                        checked={selectedIds.has(contact.id)}
                                        onChange={e => handleSelectRow(contact.id, e.target.checked)} />
                                </td>
                                {visibleColumns.map(col => (
                                    <td key={col.id} className="px-4 py-3 whitespace-nowrap max-w-[220px] truncate">
                                        {col.id === 'name' && (
                                            <div className="flex items-center gap-2.5">
                                                <Avatar name={getFullName(contact)} />
                                                <span className="font-semibold text-[#0051A5] truncate">{getFullName(contact)}</span>
                                            </div>
                                        )}
                                        {col.id === 'email' && (
                                            contact.email
                                                ? <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-slate-600 hover:text-[#0051A5] group/mail">
                                                    <span className="truncate">{contact.email}</span>
                                                    <ExternalLink size={11} className="opacity-0 group-hover/mail:opacity-100" />
                                                  </a>
                                                : <span className="text-slate-300">--</span>
                                        )}
                                        {col.id === 'phone' && (
                                            contact.phone ? <span className="text-slate-600">{contact.phone}</span> : <span className="text-slate-300">--</span>
                                        )}
                                        {col.id === 'job_title' && (
                                            contact.job_title ? <span className="text-slate-600">{contact.job_title}</span> : <span className="text-slate-300">--</span>
                                        )}
                                        {col.id === 'source' && (
                                            contact.source ? <span className="text-slate-600">{contact.source}</span> : <span className="text-slate-300">--</span>
                                        )}
                                        {col.id === 'lead_status' && (
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold
                                                ${STATUS_COLORS[contact.lead_status] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {contact.lead_status}
                                            </span>
                                        )}
                                        {col.id === 'created_at' && (
                                            <span className="text-slate-500 text-xs">
                                                {new Date(contact.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        )}
                                        {col.id === 'notes' && (
                                            <span className="text-slate-400 text-xs italic truncate">{contact.notes || '--'}</span>
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

            {/* Pagination */}
            <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span>{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</span>
                    {someSelected && <span className="text-[#0051A5] font-medium">• {selectedIds.size} selected</span>}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>Per page:</span>
                        <select className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white outline-none"
                            value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}>
                            {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg border border-slate-200">
                            {page} / {totalPages}
                        </span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Contact Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                    <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Add New Contact</h2>
                                <p className="text-slate-400 text-sm mt-0.5">Create a new CRM contact</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddContact} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">First Name *</label>
                                    <input required type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none text-sm"
                                        placeholder="John"
                                        value={newContact.first_name}
                                        onChange={e => setNewContact({ ...newContact, first_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Last Name</label>
                                    <input type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none text-sm"
                                        placeholder="Doe"
                                        value={newContact.last_name}
                                        onChange={e => setNewContact({ ...newContact, last_name: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Email</label>
                                    <input type="email"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none text-sm"
                                        placeholder="email@example.com"
                                        value={newContact.email}
                                        onChange={e => setNewContact({ ...newContact, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Phone</label>
                                    <input type="tel"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none text-sm"
                                        placeholder="+91 99999 99999"
                                        value={newContact.phone}
                                        onChange={e => setNewContact({ ...newContact, phone: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Job Title</label>
                                <input type="text"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none text-sm"
                                    placeholder="e.g. Sales Manager"
                                    value={newContact.job_title}
                                    onChange={e => setNewContact({ ...newContact, job_title: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Source</label>
                                    <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white text-sm"
                                        value={newContact.source}
                                        onChange={e => setNewContact({ ...newContact, source: e.target.value })}>
                                        {['Web', 'Facebook', 'Referral', 'Direct', 'WhatsApp', 'Other'].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Status</label>
                                    <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white text-sm"
                                        value={newContact.lead_status}
                                        onChange={e => setNewContact({ ...newContact, lead_status: e.target.value })}>
                                        {['New', 'Contacted', 'Qualified', 'Lost', 'Customer'].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Notes</label>
                                <textarea rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none resize-none text-sm"
                                    placeholder="Any notes about this contact..."
                                    value={newContact.notes}
                                    onChange={e => setNewContact({ ...newContact, notes: e.target.value })} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 py-3 bg-[#0051A5] text-white rounded-xl font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20 text-sm disabled:opacity-60">
                                    {saving ? 'Saving...' : 'Add Contact'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showColumnPicker && (
                <div className="fixed inset-0 z-40" onClick={() => setShowColumnPicker(false)} />
            )}
        </div>
    );
};

export default CRMContacts;
