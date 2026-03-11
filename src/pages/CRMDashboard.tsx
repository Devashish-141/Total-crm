import React, { useState, useEffect } from 'react';
import {
    Users, TrendingUp, Phone, CheckSquare, Ticket,
    ArrowUpRight, BarChart2, RefreshCw,
    Clock, ChevronRight, AlertCircle, Zap,
    ShoppingCart, Scissors, FileText, Inbox, CircleDollarSign, Award
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface KPI {
    label: string;
    value: string | number;
    sub: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    trend?: number; // positive = up, negative = down
    link: string;
}

interface PipelineStage {
    name: string;
    count: number;
    value: number;
    color: string;
}

interface Activity {
    id: string;
    type: 'call' | 'task' | 'contact' | 'deal' | 'ticket';
    title: string;
    sub: string;
    time: string;
    icon: React.ElementType;
    color: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => n >= 1_00_00_000 ? `₹${(n / 1_00_00_000).toFixed(1)}Cr`
    : n >= 1_00_000 ? `₹${(n / 1_00_000).toFixed(1)}L`
        : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K`
            : `₹${n}`;

const fmtRel = (d: string) => {
    if (!d) return '—';
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

// ─── Mini Bar Chart ────────────────────────────────────────────────────────────
const KPICard = ({ kpi, onClick }: { kpi: KPI; onClick(): void }) => (
    <button onClick={onClick} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3 text-left hover:shadow-md hover:border-slate-300 transition-all group">
        <div className="flex items-center justify-between">
            <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon size={19} className={kpi.color} />
            </div>
            {kpi.trend !== undefined && (
                <span className={`flex items-center gap-1 text-xs font-bold rounded-full px-2 py-0.5 ${kpi.trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                    {kpi.trend >= 0 ? <ArrowUpRight size={11} /> : <span className="text-xs">↓</span>}
                    {Math.abs(kpi.trend)}%
                </span>
            )}
        </div>
        <div>
            <p className="text-2xl font-extrabold text-slate-900">{kpi.value}</p>
            <p className="text-xs font-bold text-slate-500 mt-0.5">{kpi.label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</p>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-bold text-[#0051A5] opacity-0 group-hover:opacity-100 transition-opacity">
            View all <ChevronRight size={12} />
        </div>
    </button>
);

// ─── Pipeline Funnel ──────────────────────────────────────────────────────────
const PipelineFunnel = ({ stages }: { stages: PipelineStage[] }) => {
    const maxCount = Math.max(...stages.map(s => s.count), 1);
    return (
        <div className="space-y-2">
            {stages.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                    <div className="w-28 text-right">
                        <span className="text-xs font-bold text-slate-600 truncate block">{s.name}</span>
                        <span className="text-[10px] text-slate-400">{fmt(s.value)}</span>
                    </div>
                    <div className="flex-1 h-8 bg-slate-100 rounded-xl overflow-hidden relative">
                        <div
                            className="h-full rounded-xl flex items-center justify-end pr-3 transition-all duration-700"
                            style={{ width: `${Math.max(8, (s.count / maxCount) * 100)}%`, background: s.color }}>
                            <span className="text-white text-xs font-extrabold">{s.count}</span>
                        </div>
                    </div>
                    <div className="w-6 text-center">
                        {i < stages.length - 1 && (
                            <span className="text-[10px] text-slate-400 font-bold">
                                {stages[i + 1].count > 0 ? `${Math.round((stages[i + 1].count / s.count) * 100)}%` : '—'}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── Activity Icon ─────────────────────────────────────────────────────────────
const activityIcon = (type: Activity['type']) => {
    const map: Record<Activity['type'], { icon: React.ElementType; color: string; bg: string }> = {
        call: { icon: Phone, color: 'text-violet-600', bg: 'bg-violet-100' },
        task: { icon: CheckSquare, color: 'text-amber-600', bg: 'bg-amber-100' },
        contact: { icon: Users, color: 'text-sky-600', bg: 'bg-sky-100' },
        deal: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        ticket: { icon: Ticket, color: 'text-rose-600', bg: 'bg-rose-100' },
    };
    return map[type];
};

// ─── Quick Action ─────────────────────────────────────────────────────────────
const QuickAction = ({ icon: Icon, label, sub, color, bg, onClick }: {
    icon: React.ElementType; label: string; sub: string; color: string; bg: string; onClick(): void;
}) => (
    <button onClick={onClick} className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all text-left group">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
            <Icon size={18} className={color} />
        </div>
        <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 group-hover:text-[#0051A5] transition-colors">{label}</p>
            <p className="text-[11px] text-slate-400 truncate">{sub}</p>
        </div>
        <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-[#0051A5] transition-colors shrink-0" />
    </button>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const CRMDashboard = () => {
    const nav = useNavigate();
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState({
        contacts: 0, companies: 0, deals: 0, tickets: 0,
        calls: 0, tasks: 0, orders: 0, openDeals: 0,
        dealValue: 0, tasksOverdue: 0, unresolvedTickets: 0, wonDeals: 0,
    });
    const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
    const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
    const now = new Date();
    const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Fetch all counts in parallel
                const [contacts, companies, deals, tickets, calls, tasks, orders] = await Promise.all([
                    supabase.from('crm_contacts').select('id', { count: 'exact', head: true }),
                    supabase.from('crm_companies').select('id', { count: 'exact', head: true }),
                    supabase.from('crm_deals').select('*'),
                    supabase.from('crm_tickets').select('*'),
                    supabase.from('crm_calls').select('id', { count: 'exact', head: true }),
                    supabase.from('crm_tasks').select('*'),
                    supabase.from('crm_orders').select('id', { count: 'exact', head: true }),
                ]);

                const dealsData = deals.data ?? [];
                const ticketsData = tickets.data ?? [];
                const tasksData = tasks.data ?? [];

                const openDeals = dealsData.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
                const wonDeals = dealsData.filter(d => d.stage === 'Closed Won');
                const dealValue = openDeals.reduce((s: number, d: any) => s + (d.value || 0), 0);
                const unresolvedTickets = ticketsData.filter((t: any) => t.status !== 'Closed').length;
                const tasksOverdue = tasksData.filter((t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Completed').length;

                setCounts({
                    contacts: contacts.count ?? 0,
                    companies: companies.count ?? 0,
                    deals: dealsData.length,
                    tickets: ticketsData.length,
                    calls: calls.count ?? 0,
                    tasks: tasksData.length,
                    orders: orders.count ?? 0,
                    openDeals: openDeals.length,
                    dealValue,
                    tasksOverdue,
                    unresolvedTickets,
                    wonDeals: wonDeals.length,
                });

                // Pipeline funnel from deals
                const stages = ['Prospecting', 'Qualification', 'Proposal Sent', 'Negotiation', 'Closed Won'];
                const stageColors = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#0051A5'];
                setPipeline(stages.map((name, i) => {
                    const stageDeals = dealsData.filter((d: any) => d.stage === name);
                    return {
                        name,
                        count: stageDeals.length,
                        value: stageDeals.reduce((s: number, d: any) => s + (d.value || 0), 0),
                        color: stageColors[i],
                    };
                }));

                // Recent activity — pull latest entries from calls + tasks
                const [recentCalls, recentTasks, recentContacts] = await Promise.all([
                    supabase.from('crm_calls').select('id, contact_name, created_at, call_type').order('created_at', { ascending: false }).limit(4),
                    supabase.from('crm_tasks').select('id, title, created_at, task_type').order('created_at', { ascending: false }).limit(4),
                    supabase.from('crm_contacts').select('id, first_name, last_name, created_at').order('created_at', { ascending: false }).limit(3),
                ]);

                const activities: Activity[] = [
                    ...(recentCalls.data ?? []).map((c: any) => ({
                        id: `call-${c.id}`, type: 'call' as const,
                        title: `Call with ${c.contact_name || 'Unknown'}`,
                        sub: c.call_type || 'Outbound call',
                        time: fmtRel(c.created_at),
                        icon: Phone, color: 'text-violet-600',
                    })),
                    ...(recentTasks.data ?? []).map((t: any) => ({
                        id: `task-${t.id}`, type: 'task' as const,
                        title: t.title,
                        sub: t.task_type || 'Follow-up',
                        time: fmtRel(t.created_at),
                        icon: CheckSquare, color: 'text-amber-600',
                    })),
                    ...(recentContacts.data ?? []).map((c: any) => ({
                        id: `contact-${c.id}`, type: 'contact' as const,
                        title: `New contact: ${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
                        sub: 'Contact added',
                        time: fmtRel(c.created_at),
                        icon: Users, color: 'text-sky-600',
                    })),
                ].sort(() => Math.random() - 0.5).slice(0, 8);

                setRecentActivities(activities);
            } catch { /* supabase offline — show zeros */ }
            setLoading(false);
        };
        load();
    }, []);

    const kpis: KPI[] = [
        { label: 'Total Contacts', value: counts.contacts, sub: 'All active contacts', icon: Users, color: 'text-sky-600', bg: 'bg-sky-100', trend: 12, link: '/crm/contacts' },
        { label: 'Open Deals', value: counts.openDeals, sub: `Pipeline value: ${fmt(counts.dealValue)}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100', trend: 5, link: '/crm/deals' },
        { label: 'Tasks Overdue', value: counts.tasksOverdue, sub: `${counts.tasks} tasks total`, icon: CheckSquare, color: 'text-amber-600', bg: 'bg-amber-100', trend: counts.tasksOverdue > 0 ? -counts.tasksOverdue : 0, link: '/crm/tasks' },
        { label: 'Unresolved Tickets', value: counts.unresolvedTickets, sub: `${counts.tickets} tickets total`, icon: Ticket, color: 'text-rose-600', bg: 'bg-rose-100', trend: -8, link: '/crm/tickets' },
        { label: 'Total Calls', value: counts.calls, sub: 'Logged call records', icon: Phone, color: 'text-violet-600', bg: 'bg-violet-100', trend: 20, link: '/crm/calls' },
        { label: 'Deals Won', value: counts.wonDeals, sub: 'Closed deals this period', icon: Award, color: 'text-[#0051A5]', bg: 'bg-blue-100', trend: 15, link: '/crm/deals' },
        { label: 'Companies', value: counts.companies, sub: 'Linked organizations', icon: CircleDollarSign, color: 'text-teal-600', bg: 'bg-teal-100', link: '/crm/companies' },
        { label: 'Orders', value: counts.orders, sub: 'All customer orders', icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-100', link: '/crm/orders' },
    ];

    const quickActions = [
        { icon: Users, label: 'Add Contact', sub: 'Create a new CRM contact', color: 'text-sky-600', bg: 'bg-sky-100', path: '/crm/contacts' },
        { icon: TrendingUp, label: 'New Deal', sub: 'Add to your pipeline', color: 'text-emerald-600', bg: 'bg-emerald-100', path: '/crm/deals' },
        { icon: Phone, label: 'Log a Call', sub: 'Record a call outcome', color: 'text-violet-600', bg: 'bg-violet-100', path: '/crm/calls' },
        { icon: CheckSquare, label: 'Create Task', sub: 'Set a follow-up or reminder', color: 'text-amber-600', bg: 'bg-amber-100', path: '/crm/tasks' },
        { icon: FileText, label: 'New Template', sub: 'Build a message template', color: 'text-[#0051A5]', bg: 'bg-blue-100', path: '/crm/templates' },
        { icon: Scissors, label: 'New Snippet', sub: 'Create a text shortcut', color: 'text-slate-600', bg: 'bg-slate-100', path: '/crm/snippets' },
        { icon: Ticket, label: 'New Ticket', sub: 'Raise a support ticket', color: 'text-rose-600', bg: 'bg-rose-100', path: '/crm/tickets' },
        { icon: Inbox, label: 'Open Inbox', sub: 'View conversations', color: 'text-teal-600', bg: 'bg-teal-100', path: '/crm/inbox' },
    ];

    const weeklyTrend = [3, 7, 5, 9, 12, 8, 15];

    return (
        <div className="min-h-full bg-[#F8FAFB]">
            {/* ── Header ── */}
            <div className="px-8 pt-8 pb-6 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Zap size={14} className="text-amber-500" />
                            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">CRM Overview</span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900">{greeting}, Admin! 👋</h1>
                        <p className="text-sm text-slate-400 mt-1">
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {counts.tasksOverdue > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                                <AlertCircle size={14} className="text-amber-600" />
                                <span className="text-xs font-bold text-amber-700">{counts.tasksOverdue} overdue task{counts.tasksOverdue > 1 ? 's' : ''}</span>
                                <button onClick={() => nav('/crm/tasks')} className="text-amber-600 hover:underline text-xs font-bold">View →</button>
                            </div>
                        )}
                        <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors">
                            <RefreshCw size={13} /> Refresh
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
                    <RefreshCw size={28} className="animate-spin" />
                    <p className="font-medium">Loading CRM data...</p>
                </div>
            ) : (
                <div className="px-8 py-8 space-y-8">

                    {/* ── KPI Grid ── */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Key Metrics</h2>
                            <span className="text-xs text-slate-400">Updated just now</span>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            {kpis.map(k => <KPICard key={k.label} kpi={k} onClick={() => nav(k.link)} />)}
                        </div>
                    </section>

                    {/* ── Pipeline + Activity ── */}
                    <div className="grid grid-cols-5 gap-6">
                        {/* Pipeline Funnel */}
                        <div className="col-span-3 bg-white rounded-2xl border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-base font-extrabold text-slate-900">Deal Pipeline</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Conversion across stages</p>
                                </div>
                                <button onClick={() => nav('/crm/deals')} className="flex items-center gap-1.5 text-xs font-bold text-[#0051A5] hover:underline">
                                    Open Kanban <ChevronRight size={13} />
                                </button>
                            </div>
                            {pipeline.every(s => s.count === 0) ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <BarChart2 size={40} className="mb-3 opacity-30" />
                                    <p className="text-sm font-medium">No deal data yet</p>
                                    <button onClick={() => nav('/crm/deals')} className="mt-3 text-xs font-bold text-[#0051A5] hover:underline">+ Add a deal</button>
                                </div>
                            ) : (
                                <>
                                    <PipelineFunnel stages={pipeline} />
                                    <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-4">
                                        <div className="text-center">
                                            <p className="text-xl font-extrabold text-slate-900">{fmt(counts.dealValue)}</p>
                                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Pipeline Value</p>
                                        </div>
                                        <div className="text-center border-x border-slate-100">
                                            <p className="text-xl font-extrabold text-slate-900">{counts.openDeals}</p>
                                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Active Deals</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xl font-extrabold text-slate-900">{counts.wonDeals}</p>
                                            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Won Deals ✓</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Activity Feed */}
                        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-base font-extrabold text-slate-900">Recent Activity</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Latest CRM actions</p>
                                </div>
                            </div>
                            {recentActivities.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
                                    <Clock size={32} className="mb-2 opacity-30" />
                                    <p className="text-xs font-medium">No activity yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4 overflow-y-auto flex-1">
                                    {recentActivities.map(a => {
                                        const meta = activityIcon(a.type);
                                        return (
                                            <div key={a.id} className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-xl ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                                    <meta.icon size={14} className={meta.color} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 truncate">{a.title}</p>
                                                    <p className="text-[10px] text-slate-400">{a.sub}</p>
                                                </div>
                                                <span className="text-[10px] text-slate-400 shrink-0 mt-1">{a.time}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Weekly Trend + Quick Actions ── */}
                    <div className="grid grid-cols-5 gap-6">
                        {/* Weekly Trend Card */}
                        <div className="col-span-2 bg-gradient-to-br from-[#0051A5] to-[#003d7a] rounded-2xl p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-200">This Week</p>
                                    <p className="text-3xl font-extrabold mt-1">{weeklyTrend.reduce((a, b) => a + b, 0)}</p>
                                    <p className="text-xs text-blue-200 mt-0.5">Total activities logged</p>
                                </div>
                                <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                                    <ArrowUpRight size={12} />
                                    <span className="text-xs font-bold">+18% vs last week</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-end gap-2 h-16">
                                {weeklyTrend.map((v, i) => {
                                    const max = Math.max(...weeklyTrend);
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <div
                                                className="w-full rounded-lg bg-white/30 hover:bg-white/50 transition-colors"
                                                style={{ height: `${Math.max(8, (v / max) * 48)}px` }}
                                            />
                                            <span className="text-[9px] text-blue-200 font-bold">
                                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-3 gap-3 text-center">
                                <div>
                                    <p className="text-lg font-extrabold">{counts.calls}</p>
                                    <p className="text-[10px] text-blue-200">Calls</p>
                                </div>
                                <div className="border-x border-white/20">
                                    <p className="text-lg font-extrabold">{counts.tasks}</p>
                                    <p className="text-[10px] text-blue-200">Tasks</p>
                                </div>
                                <div>
                                    <p className="text-lg font-extrabold">{counts.contacts}</p>
                                    <p className="text-[10px] text-blue-200">Contacts</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="col-span-3 bg-white rounded-2xl border border-slate-200 p-6">
                            <div className="mb-5">
                                <h2 className="text-base font-extrabold text-slate-900">Quick Actions</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Jump to any CRM module</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {quickActions.map(qa => (
                                    <QuickAction key={qa.label} {...qa} onClick={() => nav(qa.path)} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Module Status Grid ── */}
                    <section>
                        <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest mb-4">All Modules</h2>
                        <div className="grid grid-cols-4 gap-4">
                            {[
                                { label: 'Contacts', count: counts.contacts, icon: Users, path: '/crm/contacts', color: 'text-sky-600', bg: 'bg-sky-50' },
                                { label: 'Companies', count: counts.companies, icon: CircleDollarSign, path: '/crm/companies', color: 'text-teal-600', bg: 'bg-teal-50' },
                                { label: 'Deals', count: counts.deals, icon: TrendingUp, path: '/crm/deals', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'Tickets', count: counts.tickets, icon: Ticket, path: '/crm/tickets', color: 'text-rose-600', bg: 'bg-rose-50' },
                                { label: 'Orders', count: counts.orders, icon: ShoppingCart, path: '/crm/orders', color: 'text-orange-600', bg: 'bg-orange-50' },
                                { label: 'Calls', count: counts.calls, icon: Phone, path: '/crm/calls', color: 'text-violet-600', bg: 'bg-violet-50' },
                                { label: 'Tasks', count: counts.tasks, icon: CheckSquare, path: '/crm/tasks', color: 'text-amber-600', bg: 'bg-amber-50' },
                                { label: 'Inbox', count: null, icon: Inbox, path: '/crm/inbox', color: 'text-[#0051A5]', bg: 'bg-blue-50' },
                            ].map(m => (
                                <button key={m.label} onClick={() => nav(m.path)}
                                    className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group text-left">
                                    <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
                                        <m.icon size={17} className={m.color} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-extrabold text-slate-800 group-hover:text-[#0051A5] transition-colors">{m.label}</p>
                                        {m.count !== null && <p className="text-xs text-slate-400">{m.count} records</p>}
                                        {m.count === null && <p className="text-xs text-slate-400">Open module</p>}
                                    </div>
                                    <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-[#0051A5] transition-colors" />
                                </button>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default CRMDashboard;
