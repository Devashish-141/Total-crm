import React, { useState, useEffect, useRef } from 'react';
import {
    X, Settings, Mail, MessageSquare, Phone, Globe,
    Users, Bell, Clock, Zap, Save, CheckCircle2,
    Plus, Trash2, ToggleLeft, ToggleRight, Hash,
    ChevronRight, Info, AlertCircle, RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type SettingsTab = 'general' | 'channels' | 'team' | 'routing' | 'notifications' | 'hours';

interface ChannelConfig {
    enabled: boolean;
    email_from?: string;
    email_signature?: string;
    whatsapp_number?: string;
    chat_greeting?: string;
    chat_color?: string;
}

interface TeamMember {
    name: string;
    role: string;
    available: boolean;
}

interface BusinessHour {
    day: string;
    open: boolean;
    from: string;
    to: string;
}

interface InboxSettingsData {
    // General
    inbox_name: string;
    description: string;
    default_assignee: string;
    timezone: string;

    // Channels
    channels: Record<string, ChannelConfig>;

    // Team
    team: TeamMember[];

    // Routing
    auto_assign: 'off' | 'round_robin' | 'load_balanced';
    max_conversations: number;
    reopen_on_reply: boolean;

    // Notifications
    notify_email: boolean;
    notify_browser: boolean;
    notify_unassigned: boolean;
    notify_assigned_to_me: boolean;
    notify_mentioned: boolean;

    // Business Hours
    business_hours: BusinessHour[];
    respond_outside_hours: boolean;
    out_of_hours_message: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_HOURS: BusinessHour[] = [
    { day: 'Monday', open: true, from: '09:00', to: '18:00' },
    { day: 'Tuesday', open: true, from: '09:00', to: '18:00' },
    { day: 'Wednesday', open: true, from: '09:00', to: '18:00' },
    { day: 'Thursday', open: true, from: '09:00', to: '18:00' },
    { day: 'Friday', open: true, from: '09:00', to: '18:00' },
    { day: 'Saturday', open: false, from: '10:00', to: '15:00' },
    { day: 'Sunday', open: false, from: '10:00', to: '14:00' },
];

const DEFAULT_SETTINGS: InboxSettingsData = {
    inbox_name: 'TN Solar Inbox',
    description: 'Main customer support inbox for TN Solar Solutions',
    default_assignee: 'Admin User',
    timezone: 'Asia/Kolkata',
    channels: {
        email: { enabled: true, email_from: 'support@tnsolar.in', email_signature: 'TN Solar Solutions\nCustomer Support' },
        whatsapp: { enabled: false, whatsapp_number: '' },
        chat: { enabled: false, chat_greeting: 'Hi! How can we help you today?', chat_color: '#0051A5' },
        form: { enabled: false },
        call: { enabled: false },
        sms: { enabled: false },
    },
    team: [
        { name: 'Admin User', role: 'Admin', available: true },
        { name: 'Sales Executive', role: 'Agent', available: true },
        { name: 'Manager', role: 'Supervisor', available: false },
    ],
    auto_assign: 'round_robin',
    max_conversations: 10,
    reopen_on_reply: true,
    notify_email: true,
    notify_browser: true,
    notify_unassigned: true,
    notify_assigned_to_me: true,
    notify_mentioned: true,
    business_hours: DEFAULT_HOURS,
    respond_outside_hours: true,
    out_of_hours_message: "We're currently closed. Our working hours are Mon–Fri 9am–6pm IST. We'll get back to you soon!",
};

// ─── Channel icons ─────────────────────────────────────────────────────────────
const CHANNEL_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; description: string }> = {
    email: { label: 'Team Email', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Send and receive emails from customers' },
    whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50', description: 'Receive WhatsApp messages from customers' },
    chat: { label: 'Live Chat', icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-50', description: 'Chat widget for your website' },
    form: { label: 'Contact Forms', icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50', description: 'Collect inquiries from web forms' },
    call: { label: 'Phone Calls', icon: Phone, color: 'text-rose-600', bg: 'bg-rose-50', description: 'Receive and log phone calls' },
    sms: { label: 'SMS', icon: Hash, color: 'text-cyan-600', bg: 'bg-cyan-50', description: 'Send and receive SMS messages' },
};

const STORAGE_KEY = 'tn_solar_inbox_settings';

// ─── Shared input styles ───────────────────────────────────────────────────────
const ic = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white transition-all';

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ on, onChange }: { on: boolean; onChange(v: boolean): void }) => (
    <button onClick={() => onChange(!on)} className="shrink-0">
        {on
            ? <ToggleRight size={26} className="text-[#0051A5] transition-colors" />
            : <ToggleLeft size={26} className="text-slate-300  transition-colors" />}
    </button>
);

// ─── Section Label ─────────────────────────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{children}</label>
);

// ─── Tab: General ─────────────────────────────────────────────────────────────
const GeneralTab = ({ s, setS }: { s: InboxSettingsData; setS: React.Dispatch<React.SetStateAction<InboxSettingsData>> }) => (
    <div className="space-y-5">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
            <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700">Changes to inbox settings apply immediately to all agents.</p>
        </div>
        <div><Label>Inbox Name</Label><input type="text" className={ic} value={s.inbox_name} onChange={e => setS(p => ({ ...p, inbox_name: e.target.value }))} /></div>
        <div><Label>Description</Label><textarea rows={2} className={`${ic} resize-none`} value={s.description} onChange={e => setS(p => ({ ...p, description: e.target.value }))} /></div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <Label>Default Assignee</Label>
                <select className={ic} value={s.default_assignee} onChange={e => setS(p => ({ ...p, default_assignee: e.target.value }))}>
                    <option>Unassigned</option>
                    <option>Admin User</option>
                    <option>Sales Executive</option>
                    <option>Manager</option>
                </select>
            </div>
            <div>
                <Label>Timezone</Label>
                <select className={ic} value={s.timezone} onChange={e => setS(p => ({ ...p, timezone: e.target.value }))}>
                    {['Asia/Kolkata', 'Asia/Dubai', 'UTC', 'America/New_York', 'Europe/London'].map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
            </div>
        </div>
    </div>
);

// ─── Tab: Channels ─────────────────────────────────────────────────────────────
const ChannelsTab = ({ s, setS }: { s: InboxSettingsData; setS: React.Dispatch<React.SetStateAction<InboxSettingsData>> }) => {
    const updateCh = (ch: string, patch: Partial<ChannelConfig>) =>
        setS(p => ({ ...p, channels: { ...p.channels, [ch]: { ...p.channels[ch], ...patch } } }));

    return (
        <div className="space-y-4">
            {Object.entries(CHANNEL_META).map(([key, meta]) => {
                const cfg = s.channels[key] ?? { enabled: false };
                const Icon = meta.icon;
                return (
                    <div key={key} className={`border rounded-2xl overflow-hidden transition-all ${cfg.enabled ? 'border-[#0051A5]/30 shadow-sm' : 'border-slate-200'}`}>
                        {/* Channel header */}
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center`}>
                                    <Icon size={18} className={meta.color} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-800">{meta.label}</p>
                                    <p className="text-xs text-slate-400">{meta.description}</p>
                                </div>
                            </div>
                            <Toggle on={cfg.enabled} onChange={v => updateCh(key, { enabled: v })} />
                        </div>

                        {/* Expanded settings */}
                        {cfg.enabled && (
                            <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-3">
                                {key === 'email' && <>
                                    <div><Label>From Email</Label><input type="email" className={ic} placeholder="support@yourdomain.com" value={cfg.email_from ?? ''} onChange={e => updateCh(key, { email_from: e.target.value })} /></div>
                                    <div><Label>Email Signature</Label><textarea rows={2} className={`${ic} resize-none`} placeholder="Your Company Name" value={cfg.email_signature ?? ''} onChange={e => updateCh(key, { email_signature: e.target.value })} /></div>
                                </>}
                                {key === 'whatsapp' && <>
                                    <div><Label>WhatsApp Number (with country code)</Label><input type="tel" className={ic} placeholder="+91 99999 99999" value={cfg.whatsapp_number ?? ''} onChange={e => updateCh(key, { whatsapp_number: e.target.value })} /></div>
                                </>}
                                {key === 'chat' && <>
                                    <div><Label>Welcome Greeting</Label><input type="text" className={ic} placeholder="Hi! How can we help?" value={cfg.chat_greeting ?? ''} onChange={e => updateCh(key, { chat_greeting: e.target.value })} /></div>
                                    <div><Label>Widget Color</Label>
                                        <div className="flex items-center gap-3">
                                            <input type="color" className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200" value={cfg.chat_color ?? '#0051A5'} onChange={e => updateCh(key, { chat_color: e.target.value })} />
                                            <input type="text" className={`${ic} flex-1`} value={cfg.chat_color ?? '#0051A5'} onChange={e => updateCh(key, { chat_color: e.target.value })} />
                                        </div>
                                    </div>
                                </>}
                                {(key === 'form' || key === 'call' || key === 'sms') && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl p-3">
                                        <AlertCircle size={14} className="text-amber-500 shrink-0" />
                                        Integration setup required. Contact support to configure.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ─── Tab: Team ────────────────────────────────────────────────────────────────
const TeamTab = ({ s, setS }: { s: InboxSettingsData; setS: React.Dispatch<React.SetStateAction<InboxSettingsData>> }) => {
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('Agent');

    const addMember = () => {
        if (!newName.trim()) return;
        setS(p => ({ ...p, team: [...p.team, { name: newName.trim(), role: newRole, available: true }] }));
        setNewName(''); setRole('Agent'); setAdding(false);
    };

    const setRole = (r: string) => setNewRole(r);

    const removeMember = (i: number) =>
        setS(p => ({ ...p, team: p.team.filter((_, idx) => idx !== i) }));

    const toggleAvail = (i: number) =>
        setS(p => ({ ...p, team: p.team.map((m, idx) => idx === i ? { ...m, available: !m.available } : m) }));

    const p = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
    const initial = (name: string) => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

    return (
        <div className="space-y-4">
            {s.team.map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-2xl hover:border-slate-300 transition-all">
                    <span className={`w-9 h-9 rounded-full ${p[m.name.charCodeAt(0) % p.length]} inline-flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                        {initial(m.name)}
                    </span>
                    <div className="flex-1">
                        <p className="font-semibold text-sm text-slate-800">{m.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-400">{m.role}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${m.available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {m.available ? 'Available' : 'Away'}
                            </span>
                        </div>
                    </div>
                    <Toggle on={m.available} onChange={() => toggleAvail(i)} />
                    <button onClick={() => removeMember(i)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}

            {adding ? (
                <div className="p-4 border border-dashed border-[#0051A5]/40 bg-blue-50/30 rounded-2xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div><Label>Name</Label><input autoFocus type="text" className={ic} placeholder="Agent name" value={newName} onChange={e => setNewName(e.target.value)} /></div>
                        <div><Label>Role</Label>
                            <select className={ic} value={newRole} onChange={e => setRole(e.target.value)}>
                                {['Admin', 'Agent', 'Supervisor'].map(r => <option key={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={addMember} className="flex items-center gap-1.5 px-4 py-2 bg-[#0051A5] text-white rounded-xl text-xs font-bold hover:bg-[#003d7a] transition-all">
                            <CheckCircle2 size={13} /> Add member
                        </button>
                        <button onClick={() => setAdding(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50">Cancel</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setAdding(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-semibold text-slate-400 hover:border-[#0051A5]/40 hover:text-[#0051A5] hover:bg-blue-50/30 transition-all">
                    <Plus size={15} /> Add team member
                </button>
            )}
        </div>
    );
};

// ─── Tab: Routing ─────────────────────────────────────────────────────────────
const RoutingTab = ({ s, setS }: { s: InboxSettingsData; setS: React.Dispatch<React.SetStateAction<InboxSettingsData>> }) => {
    const opts: { id: InboxSettingsData['auto_assign']; label: string; desc: string }[] = [
        { id: 'off', label: 'Off', desc: 'Conversations are not automatically assigned.' },
        { id: 'round_robin', label: 'Round Robin', desc: 'Conversations are assigned evenly among available agents.' },
        { id: 'load_balanced', label: 'Load Balanced', desc: 'Conversations go to the agent with fewest open items.' },
    ];
    return (
        <div className="space-y-5">
            <div>
                <Label>Auto-assignment Mode</Label>
                <div className="space-y-2 mt-2">
                    {opts.map(o => (
                        <label key={o.id} className={`flex items-start gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all
                            ${s.auto_assign === o.id ? 'border-[#0051A5]/40 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300'}`}>
                            <input type="radio" name="auto_assign" className="mt-0.5 accent-[#0051A5]" checked={s.auto_assign === o.id} onChange={() => setS(p => ({ ...p, auto_assign: o.id }))} />
                            <div>
                                <p className="font-bold text-sm text-slate-800">{o.label}</p>
                                <p className="text-xs text-slate-400">{o.desc}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </div>
            <div>
                <Label>Max conversations per agent</Label>
                <div className="flex items-center gap-3">
                    <input type="range" min={1} max={50} className="flex-1 accent-[#0051A5]" value={s.max_conversations} onChange={e => setS(p => ({ ...p, max_conversations: +e.target.value }))} />
                    <span className="w-10 text-center text-sm font-bold text-[#0051A5]">{s.max_conversations}</span>
                </div>
            </div>
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl">
                <div>
                    <p className="font-semibold text-sm text-slate-800">Reopen on customer reply</p>
                    <p className="text-xs text-slate-400 mt-0.5">Resolved conversations reopen when customer sends a new message</p>
                </div>
                <Toggle on={s.reopen_on_reply} onChange={v => setS(p => ({ ...p, reopen_on_reply: v }))} />
            </div>
        </div>
    );
};

// ─── Tab: Notifications ───────────────────────────────────────────────────────
const NotificationsTab = ({ s, setS }: { s: InboxSettingsData; setS: React.Dispatch<React.SetStateAction<InboxSettingsData>> }) => {
    const rows: { key: keyof InboxSettingsData; label: string; desc: string }[] = [
        { key: 'notify_email', label: 'Email notifications', desc: 'Receive email notifications for new conversations' },
        { key: 'notify_browser', label: 'Browser notifications', desc: 'Show desktop push notifications' },
        { key: 'notify_unassigned', label: 'Unassigned conversations', desc: 'Notify when a conversation is unassigned' },
        { key: 'notify_assigned_to_me', label: 'Assigned to me', desc: 'Notify when a conversation is assigned to you' },
        { key: 'notify_mentioned', label: 'Mentions', desc: 'Notify when you are @mentioned in a conversation' },
    ];
    return (
        <div className="space-y-3">
            {rows.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl hover:border-slate-300 transition-all">
                    <div>
                        <p className="font-semibold text-sm text-slate-800">{label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </div>
                    <Toggle on={s[key] as boolean} onChange={v => setS(p => ({ ...p, [key]: v }))} />
                </div>
            ))}
        </div>
    );
};

// ─── Tab: Business Hours ──────────────────────────────────────────────────────
const HoursTab = ({ s, setS }: { s: InboxSettingsData; setS: React.Dispatch<React.SetStateAction<InboxSettingsData>> }) => {
    const updateHour = (i: number, patch: Partial<BusinessHour>) =>
        setS(p => ({ ...p, business_hours: p.business_hours.map((h, idx) => idx === i ? { ...h, ...patch } : h) }));

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {s.business_hours.map((h, i) => (
                    <div key={h.day} className={`flex items-center gap-3 p-3 border rounded-xl transition-all
                        ${h.open ? 'border-slate-200' : 'border-slate-100 bg-slate-50/50 opacity-60'}`}>
                        <Toggle on={h.open} onChange={v => updateHour(i, { open: v })} />
                        <span className="text-sm font-semibold text-slate-700 w-24 shrink-0">{h.day}</span>
                        {h.open ? (<>
                            <div className="flex items-center gap-2 flex-1">
                                <input type="time" className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#0051A5] focus:ring-1 focus:ring-[#0051A5]/20"
                                    value={h.from} onChange={e => updateHour(i, { from: e.target.value })} />
                                <span className="text-slate-400 text-xs">to</span>
                                <input type="time" className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#0051A5] focus:ring-1 focus:ring-[#0051A5]/20"
                                    value={h.to} onChange={e => updateHour(i, { to: e.target.value })} />
                            </div>
                        </>) : (
                            <span className="text-xs text-slate-400 flex-1">Closed</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl">
                    <div>
                        <p className="font-semibold text-sm text-slate-800">Respond outside business hours</p>
                        <p className="text-xs text-slate-400 mt-0.5">Show out-of-hours message to customers</p>
                    </div>
                    <Toggle on={s.respond_outside_hours} onChange={v => setS(p => ({ ...p, respond_outside_hours: v }))} />
                </div>
                {s.respond_outside_hours && (
                    <div>
                        <Label>Out-of-hours message</Label>
                        <textarea rows={3} className={`${ic} resize-none`}
                            placeholder="We're currently closed…"
                            value={s.out_of_hours_message}
                            onChange={e => setS(p => ({ ...p, out_of_hours_message: e.target.value }))} />
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
interface Props { onClose(): void }

const InboxSettings = ({ onClose }: Props) => {
    const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'channels', label: 'Channels', icon: Zap },
        { id: 'team', label: 'Team', icon: Users },
        { id: 'routing', label: 'Routing', icon: RefreshCw },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'hours', label: 'Business Hours', icon: Clock },
    ];

    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [settings, setSettings] = useState<InboxSettingsData>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const base = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
            return saved ? { ...base, ...JSON.parse(saved) } : base;
        } catch { return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); }
    });
    const [saved, setSaved] = useState(true); // Start as saved since we just loaded
    const isFirstMount = useRef(true);

    // Set saved to false when settings change, but skip the first mount
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        setSaved(false);
    }, [settings]);

    const handleSave = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            setSaved(true);
            toast.success('Inbox settings saved!');
            setTimeout(() => setSaved(false), 3000);
        } catch {
            toast.error('Could not save settings');
        }
    };

    const handleReset = () => {
        if (!window.confirm('Reset all inbox settings to defaults?')) return;

        const freshDefaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        localStorage.removeItem(STORAGE_KEY);
        setSettings(freshDefaults);
        setSaved(true); // Since storage is cleared, reloading would lead to defaults anyway
        toast.success('Settings reset to defaults');
    };

    const currentTab = TABS.find(t => t.id === activeTab)!;

    return (
        <div className="fixed inset-0 z-[3000] flex items-stretch">
            {/* Overlay */}
            <div className="flex-1 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="w-[720px] max-w-[95vw] bg-white flex flex-col shadow-2xl border-l border-slate-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0051A5]/10 flex items-center justify-center">
                            <Settings size={18} className="text-[#0051A5]" />
                        </div>
                        <div>
                            <h2 className="font-extrabold text-slate-900 text-base">Inbox Settings</h2>
                            <p className="text-xs text-slate-400 mt-0.5">{settings.inbox_name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            <RefreshCw size={12} /> Reset
                        </button>
                        <button onClick={handleSave}
                            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all shadow-md
                                ${saved ? 'bg-emerald-500 text-white shadow-emerald-900/20' : 'bg-[#0051A5] text-white shadow-blue-900/20 hover:bg-[#003d7a]'}`}>
                            {saved ? <><CheckCircle2 size={13} /> Saved!</> : <><Save size={13} /> Save settings</>}
                        </button>
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body: sidebar + content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left nav */}
                    <div className="w-44 shrink-0 border-r border-slate-100 py-3 flex flex-col gap-0.5 overflow-y-auto">
                        {TABS.map(t => {
                            const Icon = t.icon;
                            return (
                                <button key={t.id} onClick={() => setActiveTab(t.id)}
                                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-all text-left
                                        ${activeTab === t.id
                                            ? 'text-[#0051A5] bg-blue-50 border-r-2 border-r-[#0051A5]'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                                    <Icon size={14} />
                                    {t.label}
                                    {activeTab === t.id && <ChevronRight size={12} className="ml-auto opacity-50" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content area */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <h3 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                            <currentTab.icon size={16} className="text-[#0051A5]" />
                            {currentTab.label}
                        </h3>
                        <p className="text-xs text-slate-400 mb-5 pl-6">
                            {activeTab === 'general' && 'Configure basic inbox information and defaults.'}
                            {activeTab === 'channels' && 'Connect and configure communication channels.'}
                            {activeTab === 'team' && 'Manage agents assigned to this inbox.'}
                            {activeTab === 'routing' && 'Control how conversations are assigned to agents.'}
                            {activeTab === 'notifications' && 'Manage when and how you get notified.'}
                            {activeTab === 'hours' && 'Set the working hours for this inbox.'}
                        </p>

                        {activeTab === 'general' && <GeneralTab s={settings} setS={setSettings} />}
                        {activeTab === 'channels' && <ChannelsTab s={settings} setS={setSettings} />}
                        {activeTab === 'team' && <TeamTab s={settings} setS={setSettings} />}
                        {activeTab === 'routing' && <RoutingTab s={settings} setS={setSettings} />}
                        {activeTab === 'notifications' && <NotificationsTab s={settings} setS={setSettings} />}
                        {activeTab === 'hours' && <HoursTab s={settings} setS={setSettings} />}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <p className="text-xs text-slate-400">
                        {saved ? '✓ All changes saved' : 'Unsaved changes — click Save to apply'}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors">Close</button>
                        <button onClick={handleSave}
                            className="flex items-center gap-1.5 px-5 py-2 bg-[#0051A5] text-white rounded-xl text-xs font-bold hover:bg-[#003d7a] transition-all shadow-md shadow-blue-900/20">
                            <Save size={13} /> Save settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InboxSettings;
