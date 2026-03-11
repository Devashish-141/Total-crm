import { supabase } from '../lib/supabase';
import { Customer, InventoryItem, Job, Invoice, Lead, Project, Settings } from '../types';
import { auditLogger } from './AuditLogService';

// Helper to check if Supabase is configured
const isSupabaseConfigured = () => {
    return import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
};

export const dataService = {
    async getJobs(status?: string, engineerName?: string): Promise<Job[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            let query = supabase
                .from('jobs')
                .select('*, customers(*)')
                .order('date_scheduled', { ascending: false });

            if (status && status !== 'all') {
                query = query.eq('status', status);
            }

            if (engineerName) {
                query = query.eq('engineer_name', engineerName);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching jobs:', error);
            return [];
        }
    },

    async getJobById(id: string): Promise<Job | null> {
        if (!isSupabaseConfigured()) return null;
        try {
            const { data, error } = await supabase
                .from('jobs')
                .select('*, customers(*)')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching job by ID:', error);
            return null;
        }
    },

    async getCustomers(): Promise<Customer[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('name');
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching customers:', error);
            return [];
        }
    },

    async getInvoices(): Promise<Invoice[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('*, customers(*)')
                .order('date_issued', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching invoices:', error);
            return [];
        }
    },

    async getJobItems(jobId: string): Promise<any[]> {
        if (!isSupabaseConfigured()) return [];
        try {
            const { data, error } = await supabase
                .from('job_items')
                .select('*')
                .eq('job_id', jobId);
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching job items:', error);
            return [];
        }
    },

    async addJobItem(item: any): Promise<{ data: any, error: any }> {
        if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
        return await supabase.from('job_items').insert([item]).select().single();
    },

    async addJobItems(items: any[]): Promise<{ data: any, error: any }> {
        if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
        return await supabase.from('job_items').insert(items).select();
    },

    async getEngineers(): Promise<any[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            const { data, error } = await supabase.from('engineers').select('*').order('name');
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching engineers', error);
            return [];
        }
    },

    async getInventory(): Promise<InventoryItem[]> {
        if (!isSupabaseConfigured()) return [];

        try {
            const { data, error } = await supabase.from('inventory').select('*');
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Error fetching inventory", error);
            return [];
        }
    },

    async createJob(job: Partial<Job>): Promise<{ data: Job | null, error: any }> {
        if (!isSupabaseConfigured()) {
            return { data: null, error: 'Supabase not configured' };
        }

        return await supabase.from('jobs').insert([job]).select().single();
    },

    async updateJob(id: string, updates: Partial<Job>): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };

        const { data: currentJob } = await supabase
            .from('jobs')
            .select('status, customer_id')
            .eq('id', id)
            .single();

        let shouldRecalculate = false;
        let customerIdToRecalculate: string | null = null;

        // Determine if status is changing
        if (updates.status && currentJob && currentJob.status !== updates.status) {
            if (currentJob.status === 'completed' || updates.status === 'completed') {
                shouldRecalculate = true;
                customerIdToRecalculate = currentJob.customer_id;
            }

            // Log status change
            await auditLogger.logStatusChange('Survey', id, currentJob.status, updates.status, '');
        }

        const result = await supabase.from('jobs').update(updates).eq('id', id);

        // General audit log
        await auditLogger.log({
            entity_type: 'Survey',
            entity_id: id,
            action: 'UPDATE_JOB',
            changes: updates,
            performed_by: ''
        });

        // Trigger secure synchronized recalculation
        if (shouldRecalculate && customerIdToRecalculate && !result.error) {
            await this.recalculateCustomerBalance(customerIdToRecalculate);
        }

        return result;
    },

    async deleteJob(id: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };

        try {
            const { error: itemsError } = await supabase.from('job_items').delete().eq('job_id', id);
            if (itemsError) return { error: itemsError };

            const { data: invoices } = await supabase.from('invoices').select('id').eq('job_id', id);
            if (invoices && invoices.length > 0) {
                const invoiceIds = invoices.map(i => i.id);
                await supabase.from('invoice_items').delete().in('invoice_id', invoiceIds);
                await supabase.from('invoices').delete().in('id', invoiceIds);
            }

            const { data: quotes } = await supabase.from('quotes').select('id').eq('job_id', id);
            if (quotes && quotes.length > 0) {
                const quoteIds = quotes.map(q => q.id);
                await supabase.from('quote_items').delete().in('quote_id', quoteIds);
                await supabase.from('quotes').delete().in('id', quoteIds);
            }

            await supabase.from('statements').delete().eq('job_id', id);

            const { error: finalError } = await supabase.from('jobs').delete().eq('id', id);

            if (!finalError) {
                await auditLogger.log({
                    entity_type: 'Survey',
                    entity_id: id,
                    action: 'DELETE_JOB',
                    changes: { deleted: true },
                    performed_by: ''
                });
            }
            return { error: finalError };
        } catch (error) {
            console.error("Failed to delete job safely", error);
            return { error };
        }
    },

    async deleteCustomer(id: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        return await supabase.from('customers').delete().eq('id', id);
    },

    async updateInvoice(id: string, updates: Partial<Invoice>): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        return await supabase.from('invoices').update(updates).eq('id', id);
    },

    async deleteInvoice(id: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };

        await supabase.from('invoice_items').delete().eq('invoice_id', id);

        return await supabase.from('invoices').delete().eq('id', id);
    },

    async getInvoiceItems(invoiceId: string): Promise<any[]> {
        if (!isSupabaseConfigured()) return [];
        try {
            const { data, error } = await supabase
                .from('invoice_items')
                .select('*')
                .eq('invoice_id', invoiceId);
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching invoice items:', error);
            return [];
        }
    },

    async addInvoiceItems(items: any[]): Promise<{ data: any, error: any }> {
        if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
        return await supabase.from('invoice_items').insert(items).select();
    },

    async deleteStatement(id: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        return await supabase.from('statements').delete().eq('id', id);
    },

    async getSettings(): Promise<Settings | null> {
        if (!isSupabaseConfigured()) return null;
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching settings:', error);
            return null;
        }
    },

    async updateSettings(updates: Partial<Settings>): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        return await supabase
            .from('settings')
            .upsert({
                ...updates,
                id: '00000000-0000-0000-0000-000000000000',
                updated_at: new Date().toISOString()
            });
    },

    async recalculateCustomerBalance(customerId: string): Promise<number> {
        if (!isSupabaseConfigured()) return 0;
        try {
            const { data: completedJobs } = await supabase.from('jobs').select('id').eq('customer_id', customerId).eq('status', 'completed');
            let totalJobValue = 0;
            if (completedJobs && completedJobs.length > 0) {
                const jobIds = completedJobs.map(j => j.id);
                const { data: jobItems } = await supabase.from('job_items').select('total').in('job_id', jobIds);
                totalJobValue = (jobItems || []).reduce((sum, item) => sum + (item.total || 0), 0);
            }

            const { data: standaloneInvoices } = await supabase.from('invoices').select('total_amount').eq('customer_id', customerId).is('job_id', null);
            const totalStandaloneInvoices = (standaloneInvoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

            const { data: allInvoices } = await supabase.from('invoices').select('amount_paid').eq('customer_id', customerId);
            const totalPaid = (allInvoices || []).reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);

            const newBalance = totalJobValue + totalStandaloneInvoices - totalPaid;

            await supabase.from('customers').update({ account_balance: newBalance }).eq('id', customerId);
            return newBalance;
        } catch (error) {
            console.error('Error recalculating bounds:', error);
            return 0;
        }
    },

    async getLeads(): Promise<Lead[]> {
        if (!isSupabaseConfigured()) return [];
        try {
            const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching leads:', error);
            return [];
        }
    },

    async addLead(lead: Partial<Lead>): Promise<{ data: Lead | null, error: any }> {
        if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
        const result = await supabase.from('leads').insert([lead]).select().single();
        if (result.data) {
            await auditLogger.log({
                entity_type: 'Lead',
                entity_id: result.data.id,
                action: 'CREATE_LEAD',
                changes: lead,
                performed_by: ''
            });
        }
        return result;
    },

    async updateLead(id: string, updates: Partial<Lead>): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        const result = await supabase.from('leads').update(updates).eq('id', id);
        if (!result.error) {
            await auditLogger.log({
                entity_type: 'Lead',
                entity_id: id,
                action: 'UPDATE_LEAD',
                changes: updates,
                performed_by: ''
            });
        }
        return result;
    },

    async deleteLead(id: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        const result = await supabase.from('leads').delete().eq('id', id);
        if (!result.error) {
            await auditLogger.log({
                entity_type: 'Lead',
                entity_id: id,
                action: 'DELETE_LEAD',
                changes: { deleted: true },
                performed_by: ''
            });
        }
        return result;
    },

    async getProfilesByRole(role: string): Promise<any[]> {
        if (!isSupabaseConfigured()) return [];
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', role);
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error(`Error fetching profiles for role ${role}: `, error);
            return [];
        }
    },

    async assignLead(leadId: string, userId: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
        return await supabase.from('leads').update({ assigned_to: userId }).eq('id', leadId);
    },

    async scheduleSiteVisit(leadId: string, visitDate: string, surveyorId?: string): Promise<{ error: any }> {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };

        try {
            const { error: leadError } = await supabase
                .from('leads')
                .update({ status: 'site_visit_scheduled' })
                .eq('id', leadId);
            if (leadError) throw leadError;

            const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();

            const newJob: Partial<Job> = {
                customer_id: undefined,
                service_type: 'Site Survey',
                status: 'scheduled',
                date_scheduled: visitDate,
                notes: `Site Survey for Lead: ${lead?.name}. ${lead?.notes || ''} `,
                engineer_name: surveyorId ? (await supabase.from('profiles').select('full_name').eq('id', surveyorId).single()).data?.full_name : undefined
            };

            const { error: jobError } = await supabase.from('jobs').insert([newJob]);
            if (jobError) throw jobError;

            return { error: null };
        } catch (error) {
            console.error('Error scheduling site visit:', error);
            return { error };
        }
    },

    async convertLeadToCustomer(lead: Lead): Promise<{ data: Customer | null, error: any }> {
        if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };

        try {
            const newCustomer: Partial<Customer> = {
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                notes: `Converted from lead source: ${lead.source}. Original notes: ${lead.notes || ''} `,
                status: 'active'
            };

            const { data: customer, error: customerError } = await supabase.from('customers').insert([newCustomer]).select().single();
            if (customerError) throw customerError;

            await supabase.from('leads').update({ status: 'converted', is_converted: true, converted_at: new Date().toISOString() }).eq('id', lead.id);

            return { data: customer, error: null };
        } catch (error) {
            console.error('Error converting lead to customer:', error);
            return { data: null, error };
        }
    },

    async getProject(id: string): Promise<Project | null> {
        const { data, error } = await supabase
            .from('projects')
            .select('*, customers(*)')
            .eq('id', id)
            .single();
        if (error) {
            console.error('Error fetching project:', error);
            return null;
        }
        return data;
    },

    async getProjects(): Promise<{ data: Project[] | null, error: any }> {
        if (!isSupabaseConfigured()) return { data: [], error: 'Supabase not configured' };
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*, customers(*)')
                .order('created_at', { ascending: false });
            return { data, error };
        } catch (error) {
            console.error('Error fetching projects:', error);
            return { data: null, error };
        }
    },

    async createProjectFromQuote(quoteId: string) {
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select('*')
            .eq('id', quoteId)
            .single();

        if (quoteError) throw quoteError;

        const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert([{
                customer_id: quote.customer_id,
                lead_id: quote.lead_id,
                title: `${quote.capacity || ''} ${quote.brand || ''} Solar Project`,
                system_size_kw: parseFloat(quote.capacity) || 0,
                total_price: quote.total_amount,
                status: 'Project Initiated',
                current_stage: 'Documentation'
            }])
            .select()
            .single();

        if (projectError) throw projectError;

        await auditLogger.log({
            entity_type: 'Project',
            entity_id: project.id,
            action: 'CREATE_PROJECT_FROM_QUOTE',
            changes: { quote_id: quoteId, project_number: project.project_number },
            performed_by: ''
        });

        await supabase
            .from('quotes')
            .update({ status: 'accepted' })
            .eq('id', quoteId);

        return project;
    },

    async advanceProjectStage(projectId: string): Promise<{ data: Project | null, error: any }> {
        if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };

        const stages = [
            'Documentation',
            'MNRE Application',
            'Loan Process',
            'Procurement',
            'Installation',
            'Net Metering'
        ];

        try {
            const { data: project, error: fetchError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (fetchError || !project) throw fetchError || new Error('Project not found');

            const currentIndex = stages.indexOf(project.current_stage);
            if (currentIndex === -1 || currentIndex === stages.length - 1) {
                return { data: null, error: 'Cannot advance further or invalid stage' };
            }

            const nextStage = stages[currentIndex + 1];

            // PAYMENT GATE: Installation requires 80% payment
            if (nextStage === 'Installation') {
                const { data: invoices } = await supabase
                    .from('invoices')
                    .select('total_amount, amount_paid')
                    .eq('customer_id', project.customer_id)
                    .eq('status', 'paid');

                const totalPaid = (invoices || []).reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
                const paymentPercentage = (totalPaid / project.total_price) * 100;

                if (paymentPercentage < 80) {
                    return { data: null, error: `Installation requires at least 80% payment. Current: ${paymentPercentage.toFixed(1)}%` };
                }
            }

            const { data: updatedProject, error: updateError } = await supabase
                .from('projects')
                .update({
                    current_stage: nextStage,
                    status: nextStage === 'Net Metering' ? 'Completed' : 'In Progress'
                })
                .eq('id', projectId)
                .select()
                .single();

            if (updateError) throw updateError;

            await auditLogger.logStatusChange('Project', projectId, project.current_stage, nextStage, '');

            return { data: updatedProject, error: null };
        } catch (error: any) {
            console.error('Error advancing project stage:', error);
            return { data: null, error: error.message || error };
        }
    },

    async updateProjectStatus(projectId: string, status?: string, stage?: string): Promise<{ data: Project | null, error: any }> {
        if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };

        try {
            const { data: oldProject } = await supabase.from('projects').select('status, current_stage').eq('id', projectId).single();

            const updates: any = {};
            if (status) updates.status = status;
            if (stage) updates.current_stage = stage;

            const { data: project, error } = await supabase
                .from('projects')
                .update(updates)
                .eq('id', projectId)
                .select()
                .single();

            if (error) throw error;

            if (status && oldProject?.status !== status) {
                await auditLogger.logStatusChange('Project', projectId, oldProject?.status || 'Unknown', status, '');
            }
            if (stage && oldProject?.current_stage !== stage) {
                await auditLogger.logStatusChange('Project', projectId, oldProject?.current_stage || 'Unknown', stage, '');
            }

            return { data: project, error: null };
        } catch (error: any) {
            console.error('Error updating project status:', error);
            return { data: null, error: error.message || error };
        }
    },

    async getCustomFieldDefinitions(entityType: 'lead' | 'customer') {
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase
            .from('custom_field_definitions')
            .select('*')
            .eq('entity_type', entityType);
        if (error) {
            console.error('Error fetching field definitions:', error);
            return [];
        }
        return data || [];
    },

    async saveCustomFieldDefinitions(definitions: any[]) {
        if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };

        // Simple implementation: upsert based on ID if exists, or insert
        const { data, error } = await supabase
            .from('custom_field_definitions')
            .upsert(definitions.map(d => ({
                id: d.id.length > 20 ? d.id : undefined, // Check if it's a real UUID or a temp timestamp ID
                name: d.name,
                label: d.label,
                type: d.type,
                required: d.required,
                entity_type: d.entity_type
            })));

        return { data, error };
    },

    async deleteCustomFieldDefinition(id: string) {
        const { error } = await supabase
            .from('custom_field_definitions')
            .delete()
            .eq('id', id);
        return { error };
    },

    async getAuditLogs(entityType: string, entityId: string) {
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching audit logs:', error);
            return [];
        }
        return data || [];
    }
};

