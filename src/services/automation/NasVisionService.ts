import { BookingStatus } from '../../types';
import { electronBackend } from '../mockBackend';
import { toast } from 'sonner';

/**
 * 🌑 BLACK'S NAS VISION SERVICE
 * Periodically scans NAS folders to automatically advance booking statuses.
 */
export class NasVisionService {
  private static intervalId: ReturnType<typeof setInterval> | null = null;
  private static isScanning = false;

  static start(onUpdate?: () => void) {
    if (this.intervalId) return;
    
    console.log('🌑 [NasVision] Service Started (Eye of the Storm)');
    
    this.intervalId = setInterval(async () => {
      if (this.isScanning) return;
      this.isScanning = true;
      
      try {
        const bookings = await electronBackend.getBookings();
        const activeBookings = bookings.filter(b => 
           b.status === BookingStatus.SHOOTING || 
           b.status === BookingStatus.SHOOTING_COMPLETED ||
           b.status === BookingStatus.SELECTION
        );

        for (const booking of activeBookings) {
          if (!booking.folderPath) continue;

          // 🔍 Call Electron API to check files
          const stats = await window.electronAPI?.sessionLifecycle?.getStats?.(booking.folderPath);
          
          if (!stats) continue;

          // LOGIC 1: Shooting -> Shooting Completed (RAW files found)
          if (booking.status === BookingStatus.SHOOTING && stats.raw > 0) {
            console.log(`✨ [NasVision] Files detected for ${booking.clientName}. Moving to Completed.`);
            await electronBackend.updateBooking(booking.id, { 
                status: BookingStatus.SHOOTING_COMPLETED,
                notes: (booking.notes || '') + `\n[NAS Vision] Auto-detected ${stats.raw} raw files.`
            });
            toast.success(`✨ تم رصد صور لـ ${booking.clientName} - اكتمل التصوير تلقائياً`);
            onUpdate?.();
          }

          // LOGIC 2: Selection -> Editing (Selected files found)
          if (booking.status === BookingStatus.SELECTION && stats.selected > 0) {
            console.log(`✨ [NasVision] Selections detected for ${booking.clientName}. Moving to Editing.`);
            await electronBackend.updateBooking(booking.id, { 
                status: BookingStatus.EDITING,
                notes: (booking.notes || '') + `\n[NAS Vision] Auto-detected ${stats.selected} selections.`
            });
            toast.success(`✨ تم رصد اختيارات لـ ${booking.clientName} - بانتظار التعديل`);
            onUpdate?.();
          }
        }
      } catch (e) {
        console.warn('NasVision scan failed:', e);
      } finally {
        this.isScanning = false;
      }
    }, 10000); // Scan every 10 seconds
  }

  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
