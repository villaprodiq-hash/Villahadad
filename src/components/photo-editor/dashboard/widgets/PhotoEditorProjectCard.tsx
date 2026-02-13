import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Eye } from 'lucide-react';

interface EditingProject {
  id: string;
  clientName: string;
  projectName: string;
  totalImages: number;
  editedImages: number;
  status: 'pending' | 'in-progress' | 'review' | 'approved' | 'revision';
  priority: 'high' | 'normal' | 'low';
  deadline: string;
  assignedTo: string;
  thumbnail: string;
}

interface ProjectCardProps {
  project: EditingProject;
  index: number;
  onSelect: (project: EditingProject) => void;
  onStartEditing: (project: EditingProject) => void;
  onSubmitForReview: (project: EditingProject) => void;
}

const PhotoEditorProjectCard: React.FC<ProjectCardProps> = ({
  project,
  index,
  onSelect,
  onStartEditing,
  onSubmitForReview
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onSelect(project)}
      className="group p-2 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10 hover:border-blue-400/50 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-2">
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-400/30 flex items-center justify-center text-2xl shadow-lg">
          {project.thumbnail}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-[10px] truncate">{project.projectName}</h3>
            {project.priority === 'high' && (
              <span className="px-1.5 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[7px] font-bold rounded-full">
                عاجل
              </span>
            )}
          </div>
          <p className="text-gray-400 text-[8px]">{project.clientName}</p>
          
          {/* Progress */}
          <div className="mt-1">
            <div className="flex justify-between text-[7px] text-gray-400 mb-0.5">
              <span>{project.editedImages} / {project.totalImages} صورة</span>
              <span>{Math.round((project.editedImages / project.totalImages) * 100)}%</span>
            </div>
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(project.editedImages / project.totalImages) * 100}%` }}
                className={`h-full bg-gradient-to-r ${
                  project.status === 'approved' ? 'from-emerald-500 to-emerald-600' :
                  project.status === 'in-progress' ? 'from-blue-500 to-blue-600' :
                  'from-amber-500 to-amber-600'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          {project.status === 'pending' && (
            <button
              onClick={(e) => { e.stopPropagation(); onStartEditing(project); }}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[7px] font-bold rounded-md transition-all flex items-center gap-1"
            >
              <Play size={8} />
              بدء
            </button>
          )}
          {project.status === 'in-progress' && (
            <button
              onClick={(e) => { e.stopPropagation(); onSubmitForReview(project); }}
              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[7px] font-bold rounded-md transition-all flex items-center gap-1"
            >
              <Eye size={8} />
              مراجعة
            </button>
          )}
          <span className="text-[7px] text-gray-500">{project.deadline}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default PhotoEditorProjectCard;
