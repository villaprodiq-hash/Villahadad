import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GalleryFolderCard, { GalleryFolder } from './GalleryFolderCard';
import { FolderPlus } from 'lucide-react';

interface GalleryAlbumsGridProps {
  folders: GalleryFolder[];
  onFolderClick: (folder: GalleryFolder) => void;
  onFolderDrop?: (folder: GalleryFolder, files: FileList) => void;
  onDelete?: (folder: GalleryFolder) => void;
  theme?: 'amber' | 'pink';
}

const GalleryAlbumsGrid: React.FC<GalleryAlbumsGridProps> = (props) => {
    const { folders, onFolderClick, onFolderDrop, onDelete } = props;
  return (
    <motion.div 
       className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8 gap-4"
    >
       <AnimatePresence>
          {/* Album Cards */}
          {folders.map((folder) => (
             <motion.div
                key={folder.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
             >
                <GalleryFolderCard 
                   folder={folder} 
                   onClick={() => onFolderClick(folder)} 
                   onDropFiles={(files) => onFolderDrop && onFolderDrop(folder, files)}
                   onDelete={() => onDelete && onDelete(folder)}
                   theme={props.theme}
                />
             </motion.div>
          ))}
       </AnimatePresence>
    </motion.div>
  );
};

export default GalleryAlbumsGrid;
