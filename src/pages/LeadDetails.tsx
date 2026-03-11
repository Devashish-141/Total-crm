import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { dataService } from "../services/dataService";
import { Lead } from "../types";
import {
    ArrowLeft,
    User,
    Phone,
    Mail,
    Clock,
    History,
    Edit,
    CheckCircle2,
    AlertCircle,
    Plus,
    Save
} from "lucide-react";
import toast from "react-hot-toast";

const LeadDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'custom'>('info');
    const [fieldDefinitions, setFieldDefinitions] = useState<any[]>([]);
    const [customFieldValues, setCustomFieldValues] = useState<any>({});
    const [activities, setActivities] = useState<any[]>([]);

    useEffect(() => {
        const loadLead = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const leads = await dataService.getLeads();
                const found = leads.find(l => l.id === id);
                if (found) {
                    setLead(found);
                    setCustomFieldValues(found.custom_fields || {});

                    // Fetch definitions and activities
                    const [defs, logs] = await Promise.all([
                        dataService.getCustomFieldDefinitions('lead'),
                        dataService.getAuditLogs('Lead', id)
                    ]);
                    setFieldDefinitions(defs);
                    setActivities(logs);
                } else {
                    toast.error("Lead not found");
                    navigate('/leads');
                }
            } catch (error) {
                console.error("Error loading lead:", error);
                toast.error("Failed to load lead details");
            } finally {
                setLoading(false);
            }
        };
        loadLead();
    }, [id, navigate]);

    const handleSaveCustomFields = async () => {
        if (!id || !lead) return;
        try {
            const { error } = await dataService.updateLead(id, { custom_fields: customFieldValues });
            if (error) throw error;
            toast.success("Custom fields updated");
            setLead({ ...lead, custom_fields: customFieldValues });
        } catch (error) {
            toast.error("Failed to update custom fields");
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            </div>
        );
    }

    if (!lead) return null;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors"
            >
                <ArrowLeft size={20} />
                Back to Leads
            </button>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-200">
                            {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{lead.name}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                                    {lead.status}
                                </span>
                                <span className="text-slate-400 text-sm flex items-center gap-1">
                                    <Clock size={14} />
                                    Added {new Date(lead.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <Edit size={20} />
                        </button>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center gap-2">
                            <CheckCircle2 size={18} />
                            Convert to Customer
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 px-6">
                    {[
                        { id: 'info', label: 'Overview', icon: User },
                        { id: 'custom', label: 'Custom Fields', icon: Plus },
                        { id: 'activity', label: 'Activity Log', icon: History }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-8">
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Information</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 border border-slate-100">
                                                <Phone size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</p>
                                                <p className="text-slate-700 font-semibold">{lead.phone || 'Not provided'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 border border-slate-100">
                                                <Mail size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Email Address</p>
                                                <p className="text-slate-700 font-semibold">{lead.email || 'Not provided'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Source & Assignment</h3>
                                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Lead Source</span>
                                            <span className="font-semibold text-slate-700">{lead.source || 'Direct'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Assigned To</span>
                                            <span className="font-semibold text-slate-700">{lead.assigned_to || 'Unassigned'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Internal Notes</h3>
                                <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 text-slate-700 italic relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                        <AlertCircle size={64} />
                                    </div>
                                    {lead.notes || 'No notes available for this lead.'}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'custom' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Dynamic Lead Data</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Custom data points defined in settings</p>
                                </div>
                                <button
                                    onClick={handleSaveCustomFields}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
                                >
                                    <Save size={16} />
                                    Save Fields
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {fieldDefinitions.length > 0 ? fieldDefinitions.map(field => (
                                    <div key={field.id} className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        {field.type === 'boolean' ? (
                                            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                                                <input
                                                    type="checkbox"
                                                    checked={!!customFieldValues[field.name]}
                                                    onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.checked })}
                                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-medium text-slate-700">{field.label}</span>
                                            </div>
                                        ) : (
                                            <input
                                                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                                value={customFieldValues[field.name] || ''}
                                                onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-slate-700"
                                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                                            />
                                        )}
                                    </div>
                                )) : (
                                    <div className="col-span-2 text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                                        <Plus className="mx-auto text-slate-200 mb-4" size={32} />
                                        <p className="text-slate-400 font-medium italic">No custom fields defined for leads.</p>
                                        <button
                                            onClick={() => navigate('/settings/custom-fields')}
                                            className="mt-4 text-blue-600 font-bold hover:underline"
                                        >
                                            Define Fields in Settings
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="space-y-6">
                            {activities.length > 0 ? activities.map((activity, idx) => (
                                <div key={activity.id} className="flex gap-4 relative">
                                    {idx !== activities.length - 1 && (
                                        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-slate-100"></div>
                                    )}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${activity.action.includes('CREATE') ? 'bg-green-100 text-green-600' :
                                        activity.action.includes('STATUS') ? 'bg-amber-100 text-amber-600' :
                                            'bg-blue-100 text-blue-600'
                                        }`}>
                                        <History size={18} />
                                    </div>
                                    <div className="pt-1.5 flex-1 p-4 rounded-xl border border-slate-50 bg-slate-50/30">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-900">
                                                {activity.action.replace(/_/g, ' ')}
                                            </h4>
                                            <span className="text-xs text-slate-400">
                                                {new Date(activity.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-slate-600 text-sm">
                                            {typeof activity.changes === 'object' ? (
                                                <pre className="text-[10px] bg-white p-2 rounded border border-slate-100 overflow-auto max-h-32">
                                                    {JSON.stringify(activity.changes, null, 2)}
                                                </pre>
                                            ) : (
                                                activity.changes || 'No details'
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">
                                            BY {activity.performed_by || 'SYSTEM'}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-12">
                                    <p className="text-slate-400 italic">No activity recorded for this lead yet.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeadDetails;
