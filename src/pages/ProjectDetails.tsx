import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ChevronLeft,
    FileText,
    Upload,
    CheckCircle2,
    Clock,
    User,
    MapPin,
    Zap,
    Scale,
    CreditCard
} from 'lucide-react';
import { Project } from '../types';
import { dataService } from '../services/dataService';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

const ProjectDetails = () => {
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);
    const [transitioning, setTransitioning] = useState(false);

    useEffect(() => {
        if (id) fetchProject(id);
    }, [id]);

    const fetchProject = async (projectId: string) => {
        setLoading(true);
        const data = await dataService.getProject(projectId);
        setProject(data);
        setLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'aadhaar_url' | 'pan_url' | 'eb_bill_url') => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        setUploading(field);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${id}/${field}_${Date.now()}.${fileExt}`;
            const filePath = `project-docs/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('projects')
                .update({ [field]: publicUrl })
                .eq('id', id);

            if (updateError) throw updateError;

            showToast('Success', 'Document uploaded successfully', 'success');
            fetchProject(id);
        } catch (error) {
            console.error('Error uploading file:', error);
            showToast('Error', 'Failed to upload document. Ensure "documents" bucket exists in Supabase Storage.', 'error');
        } finally {
            setUploading(null);
        }
    };

    const handleNextStage = async () => {
        if (!project || !id) return;
        setTransitioning(true);
        const { data, error } = await dataService.advanceProjectStage(id);
        setTransitioning(false);

        if (error) {
            showToast('Workflow Gate', error.toString(), 'error');
        } else {
            setProject(data);
            showToast('Success', `Project moved to ${data?.current_stage}`, 'success');
        }
    };

    const handleUpdateStatus = async () => {
        if (!project || !id) return;
        const newStatus = prompt('Enter new status (e.g. In Progress, Delayed, On Hold):', project.status);
        if (!newStatus) return;

        setTransitioning(true);
        const { data, error } = await dataService.updateProjectStatus(id, newStatus);
        setTransitioning(false);

        if (error) {
            showToast('Error', error.toString(), 'error');
        } else {
            setProject(data);
            showToast('Success', 'Status updated', 'success');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading project details...</div>;
    if (!project) return <div className="p-8 text-center text-slate-500 font-medium">Project not found</div>;

    // Helper to determine if a stage is past
    const stages_after = (stage: string, current: string) => {
        const order = ['Documentation', 'MNRE Application', 'Loan Process', 'Procurement', 'Installation', 'Net Metering'];
        return order.indexOf(current) > order.indexOf(stage);
    };

    const stages = [
        { name: 'Documentation', status: project.current_stage === 'Documentation' ? 'active' : project.current_stage !== 'Documentation' && stages_after('Documentation', project.current_stage) ? 'completed' : 'pending' },
        { name: 'MNRE Application', status: project.current_stage === 'MNRE Application' ? 'active' : stages_after('MNRE Application', project.current_stage) ? 'completed' : 'pending' },
        { name: 'Loan Process', status: project.current_stage === 'Loan Process' ? 'active' : stages_after('Loan Process', project.current_stage) ? 'completed' : 'pending' },
        { name: 'Procurement', status: project.current_stage === 'Procurement' ? 'active' : stages_after('Procurement', project.current_stage) ? 'completed' : 'pending' },
        { name: 'Installation', status: project.current_stage === 'Installation' ? 'active' : stages_after('Installation', project.current_stage) ? 'completed' : 'pending' },
        { name: 'Net Metering', status: project.current_stage === 'Net Metering' ? 'active' : 'pending' }
    ];

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 sm:px-0">
                <div className="flex items-center gap-4">
                    <Link to="/projects" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ChevronLeft size={24} className="text-slate-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold font-display text-slate-900">Project #{project.project_number}</h1>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase">{project.status}</span>
                        </div>
                        <p className="text-slate-500">{project.title}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleUpdateStatus}
                        disabled={transitioning}
                        className="btn btn-secondary text-sm"
                    >
                        Update Status
                    </button>
                    {project.current_stage !== 'Net Metering' && (
                        <button
                            onClick={handleNextStage}
                            disabled={transitioning}
                            className="btn btn-primary text-sm flex items-center gap-2 shadow-blue-900/10"
                        >
                            {transitioning ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : null}
                            Next Stage
                        </button>
                    )}
                </div>
            </div>

            {/* Workflow Tracker */}
            <div className="section-card p-4 sm:p-6">
                <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-4 relative">
                    {stages.map((stage, idx) => (
                        <div key={idx} className="flex-1 flex flex-row md:flex-col items-center md:text-center relative gap-4 md:gap-0">
                            {/* Circle Indicator */}
                            <div className={`w-8 h-8 min-w-[32px] rounded-full flex items-center justify-center mb-0 md:mb-2 z-10 ${stage.status === 'completed' ? 'bg-green-600 text-white' :
                                stage.status === 'active' ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                                    'bg-slate-200 text-slate-400'
                                }`}>
                                {stage.status === 'completed' ? <CheckCircle2 size={16} /> : <span>{idx + 1}</span>}
                            </div>

                            {/* Line connecting circles on mobile (vertical) */}
                            {idx < stages.length - 1 && (
                                <div className="md:hidden absolute left-4 top-8 w-0.5 h-6 bg-slate-100 -z-0"></div>
                            )}

                            {/* Stage Label */}
                            <div className="flex flex-col md:items-center">
                                <span className={`text-xs font-bold ${stage.status === 'active' ? 'text-blue-600' : 'text-slate-500'}`}>{stage.name}</span>
                                <span className="md:hidden text-[10px] text-slate-400 font-medium">
                                    {stage.status === 'completed' ? 'Done' : stage.status === 'active' ? 'Current' : 'Upcoming'}
                                </span>
                            </div>

                            {/* Line connecting circles on desktop (horizontal) */}
                            {idx < stages.length - 1 && (
                                <div className="hidden md:block absolute top-4 left-[60%] w-[80%] h-0.5 bg-slate-100 -z-0"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Project Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="section-card p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <FileText size={20} className="text-blue-600" /> Project Summary
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">System Size</div>
                                    <div className="font-bold text-slate-900 uppercase tracking-wider">{project.system_size_kw} kWp</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-green-600 shadow-sm">
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Project Value</div>
                                    <div className="font-bold text-slate-900">₹{project.total_price.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl col-span-1 sm:col-span-2">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-purple-600 shadow-sm">
                                    <User size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Customer</div>
                                    <div className="font-bold text-slate-900">{project.customers?.name}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={12} /> {project.customers?.address}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="section-card p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Scale size={20} className="text-blue-600" /> Technical Details
                        </h2>
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                            Technical specifications and Site Survey data will appear here once finalized.
                        </div>
                    </div>
                </div>

                {/* Right Column: Documentation */}
                <div className="space-y-6">
                    <div className="section-card p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <FileText size={20} className="text-blue-600" /> Mandatory Documents
                        </h2>
                        <div className="space-y-4">
                            {[
                                { label: 'Aadhaar Card', field: 'aadhaar_url' as const },
                                { label: 'PAN Card', field: 'pan_url' as const },
                                { label: 'Electricity Bill', field: 'eb_bill_url' as const }
                            ].map((doc, idx) => (
                                <div key={idx} className="p-4 border border-slate-100 rounded-xl hover:border-blue-100 transition-colors bg-slate-50/50">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-bold text-slate-700">{doc.label}</span>
                                        {project[doc.field] ? (
                                            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                                                <CheckCircle2 size={14} /> Uploaded
                                            </span>
                                        ) : (
                                            <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                                <Clock size={14} /> Pending
                                            </span>
                                        )}
                                    </div>
                                    {project[doc.field] ? (
                                        <a
                                            href={project[doc.field]}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full btn btn-secondary text-xs py-2 flex items-center justify-center gap-2"
                                        >
                                            <FileText size={14} /> View Document
                                        </a>
                                    ) : (
                                        <label className="w-full btn btn-primary text-xs py-2 flex items-center justify-center gap-2 cursor-pointer shadow-blue-900/10">
                                            {uploading === doc.field ? 'Uploading...' : <><Upload size={14} /> Upload {doc.label.split(' ')[0]}</>}
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*,.pdf"
                                                onChange={(e) => handleFileUpload(e, doc.field)}
                                                disabled={!!uploading}
                                            />
                                        </label>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="section-card p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Internal Notes</h2>
                        <textarea
                            className="w-full p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600/20 outline-none"
                            placeholder="Add internal project notes..."
                            rows={4}
                        ></textarea>
                        <button className="w-full btn btn-secondary text-xs mt-3">Save Notes</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetails;
