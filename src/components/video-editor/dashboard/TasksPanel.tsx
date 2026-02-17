/**
 * 🎬 Tasks Panel - Video Editor Dashboard
 * ✅ PRODUCTION READY - No mock data
 * Shows videos from real bookings only
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, Maximize2, Minimize2, CheckCircle2, Circle, Film } from 'lucide-react';
import { Booking, BookingCategory, BookingStatus } from '../../../types';

interface Album {
  id: string;
  name: string;
  notes?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

interface TasksPanelProps {
  isManager?: boolean;
  bookings?: Booking[];
}

const TasksPanel: React.FC<TasksPanelProps> = ({ isManager: _isManager = false, bookings = [] }) => {
  // ✅ Generate videos from REAL bookings only (weddings usually have video)
  const initialAlbums: Album[] = bookings
    .filter(
      b =>
        (b.status === BookingStatus.SHOOTING_COMPLETED ||
          b.status === BookingStatus.SELECTION ||
          b.status === BookingStatus.EDITING) &&
        (b.category === BookingCategory.WEDDING || Boolean(b.details?.includesVideo))
    )
    .slice(0, 10)
    .map(b => ({
      id: b.id,
      name: `فيديو ${b.clientName}`,
      notes: b.details?.videoNotes || b.details?.notes || undefined,
      status: 'pending' as const
    }));

  const [albums, setAlbums] = useState<Album[]>(initialAlbums);
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());
  const [isPiP, setIsPiP] = useState(false);
  const [pipPosition, setPipPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const toggleAlbum = (albumId: string) => {
    setExpandedAlbums(prev => {
      const newSet = new Set(prev);
      if (newSet.has(albumId)) {
        newSet.delete(albumId);
      } else {
        newSet.add(albumId);
      }
      return newSet;
    });
  };

  const toggleStatus = (albumId: string) => {
    setAlbums(prev => prev.map(album => {
      if (album.id === albumId) {
        const nextStatus = album.status === 'pending' ? 'in_progress' 
          : album.status === 'in_progress' ? 'completed' 
          : 'pending';
        return { ...album, status: nextStatus };
      }
      return album;
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPiP) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pipPosition.x,
      y: e.clientY - pipPosition.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPipPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} className="text-green-400" />;
      case 'in_progress':
        return <Circle size={16} className="text-purple-400 fill-purple-400/30" />;
      default:
        return <Circle size={16} className="text-gray-500" />;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'in_progress': return 'قيد المونتاج';
      default: return 'في الانتظار';
    }
  };

  // Empty state
  if (albums.length === 0) {
    return (
      <div className="bg-[#1a1c22] rounded-2xl border border-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Film size={16} className="text-purple-400" />
            مشاريع الفيديو
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Film size={32} className="mb-2 opacity-50" />
          <p className="text-sm">لا توجد فيديوهات للمونتاج</p>
          <p className="text-xs mt-1">ستظهر هنا بعد حفلات الزفاف</p>
        </div>
      </div>
    );
  }

  const panelContent = (
    <div className={`bg-[#1a1c22] rounded-2xl border border-white/5 ${isPiP ? 'shadow-2xl' : ''}`}>
      <div 
        className="flex items-center justify-between p-4 border-b border-white/5 cursor-move"
        onMouseDown={handleMouseDown}
      >
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <Film size={16} className="text-purple-400" />
          مشاريع الفيديو
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
            {albums.length}
          </span>
        </h3>
        <button
          onClick={() => setIsPiP(!isPiP)}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
        >
          {isPiP ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        {albums.map(album => (
          <div key={album.id} className="bg-black/20 rounded-xl border border-white/5">
            <div className="flex items-center justify-between p-3">
              <button
                onClick={() => toggleAlbum(album.id)}
                className="flex items-center gap-2 flex-1 hover:bg-white/5 -m-1 p-1 rounded transition-colors"
              >
                {expandedAlbums.has(album.id) ? (
                  <ChevronDown size={16} className="text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400 shrink-0" />
                )}
                <span className="text-white text-sm font-medium truncate">{album.name}</span>
              </button>
              
              <button
                onClick={() => toggleStatus(album.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                title="تغيير الحالة"
              >
                {getStatusIcon(album.status)}
                <span className="text-xs text-gray-400">{getStatusLabel(album.status)}</span>
              </button>
            </div>

            {expandedAlbums.has(album.id) && (
              <div className="px-3 pb-3 border-t border-white/5">
                {album.notes ? (
                  <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-purple-400 text-xs flex items-start gap-2">
                      <AlertCircle size={12} className="shrink-0 mt-0.5" />
                      <span>{album.notes}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs mt-2 text-center py-2">
                    لا توجد ملاحظات خاصة
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (isPiP) {
    return (
      <div
        className="fixed z-50 w-80"
        style={{ left: pipPosition.x, top: pipPosition.y }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {panelContent}
      </div>
    );
  }

  return panelContent;
};

export default TasksPanel;
