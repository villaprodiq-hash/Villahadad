import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  MousePointerClick,
  X,
  CheckCheck,
  Layers,
} from 'lucide-react';

interface ImageSelectionToolbarProps {
  /** Number of currently selected items */
  selectedCount: number;
  /** Total items available */
  totalCount: number;
  /** Whether multi-select mode is active */
  isSelecting: boolean;
  /** Toggle multi-select mode */
  onToggleSelecting: () => void;
  /** Approve all selected items */
  onApproveSelected: () => void;
  /** Reject all selected items */
  onRejectSelected: () => void;
  /** Mark selected as "maybe" */
  onMaybeSelected: () => void;
  /** Select all items */
  onSelectAll: () => void;
  /** Clear selection */
  onClearSelection: () => void;
}

const ImageSelectionToolbar: React.FC<ImageSelectionToolbarProps> = ({
  selectedCount,
  totalCount,
  isSelecting,
  onToggleSelecting,
  onApproveSelected,
  onRejectSelected,
  onMaybeSelected,
  onSelectAll,
  onClearSelection,
}) => {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Toggle Selection Mode Button */}
      <button
        onClick={onToggleSelecting}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all
          ${isSelecting
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
            : 'bg-zinc-800/60 text-zinc-400 border border-white/10 hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/20'
          }`}
      >
        <MousePointerClick size={16} />
        <span>{isSelecting ? 'وضع الاختيار' : 'اختيار متعدد'}</span>
      </button>

      {/* Batch Actions Bar — slides in when selecting */}
      <AnimatePresence>
        {isSelecting && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex items-center gap-2 bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg px-3 py-1.5"
          >
            {/* Counter */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-gray-100">
              <Layers size={14} className="text-indigo-500" />
              <span className="text-xs font-bold text-zinc-300">
                {selectedCount}<span className="text-zinc-400">/{totalCount}</span>
              </span>
            </div>

            {/* Select All */}
            <button
              onClick={onSelectAll}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-indigo-400 hover:bg-indigo-500/10 transition-colors"
            >
              <CheckCheck size={14} />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-white/10" />

            {/* Approve Selected */}
            <button
              onClick={onApproveSelected}
              disabled={selectedCount === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold
                bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="اعتماد المحدد"
            >
              <CheckCircle2 size={14} />
              <span>اعتماد</span>
            </button>

            {/* Maybe Selected */}
            <button
              onClick={onMaybeSelected}
              disabled={selectedCount === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold
                bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="حاير"
            >
              <HelpCircle size={14} />
              <span>حاير</span>
            </button>

            {/* Reject Selected */}
            <button
              onClick={onRejectSelected}
              disabled={selectedCount === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold
                bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="رفض المحدد"
            >
              <XCircle size={14} />
              <span>رفض</span>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-white/10" />

            {/* Clear / Exit */}
            <button
              onClick={onClearSelection}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
              title="إلغاء التحديد"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageSelectionToolbar;
