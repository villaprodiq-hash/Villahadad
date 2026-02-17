/**
 * SessionCard Component
 * 
 * Displays session status and quick actions in the booking list
 * Shows: Image count, selection progress, status badge
 */

import React from 'react';
import { Image as ImageIcon, CheckSquare, FolderOpen } from 'lucide-react';
import type { SessionsTable } from '../../services/db/types';

interface SessionCardProps {
  session: SessionsTable | null;
  imageCount: number;
  selectedCount: number;
  onOpenSelection: () => void;
  onOpenFolder: () => void;
}

export function SessionCard({ 
  session, 
  imageCount, 
  selectedCount, 
  onOpenSelection, 
  onOpenFolder 
}: SessionCardProps) {
  const selectionProgress = imageCount > 0 
    ? Math.round((selectedCount / imageCount) * 100) 
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'bg-blue-500/20 text-blue-400';
      case 'selected': return 'bg-green-500/20 text-green-400';
      case 'printed': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'uploaded': return 'تم الرفع';
      case 'selected': return 'تم الاختيار';
      case 'printed': return 'تم الطباعة';
      default: return status;
    }
  };

  if (!session) {
    return (
      <div className="border border-dashed border-white/20 rounded-xl p-4">
        <div className="flex items-center gap-3 text-gray-500">
          <ImageIcon className="w-5 h-5" />
          <span className="text-sm">لا يوجد جلسة تصوير</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon size={18} className="text-[#C94557]" />
        <h3 className="text-lg font-bold text-white">جلسة التصوير</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full mr-auto ${getStatusColor(session.status)}`}>
          {getStatusLabel(session.status)}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <ImageIcon className="w-4 h-4" />
            <span className="text-xs">الصور الكلية</span>
          </div>
          <span className="text-2xl font-bold text-white">{imageCount}</span>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CheckSquare className="w-4 h-4" />
            <span className="text-xs">المختارة</span>
          </div>
          <span className="text-2xl font-bold text-green-400">{selectedCount}</span>
        </div>
      </div>

      {/* Progress Bar */}
      {imageCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-500">تقدم الاختيار</span>
            <span className="font-medium text-gray-300">{selectionProgress}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${selectionProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSelection}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C94557] text-white rounded-xl hover:bg-[#C94557]/90 transition-colors text-sm font-medium"
        >
          <CheckSquare className="w-4 h-4" />
          <span>{selectedCount > 0 ? 'متابعة الاختيار' : 'اختيار الصور'}</span>
        </button>
        
        {session.folderPath && (
          <button
            onClick={onOpenFolder}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium"
          >
            <FolderOpen className="w-4 h-4" />
            <span>المجلد</span>
          </button>
        )}
      </div>
    </div>
  );
}
