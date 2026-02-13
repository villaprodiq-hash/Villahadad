import { Booking } from '../../types';
import { ConflictRecord } from '../db/schema';

class ConflictManagerService {
  private conflicts: ConflictRecord[] = [];

  constructor() {}

  /**
   * Checks if a local update conflicts with server data
   * @param localBooking The booking data being uploaded
   * @param serverBooking The current state of the booking on the server
   * @returns ConflictRecord if conflict exists, null otherwise
   */
  public checkForConflict(localBooking: Booking, serverBooking: Booking): ConflictRecord | null {
    // 1. Logic: If local changes are older than server changes (simulated via timestamp check)
    // Or if critical fields differ significantly
    
    // For prototype, we check if the "status" or "shootDate" is different
    const isDifferent = 
      localBooking.status !== serverBooking.status ||
      localBooking.shootDate !== serverBooking.shootDate ||
      localBooking.title !== serverBooking.title;

    if (isDifferent) {
       // Check timestamps (simulated)
       // In a real app, we'd compare `updatedAt` fields
       // const serverUpdated = new Date(serverBooking.updatedAt).getTime();
       // const localUpdated = new Date(localBooking.updatedAt).getTime();
       
       // Alert if server has newer data
       // if (serverUpdated > localUpdated) { ... }
       
       const conflict: ConflictRecord = {
         id: crypto.randomUUID(),
         entityId: localBooking.id,
         localData: localBooking,
         serverData: serverBooking,
         resolved: false,
         timestamp: Date.now()
       };
       
       this.conflicts.push(conflict);
       return conflict;
    }

    return null;
  }

  public getConflicts() {
    return this.conflicts.filter(c => !c.resolved);
  }

  public resolveConflict(conflictId: string, resolution: 'local' | 'server') {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (conflict) {
      conflict.resolved = true;
      conflict.resolution = resolution;
      // Triggers logic to apply the chosen data
    }
  }
}

export const conflictManager = new ConflictManagerService();
