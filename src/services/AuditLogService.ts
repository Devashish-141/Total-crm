import { supabase } from '../lib/supabase';

export type AuditEntity = 'Project' | 'Lead' | 'Payment' | 'Survey' | 'Inventory' | 'User';

export interface AuditLogEntry {
    entity_type: AuditEntity;
    entity_id: string;
    action: string;
    changes: any;
    performed_by: string;
}

class AuditLogService {
    async log(entry: AuditLogEntry) {
        try {
            const { error } = await supabase
                .from('audit_logs')
                .insert([{
                    entity_type: entry.entity_type,
                    entity_id: entry.entity_id,
                    action: entry.action,
                    changes: entry.changes,
                    performed_by: entry.performed_by || (await supabase.auth.getUser()).data.user?.id
                }]);

            if (error) {
                console.error('Failed to write audit log:', error);
            }
        } catch (err) {
            console.error('AuditLogService Error:', err);
        }
    }

    // Helper for status changes
    async logStatusChange(entityType: AuditEntity, entityId: string, from: string, to: string, userId: string) {
        return this.log({
            entity_type: entityType,
            entity_id: entityId,
            action: 'STATUS_CHANGE',
            changes: { from, to },
            performed_by: userId
        });
    }
}

export const auditLogger = new AuditLogService();
