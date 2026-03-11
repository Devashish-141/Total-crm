import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Search, ChevronLeft, ChevronRight, Settings,
    Mail, MessageSquare, Phone, Globe, Send,
    Plus, MoreHorizontal, RefreshCw, Star,
    CheckCircle2, Clock,
    Paperclip, Smile, Bold, Italic, Link2,
    User, X, Hash, Bell,
    Inbox, Tag, ArrowLeft,
    CornerDownLeft, MessageCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import InboxSettings from '../components/InboxSettings';

// ─── Types ────────────────────────────────────────────────────────────────────
type ConvStatus = 'open' | 'resolved' | 'spam' | 'snoozed';
type Channel = 'email' | 'whatsapp' | 'chat' | 'form' | 'call' | 'sms';
type FilterView = 'unassigned' | 'mine' | 'all_open' | 'resolved' | 'spam';

interface Message {
    id: string;
    from: string;
    body: string;
    time: string;
    mine: boolean;
    channel: Channel;
}

interface Conversation {
    id: string;
    created_at: string;
    updated_at: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    channel: Channel;
    subject: string;
    last_message: string;
    status: ConvStatus;
    assigned_to: string;
    unread: boolean;
    messages: Message[];
}

// ─── Config ───────────────────────────────────────────────────────────────────
const CHANNEL_CONFIG: Record<Channel, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    email: { label: 'Email', color: 'text-blue-600', bg: 'bg-blue-50', icon: Mail },
    whatsapp: { label: 'WhatsApp', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: MessageSquare },
    chat: { label: 'Chat', color: 'text-violet-600', bg: 'bg-violet-50', icon: MessageCircle },
    form: { label: 'Form', color: 'text-amber-600', bg: 'bg-amber-50', icon: Globe },
    call: { label: 'Call', color: 'text-rose-600', bg: 'bg-rose-50', icon: Phone },
    sms: { label: 'SMS', color: 'text-cyan-600', bg: 'bg-cyan-50', icon: Hash },
};

const FILTERS: { id: FilterView; label: string }[] = [
    { id: 'unassigned', label: 'Unassigned' },
    { id: 'mine', label: 'Assigned to me' },
    { id: 'all_open', label: 'All open' },
];

const MORE_FILTERS: { id: FilterView; label: string }[] = [
    { id: 'resolved', label: 'Resolved' },
    { id: 'spam', label: 'Spam' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ago = (s: string) => {
    if (!s) return '';
    const d = Date.now() - new Date(s).getTime();
    const m = Math.floor(d / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
};

const Av = ({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) => {
    const init = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const p = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
    const sz = size === 'sm' ? 'w-7 h-7 text-[11px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
    return (
        <span className={`${sz} rounded-full ${p[name.charCodeAt(0) % p.length]} inline-flex items-center justify-center font-bold text-white shrink-0`}>
            {init}
        </span>
    );
};

// ─── Channel Card (empty state) ───────────────────────────────────────────────
const ChannelCard = ({ channel, emoji, title, desc, onClick }:
    { channel: Channel; emoji: string; title: string; desc: string; onClick(): void }) => {
    const cfg = CHANNEL_CONFIG[channel];
    return (
        <button onClick={onClick}
            className="flex flex-col items-center p-5 border border-slate-200 rounded-2xl hover:border-[#0051A5]/30 hover:shadow-lg transition-all group bg-white text-center min-w-[140px] max-w-[160px]">
            <div className={`w-16 h-16 rounded-2xl ${cfg.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                <span className="text-3xl">{emoji}</span>
            </div>
            <p className={`font-bold text-sm mb-2 ${cfg.color} group-hover:underline`}>{title}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
        </button>
    );
};

// ─── Conversation Card ────────────────────────────────────────────────────────
const ConvCard = ({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick(): void }) => {
    const cfg = CHANNEL_CONFIG[conv.channel];
    const CIcon = cfg.icon;
    return (
        <button onClick={onClick}
            className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-blue-50/30 transition-colors flex items-start gap-3 group
                ${active ? 'bg-blue-50 border-l-2 border-l-[#0051A5]' : 'border-l-2 border-l-transparent'}`}>
            <div className="relative shrink-0 mt-0.5">
                <Av name={conv.contact_name} size="md" />
                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${cfg.bg} flex items-center justify-center border border-white`}>
                    <CIcon size={9} className={cfg.color} />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className={`text-sm truncate ${conv.unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {conv.contact_name}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0">{ago(conv.updated_at)}</span>
                </div>
                <p className={`text-xs truncate mb-0.5 ${conv.unread ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>
                    {conv.subject}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{conv.last_message}</p>
            </div>
            {conv.unread && <span className="w-2 h-2 rounded-full bg-[#0051A5] shrink-0 mt-2" />}
        </button>
    );
};

// ─── Thread View ──────────────────────────────────────────────────────────────
const ThreadView = ({ conv, onClose, onResolve, currentUser = 'Admin User' }:
    { conv: Conversation; onClose(): void; onResolve(id: string): void; currentUser?: string }) => {
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [messages, setMessages] = useState<Message[]>(conv.messages ?? []);
    const bottomRef = useRef<HTMLDivElement>(null);
    const cfg = CHANNEL_CONFIG[conv.channel];
    const CIcon = cfg.icon;

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!reply.trim()) return;
        setSending(true);
        const m: Message = {
            id: Date.now().toString(),
            from: currentUser,
            body: reply.trim(),
            time: new Date().toISOString(),
            mine: true,
            channel: conv.channel,
        };
        const updated = [...messages, m];
        setMessages(updated);
        // persist
        await supabase.from('crm_conversations').update({
            messages: updated,
            last_message: reply.trim(),
            updated_at: new Date().toISOString(),
        }).eq('id', conv.id);
        setReply('');
        setSending(false);
        toast.success('Reply sent');
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Thread header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors md:hidden"><ArrowLeft size={16} /></button>
                    <Av name={conv.contact_name} size="lg" />
                    <div>
                        <p className="font-bold text-slate-900 text-sm">{conv.contact_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${cfg.color}`}>
                                <CIcon size={11} /> {cfg.label}
                            </span>
                            {conv.contact_email && <span className="text-[11px] text-slate-400">{conv.contact_email}</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {conv.status === 'open' && (
                        <button onClick={() => onResolve(conv.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                            <CheckCircle2 size={13} /> Resolve
                        </button>
                    )}
                    <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><Star size={16} /></button>
                    <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><Bell size={16} /></button>
                    <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><MoreHorizontal size={16} /></button>
                </div>
            </div>

            {/* Subject */}
            <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-2 shrink-0">
                <Tag size={14} className="text-slate-400" />
                <p className="text-sm font-semibold text-slate-700">{conv.subject}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                            <MessageCircle size={24} className="text-slate-300" />
                        </div>
                        <p className="text-slate-400 text-sm">No messages yet. Start the conversation!</p>
                    </div>
                ) : messages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.mine ? 'flex-row-reverse' : ''}`}>
                        <Av name={msg.from} size="sm" />
                        <div className={`max-w-[75%] ${msg.mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                            <div className="flex items-center gap-2">
                                <p className="text-[11px] font-bold text-slate-400">{msg.from}</p>
                                <p className="text-[10px] text-slate-300">{ago(msg.time)}</p>
                            </div>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                                ${msg.mine
                                    ? 'bg-[#0051A5] text-white rounded-tr-sm'
                                    : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                                {msg.body}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Reply box */}
            <div className="border-t border-slate-200 p-4 shrink-0">
                <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-[#0051A5]/20 focus-within:border-[#0051A5] transition-all">
                    {/* Toolbar */}
                    <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-slate-100">
                        {[Bold, Italic, Link2, Paperclip, Smile].map((Icon, i) => (
                            <button key={i} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
                                <Icon size={14} />
                            </button>
                        ))}
                        <div className="flex-1" />
                        <span className="text-[11px] text-slate-300 px-2">Replying via {cfg.label}</span>
                    </div>
                    <textarea
                        rows={3}
                        placeholder={`Reply to ${conv.contact_name}…`}
                        className="w-full px-4 py-3 text-sm outline-none resize-none text-slate-700 placeholder-slate-300"
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSend(); }}
                    />
                    <div className="flex items-center justify-between px-3 pb-3">
                        <span className="text-[10px] text-slate-300 flex items-center gap-1">
                            <CornerDownLeft size={11} /> ⌘+Enter to send
                        </span>
                        <button onClick={handleSend} disabled={sending || !reply.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0051A5] text-white rounded-xl text-xs font-bold hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20 disabled:opacity-40">
                            <Send size={13} /> {sending ? 'Sending…' : 'Send reply'}
                        </button>
                    </div>
                </div>

                {/* Assignee / status row */}
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <User size={12} />
                        <span>{conv.assigned_to || 'Unassigned'}</span>
                    </div>
                    <span>·</span>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold
                        ${conv.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {conv.status === 'open' ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                        {conv.status === 'open' ? 'Open' : 'Resolved'}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Compose Modal ────────────────────────────────────────────────────────────
const ComposeModal = ({ onClose, onSaved }: { onClose(): void; onSaved(conv: Conversation): void }) => {
    const [form, setForm] = useState({
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        channel: 'email' as Channel,
        subject: '',
        message: '',
        assigned_to: 'Admin User',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const now = new Date().toISOString();
        const msg: Message = {
            id: Date.now().toString(),
            from: 'Admin User',
            body: form.message,
            time: now,
            mine: true,
            channel: form.channel,
        };
        const { data, error } = await supabase.from('crm_conversations').insert([{
            contact_name: form.contact_name,
            contact_email: form.contact_email,
            contact_phone: form.contact_phone,
            channel: form.channel,
            subject: form.subject,
            last_message: form.message,
            status: 'open',
            assigned_to: form.assigned_to,
            unread: false,
            messages: [msg],
            created_at: now,
            updated_at: now,
        }]).select().single();
        setSaving(false);
        if (error) {
            toast.error('Failed to create conversation: ' + error.message);
            return;
        }
        toast.success('Conversation created!');
        onSaved(data as Conversation);
        onClose();
    };

    const ic = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none transition-all';

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                    <h2 className="text-lg font-bold text-slate-900">New Conversation</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <input required type="text" className={ic} placeholder="Contact name *" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="email" className={ic} placeholder="Email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
                        <input type="tel" className={ic} placeholder="Phone" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <select className={ic} value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value as Channel })}>
                            {Object.entries(CHANNEL_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <select className={ic} value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                            <option value="">— Unassigned —</option>
                            {['Admin User', 'Sales Executive', 'Manager'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <input required type="text" className={ic} placeholder="Subject *" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
                    <textarea required rows={4} className={`${ic} resize-none`} placeholder="First message *" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-sm">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#0051A5] text-white rounded-xl font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20 text-sm disabled:opacity-60">
                            {saving ? 'Creating…' : 'Create Conversation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ onCreate }: { onCreate(): void }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-10 bg-[#F8FAFB]">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Say hello.</h2>
        <p className="text-slate-400 text-sm mb-10 text-center max-w-md">
            Connect your first channel and start bringing conversations to your inbox.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
            {[
                { channel: 'email' as Channel, emoji: '✉️', title: 'Team email', desc: 'Manage and respond to team emails from your inbox.' },
                { channel: 'chat' as Channel, emoji: '💬', title: 'Chat', desc: 'Connect live chat and create chatbots to engage visitors.' },
                { channel: 'form' as Channel, emoji: '📋', title: 'Forms', desc: 'Connect and respond to forms from your inbox.' },
                { channel: 'whatsapp' as Channel, emoji: '📲', title: 'WhatsApp', desc: 'Start receiving WhatsApp conversations in your inbox.' },
                { channel: 'call' as Channel, emoji: '📞', title: 'Calling', desc: 'Start making and receiving calls in your inbox.' },
                { channel: 'sms' as Channel, emoji: '💌', title: 'SMS', desc: 'Send and receive SMS messages from customers.' },
            ].map(card => (
                <ChannelCard key={card.channel} {...card} onClick={onCreate} />
            ))}
        </div>
    </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const CRMInbox = () => {
    const currentUser = 'Admin User';
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterView>('all_open');
    const [showMore, setShowMore] = useState(false);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Conversation | null>(null);
    const [showCompose, setShowCompose] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('crm_conversations')
            .select('*')
            .order('updated_at', { ascending: false });
        setConversations(error ? [] : (data ?? []) as Conversation[]);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const filterCount = (f: FilterView) => {
        return conversations.filter(c => {
            if (f === 'unassigned') return !c.assigned_to && c.status === 'open';
            if (f === 'mine') return c.assigned_to === currentUser && c.status === 'open';
            if (f === 'all_open') return c.status === 'open';
            if (f === 'resolved') return c.status === 'resolved';
            if (f === 'spam') return c.status === 'spam';
            return true;
        }).length;
    };

    const displayed = conversations.filter(c => {
        const q = search.toLowerCase();
        if (q && !c.contact_name.toLowerCase().includes(q) && !c.subject.toLowerCase().includes(q)) return false;
        if (activeFilter === 'unassigned') return !c.assigned_to && c.status === 'open';
        if (activeFilter === 'mine') return c.assigned_to === currentUser && c.status === 'open';
        if (activeFilter === 'all_open') return c.status === 'open';
        if (activeFilter === 'resolved') return c.status === 'resolved';
        if (activeFilter === 'spam') return c.status === 'spam';
        return true;
    });

    const handleResolve = async (id: string) => {
        await supabase.from('crm_conversations').update({ status: 'resolved', updated_at: new Date().toISOString() }).eq('id', id);
        toast.success('Conversation resolved');
        if (selected?.id === id) setSelected(null);
        fetchData();
    };

    // When switching filters, clear selected if it doesn't belong to new filter
    const handleFilterChange = (f: FilterView) => {
        setActiveFilter(f);
        setSelected(prev => {
            if (!prev) return null;
            if (f === 'unassigned') return (!prev.assigned_to && prev.status === 'open') ? prev : null;
            if (f === 'mine') return (prev.assigned_to === currentUser && prev.status === 'open') ? prev : null;
            if (f === 'all_open') return prev.status === 'open' ? prev : null;
            if (f === 'resolved') return prev.status === 'resolved' ? prev : null;
            if (f === 'spam') return prev.status === 'spam' ? prev : null;
            return null;
        });
    };

    const hasConversations = conversations.length > 0;

    return (
        <div className="flex h-full overflow-hidden bg-[#F8FAFB]">

            {/* ── Left sidebar: filter list ── */}
            <div className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col">
                {/* Header */}
                <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
                    <Link to="/crm" className="flex items-center gap-2 font-bold text-slate-800 hover:text-[#0051A5] transition-colors group">
                        <ChevronLeft size={16} className="text-slate-400 group-hover:text-[#0051A5] transition-colors" />
                        <span className="text-sm">Inbox</span>
                    </Link>
                    <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><Search size={14} /></button>
                </div>

                {/* Filters */}
                <nav className="flex-1 py-2 overflow-y-auto">
                    {FILTERS.map(f => (
                        <button key={f.id} onClick={() => handleFilterChange(f.id)}
                            className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors
                                ${activeFilter === f.id ? 'font-bold text-[#0051A5] bg-blue-50' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}>
                            <span>{f.label}</span>
                            <span className={`text-xs ${activeFilter === f.id ? 'text-[#0051A5]' : 'text-slate-400'}`}>{filterCount(f.id)}</span>
                        </button>
                    ))}

                    {/* More */}
                    <button onClick={() => setShowMore(!showMore)}
                        className="w-full flex items-center gap-1.5 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors">
                        <ChevronRight size={14} className={`transition-transform ${showMore ? 'rotate-90' : ''}`} />
                        More
                    </button>
                    {showMore && MORE_FILTERS.map(f => (
                        <button key={f.id} onClick={() => handleFilterChange(f.id)}
                            className={`w-full flex items-center justify-between px-4 py-2 pl-8 text-sm transition-colors
                                ${activeFilter === f.id ? 'font-bold text-[#0051A5] bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <span>{f.label}</span>
                            <span className="text-xs text-slate-400">{filterCount(f.id)}</span>
                        </button>
                    ))}
                </nav>

                {/* Footer */}
                <div className="border-t border-slate-100 p-3 space-y-1">
                    <button onClick={() => setShowCompose(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold bg-[#0051A5] text-white rounded-xl hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20">
                        <Plus size={13} /> New conversation
                    </button>
                    <button onClick={() => setShowSettings(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                        <Settings size={12} /> Inbox Settings
                    </button>
                </div>
            </div>

            {/* ── Conversation list ── */}
            {hasConversations && (
                <div className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col">
                    {/* Search */}
                    <div className="px-3 py-2.5 border-b border-slate-100">
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search conversations…"
                                className="w-full pl-8 pr-8 py-2 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:ring-1 focus:ring-[#0051A5]/30 focus:border-[#0051A5] outline-none"
                                value={search} onChange={e => setSearch(e.target.value)} />
                            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X size={12} /></button>}
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm">
                                <div className="w-4 h-4 border-2 border-slate-200 border-t-[#0051A5] rounded-full animate-spin" />
                                Loading…
                            </div>
                        ) : displayed.length === 0 ? (
                            <div className="flex flex-col items-center py-12 gap-2 text-center px-4">
                                <Inbox size={28} className="text-slate-200" />
                                <p className="text-slate-400 text-xs">No conversations in this view</p>
                            </div>
                        ) : displayed.map(c => (
                            <ConvCard key={c.id} conv={c} active={selected?.id === c.id} onClick={() => setSelected(c)} />
                        ))}
                    </div>

                    {/* Actions bar */}
                    <div className="border-t border-slate-100 px-3 py-2 flex items-center gap-2">
                        <select className="flex-1 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none">
                            <option>Actions</option>
                            <option>Assign to me</option>
                            <option>Mark all read</option>
                            <option>Archive all</option>
                        </select>
                        <button onClick={fetchData} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                            <RefreshCw size={13} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Main content ── */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {!hasConversations ? (
                    <EmptyState onCreate={() => setShowCompose(true)} />
                ) : selected ? (
                    <ThreadView
                        conv={selected}
                        onClose={() => setSelected(null)}
                        onResolve={handleResolve}
                        currentUser={currentUser}
                    />
                ) : (
                    // No conversation selected state
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#F8FAFB]">
                        <div className="w-20 h-20 bg-white border border-slate-200 rounded-3xl flex items-center justify-center shadow-sm mb-4">
                            <MessageCircle size={32} className="text-slate-200" />
                        </div>
                        <p className="font-bold text-slate-700 mb-1">Select a conversation</p>
                        <p className="text-slate-400 text-sm mb-6">Choose a conversation from the list to start replying</p>
                        <button onClick={() => setShowCompose(true)}
                            className="flex items-center gap-2 bg-[#0051A5] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20">
                            <Plus size={15} /> New conversation
                        </button>
                    </div>
                )}
            </div>

            {showCompose && (
                <ComposeModal
                    onClose={() => setShowCompose(false)}
                    onSaved={async (newConv: Conversation) => {
                        await fetchData();
                        setActiveFilter('all_open');
                        setSelected(newConv);
                    }}
                />
            )}
            {showSettings && <InboxSettings onClose={() => setShowSettings(false)} />}
        </div>
    );
};

export default CRMInbox;
