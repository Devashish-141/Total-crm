import React, { useState, useEffect, useRef } from 'react';
import {
    FileText, Plus, Search, X, FolderPlus, BarChart2,
    ChevronDown, ArrowUpDown, MoreHorizontal,
    Trash2, Edit3, Copy, Star, RefreshCw, CheckCircle2,
    Tag, User, Clock, Calendar, LayoutGrid, LayoutList,
    Folder, ChevronRight, Zap, Hash, BookOpen,
    Bold, Italic, Link2, List as ListIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

type TemplateType = 'email' | 'whatsapp' | 'sms' | 'chat';
interface Template {
    id: string; created_at: string; updated_at: string;
    name: string; subject: string; body: string;
    template_type: TemplateType; owner: string; folder: string;
    starred: boolean; usage_count: number; tags: string;
}

const TYPE_META: Record<TemplateType, { label: string; color: string; bg: string; border: string }> = {
    email: { label: 'Email', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    whatsapp: { label: 'WhatsApp', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    sms: { label: 'SMS', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
    chat: { label: 'Chat', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
};

const OWNERS = ['Admin User', 'Sales Executive', 'Manager', 'Coordinator'];
const FOLDERS = ['Uncategorized', 'Follow-ups', 'Onboarding', 'Renewals', 'Support'];
const TOKENS = ['first_name', 'last_name', 'company', 'sender_name', 'sender_email', 'phone', 'date'];
const MAX_FREE = 5;

const ic = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white transition-all';

const fmtRel = (d: string) => {
    if (!d) return '—';
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const SAMPLE: Omit<Template, 'id' | 'created_at' | 'updated_at'>[] = [
    { name: 'The Follow-Up Email', subject: 'Quick follow-up from TN Solar', body: 'Hi {{first_name}},\n\nFollowing up on our recent conversation about your solar installation needs.\n\nWe\'d love to walk you through our latest offers — timing couldn\'t be better with current government subsidies.\n\nAre you free for a 15-minute call this week?\n\nBest,\n{{sender_name}}', template_type: 'email', owner: 'Admin User', folder: 'Follow-ups', starred: true, usage_count: 12, tags: 'follow-up,sales' },
    { name: 'Inbound Lead Welcome', subject: 'Great that you reached out!', body: 'Hi {{first_name}},\n\nThank you for downloading our solar guide.\n\nWe\'ve helped hundreds of homes cut electricity bills by 70–90%. I\'d love to help you do the same.\n\nWould you like a free site assessment?\n\nWarm regards,\n{{sender_name}}', template_type: 'email', owner: 'Admin User', folder: 'Onboarding', starred: false, usage_count: 8, tags: 'inbound' },
    { name: 'Site Visit Confirmation', subject: 'Confirmed: Solar site assessment for {{date}}', body: 'Hi {{first_name}},\n\nOur technician is confirmed for your solar site assessment on {{date}}.\n\nWe\'ll check your roof condition, shadow patterns, and electrical setup to create a custom ROI plan for {{company}}.\n\nSee you soon,\n{{sender_name}}', template_type: 'email', owner: 'Sales Executive', folder: 'Support', starred: false, usage_count: 15, tags: 'technical,visit' },
    { name: 'Installation Success 🎉', subject: 'Your solar system is LIVE!', body: 'Hi {{first_name}},\n\nCongratulations! Your solar system is now officially commissioned.\n\nYou are now producing clean energy and saving money on every unit.\n\nPlease find the system manuals and warranty documents attached.\n\nWelcome to the solar revolution!\n\nBest,\n{{sender_name}}', template_type: 'email', owner: 'Manager', folder: 'Renewals', starred: true, usage_count: 22, tags: 'customer-success' },
    { name: 'Maintenance Reminder', subject: 'Time for your annual solar health check', body: 'Hi {{first_name}},\n\nIt\'s been a year since your installation! To ensure your panels are performing at 100% efficiency, we recommend a quick cleaning and health check.\n\nReply to this email to book your slot for just ₹999.\n\n{{sender_name}}', template_type: 'email', owner: 'Coordinator', folder: 'Support', starred: false, usage_count: 5, tags: 'maintenance' },
    { name: 'Referral Program Intro', subject: 'Help a friend, earn ₹5,000!', body: 'Hi {{first_name}},\n\nHope you\'re enjoying your solar savings! Do you have friends or family in Tamil Nadu looking to switch to solar?\n\nRefer them to TN Solar and we\'ll send you ₹5,000 for every successful installation.\n\nJust reply with their contact details!\n\nCheers,\n{{sender_name}}', template_type: 'email', owner: 'Admin User', folder: 'Renewals', starred: false, usage_count: 0, tags: 'referral' },
    { name: 'WhatsApp Quick Follow-up', subject: '', body: 'Hi {{first_name}} 👋 This is {{sender_name}} from TN Solar. Just checking in about your solar enquiry. Are you available for a quick 2-minute call? 📞', template_type: 'whatsapp', owner: 'Admin User', folder: 'Follow-ups', starred: false, usage_count: 31, tags: 'whatsapp' },
    { name: 'WhatsApp Quote Sent', subject: '', body: 'Hi {{first_name}}! I just sent your custom solar quotation to your email. 📄\n\nIt shows how you can save ₹{{phone}} per year. Let me know if you have any questions! ⚡', template_type: 'whatsapp', owner: 'Sales Executive', folder: 'Follow-ups', starred: false, usage_count: 18, tags: 'quote' },
    { name: 'SMS Visit Reminder', subject: '', body: 'Reminder: TN Solar site visit is scheduled for today at 11 AM. See you there, {{first_name}}!', template_type: 'sms', owner: 'Admin User', folder: 'Support', starred: false, usage_count: 12, tags: 'sms' },
    { name: 'Summer Savings Offer', subject: 'Beat the heat—and the bills! ☀️', body: 'Hi {{first_name}},\n\nSummer is here and electricity usage is at its peak. Install solar this month and get an additional 10% discount on 5kW systems!\n\nDon\'t wait—the offer ends on {{date}}.\n\nBest,\n{{sender_name}}', template_type: 'email', owner: 'Admin User', folder: 'Renewals', starred: false, usage_count: 0, tags: 'promo' },
];

// ── Template Editor Modal (with live preview) ──────────────────────────────
const TemplateModal = ({ onClose, onSaved, initial }: { onClose(): void; onSaved(): void; initial?: Template | null }) => {
    const [form, setForm] = useState({
        name: initial?.name ?? '', subject: initial?.subject ?? '',
        body: initial?.body ?? '', template_type: (initial?.template_type ?? 'email') as TemplateType,
        owner: initial?.owner ?? 'Admin User', folder: initial?.folder ?? 'Uncategorized',
        starred: initial?.starred ?? false, tags: initial?.tags ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'edit' | 'preview'>('edit');
    const textRef = useRef<HTMLTextAreaElement>(null);

    const insertToken = (token: string) => {
        const el = textRef.current;
        if (!el) { setForm(p => ({ ...p, body: p.body + ` {{${token}}}` })); return; }
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const next = form.body.slice(0, start) + `{{${token}}}` + form.body.slice(end);
        setForm(p => ({ ...p, body: next }));
        setTimeout(() => { el.focus(); el.setSelectionRange(start + token.length + 4, start + token.length + 4); }, 10);
    };

    const previewBody = form.body
        .replace(/{{first_name}}/g, 'Ravi')
        .replace(/{{last_name}}/g, 'Kumar')
        .replace(/{{company}}/g, 'TN Solar')
        .replace(/{{sender_name}}/g, 'Admin User')
        .replace(/{{sender_email}}/g, 'admin@tnsolar.in')
        .replace(/{{phone}}/g, '+91 98765 43210')
        .replace(/{{date}}/g, new Date().toLocaleDateString('en-IN'));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        const now = new Date().toISOString();
        const { error } = initial?.id
            ? await supabase.from('crm_message_templates').update({ ...form, updated_at: now }).eq('id', initial.id)
            : await supabase.from('crm_message_templates').insert([{ ...form, created_at: now, updated_at: now, usage_count: 0 }]);
        if (error) toast.error('Failed to save template');
        else { toast.success(initial ? 'Template updated!' : 'Template created!'); onSaved(); onClose(); }
        setSaving(false);
    };

    const charCount = form.body.length;
    const tm = TYPE_META[form.template_type];

    const loadSample = (s: typeof SAMPLE[0]) => {
        if (form.body && !window.confirm('This will overwrite your current content. Continue?')) return;
        setForm(p => ({
            ...p,
            name: s.name,
            subject: s.subject,
            body: s.body,
            template_type: s.template_type,
            folder: s.folder,
            tags: s.tags
        }));
        toast.success('Sample loaded!');
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-[#0051A5]/5 to-transparent shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${tm.bg} flex items-center justify-center`}>
                            <FileText size={17} className={tm.color} />
                        </div>
                        <div>
                            <h2 className="font-extrabold text-slate-900">{initial ? 'Edit template' : 'New template'}</h2>
                            <p className="text-xs text-slate-400">{initial ? 'Update your saved template' : 'Build a reusable message'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Sample Library Dropdown */}
                        <div className="relative group/lib">
                            <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all">
                                <BookOpen size={14} /> Browse Library
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 hidden group-hover/lib:block z-50 max-h-80 overflow-y-auto">
                                <p className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase">Solar Industry Samples</p>
                                {SAMPLE.map((s, i) => (
                                    <button key={i} type="button" onClick={() => loadSample(s)}
                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 flex flex-col gap-0.5 border-b border-slate-50 last:border-0">
                                        <span className="text-xs font-bold text-slate-700 truncate">{s.name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono truncate">{s.template_type.toUpperCase()} · {s.body.slice(0, 40)}...</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab toggle */}
                        <div className="flex items-center bg-slate-100 rounded-xl p-1">
                            {(['edit', 'preview'] as const).map(t => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize
                                        ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    {t === 'edit' ? '✏ Edit' : '👁 Preview'}
                                </button>
                            ))}
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={18} /></button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1">
                    {tab === 'edit' ? (
                        <div className="flex overflow-hidden flex-1">
                            {/* Left pane: form */}
                            <div className="flex-1 p-6 overflow-y-auto space-y-4 border-r border-slate-100">

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Template name *</label>
                                    <input required type="text" className={ic} placeholder="e.g. Follow-up after demo"
                                        value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Channel</label>
                                        <select className={ic} value={form.template_type} onChange={e => setForm(p => ({ ...p, template_type: e.target.value as TemplateType }))}>
                                            {Object.entries(TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Folder</label>
                                        <select className={ic} value={form.folder} onChange={e => setForm(p => ({ ...p, folder: e.target.value }))}>
                                            {FOLDERS.map(f => <option key={f}>{f}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {form.template_type === 'email' && (
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subject line</label>
                                        <input type="text" className={ic} placeholder="Your email subject"
                                            value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
                                    </div>
                                )}

                                {/* Body */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Body *</label>
                                        <span className="text-[10px] text-slate-400">{charCount} chars</span>
                                    </div>
                                    {/* Token chips */}
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><Zap size={10} /> Insert:</span>
                                        {TOKENS.map(t => (
                                            <button key={t} type="button" onClick={() => insertToken(t)}
                                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-[#0051A5]/8 hover:bg-[#0051A5]/15 text-[#0051A5] border border-[#0051A5]/20 rounded-full font-mono transition-colors">
                                                <Hash size={8} />{t}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Format toolbar */}
                                    <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border border-slate-200 border-b-0 rounded-t-xl">
                                        {[{ icon: Bold, label: 'B' }, { icon: Italic, label: 'I' }, { icon: Link2, label: 'Link' }, { icon: ListIcon, label: 'List' }].map(({ icon: Icon, label }) => (
                                            <button key={label} type="button" title={label}
                                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors text-xs font-bold">
                                                <Icon size={13} />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea required ref={textRef} rows={8}
                                        className="w-full px-3.5 py-3 border border-slate-200 rounded-b-xl text-sm focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white transition-all resize-none leading-relaxed"
                                        placeholder="Write your template here. Click tokens above to insert them at cursor position."
                                        value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Owner</label>
                                        <select className={ic} value={form.owner} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}>
                                            {OWNERS.map(o => <option key={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tags</label>
                                        <input type="text" className={ic} placeholder="follow-up, sales"
                                            value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
                                    </div>
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" className="w-4 h-4 accent-[#0051A5] rounded"
                                        checked={form.starred} onChange={e => setForm(p => ({ ...p, starred: e.target.checked }))} />
                                    <span className="text-sm text-slate-600 font-medium flex items-center gap-1.5">
                                        <Star size={13} className={form.starred ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} /> Mark as favourite
                                    </span>
                                </label>
                            </div>

                            {/* Right pane: live preview */}
                            <div className="w-80 shrink-0 p-5 bg-slate-50 overflow-y-auto">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Live preview</p>
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className={`px-4 py-3 ${tm.bg} border-b ${tm.border} flex items-center gap-2`}>
                                        <span className={`text-xs font-bold ${tm.color}`}>{tm.label}</span>
                                        {form.subject && <span className="text-xs text-slate-600 truncate">· {form.subject}</span>}
                                    </div>
                                    <div className="p-4">
                                        {form.name && <p className="text-xs font-bold text-slate-800 mb-3">{form.name}</p>}
                                        <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                                            {previewBody || <span className="text-slate-300 italic">Start typing to see preview…</span>}
                                        </div>
                                        {form.tags && (
                                            <div className="flex flex-wrap gap-1 mt-3">
                                                {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                                                    <span key={t} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{t}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400">
                                        <User size={9} /> {form.owner} &nbsp;·&nbsp; <Folder size={9} /> {form.folder}
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-3 text-center">Tokens replaced with sample values</p>
                            </div>
                        </div>
                    ) : (
                        /* Full preview tab */
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
                                <div className={`px-6 py-4 ${tm.bg} border-b ${tm.border}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tm.bg} ${tm.color} border ${tm.border}`}>{tm.label}</span>
                                        <span className="text-xs text-slate-500">{form.folder}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-800">{form.name || 'Untitled template'}</h3>
                                    {form.subject && <p className="text-sm text-slate-600 mt-0.5">Subject: {form.subject}</p>}
                                </div>
                                <div className="p-6">
                                    <p className="text-sm text-slate-700 whitespace-pre-line leading-7">{previewBody || <span className="text-slate-300 italic">Body is empty…</span>}</p>
                                </div>
                                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
                                    <span className="flex items-center gap-1"><User size={11} /> {form.owner}</span>
                                    <span className="flex items-center gap-1"><Tag size={11} /> {form.tags || 'No tags'}</span>
                                </div>
                            </div>
                            <p className="text-xs text-center text-slate-400 mt-4">Tokens replaced with sample values for preview</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="border-t border-slate-100 px-6 py-4 flex gap-3 shrink-0 bg-white">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 text-sm hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 bg-[#0051A5] text-white rounded-xl font-bold text-sm hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20 disabled:opacity-60 flex items-center justify-center gap-2">
                            {saving ? <><RefreshCw size={14} className="animate-spin" />Saving…</> : <><CheckCircle2 size={14} />{initial ? 'Save changes' : 'Create template'}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const CRMMessageTemplates = () => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterOwner, setFilterOwner] = useState('');
    const [activeFolder, setActiveFolder] = useState('');
    const [filterType, setFilterType] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sortCol, setSortCol] = useState<'name' | 'owner' | 'created_at' | 'updated_at'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [showEditor, setShowEditor] = useState(false);
    const [editTarget, setEditTarget] = useState<Template | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('crm_message_templates').select('*').order('name');
        if (!error && data?.length === 0) {
            const now = new Date().toISOString();
            await supabase.from('crm_message_templates').insert(
                SAMPLE.map(t => ({ ...t, created_at: now, updated_at: now }))
            );
            const { data: d2 } = await supabase.from('crm_message_templates').select('*').order('name');
            setTemplates((d2 ?? []) as Template[]);
        } else {
            setTemplates(error ? [] : (data ?? []) as Template[]);
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSort = (col: typeof sortCol) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this template?')) return;
        await supabase.from('crm_message_templates').delete().eq('id', id);
        toast.success('Deleted'); fetchData();
    };

    const handleDuplicate = async (t: Template) => {
        const now = new Date().toISOString();
        await supabase.from('crm_message_templates').insert([{ ...t, id: undefined, name: `Copy of ${t.name}`, created_at: now, updated_at: now, usage_count: 0 }]);
        toast.success('Duplicated!'); fetchData();
    };

    const toggleStar = async (t: Template) => {
        await supabase.from('crm_message_templates').update({ starred: !t.starred }).eq('id', t.id);
        fetchData();
    };

    const toggleSelect = (id: string) =>
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const displayed = templates
        .filter(t => {
            if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.body?.toLowerCase().includes(search.toLowerCase())) return false;
            if (filterOwner && t.owner !== filterOwner) return false;
            if (activeFolder && t.folder !== activeFolder) return false;
            if (filterType && t.template_type !== filterType) return false;
            return true;
        })
        .sort((a, b) => {
            const av = a[sortCol] ?? ''; const bv = b[sortCol] ?? '';
            return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        });

    const SortIcon = ({ col }: { col: typeof sortCol }) => (
        <ArrowUpDown size={11} className={`ml-1 inline-block ${sortCol === col ? 'text-[#0051A5]' : 'opacity-20'}`} />
    );

    const usedCount = templates.length;
    const freeLeft = Math.max(0, MAX_FREE - usedCount);
    const pct = Math.min(100, (usedCount / MAX_FREE) * 100);
    const barColor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';

    // Folder counts
    const folderCounts: Record<string, number> = {};
    templates.forEach(t => { folderCounts[t.folder] = (folderCounts[t.folder] ?? 0) + 1; });

    return (
        <div className="flex flex-col h-full bg-[#F8FAFB]">

            {/* ── Header ── */}
            <div className="px-6 pt-5 pb-4 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0051A5]/10 flex items-center justify-center">
                            <FileText size={18} className="text-[#0051A5]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-900">Message templates</h1>
                            <p className="text-xs text-slate-400 mt-0.5">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Quota */}
                        <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-[11px] text-slate-500 font-medium">Free templates</span>
                                    <span className="text-[11px] font-bold" style={{ color: barColor }}>{freeLeft} left</span>
                                </div>
                                <div className="w-28 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                                </div>
                            </div>
                        </div>

                        <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            <FolderPlus size={13} /> New folder
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            <BarChart2 size={13} /> Analyze <ChevronDown size={11} />
                        </button>
                        <button onClick={() => { setEditTarget(null); setShowEditor(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0051A5] text-white rounded-xl text-sm font-bold hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20">
                            <Plus size={15} /> New template
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Body: sidebar + content ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Left: Folder sidebar */}
                <div className="w-52 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
                    <div className="px-4 pt-4 pb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Folders</p>
                        <button
                            onClick={() => setActiveFolder('')}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all mb-1
                                ${activeFolder === '' ? 'bg-[#0051A5] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <span className="flex items-center gap-2"><FileText size={13} /> All templates</span>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeFolder === '' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {templates.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveFolder('__starred__')}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all mb-1
                                ${activeFolder === '__starred__' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <span className="flex items-center gap-2"><Star size={13} /> Starred</span>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeFolder === '__starred__' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {templates.filter(t => t.starred).length}
                            </span>
                        </button>
                    </div>

                    <div className="px-4 py-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">By folder</p>
                        {FOLDERS.map(f => {
                            const count = folderCounts[f] ?? 0;
                            const active = activeFolder === f;
                            return (
                                <button key={f} onClick={() => setActiveFolder(f)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all mb-1
                                        ${active ? 'bg-[#0051A5]/10 text-[#0051A5]' : 'text-slate-500 hover:bg-slate-50'}`}>
                                    <span className="flex items-center gap-2">
                                        <ChevronRight size={12} className={active ? 'rotate-90' : ''} />
                                        {f}
                                    </span>
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-[#0051A5]/10 text-[#0051A5]' : 'bg-slate-100 text-slate-400'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="px-4 py-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">By channel</p>
                        {Object.entries(TYPE_META).map(([k, m]) => {
                            const count = templates.filter(t => t.template_type === k).length;
                            const active = filterType === k;
                            return (
                                <button key={k} onClick={() => setFilterType(active ? '' : k)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all mb-1
                                        ${active ? `${m.bg} ${m.color}` : 'text-slate-500 hover:bg-slate-50'}`}>
                                    <span>{m.label}</span>
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/60' : 'bg-slate-100 text-slate-400'}`}>{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right: main content */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Filter + view toggle bar */}
                    <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center gap-2 shrink-0">
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search templates…"
                                className="pl-8 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:ring-1 focus:ring-[#0051A5]/30 focus:border-[#0051A5] outline-none w-52"
                                value={search} onChange={e => setSearch(e.target.value)} />
                            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={12} /></button>}
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500 font-semibold">Owner:</span>
                            <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}
                                className="px-2 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white outline-none cursor-pointer text-slate-600">
                                <option value="">Any</option>
                                {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>

                        {(search || filterOwner || activeFolder || filterType) && (
                            <button onClick={() => { setSearch(''); setFilterOwner(''); setActiveFolder(''); setFilterType(''); }}
                                className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                                <X size={11} /> Clear
                            </button>
                        )}

                        <span className="text-xs text-slate-400 ml-1">{displayed.length} result{displayed.length !== 1 ? 's' : ''}</span>

                        {/* View toggle */}
                        <div className="ml-auto flex items-center bg-slate-100 rounded-xl p-1">
                            <button onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}>
                                <LayoutList size={14} />
                            </button>
                            <button onClick={() => setViewMode('card')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}>
                                <LayoutGrid size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                                <div className="w-5 h-5 border-2 border-slate-200 border-t-[#0051A5] rounded-full animate-spin" />
                                Loading templates…
                            </div>
                        ) : displayed.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
                                    <FileText size={32} className="text-slate-300" />
                                </div>
                                <h3 className="font-bold text-slate-700 mb-1">No templates found</h3>
                                <p className="text-sm text-slate-400 mb-5 max-w-xs">
                                    {search ? `No results for "${search}".` : 'Create your first reusable message template.'}
                                </p>
                                <button onClick={() => { setEditTarget(null); setShowEditor(true); }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0051A5] text-white rounded-xl text-sm font-bold hover:bg-[#003d7a] transition-all shadow-md">
                                    <Plus size={14} /> New template
                                </button>
                            </div>
                        ) : viewMode === 'list' ? (
                            /* ── List view ── */
                            <table className="w-full text-sm border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="w-8 px-4 py-3">
                                            <input type="checkbox" className="accent-[#0051A5] rounded"
                                                checked={selected.size === displayed.length && displayed.length > 0}
                                                onChange={e => setSelected(e.target.checked ? new Set(displayed.map(t => t.id)) : new Set())} />
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-700" onClick={() => handleSort('name')}>
                                            Name <SortIcon col="name" />
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap">Channel</th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap" onClick={() => handleSort('owner')}>
                                            Owner <SortIcon col="owner" />
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap" onClick={() => handleSort('created_at')}>
                                            <Calendar size={11} className="inline mr-1" />Date created <SortIcon col="created_at" />
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap" onClick={() => handleSort('updated_at')}>
                                            <Clock size={11} className="inline mr-1" />Date modified <SortIcon col="updated_at" />
                                        </th>
                                        <th className="text-center px-4 py-3 text-xs font-bold text-slate-500">Uses</th>
                                        <th className="w-10 px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayed.map((t, idx) => {
                                        const tm = TYPE_META[t.template_type] ?? TYPE_META.email;
                                        return (
                                            <tr key={t.id} className={`border-b border-slate-100 hover:bg-blue-50/20 transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                                <td className="px-4 py-3.5">
                                                    <input type="checkbox" className="accent-[#0051A5] rounded" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} />
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-start gap-2">
                                                        <button onClick={() => toggleStar(t)} className="shrink-0 mt-0.5">
                                                            <Star size={13} className={t.starred ? 'text-amber-400 fill-amber-400' : 'text-slate-200 group-hover:text-slate-300 transition-colors'} />
                                                        </button>
                                                        <div>
                                                            <button onClick={() => { setEditTarget(t); setShowEditor(true); }}
                                                                className="font-semibold text-[#0051A5] hover:underline text-left text-sm leading-snug">
                                                                {t.name}
                                                            </button>
                                                            {t.subject && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{t.subject}</p>}
                                                            {t.tags && (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {t.tags.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
                                                                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">{tag}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${tm.bg} ${tm.color} border ${tm.border}`}>
                                                        {tm.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-xs text-slate-600">{t.owner}</td>
                                                <td className="px-4 py-3.5 text-xs text-slate-500">{fmtRel(t.created_at)}</td>
                                                <td className="px-4 py-3.5 text-xs text-slate-500">{fmtRel(t.updated_at)}</td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <span className="text-xs font-bold text-slate-600">{t.usage_count}</span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => { setEditTarget(t); setShowEditor(true); }} title="Edit"
                                                            className="p-1.5 text-slate-300 hover:text-[#0051A5] hover:bg-blue-50 rounded-lg transition-colors">
                                                            <Edit3 size={13} />
                                                        </button>
                                                        <button onClick={() => handleDuplicate(t)} title="Duplicate"
                                                            className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                                            <Copy size={13} />
                                                        </button>
                                                        <button onClick={() => handleDelete(t.id)} title="Delete"
                                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                            <Trash2 size={13} />
                                                        </button>
                                                        <button title="More"
                                                            className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                                            <MoreHorizontal size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            /* ── Card view ── */
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {displayed.map(t => {
                                    const tm = TYPE_META[t.template_type] ?? TYPE_META.email;
                                    return (
                                        <div key={t.id} className="group bg-white rounded-2xl border border-slate-200 hover:border-[#0051A5]/30 hover:shadow-lg transition-all overflow-hidden flex flex-col">
                                            {/* Card header */}
                                            <div className={`px-4 py-3 ${tm.bg} border-b ${tm.border} flex items-center justify-between`}>
                                                <span className={`text-xs font-bold ${tm.color}`}>{tm.label}</span>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => toggleStar(t)}>
                                                        <Star size={13} className={t.starred ? 'text-amber-400 fill-amber-400' : 'text-slate-300 hover:text-amber-300'} />
                                                    </button>
                                                    <span className="text-[10px] text-slate-400 ml-1">{t.folder}</span>
                                                </div>
                                            </div>
                                            {/* Card body */}
                                            <div className="p-4 flex-1">
                                                <button onClick={() => { setEditTarget(t); setShowEditor(true); }}
                                                    className="font-bold text-slate-800 hover:text-[#0051A5] text-sm text-left leading-snug mb-2 transition-colors">
                                                    {t.name}
                                                </button>
                                                {t.subject && <p className="text-xs text-slate-500 mb-2 italic">"{t.subject}"</p>}
                                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{t.body}</p>
                                            </div>
                                            {/* Card footer */}
                                            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                    <span className="flex items-center gap-1"><User size={9} /> {t.owner.split(' ')[0]}</span>
                                                    <span>·</span>
                                                    <span>{t.usage_count} use{t.usage_count !== 1 ? 's' : ''}</span>
                                                </div>
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditTarget(t); setShowEditor(true); }}
                                                        className="p-1.5 text-slate-300 hover:text-[#0051A5] hover:bg-blue-50 rounded-lg transition-colors">
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <button onClick={() => handleDuplicate(t)}
                                                        className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                                        <Copy size={12} />
                                                    </button>
                                                    <button onClick={() => handleDelete(t.id)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showEditor && (
                <TemplateModal
                    onClose={() => { setShowEditor(false); setEditTarget(null); }}
                    onSaved={fetchData}
                    initial={editTarget}
                />
            )}
        </div>
    );
};

export default CRMMessageTemplates;
