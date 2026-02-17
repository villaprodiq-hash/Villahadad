import React, { useRef, useCallback, useMemo } from 'react';
import { Check, X, Clock, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import SmartImage from '../../shared/ui/SmartImage';

export interface PortfolioItem {
  id: number;
  title: string;
  category: string;
  image: string;
  likes: number;
  status: 'approved' | 'rejected' | 'pending' | 'maybe';
  rating?: number; // 0-5
  assignedTo: {
    name: string;
    avatar: string;
  };
  date: string;
  camera?: string;
  editingRequests?: string[];
}

interface GalleryGridWidgetProps {
  items: PortfolioItem[];
  onItemClick: (item: PortfolioItem) => void;
  onRate?: (id: number, rating: number) => void;
  /** Multi-select mode */
  isSelecting?: boolean;
  /** Set of selected item IDs */
  selectedIds?: Set<number>;
  /** Toggle selection for an item */
  onToggleSelect?: (id: number) => void;
  /** Quick status update from grid (no lightbox needed) */
  onQuickStatus?: (id: number, status: 'approved' | 'rejected' | 'maybe') => void;
}

/** Number of columns per breakpoint — keep in sync with the CSS grid */
const COLUMNS = 3;
const ROW_HEIGHT = 320;
const ROW_GAP = 24;

const GalleryGridWidget: React.FC<GalleryGridWidgetProps> = ({
  items,
  onItemClick,
  isSelecting = false,
  selectedIds = new Set(),
  onToggleSelect,
  onQuickStatus,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // ── Split items into rows for virtualization ──
  const rows = useMemo(() => {
    const result: PortfolioItem[][] = [];
    for (let i = 0; i < items.length; i += COLUMNS) {
      result.push(items.slice(i, i + COLUMNS));
    }
    return result;
  }, [items]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT + ROW_GAP,
    overscan: 3,
  });

  // ── Card click handler: select mode vs view mode ──
  const handleCardClick = useCallback(
    (item: PortfolioItem, e: React.MouseEvent) => {
      if (isSelecting) {
        e.stopPropagation();
        onToggleSelect?.(item.id);
      } else {
        onItemClick(item);
      }
    },
    [isSelecting, onToggleSelect, onItemClick],
  );

  // ── Shared card renderer ──
  const renderCard = useCallback(
    (item: PortfolioItem) => {
      const isSelected = selectedIds.has(item.id);

      return (
        <div
          key={item.id}
          className={`group relative rounded-2xl overflow-hidden bg-white/5 border aspect-4/3 cursor-pointer
            transition-all duration-200 hover:scale-[1.01]
            ${isSelecting && isSelected
              ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10'
              : isSelecting
                ? 'border-white/10 hover:border-indigo-300'
                : item.status === 'approved'
                  ? 'border-green-500/30'
                  : item.status === 'rejected'
                    ? 'border-red-500/30'
                    : item.status === 'maybe'
                      ? 'border-amber-500/30'
                      : 'border-white/5'
            }`}
          onClick={(e) => handleCardClick(item, e)}
        >
          <SmartImage
            src={item.image}
            className="w-full h-full"
          />

          {/* ── Selection Checkbox Overlay ── */}
          <AnimatePresence>
            {isSelecting && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute top-3 left-3 z-20"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 border-2
                    ${isSelected
                      ? 'bg-indigo-500 border-indigo-500 shadow-lg shadow-indigo-500/30'
                      : 'bg-black/30 border-white/40 backdrop-blur-sm hover:border-indigo-400'
                    }`}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <Check size={14} strokeWidth={3} className="text-white" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Status Badge (Top Right) ── */}
          <div className="absolute top-3 right-3 z-10 pointer-events-none">
            {item.status === 'approved' && (
              <div className="bg-green-500 text-white p-1.5 rounded-full shadow-lg shadow-green-900/20 backdrop-blur-md">
                <Check size={14} strokeWidth={3} />
              </div>
            )}
            {item.status === 'rejected' && (
              <div className="bg-red-500 text-white p-1.5 rounded-full shadow-lg shadow-red-900/20 backdrop-blur-md">
                <X size={14} strokeWidth={3} />
              </div>
            )}
            {item.status === 'maybe' && (
              <div className="bg-amber-500 text-white p-1.5 rounded-full shadow-lg shadow-amber-900/20 backdrop-blur-md">
                <Clock size={14} strokeWidth={3} />
              </div>
            )}
          </div>

          {/* ── Quick Actions on Hover (only in non-select mode) ── */}
          {!isSelecting && onQuickStatus && (
            <div className="absolute bottom-3 left-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex items-center justify-center gap-1.5 bg-black/60 backdrop-blur-md rounded-xl p-1.5 border border-white/10">
                <button
                  onClick={(e) => { e.stopPropagation(); onQuickStatus(item.id, 'approved'); }}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold transition-all
                    ${item.status === 'approved'
                      ? 'bg-green-500 text-white'
                      : 'text-zinc-300 hover:bg-green-500/20 hover:text-green-400'
                    }`}
                >
                  <CheckCircle2 size={14} />
                  <span className="hidden xl:inline">اعتماد</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onQuickStatus(item.id, 'maybe'); }}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold transition-all
                    ${item.status === 'maybe'
                      ? 'bg-amber-500 text-white'
                      : 'text-zinc-300 hover:bg-amber-500/20 hover:text-amber-400'
                    }`}
                >
                  <HelpCircle size={14} />
                  <span className="hidden xl:inline">حاير</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onQuickStatus(item.id, 'rejected'); }}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold transition-all
                    ${item.status === 'rejected'
                      ? 'bg-red-500 text-white'
                      : 'text-zinc-300 hover:bg-red-500/20 hover:text-red-400'
                    }`}
                >
                  <XCircle size={14} />
                  <span className="hidden xl:inline">رفض</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Team Member & Overlay (non-select mode) ── */}
          {!isSelecting && (
            <>
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md pl-1 pr-3 py-1 rounded-full border border-white/10">
                  <img
                    src={item.assignedTo.avatar}
                    alt={item.assignedTo.name}
                    className="w-6 h-6 rounded-full border border-white/20"
                  />
                  <span className="text-[10px] text-white font-bold">{item.assignedTo.name}</span>
                </div>
              </div>

              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 pointer-events-none">
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-amber-400 text-xs font-bold uppercase tracking-wider block">
                      {item.category}
                    </span>
                    <span className="text-zinc-500 text-[10px] font-mono">
                      {item.date}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-xl mb-3 leading-tight">{item.title}</h3>
                </div>
              </div>
            </>
          )}

          {/* ── Selection Dimmed Overlay ── */}
          {isSelecting && !isSelected && (
            <div className="absolute inset-0 bg-black/20 pointer-events-none transition-opacity" />
          )}
        </div>
      );
    },
    [isSelecting, selectedIds, handleCardClick, onQuickStatus],
  );

  // ── Small lists: plain grid with animations ──
  if (items.length <= 30) {
    return (
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              {renderCard(item)}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ── Large lists: virtualized grid ──
  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ height: '80vh' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowItems = rows[virtualRow.index] ?? [];
          return (
            <div
              key={String(virtualRow.key)}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 absolute left-0 w-full"
              style={{
                top: `${virtualRow.start}px`,
                height: `${ROW_HEIGHT}px`,
              }}
            >
              {rowItems.map((item) => renderCard(item))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GalleryGridWidget;
