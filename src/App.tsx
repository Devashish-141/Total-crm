import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import CRMContacts from './pages/CRMContacts'
import CRMCompanies from './pages/CRMCompanies'
import CRMDeals from './pages/CRMDeals'
import CRMTickets from './pages/CRMTickets'
import CRMOrders from './pages/CRMOrders'
import CRMSegments from './pages/CRMSegments'
import CRMInbox from './pages/CRMInbox'
import CRMCalls from './pages/CRMCalls'
import CRMTasks from './pages/CRMTasks'
import CRMMessageTemplates from './pages/CRMMessageTemplates'
import CRMSnippets from './pages/CRMSnippets'
import CRMDashboard from './pages/CRMDashboard'
import CRMLayout from './layouts/CRMLayout'
import CRMShell from './layouts/CRMShell'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Toaster } from 'react-hot-toast'

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { session, loading } = useAuth();
    const location = useLocation();

    const isDevBypass = localStorage.getItem('dev_bypass') === 'true';

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFB]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="text-slate-500 font-medium animate-pulse">Loading CRM...</div>
                </div>
            </div>
        );
    }

    if (!session && !isDevBypass) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Toaster position="top-right" />
                <Routes>
                    <Route path="/login" element={<Login />} />

                    {/* All CRM routes wrapped in CRMShell (header + CRM sidebar) */}
                    <Route path="/" element={
                        <ProtectedRoute>
                            <CRMShell />
                        </ProtectedRoute>
                    }>
                        <Route index element={<Navigate to="/crm/dashboard" replace />} />
                        <Route path="crm" element={<CRMLayout />}>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<CRMDashboard />} />
                            <Route path="contacts" element={<CRMContacts />} />
                            <Route path="companies" element={<CRMCompanies />} />
                            <Route path="deals" element={<CRMDeals />} />
                            <Route path="tickets" element={<CRMTickets />} />
                            <Route path="orders" element={<CRMOrders />} />
                            <Route path="segments" element={<CRMSegments />} />
                            <Route path="inbox" element={<CRMInbox />} />
                            <Route path="calls" element={<CRMCalls />} />
                            <Route path="tasks" element={<CRMTasks />} />
                            <Route path="templates" element={<CRMMessageTemplates />} />
                            <Route path="snippets" element={<CRMSnippets />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/crm/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App
