import React from 'react';
import { useLocation, Link, Outlet } from 'react-router-dom';
import {
    LayoutDashboard, Users, Building2, Inbox, ListTodo, FileText, Phone, Scissors,
    TrendingUp, Ticket, ShoppingCart, Layers
} from 'lucide-react';

interface NavItem {
    label: string;
    path: string;
    icon: React.ElementType;
}

const crmNavItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/crm/dashboard' },
    { icon: Users, label: 'Contacts', path: '/crm/contacts' },
    { icon: Building2, label: 'Companies', path: '/crm/companies' },
    { icon: Inbox, label: 'Inbox', path: '/crm/inbox' },
    { icon: ListTodo, label: 'Tasks', path: '/crm/tasks' },
    { icon: FileText, label: 'Templates', path: '/crm/templates' },
    { icon: Scissors, label: 'Snippets', path: '/crm/snippets' },
    { icon: Phone, label: 'Calls', path: '/crm/calls' },
    { icon: TrendingUp, label: 'Deals', path: '/crm/deals' },
    { icon: Ticket, label: 'Tickets', path: '/crm/tickets' },
    { icon: ShoppingCart, label: 'Orders', path: '/crm/orders' },
    { icon: Layers, label: 'Segments', path: '/crm/segments' },
];

const CRMLayout = ({ children }: { children?: React.ReactNode }) => {
    const location = useLocation();

    return (
        <div className="flex h-[calc(100vh-57px)] overflow-hidden bg-slate-50">
            {/* CRM Sub-Sidebar */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-base font-extrabold text-[#0051A5]">Navigation</h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">Manage your CRM</p>
                </div>

                <nav className="flex-1 overflow-y-auto py-4">
                    <div className="px-3 mb-2">
                        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Main Menu</p>
                        <div className="space-y-1">
                            {crmNavItems.slice(0, 8).map((item) => {
                                const active = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active
                                                ? 'bg-[#0051A5] text-white shadow-lg shadow-blue-900/20'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-[#0051A5]'
                                            }`}
                                    >
                                        <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                                            <item.icon size={18} />
                                        </div>
                                        <span className="text-sm font-bold">{item.label}</span>
                                        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div className="px-3 mt-6">
                        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Commerce &amp; Support</p>
                        <div className="space-y-1">
                            {crmNavItems.slice(8).map((item) => {
                                const active = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active
                                                ? 'bg-[#0051A5] text-white shadow-lg shadow-blue-900/20'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-[#0051A5]'
                                            }`}
                                    >
                                        <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                                            <item.icon size={18} />
                                        </div>
                                        <span className="text-sm font-bold">{item.label}</span>
                                        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </nav>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                    {children || <Outlet />}
                </div>
            </main>
        </div>
    );
};

export default CRMLayout;
