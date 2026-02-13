import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const QualityCheckView: React.FC = () => {
  const qualityIssues = [
    { id: '1', image: 'IMG_2001.JPG', issue: 'Low Resolution (72 DPI)', severity: 'high', fixed: false },
    { id: '2', image: 'IMG_2015.JPG', issue: 'Missing Color Profile', severity: 'medium', fixed: false },
    { id: '3', image: 'IMG_2023.JPG', issue: 'File Size Too Large (25 MB)', severity: 'low', fixed: true },
    { id: '4', image: 'IMG_2031.JPG', issue: 'Wrong Format (PNG instead of JPG)', severity: 'medium', fixed: false },
  ];

  return (
    <div className="h-full flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center px-6 justify-between">
          <div>
            <h2 className="text-white font-bold">Quality Check</h2>
            <p className="text-gray-500 text-xs">Automated quality validation</p>
          </div>
          
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded transition-all">
            Run Full Scan
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-3">
            {qualityIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-4 rounded-lg border ${
                  issue.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
                  issue.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                  'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {issue.fixed ? (
                      <CheckCircle2 size={20} className="text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertTriangle size={20} className={`mt-0.5 ${
                        issue.severity === 'high' ? 'text-red-400' :
                        issue.severity === 'medium' ? 'text-amber-400' :
                        'text-blue-400'
                      }`} />
                    )}
                    <div>
                      <p className="text-white font-bold text-sm">{issue.image}</p>
                      <p className="text-gray-400 text-xs mt-1">{issue.issue}</p>
                    </div>
                  </div>

                  {!issue.fixed && (
                    <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-all">
                      Fix
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Stats */}
      <div className="w-64 bg-[#1e1e1e] border-r border-[#2d2d2d] flex flex-col">
        <div className="h-10 bg-[#2d2d2d] border-b border-[#3d3d3d] flex items-center px-3">
          <span className="text-gray-300 text-xs font-bold uppercase tracking-wider">Summary</span>
        </div>
        
        <div className="flex-1 p-3 space-y-4">
          <div>
            <label className="text-gray-500 text-[10px] uppercase tracking-wider block mb-1">Total Issues</label>
            <p className="text-white text-2xl font-bold">{qualityIssues.length}</p>
          </div>

          <div>
            <label className="text-gray-500 text-[10px] uppercase tracking-wider block mb-1">Fixed</label>
            <p className="text-emerald-400 text-2xl font-bold">
              {qualityIssues.filter(i => i.fixed).length}
            </p>
          </div>

          <div>
            <label className="text-gray-500 text-[10px] uppercase tracking-wider block mb-1">High Priority</label>
            <p className="text-red-400 text-2xl font-bold">
              {qualityIssues.filter(i => i.severity === 'high' && !i.fixed).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityCheckView;
