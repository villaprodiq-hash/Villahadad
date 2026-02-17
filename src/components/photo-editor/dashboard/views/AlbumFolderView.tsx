import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Tag, Grid3x3, List, Download } from 'lucide-react';
import type { Album, AlbumImage } from '../types';
import BatchExportModal, { ExportSettings } from '../widgets/BatchExportModal';

interface AlbumFolderViewProps {
  album: Album;
  onBack: () => void;
  onOpenImage: (image: AlbumImage) => void;
}

type ImageFilter = 'all' | 'pending' | 'completed';

const AlbumFolderView: React.FC<AlbumFolderViewProps> = ({ album, onBack, onOpenImage }) => {
  // Use real album images if available, otherwise show empty state
  const [loadedImages, setLoadedImages] = React.useState<AlbumImage[]>(album.images || []);
  const [, setIsLoadingNAS] = React.useState(false);

  // Try to load images from NAS folder when album opens
  React.useEffect(() => {
    const loadFromNAS = async () => {
      if (loadedImages.length > 0) return;
      setIsLoadingNAS(true);
      try {
        const electronAPI = window.electronAPI;
        const listDirectory = electronAPI?.fileSystem?.listDirectory;
        if (!listDirectory) return;

        // Resolve missing folderPath from sessions table when booking row doesn't have it.
        let resolvedSessionPath = album.folderPath || '';
        if (!resolvedSessionPath && electronAPI?.db?.query) {
          const attempts = [
            {
              sql: `SELECT nasPath AS path FROM sessions WHERE bookingId = ? AND nasPath IS NOT NULL ORDER BY updatedAt DESC LIMIT 1`,
              params: [album.bookingId],
            },
            {
              sql: `SELECT nasPath AS path FROM sessions WHERE id = ? AND nasPath IS NOT NULL ORDER BY updatedAt DESC LIMIT 1`,
              params: [album.bookingId],
            },
            {
              sql: `SELECT nas_path AS path FROM sessions WHERE booking_id = ? AND nas_path IS NOT NULL ORDER BY updated_at DESC LIMIT 1`,
              params: [album.bookingId],
            },
          ];
          for (const attempt of attempts) {
            try {
              const rows = await electronAPI.db.query(attempt.sql, attempt.params);
              const firstRow = Array.isArray(rows) && rows.length > 0
                ? (rows[0] as Record<string, unknown>)
                : null;
              if (firstRow?.path) {
                resolvedSessionPath = String(firstRow.path);
                break;
              }
            } catch {
              // Try next schema variation
            }
          }
        }

        if (!resolvedSessionPath) return;

        // Editor should work on client-selected photos first.
        const selectedDir = `${resolvedSessionPath}/02_SELECTED`;
        const rawDir = `${resolvedSessionPath}/01_RAW`;
        let activeDir = selectedDir;

        let files: Array<string | { name: string; path: string; isDirectory?: boolean }> = [];
        try {
          files = await listDirectory(selectedDir);
        } catch {
          files = [];
        }
        // Fallback to RAW only when no selected files exist yet.
        if (!Array.isArray(files) || files.length === 0) {
          activeDir = rawDir;
          try {
            files = await listDirectory(rawDir);
          } catch {
            files = [];
          }
        }

        const imageFiles = (files || [])
          .map((entry) =>
            typeof entry === 'string'
              ? { name: entry, path: `${activeDir}/${entry}` }
              : entry
          )
          .filter((entry) =>
            /\.(jpg|jpeg|png|webp|heic|tiff?|raw|cr2|cr3|nef|arw|dng|orf|rw2)$/i.test(entry.name)
          );

        const mapped: AlbumImage[] = imageFiles.map((entry, i: number) => ({
          id: `img-${i + 1}`,
          filename: entry.name,
          path: entry.path || `${activeDir}/${entry.name}`,
          status: 'pending' as const,
          retouchNotes: [],
          thumbnail: `file://${entry.path || `${activeDir}/${entry.name}`}`,
        }));
        setLoadedImages(mapped);
      } catch (err) {
        console.warn('[AlbumFolderView] Could not load NAS folder:', err);
      } finally {
        setIsLoadingNAS(false);
      }
    };
    loadFromNAS();
  }, [album.bookingId, album.folderPath, loadedImages.length]);

  const [filter, setFilter] = useState<ImageFilter>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);

  const filteredImages = loadedImages.filter(img => {
    if (filter === 'all') return true;
    return img.status === filter;
  });

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedImages(new Set(filteredImages.map(img => img.id)));
  };

  const deselectAll = () => {
    setSelectedImages(new Set());
  };

  const handleExport = (settings: ExportSettings) => {
    const selectedImagesList = Array.from(selectedImages);
    alert(`Exporting ${selectedImagesList.length} images with settings:\nFormat: ${settings.format}\nQuality: ${settings.quality}%\nSize: ${settings.size}\nWatermark: ${settings.watermark ? 'Yes' : 'No'}`);
    // TODO: Implement actual export logic
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - Thumbnails */}
      <div className="w-72 bg-[#1e1e1e] border-l border-[#2d2d2d] flex flex-col">
        <div className="h-10 bg-[#2d2d2d] border-b border-[#3d3d3d] flex items-center px-3 justify-between">
          <span className="text-gray-300 text-xs font-bold uppercase tracking-wider">Images</span>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
            >
              <Grid3x3 size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
            >
              <List size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2">
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-1'}>
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className="relative group rounded overflow-hidden border-2 border-transparent hover:border-blue-600 transition-all"
              >
                {/* Checkbox */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleImageSelection(image.id);
                  }}
                  className="absolute top-2 left-2 z-10 cursor-pointer"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    selectedImages.has(image.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-black/50 border-white/50 hover:border-white'
                  }`}>
                    {selectedImages.has(image.id) && (
                      <CheckCircle2 size={14} className="text-white" />
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onOpenImage(image)}
                  className="w-full"
                >
                  <img
                    src={image.thumbnail}
                    alt={image.filename}
                    className={`w-full object-cover ${viewMode === 'grid' ? 'aspect-square' : 'h-16'}`}
                  />
                  
                  {image.status === 'completed' && (
                    <div className="absolute top-2 right-2 p-0.5 rounded-full bg-emerald-500">
                      <CheckCircle2 size={12} className="text-white" />
                    </div>
                  )}

                  {image.retouchNotes.length > 0 && (
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-purple-500 rounded-full">
                      <span className="text-white text-[9px] font-bold">{image.retouchNotes.length}</span>
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded hover:bg-[#2d2d2d] transition-colors"
            >
              <ArrowRight size={18} className="text-gray-400" />
            </button>
            <div>
              <h2 className="text-white font-bold">{album.projectName}</h2>
              <p className="text-gray-500 text-xs">{album.clientName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selection Controls */}
            {selectedImages.size > 0 && (
              <>
                <span className="text-blue-400 text-sm font-bold">{selectedImages.size} selected</span>
                <button
                  onClick={deselectAll}
                  className="px-3 py-1.5 rounded text-xs font-bold bg-[#2d2d2d] text-gray-400 hover:text-white transition-all"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="px-3 py-1.5 rounded text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center gap-1"
                >
                  <Download size={14} />
                  Export
                </button>
              </>
            )}
            
            {selectedImages.size === 0 && (
              <button
                onClick={selectAll}
                className="px-3 py-1.5 rounded text-xs font-bold bg-[#2d2d2d] text-gray-400 hover:text-white transition-all"
              >
                Select All
              </button>
            )}

            {/* Filters */}
            {(['all', 'pending', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Done'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 bg-[#252525]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[#1e1e1e] border border-[#3d3d3d] flex items-center justify-center">
              <Tag size={28} className="text-gray-600" />
            </div>
            <h3 className="text-white text-lg font-bold mb-2">Select an Image</h3>
            <p className="text-gray-500 text-sm">Click on any thumbnail to view and edit</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Info */}
      <div className="w-64 bg-[#1e1e1e] border-r border-[#2d2d2d] flex flex-col">
        <div className="h-10 bg-[#2d2d2d] border-b border-[#3d3d3d] flex items-center px-3">
          <span className="text-gray-300 text-xs font-bold uppercase tracking-wider">Info</span>
        </div>
        
        <div className="flex-1 p-3 space-y-4">
          <div>
            <label className="text-gray-500 text-[10px] uppercase tracking-wider block mb-1">Progress</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#2d2d2d] rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-blue-600"
                  style={{ width: `${(album.completedImages / album.totalImages) * 100}%` }}
                />
              </div>
              <span className="text-white text-sm font-bold">
                {Math.round((album.completedImages / album.totalImages) * 100)}%
              </span>
            </div>
          </div>

          <div>
            <label className="text-gray-500 text-[10px] uppercase tracking-wider block mb-1">Total</label>
            <p className="text-white text-xl font-bold">{album.totalImages}</p>
          </div>

          <div>
            <label className="text-gray-500 text-[10px] uppercase tracking-wider block mb-1">Completed</label>
            <p className="text-emerald-400 text-xl font-bold">{album.completedImages}</p>
          </div>

          <div>
            <label className="text-gray-500 text-[10px] uppercase tracking-wider block mb-1">Remaining</label>
            <p className="text-amber-400 text-xl font-bold">{album.totalImages - album.completedImages}</p>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <BatchExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedCount={selectedImages.size}
        onExport={handleExport}
      />
    </div>
  );
};

export default AlbumFolderView;
