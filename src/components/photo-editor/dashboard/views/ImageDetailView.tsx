import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, CheckCircle2, Tag, ExternalLink, 
  FolderOpen, Check, X, ZoomIn, ZoomOut
} from 'lucide-react';
import { Album, AlbumImage } from '../PhotoEditorDashboard';

interface ImageDetailViewProps {
  image: AlbumImage;
  album: Album;
  onBack: () => void;
  allImages?: AlbumImage[];
  onNavigate?: (image: AlbumImage) => void;
}

const ImageDetailView: React.FC<ImageDetailViewProps> = ({ image, album, onBack, allImages = [], onNavigate }) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isMarkedDone, setIsMarkedDone] = useState(image.status === 'completed');
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentIndex = allImages.findIndex(img => img.id === image.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allImages.length - 1;

  const handlePrev = () => {
    if (hasPrev && onNavigate) {
      onNavigate(allImages[currentIndex - 1]);
      setPan({ x: 0, y: 0 }); // Reset pan on image change
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigate) {
      onNavigate(allImages[currentIndex + 1]);
      setPan({ x: 0, y: 0 }); // Reset pan on image change
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      const newZoom = Math.max(25, Math.min(400, zoom + delta));
      setZoom(newZoom);
      
      // Reset pan if zooming out to 100% or less
      if (newZoom <= 100) {
        setPan({ x: 0, y: 0 });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 100) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 100) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    if (newZoom <= 100) {
      setPan({ x: 0, y: 0 });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  useEffect(() => {
    const handleClick = () => setShowContextMenu(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'm' || e.key === 'M') handleMarkAsDone();
      if (e.key === 'p' || e.key === 'P') handleOpenInPhotoshop();
      if (e.key === 'e' || e.key === 'E') handleShowInExplorer();
      if (e.key === '=' || e.key === '+') handleZoomChange(Math.min(400, zoom + 25));
      if (e.key === '-' || e.key === '_') handleZoomChange(Math.max(25, zoom - 25));
      if (e.key === '0') handleZoomChange(100);
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, allImages, zoom]);

  const handleOpenInPhotoshop = () => {
    alert(`Open in Photoshop: ${image.path}`);
    setShowContextMenu(false);
  };

  const handleShowInExplorer = () => {
    alert(`Show in Explorer: ${image.path}`);
    setShowContextMenu(false);
  };

  const handleMarkAsDone = () => {
    setIsMarkedDone(!isMarkedDone);
    alert(isMarkedDone ? 'Unmarked as done' : 'Marked as done');
  };

  return (
    <div className="h-full flex">
      {/* Main Canvas */}
      <div className="flex-1 flex flex-col bg-[#252525]">
        {/* Top Toolbar */}
        <div className="h-12 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center px-4 justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded hover:bg-[#2d2d2d] transition-colors"
            >
              <ArrowRight size={18} className="text-gray-400" />
            </button>
            
            {/* Navigation Arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                disabled={!hasPrev}
                className={`p-1.5 rounded transition-colors ${
                  hasPrev ? 'hover:bg-[#2d2d2d] text-gray-400' : 'text-gray-700 cursor-not-allowed'
                }`}
              >
                <ArrowRight size={16} className="rotate-180" />
              </button>
              <span className="text-gray-600 text-xs px-2">
                {currentIndex + 1} / {allImages.length}
              </span>
              <button
                onClick={handleNext}
                disabled={!hasNext}
                className={`p-1.5 rounded transition-colors ${
                  hasNext ? 'hover:bg-[#2d2d2d] text-gray-400' : 'text-gray-700 cursor-not-allowed'
                }`}
              >
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="w-px h-6 bg-[#3d3d3d]" />
            <span className="text-white text-sm font-medium">{image.filename}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleZoomChange(Math.max(25, zoom - 25))}
              className="p-1.5 rounded hover:bg-[#2d2d2d] transition-colors"
            >
              <ZoomOut size={16} className="text-gray-400" />
            </button>
            <button
              onClick={() => handleZoomChange(100)}
              className="text-gray-400 text-xs font-mono w-16 text-center hover:text-white transition-colors"
            >
              {zoom}%
            </button>
            <button
              onClick={() => handleZoomChange(Math.min(400, zoom + 25))}
              className="p-1.5 rounded hover:bg-[#2d2d2d] transition-colors"
            >
              <ZoomIn size={16} className="text-gray-400" />
            </button>

            <div className="w-px h-6 bg-[#3d3d3d] mx-2" />

            <button
              onClick={handleMarkAsDone}
              className={`px-3 py-1.5 rounded font-bold text-xs transition-all ${
                isMarkedDone
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
              }`}
            >
              {isMarkedDone ? '✓ Done' : 'Mark Done'}
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div 
          className="flex-1 flex items-center justify-center overflow-hidden bg-[#1a1a1a]"
          onContextMenu={handleContextMenu}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={() => handleZoomChange(100)}
          style={{ cursor: zoom > 100 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          <div 
            style={{ 
              transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={image.thumbnail}
              alt={image.filename}
              style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
              className="rounded shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Properties */}
      <div className="w-80 bg-[#1e1e1e] border-r border-[#2d2d2d] flex flex-col">
        <div className="h-10 bg-[#2d2d2d] border-b border-[#3d3d3d] flex items-center px-3">
          <span className="text-gray-300 text-xs font-bold uppercase tracking-wider">Properties</span>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-4">
          {/* File Info */}
          <div>
            <label className="text-gray-500 text-[10px] uppercase tracking-wider block mb-2">File Info</label>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Name:</span>
                <span className="text-white font-mono">{image.filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={isMarkedDone ? 'text-emerald-400' : 'text-amber-400'}>
                  {isMarkedDone ? 'Completed' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Retouch Notes */}
          <div>
            <label className="text-gray-500 text-[10px] uppercase tracking-wider block mb-2">Retouch Notes</label>
            {image.retouchNotes.length > 0 ? (
              <div className="space-y-2">
                {image.retouchNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-2 rounded bg-purple-500/10 border border-purple-500/20"
                  >
                    <p className="text-purple-300 font-bold text-xs">{note.type}</p>
                    {note.note && (
                      <p className="text-gray-400 text-[10px] mt-1">{note.note}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-xs">No retouch notes</p>
            )}
          </div>

          {/* Actions */}
          <div>
            <label className="text-gray-500 text-[10px] uppercase tracking-wider block mb-2">Actions</label>
            <div className="space-y-2">
              <button
                onClick={handleOpenInPhotoshop}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink size={12} />
                Open in Photoshop
              </button>

              <button
                onClick={handleShowInExplorer}
                className="w-full px-3 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white text-xs font-bold rounded transition-all flex items-center justify-center gap-2"
              >
                <FolderOpen size={12} />
                Show in Explorer
              </button>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <label className="text-gray-500 text-[10px] uppercase tracking-wider block mb-2">Shortcuts</label>
            <div className="space-y-1 text-[10px] text-gray-500">
              <div className="flex justify-between">
                <span>Previous/Next</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#2d2d2d] rounded font-mono">←</kbd>
                  <kbd className="px-1.5 py-0.5 bg-[#2d2d2d] rounded font-mono">→</kbd>
                </div>
              </div>
              <div className="flex justify-between">
                <span>Zoom In/Out</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#2d2d2d] rounded font-mono">+</kbd>
                  <kbd className="px-1.5 py-0.5 bg-[#2d2d2d] rounded font-mono">-</kbd>
                </div>
              </div>
              <div className="flex justify-between">
                <span>Zoom 100%</span>
                <kbd className="px-1.5 py-0.5 bg-[#2d2d2d] rounded font-mono">0</kbd>
              </div>
              <div className="flex justify-between">
                <span>Mouse Zoom</span>
                <kbd className="px-1.5 py-0.5 bg-[#2d2d2d] rounded font-mono text-[8px]">Ctrl+Scroll</kbd>
              </div>
              <div className="flex justify-between">
                <span>Mark Done</span>
                <kbd className="px-1.5 py-0.5 bg-[#2d2d2d] rounded font-mono">M</kbd>
              </div>
              <div className="flex justify-between">
                <span>Photoshop</span>
                <kbd className="px-1.5 py-0.5 bg-[#2d2d2d] rounded font-mono">P</kbd>
              </div>
              <div className="flex justify-between">
                <span>Explorer</span>
                <kbd className="px-1.5 py-0.5 bg-[#2d2d2d] rounded font-mono">E</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {showContextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              position: 'fixed',
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
            }}
            className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg shadow-2xl overflow-hidden z-50 min-w-[180px]"
          >
            <button
              onClick={handleOpenInPhotoshop}
              className="w-full px-3 py-2 text-right text-white hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
            >
              <ExternalLink size={14} />
              Open in Photoshop
            </button>
            <button
              onClick={handleShowInExplorer}
              className="w-full px-3 py-2 text-right text-white hover:bg-[#3d3d3d] transition-colors flex items-center gap-2 text-sm"
            >
              <FolderOpen size={14} />
              Show in Explorer
            </button>
            <div className="border-t border-[#3d3d3d]" />
            <button
              onClick={handleMarkAsDone}
              className="w-full px-3 py-2 text-right text-white hover:bg-emerald-600 transition-colors flex items-center gap-2 text-sm"
            >
              {isMarkedDone ? <X size={14} /> : <Check size={14} />}
              {isMarkedDone ? 'Unmark' : 'Mark as Done'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageDetailView;
