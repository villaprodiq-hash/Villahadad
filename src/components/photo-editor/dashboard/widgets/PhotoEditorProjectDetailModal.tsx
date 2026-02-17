import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

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

interface ProjectDetailModalProps {
  project: EditingProject | null;
  onClose: () => void;
}

const PhotoEditorProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, onClose }) => {
  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-linear-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-white/10"
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X size={20} className="text-gray-400" />
        </button>

        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-linear-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-400/30 flex items-center justify-center text-5xl shadow-lg mb-4">
            {project.thumbnail}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{project.projectName}</h2>
          <p className="text-gray-400">{project.clientName}</p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">إجمالي الصور:</span>
            <span className="text-white font-bold">{project.totalImages}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">تم التحرير:</span>
            <span className="text-white font-bold">{project.editedImages}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">الموعد النهائي:</span>
            <span className="text-white font-bold">{project.deadline}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">الحالة:</span>
            <span className={`font-bold ${
              project.status === 'approved' ? 'text-emerald-400' :
              project.status === 'in-progress' ? 'text-blue-400' :
              project.status === 'review' ? 'text-purple-400' :
              'text-amber-400'
            }`}>
              {project.status === 'approved' ? 'مكتمل' :
               project.status === 'in-progress' ? 'قيد التحرير' :
               project.status === 'review' ? 'للمراجعة' :
               'في الانتظار'}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors">
            فتح المشروع
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PhotoEditorProjectDetailModal;
