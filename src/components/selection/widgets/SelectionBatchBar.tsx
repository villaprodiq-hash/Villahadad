import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  Layers,
  CheckCheck,
} from 'lucide-react';

interface SelectionBatchBarProps {
  selectedCount: number;
  totalCount: number;
  isVisible: boolean;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onMaybeAll: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

/**
 * Floating bottom bar that appears when items are selected.
 * Provides batch actions (approve/reject/maybe all selected).
 */
const SelectionBatchBar: React.FC<SelectionBatchBarProps> = ({
  selectedCount,
  totalCount,
  isVisible,
  onApproveAll,
  onRejectAll,
  onMaybeAll,
  onSelectAll,
  onClearSelection,
}) => {
  return (
    <AnimatePresence>
      {isVisible && selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-9999"
        >
          <div className="flex items-center gap-3 bg-gray-900/95 backdrop-blur-2xl rounded-2xl px-5 py-3 shadow-2xl shadow-black/30 border border-white/10">
            {/* Counter */}
            <div className="flex items-center gap-2 pl-3 border-l border-white/10">
              <Layers size={16} className="text-indigo-400" />
              <span className="text-sm font-bold text-white">
                {selectedCount}
                <span className="text-zinc-500 font-normal"> / {totalCount}</span>
              </span>
            </div>

            {/* Select All */}
            <button
              onClick={onSelectAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                text-indigo-400 hover:bg-indigo-500/10 transition-all"
            >
              <CheckCheck size={14} />
              <span>تحديد الكل</span>
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10" />

            {/* Approve */}
            <button
              onClick={onApproveAll}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold
                bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all"
            >
              <CheckCircle2 size={16} />
              <span>اعتماد الكل</span>
            </button>

            {/* Maybe */}
            <button
              onClick={onMaybeAll}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold
                bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all"
            >
              <HelpCircle size={16} />
              <span>حاير</span>
            </button>

            {/* Reject */}
            <button
              onClick={onRejectAll}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold
                bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
            >
              <XCircle size={16} />
              <span>رفض الكل</span>
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10" />

            {/* Close */}
            <button
              onClick={onClearSelection}
              className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SelectionBatchBar;
