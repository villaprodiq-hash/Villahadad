import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Image, FileType, Droplet } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onExport: (settings: ExportSettings) => void;
}

export interface ExportSettings {
  format: 'JPG' | 'PNG' | 'TIFF';
  quality: number;
  size: 'full' | 'web' | 'print';
  watermark: boolean;
}

const BatchExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, selectedCount, onExport }) => {
  const [format, setFormat] = React.useState<'JPG' | 'PNG' | 'TIFF'>('JPG');
  const [quality, setQuality] = React.useState(95);
  const [size, setSize] = React.useState<'full' | 'web' | 'print'>('full');
  const [watermark, setWatermark] = React.useState(false);

  const handleExport = () => {
    onExport({ format, quality, size, watermark });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-[#1e1e1e] border border-[#2d2d2d] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="h-14 bg-[#2d2d2d] border-b border-[#3d3d3d] flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <Download size={20} className="text-blue-400" />
              <h2 className="text-white font-bold">Batch Export</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#3d3d3d] transition-colors"
            >
              <X size={18} className="text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Selected Count */}
            <div className="p-4 rounded-lg bg-blue-600/10 border border-blue-600/30">
              <p className="text-blue-400 text-sm">
                <span className="font-black text-2xl">{selectedCount}</span> صورة محددة
              </p>
            </div>

            {/* Format */}
            <div>
              <label className="text-gray-400 text-xs font-bold uppercase block mb-2">
                <FileType size={14} className="inline mr-1" />
                Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['JPG', 'PNG', 'TIFF'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`p-3 rounded-lg font-bold text-sm transition-all ${
                      format === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#3d3d3d]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            {format === 'JPG' && (
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase block mb-2">
                  Quality: {quality}%
                </label>
                <input
                  type="range"
                  min="60"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full h-2 bg-[#2d2d2d] rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            )}

            {/* Size */}
            <div>
              <label className="text-gray-400 text-xs font-bold uppercase block mb-2">
                <Image size={14} className="inline mr-1" />
                Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['full', 'web', 'print'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`p-3 rounded-lg font-bold text-sm transition-all ${
                      size === s
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#3d3d3d]'
                    }`}
                  >
                    {s === 'full' ? 'Full' : s === 'web' ? 'Web' : 'Print'}
                  </button>
                ))}
              </div>
            </div>

            {/* Watermark */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={watermark}
                  onChange={(e) => setWatermark(e.target.checked)}
                  className="w-5 h-5 rounded bg-[#2d2d2d] border-2 border-gray-600 checked:bg-blue-600 checked:border-blue-600"
                />
                <div className="flex items-center gap-2">
                  <Droplet size={14} className="text-gray-400" />
                  <span className="text-white text-sm font-bold">Add Watermark</span>
                </div>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="h-16 bg-[#2d2d2d] border-t border-[#3d3d3d] flex items-center justify-end gap-3 px-6">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#3d3d3d] hover:bg-[#4d4d4d] text-white font-bold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all flex items-center gap-2"
            >
              <Download size={16} />
              Export {selectedCount} Images
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BatchExportModal;
