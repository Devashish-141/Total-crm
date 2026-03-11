import { useEffect, useState } from 'react';
import { Search, Plus, FileText, Download, Eye, Pencil, Trash2, Briefcase } from 'lucide-react';
import { Quote } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';

const Quotes = () => {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchQuotes();
    }, []);

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('quotes')
                .select('*, customers(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setQuotes(data || []);
        } catch (error) {
            console.error('Error fetching quotes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteQuote = async () => {
        if (!deleteQuoteId) return;
        try {
            const { error } = await supabase
                .from('quotes')
                .delete()
                .eq('id', deleteQuoteId);

            if (error) throw error;
            setQuotes(quotes.filter(q => q.id !== deleteQuoteId));
            setDeleteQuoteId(null);
        } catch (error) {
            console.error('Error deleting quote:', error);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'accepted': return 'bg-green-100 text-green-800';
            case 'sent': return 'bg-blue-100 text-blue-800 shadow-sm';
            case 'draft': return 'bg-slate-100 text-slate-600';
            case 'expired': return 'bg-red-100 text-red-800';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const handleGeneratePDF = (quote: Quote, mode: 'download' | 'preview') => {
        console.log(`Generating PDF for ${quote.quote_number} in mode ${mode}`);
        // PDF logic would go here
    };

    const convertToProject = (quote: Quote) => {
        navigate(`/projects/new?fromQuote=${quote.id}`);
    };

    const filteredQuotes = quotes.filter(quote =>
        quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-4 sm:px-0">
                <div>
                    <h1 className="text-2xl font-bold font-display text-slate-900">Quotes</h1>
                    <p className="text-slate-500 text-sm">Create and manage professional solar quotations</p>
                </div>
                <Link to="/documents/new?type=quote" className="btn btn-primary flex items-center gap-2">
                    <Plus size={20} /> <span className="hidden sm:inline">Create Quote</span>
                </Link>
            </div>

            <div className="section-card">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search quotes by number or customer..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-600/20 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Desktop view */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left">
                        <thead className="bg-[#F8FAFB] border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quote No.</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading quotes...</td></tr>
                            ) : filteredQuotes.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No quotes found</td></tr>
                            ) : filteredQuotes.map((quote) => (
                                <tr key={quote.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-900">{quote.quote_number}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-900">{quote.customers?.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(quote.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-bold text-slate-900">₹{quote.total_amount?.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${getStatusStyle(quote.status)}`}>
                                            {quote.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleGeneratePDF(quote, 'preview')} className="p-1 text-slate-400 hover:text-blue-600"><Eye size={18} /></button>
                                            <button onClick={() => handleGeneratePDF(quote, 'download')} className="p-1 text-slate-400 hover:text-blue-600"><Download size={18} /></button>
                                            <Link to={`/documents/new?type=quote&id=${quote.id}`} className="p-1 text-slate-400 hover:text-amber-600"><Pencil size={18} /></Link>
                                            {quote.status !== 'accepted' && (
                                                <button onClick={() => convertToProject(quote)} className="p-1 text-slate-400 hover:text-purple-600" title="Convert to Project"><Briefcase size={18} /></button>
                                            )}
                                            <button onClick={() => setDeleteQuoteId(quote.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading quotes...</div>
                    ) : filteredQuotes.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 italic">No quotes found</div>
                    ) : filteredQuotes.map((quote) => (
                        <div key={quote.id} className="p-5 active:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-100/50">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-base">{quote.quote_number}</div>
                                        <div className="text-xs text-slate-500 font-medium tracking-tight">Issued: {new Date(quote.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusStyle(quote.status)}`}>
                                    {quote.status}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="max-w-[60%]">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Customer</div>
                                        <div className="text-sm font-bold text-slate-800 line-clamp-1">{quote.customers?.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Amount</div>
                                        <div className="text-sm font-black text-[#0051A5]">₹{quote.total_amount?.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-50">
                                    <button onClick={() => handleGeneratePDF(quote, 'preview')} className="flex flex-col items-center gap-1.5 p-2 rounded-xl active:bg-blue-50 transition-colors">
                                        <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Eye size={18} /></div>
                                        <span className="text-[10px] font-bold text-slate-500">View</span>
                                    </button>
                                    <button onClick={() => handleGeneratePDF(quote, 'download')} className="flex flex-col items-center gap-1.5 p-2 rounded-xl active:bg-slate-50 transition-colors">
                                        <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-50 text-slate-600"><Download size={18} /></div>
                                        <span className="text-[10px] font-bold text-slate-500">PDF</span>
                                    </button>
                                    <Link to={`/documents/new?type=quote&id=${quote.id}`} className="flex flex-col items-center gap-1.5 p-2 rounded-xl active:bg-amber-50 transition-colors">
                                        <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Pencil size={18} /></div>
                                        <span className="text-[10px] font-bold text-slate-500">Edit</span>
                                    </Link>
                                    <button onClick={() => setDeleteQuoteId(quote.id)} className="flex flex-col items-center gap-1.5 p-2 rounded-xl active:bg-red-50 transition-colors">
                                        <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 text-red-600"><Trash2 size={18} /></div>
                                        <span className="text-[10px] font-bold text-slate-500">Delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ConfirmModal
                isOpen={!!deleteQuoteId}
                onClose={() => setDeleteQuoteId(null)}
                onConfirm={handleDeleteQuote}
                title="Delete Quote"
                message="Are you sure you want to delete this quote? This action cannot be undone."
                confirmText="Delete"
            />
        </div>
    );
};

export default Quotes;
