/**
 * SelectionDashboard Component
 * 
 * Dashboard for selecting images from a photoshoot session.
 * - Drag & drop upload
 * - Grid view of all images
 * - Toggle selection (like/reject)
 * - Filter by selection status
 * - Progress tracking
 */

import React, { useCallback, useState } from 'react';
import { useSessionLifecycle } from '../../hooks/useSessionLifecycle';
import { SessionImage } from '../../hooks/useSessionLifecycle';
import { Check, X, Image as ImageIcon, Upload, Grid, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';

interface SelectionDashboardProps {
  bookingId: string;
  clientName: string;
  onComplete?: () => void;
}

type FilterMode = 'all' | 'selected' | 'unselected';

export function SelectionDashboard({ bookingId, clientName, onComplete }: SelectionDashboardProps) {
  console.log('[SelectionDashboard] Rendering for booking:', bookingId, 'client:', clientName);
  
  const {
    session,
    images,
    isUploading,
    uploadProgress,
    uploadStatus,
    selectedCount,
    totalCount,
    uploadFiles,
    toggleSelection,
  } = useSessionLifecycle({ bookingId, clientName });

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [isDragging, setIsDragging] = useState(false);

  // Filter images based on current filter mode
  const filteredImages = images.filter(img => {
    if (filterMode === 'selected') return img.isSelected;
    if (filterMode === 'unselected') return !img.isSelected;
    return true;
  });

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      void uploadFiles(files);
    }
  }, [uploadFiles]);

  // Handle file input change
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void uploadFiles(files);
    }
  }, [uploadFiles]);

  // Get selection progress percentage
  const selectionProgress = totalCount > 0 
    ? Math.round((selectedCount / totalCount) * 100) 
    : 0;

  const handleCompleteSelection = useCallback(async () => {
    if (selectedCount === 0) return;

    const selectedFileNames = images
      .filter(img => img.isSelected)
      .map(img => img.fileName)
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);

    if (!selectedFileNames.length) {
      toast.error('لا توجد صور مختارة');
      return;
    }

    const sessionPath =
      typeof session?.folderPath === 'string' && session.folderPath.trim().length > 0
        ? session.folderPath
        : '';

    const copyToSelected = window.electronAPI?.sessionLifecycle?.copyToSelected;
    if (!sessionPath || !copyToSelected) {
      toast.error('تعذر تحديد مسار الجلسة لنسخ الصور المختارة');
      return;
    }

    const copyResult = await copyToSelected(sessionPath, selectedFileNames);
    const copied = Number(copyResult?.copied || 0);
    const failed = Number(copyResult?.failed || 0);
    const expected = selectedFileNames.length;

    if (copied < expected || failed > 0) {
      toast.error(`تم نسخ ${copied}/${expected} فقط. أكمل النسخ قبل الإرسال للمحرر.`);
      return;
    }

    toast.success(`تم نسخ ${copied} صورة إلى مجلد 02_SELECTED`);
    onComplete?.();
  }, [images, onComplete, selectedCount, session?.folderPath]);

  return (
    <div className="w-full h-full flex flex-col bg-[#21242b]">
      {/* Header */}
      <div className="bg-[#1a1c22] border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">اختيار الصور</h2>
          <p className="text-sm text-gray-400">{clientName}</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Progress Stats */}
          <div className="flex items-center gap-2 bg-[#21242b] px-4 py-2 rounded-lg border border-white/10">
            <CheckSquare className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-white">
              {selectedCount} / {totalCount} مختارة
            </span>
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${selectionProgress}%` }}
              />
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-1 bg-[#21242b] p-1 rounded-lg border border-white/10">
            <FilterButton 
              active={filterMode === 'all'} 
              onClick={() => setFilterMode('all')}
              icon={<Grid className="w-4 h-4" />}
              label="الكل"
            />
            <FilterButton 
              active={filterMode === 'selected'} 
              onClick={() => setFilterMode('selected')}
              icon={<Check className="w-4 h-4" />}
              label="المختارة"
            />
            <FilterButton 
              active={filterMode === 'unselected'} 
              onClick={() => setFilterMode('unselected')}
              icon={<X className="w-4 h-4" />}
              label="الغير مختارة"
            />
          </div>
        </div>
      </div>

      {/* Upload Area */}
      {totalCount === 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            mx-6 mt-6 p-12 border-2 border-dashed rounded-xl text-center transition-all
            ${isDragging 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-gray-600 bg-[#1a1c22] hover:border-gray-500'
            }
          `}
        >
          <Upload className="w-12 h-12 mx-auto text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            اسحب الصور هنا
          </h3>
          <p className="text-gray-400 mb-4">
            أو انقر لاختيار الملفات من جهازك
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#C94557] text-white rounded-lg hover:bg-[#C94557]/90 cursor-pointer transition-colors">
            <ImageIcon className="w-4 h-4" />
            <span>اختر الصور</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="mx-6 mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-400">{uploadStatus}</span>
            <span className="text-sm text-blue-400">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Images Grid */}
      <div className="flex-1 overflow-auto p-6">
        {filteredImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <ImageIcon className="w-16 h-16 mb-4" />
            <p className="text-lg">لا توجد صور {filterMode !== 'all' ? 'في هذا التصنيف' : ''}</p>
            {totalCount === 0 && !isUploading && (
              <p className="text-sm mt-2">قم برفع الصور للبدء</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredImages.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                onToggle={() => toggleSelection(image.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {totalCount > 0 && (
        <div className="bg-[#1a1c22] border-t border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#21242b] text-gray-300 rounded-lg hover:bg-[#2a2d35] cursor-pointer transition-colors border border-white/10">
              <Upload className="w-4 h-4" />
              <span>إضافة صور</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {selectedCount} صورة مختارة من {totalCount}
            </span>
            <button
              onClick={() => {
                void handleCompleteSelection();
              }}
              disabled={selectedCount === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
            >
              إتمام الاختيار
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Filter Button Component
interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function FilterButton({ active, onClick, icon, label }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
        ${active 
          ? 'bg-[#C94557] text-white' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Image Card Component
interface ImageCardProps {
  image: SessionImage;
  onToggle: () => void;
}

function ImageCard({ image, onToggle }: ImageCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div 
      className={`
        relative group rounded-lg overflow-hidden bg-[#1a1c22] cursor-pointer
        transition-all duration-200 hover:shadow-lg border border-white/10
        ${image.isSelected ? 'ring-2 ring-green-500' : ''}
      `}
      onClick={onToggle}
    >
      {/* Image */}
      <div className="aspect-square relative">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        <img
          src={image.cloudUrl ?? undefined}
          alt={image.fileName}
          className={`
            w-full h-full object-contain bg-black/30 transition-opacity duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
      </div>

      {/* Selection Overlay */}
      <div className={`
        absolute inset-0 flex items-center justify-center
        transition-opacity duration-200
        ${image.isSelected ? 'bg-green-500/20 opacity-100' : 'bg-black/0 opacity-0 group-hover:bg-black/40'}
      `}>
        {image.isSelected ? (
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <Check className="w-6 h-6 text-white" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <Check className="w-6 h-6 text-gray-600" />
          </div>
        )}
      </div>

      {/* Filename */}
      <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-2">
        <p className="text-xs text-white truncate">{image.fileName}</p>
      </div>

      {/* Selection Badge */}
      {image.isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-md">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}
