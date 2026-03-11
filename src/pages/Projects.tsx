import { useEffect, useState } from 'react';
import { Search, Briefcase, ChevronRight } from 'lucide-react';
import { Project } from '../types';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Projects = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*, customers(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProjects(data || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'documentation': return 'bg-blue-100 text-blue-800';
            case 'project initiated': return 'bg-purple-100 text-purple-800';
            case 'survey pending': return 'bg-amber-100 text-amber-800';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const filteredProjects = projects.filter((project: Project) => {
        const matchesTab = activeTab === 'all' || project.status?.toLowerCase() === activeTab;
        const matchesSearch =
            project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.project_number?.toString().includes(searchTerm) ||
            project.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-4 sm:px-0">
                <div>
                    <h1 className="text-2xl font-bold font-display text-slate-900">Solar Projects</h1>
                    <p className="text-slate-500 text-sm">Monitor and manage end-to-end project lifecycles</p>
                </div>
            </div>

            <div className="section-card">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search projects by ID, customer..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-600/20 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
                        {['all', 'documentation', 'mnre', 'installation', 'completed'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Desktop view */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left">
                        <thead className="bg-[#F8FAFB] border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Project</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Capacity</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stage</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading projects...</td></tr>
                            ) : filteredProjects.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No projects found</td></tr>
                            ) : filteredProjects.map((project) => (
                                <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                                <Briefcase size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">#{project.project_number}</div>
                                                <div className="text-xs text-slate-500 line-clamp-1">{project.title}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-900">{project.customers?.name}</div>
                                        <div className="text-xs text-slate-500">Karnataka, India</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-slate-900">{project.system_size_kw} kW</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-700">{project.current_stage}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${getStatusStyle(project.status)}`}>
                                            {project.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link to={`/projects/${project.id}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-bold">
                                            Manage <ChevronRight size={16} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading projects...</div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 italic">No projects found</div>
                    ) : filteredProjects.map((project) => (
                        <Link
                            key={project.id}
                            to={`/projects/${project.id}`}
                            className="block p-5 active:bg-slate-50 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100/50">
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-base">#{project.project_number}</div>
                                        <div className="text-xs text-slate-500 font-medium">Solar PV Installation</div>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusStyle(project.status)}`}>
                                    {project.status}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Customer</div>
                                        <div className="text-sm font-bold text-slate-800">{project.customers?.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Capacity</div>
                                        <div className="text-sm font-black text-[#0051A5]">{project.system_size_kw} kW</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                        <span className="text-xs font-bold text-slate-600">{project.current_stage}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-blue-600 font-bold text-xs">
                                        Manage <ChevronRight size={14} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Projects;
