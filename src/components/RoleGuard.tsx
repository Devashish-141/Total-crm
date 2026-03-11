import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
}

const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
    const { role, loading, session } = useAuth();
    const location = useLocation();

    // Check for dev bypass
    const isDevBypass = localStorage.getItem('dev_bypass') === 'true';

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFB]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="text-slate-500 font-medium animate-pulse">Verifying Access...</div>
                </div>
            </div>
        );
    }

    if (!session && !isDevBypass) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (isDevBypass) return <>{children}</>;

    if (!role || !allowedRoles.includes(role)) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFB] p-4 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
                    <p className="text-slate-600 mb-8">
                        You do not have the required permissions to view this page. Please contact your administrator.
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default RoleGuard;
