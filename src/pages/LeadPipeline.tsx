import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from "@hello-pangea/dnd";
import { dataService } from "../services/dataService";
import { Lead } from "../types";
import { useAuth } from "../context/AuthContext";
import {
    CheckCircle2,
    Calendar,
    Phone,
    Mail,
    MoreVertical,
    User
} from "lucide-react";
import toast from "react-hot-toast";

const COLUMNS = [
    {
        id: "new",
        title: "New Leads",
        icon: User,
        color: "text-blue-500",
        bg: "bg-blue-50",
        border: "border-blue-200",
    },
    {
        id: "contacted",
        title: "Contacted",
        icon: Phone,
        color: "text-indigo-500",
        bg: "bg-indigo-50",
        border: "border-indigo-200",
    },
    {
        id: "site_visit_scheduled",
        title: "Site Visit",
        icon: Calendar,
        color: "text-amber-500",
        bg: "bg-amber-50",
        border: "border-amber-200",
    },
    {
        id: "qualified",
        title: "Qualified",
        icon: CheckCircle2,
        color: "text-emerald-500",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
    },
    {
        id: "converted",
        title: "Converted",
        icon: PackageSearch, // Fallback if PackageSearch not imported, using AlertCircle for now or similar
        color: "text-purple-500",
        bg: "bg-purple-50",
        border: "border-purple-200",
    }
];

// Custom icons adjustment
import { PackageSearch } from "lucide-react";

const LeadPipeline = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [showSlider, setShowSlider] = useState(false);

    const checkScrollable = () => {
        if (scrollContainerRef.current) {
            const { scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowSlider(scrollWidth > clientWidth);
        }
    };

    useEffect(() => {
        checkScrollable();
        window.addEventListener('resize', checkScrollable);
        return () => window.removeEventListener('resize', checkScrollable);
    }, [leads]);

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            const maxScroll = scrollWidth - clientWidth;
            if (maxScroll > 0) {
                setScrollProgress((scrollLeft / maxScroll) * 100);
            }
        }
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        setScrollProgress(val);
        if (scrollContainerRef.current) {
            const { scrollWidth, clientWidth } = scrollContainerRef.current;
            const maxScroll = scrollWidth - clientWidth;
            scrollContainerRef.current.scrollLeft = (val / 100) * maxScroll;
        }
    };

    const isAdmin = user?.user_metadata?.role === "Admin" || user?.user_metadata?.role === "Manager";

    useEffect(() => {
        const loadUsers = async () => {
            if (isAdmin) {
                // Fetch users for filtering if needed
            }
        };
        loadUsers();
    }, [isAdmin]);

    const loadLeads = async () => {
        try {
            setLoading(true);
            const data = await dataService.getLeads();
            setLeads(data);
        } catch (error) {
            console.error("Error loading leads:", error);
            toast.error("Failed to load leads");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLeads();
    }, []);

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId as Lead["status"];

        // Optimistically update UI
        setLeads((prevLeads) =>
            prevLeads.map((lead) =>
                lead.id === draggableId ? { ...lead, status: newStatus } : lead,
            ),
        );

        // Update in backend
        const { error } = await dataService.updateLead(draggableId, {
            status: newStatus,
        });

        if (error) {
            console.error("Failed to update lead status:", error);
            toast.error("Failed to update status");
            loadLeads();
        } else {
            toast.success(`Lead moved to ${newStatus}`);
        }
    };

    const getLeadsByStatus = (status: string) => {
        return leads
            .filter((lead) => lead.status === status)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                    <span>Loading lead pipeline...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto h-[calc(100vh-theme(spacing.16))] flex flex-col">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Lead Pipeline</h1>
                    <p className="text-slate-500 mt-1">
                        Manage your sales funnel and track lead progress
                    </p>
                </div>
            </div>

            {showSlider && (
                <div className="mb-4 flex items-center gap-3">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Scroll Pipeline</span>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={scrollProgress}
                        onChange={handleSliderChange}
                        className="flex-1 w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-all"
                    />
                </div>
            )}

            <DragDropContext onDragEnd={onDragEnd}>
                <div
                    className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar-hide"
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                >
                    {COLUMNS.map((column) => {
                        const columnLeads = getLeadsByStatus(column.id);
                        const Icon = column.icon;

                        return (
                            <div key={column.id} className="flex-shrink-0 w-80 flex flex-col">
                                <div
                                    className={`flex items-center gap-2 mb-4 p-3 rounded-xl border ${column.border} ${column.bg}`}
                                >
                                    <Icon className={`w-5 h-5 ${column.color}`} />
                                    <h2 className="font-semibold text-slate-700">
                                        {column.title}
                                    </h2>
                                    <div className="ml-auto bg-white px-2 py-0.5 rounded-full text-xs font-medium text-slate-500 shadow-sm">
                                        {columnLeads.length}
                                    </div>
                                </div>

                                <Droppable droppableId={column.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`flex-1 rounded-2xl p-3 border-2 border-dashed transition-colors duration-200 flex flex-col ${snapshot.isDraggingOver
                                                ? "border-blue-600 bg-blue-50/50"
                                                : "border-transparent bg-slate-50"
                                                }`}
                                        >
                                            <div className="flex flex-col gap-3 min-h-[150px] h-full flex-grow">
                                                {columnLeads.map((lead, index) => (
                                                    <Draggable
                                                        key={lead.id}
                                                        draggableId={lead.id}
                                                        index={index}
                                                    >
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => navigate(`/leads/${lead.id}`)}
                                                                className={`bg-white p-4 rounded-xl border shadow-sm transition-all duration-200 cursor-pointer ${snapshot.isDragging
                                                                    ? "shadow-xl ring-2 ring-blue-600/20 border-blue-600 scale-105 opacity-90"
                                                                    : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                                                                    }`}
                                                            >
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                                                                        {lead.source || "Direct"}
                                                                    </span>
                                                                    <button className="text-slate-400 hover:text-slate-600">
                                                                        <MoreVertical size={14} />
                                                                    </button>
                                                                </div>
                                                                <h3 className="font-semibold text-slate-800 mb-1 leading-snug">
                                                                    {lead.name}
                                                                </h3>
                                                                <div className="space-y-1.5 mt-3">
                                                                    {lead.phone && (
                                                                        <p className="text-xs text-slate-500 flex items-center gap-2">
                                                                            <Phone size={12} className="shrink-0" />
                                                                            {lead.phone}
                                                                        </p>
                                                                    )}
                                                                    {lead.email && (
                                                                        <p className="text-xs text-slate-500 flex items-center gap-2">
                                                                            <Mail size={12} className="shrink-0" />
                                                                            <span className="truncate">{lead.email}</span>
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                {lead.notes && (
                                                                    <p className="text-[11px] text-slate-400 mt-3 line-clamp-2 italic">
                                                                        "{lead.notes}"
                                                                    </p>
                                                                )}

                                                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                                    <span className="text-[10px] text-slate-400">
                                                                        Added {new Date(lead.created_at).toLocaleDateString()}
                                                                    </span>
                                                                    {lead.assigned_to && (
                                                                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                                                                            U
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </div>
            </DragDropContext>
        </div>
    );
};

export default LeadPipeline;
