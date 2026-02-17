import React, { useState, useCallback } from 'react';
import { Search, Grid3x3, List, FolderOpen, Image as ImageIcon, RefreshCw } from 'lucide-react';
import type { AlbumImage } from '../types';

interface GalleryViewProps {
  onOpenImage: (image: AlbumImage) => void;
}

interface DirectoryImageEntry {
  name: string;
  path: string;
}

const FILTER_OPTIONS: Array<{ value: 'all' | 'pending' | 'completed'; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'pending', label: 'معلق' },
  { value: 'completed', label: 'مكتمل' },
];

const GalleryView: React.FC<GalleryViewProps> = ({ onOpenImage }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [images, setImages] = useState<AlbumImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [nasPath, setNasPath] = useState('');

  // Try to load images from NAS
  const loadFromNas = useCallback(async (folderPath: string) => {
    if (!folderPath) return;
    setLoading(true);
    try {
      const api = window.electronAPI;
      if (api?.fileSystem?.listDirectory) {
        const files = await api.fileSystem.listDirectory(folderPath);
        if (files && Array.isArray(files)) {
          const imageFiles = files
            .filter((entry): entry is DirectoryImageEntry => (
              typeof entry === 'object' &&
              entry !== null &&
              'name' in entry &&
              'path' in entry &&
              typeof (entry as { name: unknown }).name === 'string' &&
              typeof (entry as { path: unknown }).path === 'string'
            ))
            .filter((f: DirectoryImageEntry) => /\.(jpg|jpeg|png|raw|cr2|arw|heic|webp|tif|tiff)$/i.test(f.name))
            .map((f: DirectoryImageEntry, index: number) => ({
              id: `nas-${index}`,
              filename: f.name,
              path: f.path,
              status: 'pending' as const,
              retouchNotes: [],
              thumbnail: `file://${f.path}`,
            }));
          setImages(imageFiles);
        }
      }
    } catch (e) {
      console.error('Failed to load NAS files:', e);
    }
    setLoading(false);
  }, []);

  const filteredImages = images.filter(img => {
    const matchesSearch = img.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || img.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="h-14 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center px-6 gap-4" dir="rtl">
        <h2 className="text-white font-bold">المعرض</h2>

        <div className="flex-1 max-w-md relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="بحث عن صورة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg pr-10 pl-3 text-white text-sm focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex gap-2">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded text-xs font-bold ${
                filterStatus === f.value ? 'bg-blue-600 text-white' : 'bg-[#2d2d2d] text-gray-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
          >
            <Grid3x3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* NAS Path Input */}
      <div className="h-12 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center px-6 gap-3" dir="rtl">
        <FolderOpen size={16} className="text-blue-500 shrink-0" />
        <input
          type="text"
          value={nasPath}
          onChange={e => setNasPath(e.target.value)}
          placeholder="مسار مجلد NAS مثل: /Volumes/NAS/Photos/..."
          className="flex-1 h-8 bg-[#2d2d2d] border border-[#3d3d3d] rounded px-3 text-white text-xs focus:outline-none focus:border-blue-600 font-mono"
          dir="ltr"
        />
        <button
          onClick={() => loadFromNas(nasPath)}
          disabled={!nasPath || loading}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          تحميل
        </button>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-auto p-6">
        {images.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <ImageIcon size={48} className="text-gray-700 mb-4" />
            <p className="text-gray-400 text-lg font-bold mb-2">لا توجد صور محملة</p>
            <p className="text-gray-600 text-sm max-w-md">
              أدخل مسار مجلد NAS أعلاه واضغط &quot;تحميل&quot; لعرض الصور،
              أو افتح مشروع من قائمة المشاريع
            </p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-6 gap-4' : 'space-y-2'}>
            {filteredImages.map((image) => (
              <button
                key={image.id}
                onClick={() => onOpenImage(image)}
                className="relative group rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-600 transition-all"
              >
                <img
                  src={image.thumbnail}
                  alt={image.filename}
                  className={`w-full object-cover ${viewMode === 'grid' ? 'aspect-square' : 'h-20'}`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).style.background = '#2d2d2d';
                  }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{image.filename}</span>
                </div>
                {image.status === 'completed' && (
                  <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                    <span className="text-white text-[8px]">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryView;
