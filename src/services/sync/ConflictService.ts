import { supabase } from '../supabase';

export interface ConflictRecord {
    id: string;
    booking_id: string;
    proposed_by_name: string;
    proposed_by_rank: string;
    proposed_data: any;
    status: 'PENDING' | 'RESOLVED' | 'REJECTED';
    created_at: string;
    
    // Joined Data (Booking)
    bookings?: {
        client_name: string;
        shoot_date: string;
        title: string;
    }
}

export class ConflictService {
    
    /**
     * Fetch pending conflicts for manager review
     */
    static async fetchPendingConflicts(): Promise<ConflictRecord[]> {
        const { data, error } = await supabase
            .from('conflicts')
            .select(`
                *,
                bookings (
                    client_name,
                    shoot_date,
                    title
                )
            `)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("❌ Failed to fetch conflicts:", error);
            return [];
        }

        return data || [];
    }

    /**
     * Resolve a conflict
     * @param conflictId The ID of the conflict record
     * @param decision 'ACCEPT' (Overwrite booking) or 'REJECT' (Discard proposal)
     * @param managerName Name of the manager resolving this
     */
    static async resolveConflict(conflictId: string, decision: 'ACCEPT' | 'REJECT', managerName: string) {
        
        // 1. Fetch the conflict first to get data (if accepting)
        const { data: conflict, error: fetchErr } = await supabase
            .from('conflicts')
            .select('*')
            .eq('id', conflictId)
            .single();

        if (fetchErr || !conflict) throw new Error("Conflict record not found");

        if (decision === 'ACCEPT') {
            // Overwrite the actual booking with the proposed data
            const proposed = conflict.proposed_data;
            
            // Inject resolution metadata
            proposed.last_editor_rank = 'MANAGER'; // Force upgrade rank so it sticks
            proposed.updated_by_name = `${proposed.updated_by_name} (Approved by ${managerName})`;

            const { error: updateErr } = await supabase
                .from('bookings')
                .upsert(proposed); // Upsert by ID

            if (updateErr) throw updateErr;
        }

        // 2. Mark conflict as resolved/rejected
        const { error: statusErr } = await supabase
            .from('conflicts')
            .update({
                status: decision === 'ACCEPT' ? 'RESOLVED' : 'REJECTED',
                resolved_by: managerName,
                resolved_at: new Date().toISOString()
            })
            .eq('id', conflictId);

        if (statusErr) throw statusErr;
    }
}
