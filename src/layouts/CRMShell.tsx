import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, User, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CRMShell = () => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [userName, setUserName] = useState('Admin User');

    useEffect(() => {
        if (user) {
            setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'User');
        }
    }, [user]);

    const handleSignOut = async () => {
        try {
            localStorage.removeItem('dev_bypass');
            await signOut();
            navigate('/login');
        } catch {
            localStorage.removeItem('dev_bypass');
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFB] flex flex-col font-sans">
            {/* Top Header */}
            <header className="sticky top-0 z-[1000] bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between">
                    {/* Branding */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0051A5] to-[#003875] flex items-center justify-center shadow-md">
                            <span className="text-white font-extrabold text-sm tracking-tight">CRM</span>
                        </div>
                        <div>
                            <span className="text-[#0051A5] font-extrabold text-lg leading-none">CRM Portal</span>
                            <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">Sales &amp; Relationships</p>
                        </div>
                    </div>

                    {/* Right: user + sign out */}
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2.5 px-4 py-2 bg-slate-50 rounded-full border border-slate-200">
                            <div className="w-8 h-8 rounded-full bg-[#0051A5] text-white flex items-center justify-center">
                                <User size={16} />
                            </div>
                            <span className="text-slate-700 text-sm font-semibold pr-1">{userName}</span>
                        </div>
                        <button
                            onClick={handleSignOut}
                            title="Sign Out"
                            className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
                        >
                            <LogOut size={18} />
                            <span className="hidden md:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Page content — CRMLayout renders inside here via <Outlet /> */}
            <div className="flex-1 overflow-hidden">
                <Outlet />
            </div>
        </div>
    );
};

export default CRMShell;
