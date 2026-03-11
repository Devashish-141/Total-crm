import React, { useState, useEffect, useRef } from 'react';
import {
    Scissors, Plus, Search, X, FolderPlus, Check,
    Trash2, Edit3, RefreshCw, CheckCircle2,
    Hash, Lock, Zap, Folder
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Snippet {
    id: string;
    created_at: string;
    updated_at: string;
    name: string;
    text: string;
    shortcut: string;
    owner: string;
    folder: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const OWNERS = ['Admin User', 'Sales Executive', 'Manager', 'Coordinator'];
const DEFAULT_FOLDERS = ['Uncategorized', 'General', 'Outreach', 'Follow-ups', 'Closing'];
const TOKENS = ['first_name', 'last_name', 'company', 'sender_name', 'date'];

const FOLDER_STORAGE_KEY = 'crm_snippet_folders';

const ic = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white transition-all';

const fmtRel = (d: string) => {
    if (!d) return '—';
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const SAMPLE_SNIPPETS: Omit<Snippet, 'id' | 'created_at' | 'updated_at'>[] = [
    { name: 'Pricing Page Link', text: 'You can check our detailed pricing and subsidy calculator here: https://tnsolar.in/pricing', shortcut: 'pricing', owner: 'Admin User', folder: 'General' },
    { name: 'Free Consultation Offer', text: 'Would you like to book a free 30-minute consultation with our solar expert Ravi? He can help you estimate your roof savings.', shortcut: 'consult', owner: 'Sales Executive', folder: 'Outreach' },
    { name: 'ROI Calculation Disclaimer', text: 'Please note: The ROI calculations provided are estimates based on standard Tamil Nadu electricity tariffs and 300 days of sunshine per year.', shortcut: 'roi', owner: 'Manager', folder: 'General' },
];

// ─── Snippet Modal ────────────────────────────────────────────────────────────
const SnippetModal = ({ onClose, onSaved, initial, folders }: { onClose(): void; onSaved(): void; initial?: Snippet | null; folders: string[] }) => {
    const [form, setForm] = useState({
        name: initial?.name ?? '',
        text: initial?.text ?? '',
        shortcut: initial?.shortcut ?? '',
        owner: initial?.owner ?? 'Admin User',
        folder: initial?.folder ?? 'Uncategorized',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.shortcut.match(/^[a-z0-9-_]+$/i)) {
            toast.error('Shortcut can only contain letters, numbers, hyphens and underscores.');
            return;
        }
        setSaving(true);
        const now = new Date().toISOString();
        const { error } = initial?.id
            ? await supabase.from('crm_snippets').update({ ...form, updated_at: now }).eq('id', initial.id)
            : await supabase.from('crm_snippets').insert([{ ...form, created_at: now, updated_at: now }]);

        if (error) toast.error('Failed to save snippet');
        else { toast.success(initial ? 'Snippet updated!' : 'Snippet created!'); onSaved(); onClose(); }
        setSaving(false);
    };

    const insertToken = (token: string) => {
        setForm(p => ({ ...p, text: p.text + `{{${token}}}` }));
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#0051A5]/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0051A5]/10 flex items-center justify-center">
                            <Scissors size={18} className="text-[#0051A5]" />
                        </div>
                        <h2 className="text-lg font-extrabold text-slate-900">{initial ? 'Edit snippet' : 'Create snippet'}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Internal name *</label>
                        <input required type="text" className={ic} placeholder="e.g. Subsidy Disclaimer"
                            value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                        <p className="text-[10px] text-slate-400 mt-1">Visible only to your team.</p>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Snippet text *</label>
                            <div className="flex gap-1">
                                {TOKENS.map(t => (
                                    <button key={t} type="button" onClick={() => insertToken(t)}
                                        className="text-[10px] px-1.5 py-0.5 bg-slate-50 hover:bg-[#0051A5]/10 hover:text-[#0051A5] rounded border border-slate-200 transition-colors">
                                        {'{{'}{t}{'}}'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <textarea required rows={5}
                            className={`${ic} resize-none font-sans`}
                            placeholder="Write your snippet content here..."
                            value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))} />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Shortcut *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">#</span>
                            <input required type="text" className={`${ic} pl-7`} placeholder="pricing"
                                value={form.shortcut} onChange={e => setForm(p => ({ ...p, shortcut: e.target.value.toLowerCase().replace(/\s/g, '') }))} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Type # followed by this shortcut in your emails to insert the snippet.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Folder</label>
                            <select className={ic} value={form.folder} onChange={e => setForm(p => ({ ...p, folder: e.target.value }))}>
                                {folders.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Owner</label>
                            <select className={ic} value={form.owner} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}>
                                {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 text-sm hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 bg-[#0051A5] text-white rounded-xl font-bold text-sm hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
                            {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            {initial ? 'Save changes' : 'Create snippet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const CRMSnippets = () => {
    const [snippets, setSnippets] = useState<Snippet[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeFolder, setActiveFolder] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Snippet | null>(null);

    // ── Folder management ────────────────────────────────────────────────────
    const [folders, setFolders] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(FOLDER_STORAGE_KEY);
            return saved ? JSON.parse(saved) : DEFAULT_FOLDERS;
        } catch { return DEFAULT_FOLDERS; }
    });
    const [showFolderPopover, setShowFolderPopover] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const folderPopoverRef = useRef<HTMLDivElement>(null);
    const folderBtnRef = useRef<HTMLButtonElement>(null);

    // Close popover on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                folderPopoverRef.current && !folderPopoverRef.current.contains(e.target as Node) &&
                folderBtnRef.current && !folderBtnRef.current.contains(e.target as Node)
            ) setShowFolderPopover(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const addFolder = () => {
        const trimmed = newFolderName.trim();
        if (!trimmed) { toast.error('Please enter a folder name.'); return; }
        if (folders.includes(trimmed)) { toast.error(`"${trimmed}" already exists.`); return; }
        const updated = [...folders, trimmed];
        setFolders(updated);
        localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(updated));
        setNewFolderName('');
        setShowFolderPopover(false);
        toast.success(`Folder "${trimmed}" created!`);
    };

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('crm_snippets').select('*').order('name');
        if (!error && (data?.length === 0 || !data)) {
            // Check if we need to seed
            const now = new Date().toISOString();
            await supabase.from('crm_snippets').insert(SAMPLE_SNIPPETS.map(s => ({ ...s, created_at: now, updated_at: now })));
            const { data: d2 } = await supabase.from('crm_snippets').select('*').order('name');
            setSnippets((d2 ?? []) as Snippet[]);
        } else {
            setSnippets(error ? [] : (data ?? []) as Snippet[]);
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this snippet?')) return;
        await supabase.from('crm_snippets').delete().eq('id', id);
        toast.success('Snippet deleted');
        fetchData();
    };

    const displayed = snippets.filter(s => {
        if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.shortcut.toLowerCase().includes(search.toLowerCase())) return false;
        if (activeFolder && s.folder !== activeFolder) return false;
        return true;
    });

    const usedCount = snippets.length;
    const progressLimit = 3;
    const pct = Math.min(100, (usedCount / progressLimit) * 100);

    return (
        <div className="flex flex-col h-full bg-[#F8FAFB]">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0051A5]/10 flex items-center justify-center">
                            <Scissors size={18} className="text-[#0051A5]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-900">Snippets</h1>
                            <p className="text-xs text-slate-400 mt-0.5">{usedCount} of {progressLimit} created</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-[#0051A5] transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{usedCount} Used</span>
                        </div>
                        <div className="relative">
                            <button
                                ref={folderBtnRef}
                                onClick={() => setShowFolderPopover(v => !v)}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border rounded-lg transition-all ${showFolderPopover
                                        ? 'bg-[#0051A5] text-white border-[#0051A5] shadow-md'
                                        : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}>
                                <FolderPlus size={13} /> New folder
                            </button>

                            {/* Inline popover */}
                            {showFolderPopover && (
                                <div ref={folderPopoverRef}
                                    className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 rounded-lg bg-[#0051A5]/10 flex items-center justify-center">
                                            <Folder size={14} className="text-[#0051A5]" />
                                        </div>
                                        <p className="text-sm font-extrabold text-slate-800">New folder</p>
                                    </div>
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="e.g. Product Updates"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] mb-3"
                                        value={newFolderName}
                                        onChange={e => setNewFolderName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFolder(); } }}
                                    />
                                    {/* Existing folders */}
                                    {folders.length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Existing folders</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {folders.map(f => (
                                                    <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-600">
                                                        <Folder size={10} />{f}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setShowFolderPopover(false)}
                                            className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                            Cancel
                                        </button>
                                        <button type="button" onClick={addFolder}
                                            className="flex-1 py-2 bg-[#0051A5] text-white rounded-xl text-xs font-bold hover:bg-[#003d7a] transition-colors flex items-center justify-center gap-1.5">
                                            <Check size={12} /> Create folder
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => { setEditTarget(null); setShowModal(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0051A5] text-white rounded-xl text-sm font-bold hover:bg-[#003d7a] transition-all shadow-md">
                            <Plus size={15} /> Create snippet
                        </button>
                    </div>
                </div>

                {/* Unlock Banner - matching HubSpot */}
                {usedCount >= progressLimit && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                            <Lock size={14} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-slate-800">Your team has created {usedCount} out of {progressLimit} snippets.</p>
                            <p className="text-[11px] text-slate-500">Unlock more snippets with TN Solar Enterprise. <button className="text-[#0051A5] hover:underline font-semibold">Learn more</button></p>
                        </div>
                        <button className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm">Upgrade</button>
                    </div>
                )}
            </div>

            {/* Filter bar */}
            <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-4">
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search by name or shortcut"
                        className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:ring-1 focus:ring-[#0051A5]/30 focus:border-[#0051A5] outline-none w-64"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Filter:</span>
                    <select value={activeFolder} onChange={e => setActiveFolder(e.target.value)}
                        className="px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg bg-white outline-none">
                        <option value="">All folders</option>
                        {folders.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
                <span className="ml-auto text-xs text-slate-400">{displayed.length} snippets</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                        <RefreshCw size={24} className="animate-spin" />
                        <p className="text-sm font-medium">Loading snippets...</p>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 px-6 text-center max-w-2xl mx-auto">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-blue-100 rounded-full scale-150 blur-3xl opacity-30" />
                            <div className="relative bg-white p-6 rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-slate-100">
                                <Scissors size={48} className="text-slate-300" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 border-4 border-white">
                                <Zap size={18} />
                            </div>
                        </div>
                        <h2 className="text-xl font-extrabold text-slate-800 mb-2">Save time writing emails and taking notes</h2>
                        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                            Create shortcuts to your most common responses in emails sent to prospects and notes logged in your CRM.
                            Quickly send emails and log notes without having to type the same thing over and over.
                        </p>
                        <button onClick={() => setShowModal(true)}
                            className="bg-[#0051A5] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2">
                            <Plus size={16} /> Create your first snippet
                        </button>
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Internal Name</th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Shortcut</th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Owner</th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Updated</th>
                                        <th className="w-10 px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayed.map(s => (
                                        <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group">
                                            <td className="px-4 py-4">
                                                <div>
                                                    <button onClick={() => { setEditTarget(s); setShowModal(true); }}
                                                        className="font-bold text-[#0051A5] hover:underline block text-left">
                                                        {s.name}
                                                    </button>
                                                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{s.text}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-mono font-bold">
                                                    <Hash size={10} />{s.shortcut}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-xs text-slate-500">{s.owner}</td>
                                            <td className="px-4 py-4 text-xs text-slate-400 uppercase tracking-wider">{fmtRel(s.updated_at)}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditTarget(s); setShowModal(true); }}
                                                        className="p-1.5 text-slate-400 hover:text-[#0051A5] hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all">
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(s.id)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <SnippetModal
                    onClose={() => setShowModal(false)}
                    onSaved={fetchData}
                    initial={editTarget}
                    folders={folders}
                />
            )}
        </div>
    );
};

export default CRMSnippets;
