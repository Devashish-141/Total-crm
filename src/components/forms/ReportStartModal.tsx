import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Customer, Job } from '../../types';
import Modal from '../Modal';
import SearchableSelect from '../SearchableSelect';
import { Loader2 } from 'lucide-react';

interface ReportStartModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (customer: Customer, job: Job) => void;
}

export const ReportStartModal: React.FC<ReportStartModalProps> = ({ isOpen, onClose, onStart }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedJobId, setSelectedJobId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchData();
            setSelectedCustomerId('');
            setSelectedJobId('');
        }
    }, [isOpen]);

    const fetchData = async () => {
        setLoading(true);
        const [customersRes, jobsRes] = await Promise.all([
            supabase.from('customers').select('*').order('name'),
            supabase.from('jobs').select('*, customers(name)').order('job_number', { ascending: false })
        ]);

        if (customersRes.data) setCustomers(customersRes.data);
        if (jobsRes.data) setJobs(jobsRes.data);
        setLoading(false);
    };

    const handleStart = () => {
        const customer = customers.find(c => c.id === selectedCustomerId);
        const job = jobs.find(j => j.id === selectedJobId);
        if (customer && job) {
            onStart(customer, job);
        }
    };

    const filteredJobs = selectedCustomerId
        ? jobs.filter(j => j.customer_id === selectedCustomerId)
        : jobs;

    const customerOptions = customers.map(c => ({ value: c.id, label: c.name }));
    const jobOptions = filteredJobs.map(j => ({
        value: j.id,
        label: `Job #${j.job_number}`
    }));

    // Auto-select customer if a job is picked
    const handleJobChange = (jobId: string) => {
        setSelectedJobId(jobId);
        const job = jobs.find(j => j.id === jobId);
        if (job && !selectedCustomerId) {
            setSelectedCustomerId(job.customer_id);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create Service Report"
            overflowVisible
        >
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-delaval-blue animate-spin" /></div>
            ) : (
                <div className="space-y-4 pt-2">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Customer</label>
                        <SearchableSelect
                            options={customerOptions}
                            value={selectedCustomerId}
                            onChange={setSelectedCustomerId}
                            placeholder="Select Customer..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Job</label>
                        <SearchableSelect
                            options={jobOptions}
                            value={selectedJobId}
                            onChange={handleJobChange}
                            placeholder={selectedCustomerId && jobOptions.length === 0 ? "No jobs for this customer" : "Select Job..."}
                        />
                        {selectedCustomerId && jobOptions.length === 0 && (
                            <p className="text-xs text-orange-600 mt-1 font-medium">Please create a job for this customer first.</p>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleStart}
                            disabled={!selectedCustomerId || !selectedJobId}
                            className="px-6 py-2 bg-delaval-blue hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors shadow-sm"
                        >
                            Start Report
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
