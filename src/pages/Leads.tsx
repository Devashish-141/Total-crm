import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Mail,
    Phone,
    UserPlus,
    Trash2,
    MessageSquare,
    Facebook,
    Globe,
    CheckCircle,
    Clock,
    Users,
    Upload,
    UserCheck,
    Camera
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { Lead } from '../types';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Leads = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const navigate = useNavigate();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [salesExecutives, setSalesExecutives] = useState<any[]>([]);
    const [surveyors, setSurveyors] = useState<any[]>([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [schedulingLead, setSchedulingLead] = useState<Lead | null>(null);
    const [visitData, setVisitData] = useState({ date: '', surveyorId: '' });
    const [newLead, setNewLead] = useState<Partial<Lead>>({
        name: '',
        email: '',
        phone: '',
        source: 'Web',
        status: 'new',
        notes: ''
    });

    useEffect(() => {
        fetchLeads();
        fetchSalesExecutives();
        fetchSurveyors();
    }, []);

    const fetchSalesExecutives = async () => {
        const data = await dataService.getProfilesByRole('Sales Executive');
        setSalesExecutives(data);
    };

    const fetchSurveyors = async () => {
        const data = await dataService.getProfilesByRole('Surveyor');
        setSurveyors(data);
    };

    const fetchLeads = async () => {
        setLoading(true);
        const data = await dataService.getLeads();
        setLeads(data);
        setLoading(false);
    };

    const handleAddLead = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await dataService.addLead(newLead);
        if (error) {
            toast.error('Failed to add lead');
        } else {
            toast.success('Lead added successfully');
            setIsAddModalOpen(false);
            setNewLead({ name: '', email: '', phone: '', source: 'Web', status: 'new', notes: '' });
            fetchLeads();
        }
    };

    const handleConvertToCustomer = async (lead: Lead) => {
        if (!confirm(`Convert ${lead.name} to a permanent customer?`)) return;

        const { error } = await dataService.convertLeadToCustomer(lead);
        if (error) {
            toast.error('Failed to convert lead');
        } else {
            toast.success('Lead converted to customer!');
            fetchLeads();
        }
    };

    const handleAssignLead = async (leadId: string, userId: string) => {
        const lead = leads.find(l => l.id === leadId);
        if (userId && lead && lead.status === 'new') {
            // Auto move to Contacted if assigned (optional logic)
            await dataService.updateLead(leadId, { status: 'contacted', assigned_to: userId });
        } else {
            await dataService.assignLead(leadId, userId);
        }
        toast.success('Lead updated');
        fetchLeads();
    };

    const handleStatusChange = async (lead: Lead, newStatus: string) => {
        if (newStatus === 'site_visit_scheduled') {
            setSchedulingLead(lead);
            setIsScheduleModalOpen(true);
            return;
        }

        const { error } = await dataService.updateLead(lead.id, { status: newStatus as any });
        if (error) {
            toast.error('Failed to update status');
        } else {
            toast.success('Status updated');
            fetchLeads();
        }
    };

    const handleConfirmSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schedulingLead) return;

        const { error } = await dataService.scheduleSiteVisit(schedulingLead.id, visitData.date, visitData.surveyorId);
        if (error) {
            toast.error('Failed to schedule visit');
        } else {
            toast.success('Site visit scheduled and added to calendar');
            setIsScheduleModalOpen(false);
            setSchedulingLead(null);
            setVisitData({ date: '', surveyorId: '' });
            fetchLeads();
        }
    };

    const handleDeleteLead = async (id: string) => {
        if (!confirm('Are you sure you want to delete this lead?')) return;
        const { error } = await dataService.deleteLead(id);
        if (error) {
            toast.error('Failed to delete lead');
        } else {
            toast.success('Lead deleted');
            fetchLeads();
        }
    };

    const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim());

            const leadsToImport = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const lead: any = { source: 'CSV Import', status: 'new' };
                headers.forEach((header, index) => {
                    if (header.toLowerCase() === 'name') lead.name = values[index];
                    if (header.toLowerCase() === 'email') lead.email = values[index];
                    if (header.toLowerCase() === 'phone') lead.phone = values[index];
                    if (header.toLowerCase() === 'notes') lead.notes = values[index];
                });
                return lead;
            }).filter(l => l.name);

            let successCount = 0;
            for (const lead of leadsToImport) {
                const { error } = await dataService.addLead(lead);
                if (!error) successCount++;
            }

            toast.success(`Imported ${successCount} leads`);
            setIsImportModalOpen(false);
            fetchLeads();
        };
        reader.readAsText(file);
    };

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.phone?.includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-800';
            case 'contacted': return 'bg-amber-100 text-amber-800';
            case 'site_visit_scheduled': return 'bg-purple-100 text-purple-800';
            case 'follow_up': return 'bg-indigo-100 text-indigo-800';
            case 'closed_won': return 'bg-green-100 text-green-800';
            case 'closed_lost': return 'bg-red-100 text-red-800';
            case 'converted': return 'bg-emerald-100 text-emerald-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const getSourceIcon = (source: string) => {
        if (source?.toLowerCase().includes('facebook') || source?.toLowerCase().includes('fb')) {
            return <Facebook size={14} className="text-[#1877F2]" />;
        }
        return <Globe size={14} className="text-slate-400" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
                    <p className="text-slate-500 text-sm">Track and convert potential solar customers</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-[#0051A5] text-white px-4 py-2.5 rounded-xl font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20"
                >
                    <Plus size={20} />
                    Add New Lead
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search leads by name, email or phone..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="site_visit_scheduled">Site Visit Scheduled</option>
                        <option value="follow_up">Follow Up</option>
                        <option value="closed_won">Closed Won</option>
                        <option value="closed_lost">Closed Lost</option>
                    </select>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        <Upload size={18} />
                        Import CSV
                    </button>
                </div>
            </div>

            {/* Leads Grid/List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-slate-500">Loading leads...</div>
                ) : filteredLeads.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                        <Users size={18} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-500 font-medium">No leads found matching your criteria</p>
                    </div>
                ) : filteredLeads.map(lead => (
                    <div key={lead.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start mb-4">
                            <select
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider outline-none border-none cursor-pointer ${getStatusStyle(lead.status)}`}
                                value={lead.status}
                                onChange={(e) => handleStatusChange(lead, e.target.value)}
                            >
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="site_visit_scheduled">Site Visit Scheduled</option>
                                <option value="follow_up">Follow Up</option>
                                <option value="closed_won">Closed Won</option>
                                <option value="closed_lost">Closed Lost</option>
                            </select>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!lead.is_converted && (
                                    <button
                                        onClick={() => handleConvertToCustomer(lead)}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        title="Convert to Customer"
                                    >
                                        <UserPlus size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDeleteLead(lead.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Lead"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-1">{lead.name}</h3>

                        {lead.status === 'site_visit_scheduled' && !lead.is_converted && (
                            <button
                                onClick={() => navigate(`/leads/${lead.id}/survey`)}
                                className="w-full mt-2 mb-4 py-2 bg-purple-50 text-purple-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-100 transition-all border border-purple-100"
                            >
                                <Camera size={16} />
                                Start Site Survey
                            </button>
                        )}

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
                            {getSourceIcon(lead.source || '')}
                            <span>Source: {lead.source || 'Direct'}</span>
                        </div>

                        <div className="space-y-4 mb-6">
                            {/* Assignment Dropdown */}
                            <div className="flex items-center gap-2">
                                <UserCheck size={16} className="text-slate-400" />
                                <select
                                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 flex-1"
                                    value={lead.assigned_to || ''}
                                    onChange={(e) => handleAssignLead(lead.id, e.target.value)}
                                >
                                    <option value="">Unassigned</option>
                                    {salesExecutives.map(exec => (
                                        <option key={exec.id} value={exec.id}>{exec.full_name || exec.email}</option>
                                    ))}
                                </select>
                            </div>

                            {lead.email && (
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <Mail size={16} className="text-slate-400" />
                                    <span>{lead.email}</span>
                                </div>
                            )}
                            {lead.phone && (
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <Phone size={16} className="text-slate-400" />
                                    <span>{lead.phone}</span>
                                </div>
                            )}
                            <div className="flex items-start gap-3 text-sm text-slate-600">
                                <MessageSquare size={16} className="text-slate-400 mt-0.5 shrink-0" />
                                <span className="line-clamp-2 italic text-slate-500">
                                    {lead.notes || 'No notes added...'}
                                </span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            <div className="flex items-center gap-1">
                                <Clock size={12} />
                                {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}
                            </div>
                            {lead.is_converted && (
                                <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle size={12} />
                                    Converted
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Lead Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
                    <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Add New Solar Lead</h2>
                            <form onSubmit={handleAddLead} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none"
                                        value={newLead.name}
                                        onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Email</label>
                                        <input
                                            type="email"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none"
                                            value={newLead.email}
                                            onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Phone</label>
                                        <input
                                            type="tel"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none"
                                            value={newLead.phone}
                                            onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Source</label>
                                    <select
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white"
                                        value={newLead.source}
                                        onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                                    >
                                        <option value="Web">Website</option>
                                        <option value="Facebook">Facebook Ads</option>
                                        <option value="Referral">Referral</option>
                                        <option value="Direct">Direct Call</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Notes</label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none resize-none"
                                        value={newLead.notes}
                                        onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                                    ></textarea>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-[#0051A5] text-white rounded-xl font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20"
                                    >
                                        Save Lead
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Import CSV Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)}></div>
                    <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Import Leads</h2>
                            <p className="text-slate-500 text-sm mb-6">Upload a CSV file with headers: Name, Email, Phone, Notes</p>

                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors relative">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleCSVUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="space-y-2">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                                        <Upload size={24} />
                                    </div>
                                    <div className="text-sm font-medium text-slate-700">Click or drag CSV file to upload</div>
                                    <div className="text-xs text-slate-400">Max size 2MB</div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="w-full mt-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Visit Modal */}
            {isScheduleModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsScheduleModalOpen(false)}></div>
                    <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Schedule Site Visit</h2>
                            <p className="text-slate-500 text-sm mb-6">Assign a surveyor and pick a date for {schedulingLead?.name}</p>

                            <form onSubmit={handleConfirmSchedule} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Surveyor</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none bg-white"
                                        value={visitData.surveyorId}
                                        onChange={(e) => setVisitData({ ...visitData, surveyorId: e.target.value })}
                                    >
                                        <option value="">Select Surveyor...</option>
                                        {surveyors.map(s => (
                                            <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Scheduled Date</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] outline-none"
                                        value={visitData.date}
                                        onChange={(e) => setVisitData({ ...visitData, date: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsScheduleModalOpen(false)}
                                        className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-[#0051A5] text-white rounded-xl font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20"
                                    >
                                        Schedule
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leads;
