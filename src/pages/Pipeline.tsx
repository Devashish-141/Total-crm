import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { dataService } from "../services/dataService";
import { useAuth } from "../context/AuthContext";
import {
  Clock,
  CheckCircle2,
  Filter,
  PackageSearch,
  FileText,
  Wrench,
  CircleDollarSign as RupeeIcon
} from "lucide-react";
import SearchableSelect from "../components/SearchableSelect";

const COLUMNS = [
  {
    id: "Documentation",
    title: "Documentation",
    icon: FileText,
    color: "text-slate-500",
    bg: "bg-slate-100",
    border: "border-slate-200",
  },
  {
    id: "MNRE Application",
    title: "MNRE/Subsidy",
    icon: Clock,
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    id: "Loan Process",
    title: "Loan Process",
    icon: RupeeIcon, // Need to ensure RupeeIcon is available or use CreditCard
    color: "text-indigo-500",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
  {
    id: "Procurement",
    title: "Procurement",
    icon: PackageSearch,
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  {
    id: "Installation",
    title: "Installation",
    icon: Wrench,
    color: "text-orange-500",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  {
    id: "Net Metering",
    title: "Net Metering",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
];

const Pipeline = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState<string>('all');

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
  }, [projects]);

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

  const isAdmin = user?.user_metadata?.role !== "Engineer";

  useEffect(() => {
    const loadEngineers = async () => {
      if (isAdmin) {
        const data = await dataService.getEngineers();
        setEngineers(data);
      }
    };
    loadEngineers();
  }, [isAdmin]);

  const loadProjects = async () => {
    try {
      setLoading(true);

      const { data, error } = await dataService.getProjects();
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStage = destination.droppableId;

    // Optimistically update UI
    setProjects((prev) =>
      prev.map((p) =>
        p.id === draggableId ? { ...p, current_stage: newStage } : p,
      ),
    );

    // Update in backend
    // Special handling for Installation gate is done in advanceProjectStage 
    // but for drag and drop we might need a simpler update or a specialized method.
    const { error } = await dataService.updateProjectStatus(draggableId, undefined, newStage);
    if (error) {
      console.error("Failed to update project stage:", error);
      toast.error(error);
      loadProjects();
    }
  };

  const getProjectsByStage = (stage: string) => {
    return projects
      .filter((p) => p.current_stage === stage)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-delaval-blue" />
          <span>Loading pipeline...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto h-[calc(100vh-theme(spacing.16))] flex flex-col">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Pipeline</h1>
          <p className="text-slate-500 mt-1">
            Drag and drop jobs to update their status
          </p>
        </div>
        {isAdmin && (
          <div className="w-64">
            <SearchableSelect
              label="Filter by Engineer"
              options={[
                { value: 'all', label: 'All Engineers' },
                ...engineers.map(eng => ({ value: eng.name, label: eng.name }))
              ]}
              value={selectedEngineer}
              onChange={(val) => setSelectedEngineer(val)}
              searchable={false}
              icon={<Filter size={16} />}
            />
          </div>
        )}
      </div>

      {showSlider && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-xs font-bold text-delaval-blue uppercase tracking-widest">Scroll Pipeline</span>
          <input
            type="range"
            min="0"
            max="100"
            value={scrollProgress}
            onChange={handleSliderChange}
            className="flex-1 w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-delaval-blue hover:accent-blue-700 transition-all"
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
            const columnProjects = getProjectsByStage(column.id);
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
                    {columnProjects.length}
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
                        {columnProjects.map((project, index) => (
                          <Draggable
                            key={project.id}
                            draggableId={project.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => navigate(`/projects/${project.id}`)}
                                className={`bg-white p-4 rounded-xl border shadow-sm transition-all duration-200 cursor-pointer ${snapshot.isDragging
                                  ? "shadow-xl ring-2 ring-blue-600/20 border-blue-600 scale-105 opacity-90"
                                  : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                                  }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-xs font-bold text-slate-400">
                                    #
                                    {project.project_number?.toString().padStart(4, "0")}
                                  </span>
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                    {project.status}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-slate-800 mb-1.5 leading-snug">
                                  {project.customers?.name || "Unknown Customer"}
                                </h3>
                                <p className="text-sm text-slate-600 font-medium">
                                  {project.title}
                                </p>
                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                  <span className="text-xs text-slate-500">
                                    {project.system_size_kw} kW
                                  </span>
                                  <div className="text-xs font-bold text-blue-600">
                                    ₹{project.total_price?.toLocaleString()}
                                  </div>
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

export default Pipeline;
