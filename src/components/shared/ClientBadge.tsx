import React from 'react';
import { Crown, Heart } from 'lucide-react';
import { Booking } from '../../types';

interface ClientBadgeProps {
  booking: Booking;
  allBookings?: Booking[];
  compact?: boolean;
}

const ClientBadge: React.FC<ClientBadgeProps> = ({ booking, allBookings = [], compact = false }) => {
  // 1. Loyal Customer Logic (Booked 2+ times)
  const isLoyal = React.useMemo(() => {
    if (allBookings.length === 0) return false;
    const phone = typeof booking.clientPhone === 'string' ? booking.clientPhone : (Array.isArray(booking.clientPhone) ? booking.clientPhone[0] : '');
    if (!phone || phone.length < 5) return false;
    
    const matches = allBookings.filter(b => {
      const bPhone = typeof b.clientPhone === 'string' ? b.clientPhone : (Array.isArray(b.clientPhone) ? b.clientPhone[0] : '');
      return bPhone === phone;
    });
    return matches.length > 1;
  }, [booking.clientPhone, allBookings]);

  // 2. VIP Logic (Automated based on package)
  const isAutoVIP = React.useMemo(() => {
    return booking.servicePackage?.toUpperCase().includes('VIP');
  }, [booking.servicePackage]);

  const iconSize = compact ? 10 : 12;

  return (
    <div className="flex items-center gap-1">
      {/* Famous Customer Badge - Only show Crown if NOT compact (e.g. in details) or keep it subtle */}
      {booking.isFamous && (
        <div className="relative group/badge">
          <div className="absolute inset-0 bg-yellow-400/20 blur-[4px] rounded-full animate-pulse"></div>
          <div className="relative p-0.5 bg-linear-to-br from-yellow-400 to-amber-600 rounded-md shadow-[0_0_10px_rgba(251,191,36,0.4)]">
            <Crown size={iconSize} className="text-white fill-white" />
          </div>
        </div>
      )}

      {/* VIP Badge - text only, no icon as requested */}
      {isAutoVIP && (
        <div className="px-1.5 py-0.5 bg-linear-to-br from-purple-500/20 to-indigo-600/20 rounded-md border border-purple-400/30">
          <span className={`text-purple-400 font-bold leading-none ${compact ? 'text-[7px]' : 'text-[8px]'}`}>VIP</span>
        </div>
      )}

      {/* Loyal Customer Badge (Calculated) */}
      {isLoyal && (
        <div className="p-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
          <Heart size={iconSize} className="text-emerald-500 fill-emerald-500" />
        </div>
      )}
    </div>
  );
};

export default ClientBadge;
