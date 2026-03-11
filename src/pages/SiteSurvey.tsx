import React, { useState } from 'react';
import {
    Camera,
    Upload,
    ArrowLeft,
    Zap,
    Maximize,
    Home
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';

const SiteSurvey = () => {
    const { leadId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [surveyData, setSurveyData] = useState({
        roof_type: 'Concrete',
        roof_area: '',
        shadow_free_area: '',
        sanctioned_load: '',
        avg_monthly_bill: '',
        phase: 'Single Phase',
        structure_height: 'Standard',
        notes: '',
        photos: [] as string[]
    });

    const handleSaveSurvey = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!leadId) throw new Error('Lead ID missing');

            const { error } = await dataService.updateLead(leadId, {
                status: 'site_visit_scheduled', // Or a new status like 'technical_survey_completed'
                notes: (surveyData.notes ? surveyData.notes + '\n\n' : '') +
                    `Roof: ${surveyData.roof_type}, Area: ${surveyData.roof_area}sqft, Shadow Free: ${surveyData.shadow_free_area}sqft, Load: ${surveyData.sanctioned_load}kW, Phase: ${surveyData.phase}`
            });

            if (error) throw error;

            toast.success('Survey completed and lead updated');
            navigate('/leads');
        } catch (error) {
            console.error('Survey Error:', error);
            toast.error('Failed to save survey');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto pb-20 p-4">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-slate-900">Site Survey Form</h1>
            </div>

            <form onSubmit={handleSaveSurvey} className="space-y-6">
                {/* Roof Details */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 text-[#0051A5] font-bold mb-2">
                        <Home size={18} />
                        <h2 className="uppercase tracking-wider text-sm">Roof Specification</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Roof Type</label>
                            <select
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] bg-white text-sm"
                                value={surveyData.roof_type}
                                onChange={e => setSurveyData({ ...surveyData, roof_type: e.target.value })}
                            >
                                <option>Concrete</option>
                                <option>Tin Shade</option>
                                <option>Asbestos</option>
                                <option>Ground Mount</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Structure Height</label>
                            <select
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] bg-white text-sm"
                                value={surveyData.structure_height}
                                onChange={e => setSurveyData({ ...surveyData, structure_height: e.target.value })}
                            >
                                <option>Standard</option>
                                <option>High Mast (5ft+)</option>
                                <option>Super High (10ft+)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Total Roof Area (sqft)</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] text-sm"
                                placeholder="e.g. 1200"
                                value={surveyData.roof_area}
                                onChange={e => setSurveyData({ ...surveyData, roof_area: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Shadow Free (sqft)</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] text-sm"
                                placeholder="e.g. 800"
                                value={surveyData.shadow_free_area}
                                onChange={e => setSurveyData({ ...surveyData, shadow_free_area: e.target.value })}
                            />
                        </div>
                    </div>
                </section>

                {/* Electrical Details */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 text-amber-500 font-bold mb-2">
                        <Zap size={18} />
                        <h2 className="uppercase tracking-wider text-sm">Electrical Connection</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Sanctioned Load (kW)</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] text-sm"
                                value={surveyData.sanctioned_load}
                                onChange={e => setSurveyData({ ...surveyData, sanctioned_load: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Connection Phase</label>
                            <select
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] bg-white text-sm"
                                value={surveyData.phase}
                                onChange={e => setSurveyData({ ...surveyData, phase: e.target.value })}
                            >
                                <option>Single Phase</option>
                                <option>Three Phase</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Photo Uploads */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 font-bold mb-2">
                        <Camera size={18} />
                        <h2 className="uppercase tracking-wider text-sm">Site Photos</h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-[#0051A5] hover:text-[#0051A5] transition-all cursor-pointer">
                            <Upload size={24} />
                            <span className="text-[10px] font-bold uppercase">Upload Photo</span>
                        </div>
                        {/* Photo Placeholders */}
                        {[1, 2].map(i => (
                            <div key={i} className="aspect-square rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                                <Maximize size={20} />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Notes */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Additional Technical Notes</label>
                    <textarea
                        rows={4}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#0051A5]/20 focus:border-[#0051A5] text-sm resize-none"
                        placeholder="Any obstacles, specific cable routing etc..."
                        value={surveyData.notes}
                        onChange={e => setSurveyData({ ...surveyData, notes: e.target.value })}
                    ></textarea>
                </section>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-[#0051A5] text-white rounded-2xl font-bold shadow-xl shadow-blue-900/20 hover:bg-[#003d7a] transition-all disabled:opacity-50"
                >
                    {loading ? 'Submitting Survey...' : 'Complete Site Survey'}
                </button>
            </form>
        </div>
    );
};

export default SiteSurvey;
