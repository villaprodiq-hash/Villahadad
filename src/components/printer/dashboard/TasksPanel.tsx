/**
 * 🖨️ Tasks Panel - Printer Dashboard
 * ✅ PRODUCTION READY - No mock data
 * Shows tasks from real bookings only
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { Booking, BookingStatus } from '../../../types';

interface Album {
  id: string;
  name: string;
  notes?: string;
}

interface TasksPanelProps {
  isManager?: boolean;
  bookings?: Booking[]; // Real bookings from database
}

const TasksPanel: React.FC<TasksPanelProps> = ({ isManager: _isManager = false, bookings = [] }) => {
  // ✅ Generate albums from REAL bookings only
  const albums: Album[] = bookings
    .filter(b => b.status === BookingStatus.READY_TO_PRINT || b.status === BookingStatus.PRINTING)
    .slice(0, 10)
    .map(b => ({
      id: b.id,
      name: `ألبوم ${b.clientName}`,
      notes: b.details?.notes || undefined
    }));

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

  // Empty state when no bookings
  if (albums.length === 0) {
    return (
      <div className="bg-[#1a1c22] rounded-2xl border border-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-sm">📋 مهام الطباعة</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <AlertCircle size={32} className="mb-2 opacity-50" />
          <p className="text-sm">لا توجد ألبومات جاهزة للطباعة</p>
          <p className="text-xs mt-1">ستظهر هنا عند اكتمال التصوير</p>
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
          📋 مهام الطباعة
          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
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
            <button
              onClick={() => toggleAlbum(album.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
            >
              <span className="text-white text-sm font-medium truncate">{album.name}</span>
              {expandedAlbums.has(album.id) ? (
                <ChevronDown size={16} className="text-gray-400 shrink-0" />
              ) : (
                <ChevronRight size={16} className="text-gray-400 shrink-0" />
              )}
            </button>

            {expandedAlbums.has(album.id) && (
              <div className="px-3 pb-3 border-t border-white/5">
                {album.notes ? (
                  <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-amber-400 text-xs flex items-start gap-2">
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
