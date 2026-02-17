import React from 'react';
import {
  MainFilterType,
  SuraSubFilter,
  VillaSubFilter,
  FilterState,
  suraSubFilterLabels,
  villaSubFilterLabels,
  defaultFilterState,
} from '../../utils/filterUtils';

interface FilterBarProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  stats?: {
    all?: number;
    sura?: number;
    villa?: number;
  };
  showSubFilters?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  onFilterChange,
  stats,
  showSubFilters = true,
}) => {
  const handleMainFilterChange = (mainFilter: MainFilterType) => {
    onFilterChange({
      ...defaultFilterState,
      mainFilter,
    });
  };

  const handleSuraSubFilterChange = (suraSubFilter: SuraSubFilter) => {
    onFilterChange({
      ...filter,
      suraSubFilter,
    });
  };

  const handleVillaSubFilterChange = (villaSubFilter: VillaSubFilter) => {
    onFilterChange({
      ...filter,
      villaSubFilter,
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Main Filters */}
      <div className="flex items-center gap-2 bg-[#18181b] p-1 rounded-xl border border-white/5">
        {/* All */}
        <button
          onClick={() => handleMainFilterChange('all')}
          className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap ${
            filter.mainFilter === 'all'
              ? 'bg-[#F7931E] text-white shadow-lg shadow-[#F7931E]/20'
              : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>الكل</span>
          {stats?.all !== undefined && (
            <span className="mr-1 opacity-70">({stats.all})</span>
          )}
        </button>

        {/* Sura - Photography Sessions */}
        <button
          onClick={() => handleMainFilterChange('sura')}
          className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
            filter.mainFilter === 'sura'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>📸 جلسات</span>
          {stats?.sura !== undefined && (
            <span className="opacity-70">({stats.sura})</span>
          )}
        </button>

        {/* Villa */}
        <button
          onClick={() => handleMainFilterChange('villa')}
          className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
            filter.mainFilter === 'villa'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>🏠 فيلا</span>
          {stats?.villa !== undefined && (
            <span className="opacity-70">({stats.villa})</span>
          )}
        </button>
      </div>

      {/* Sub Filters */}
      {showSubFilters && filter.mainFilter === 'sura' && (
        <div className="flex items-center gap-1 bg-purple-900/10 p-1 rounded-lg border border-purple-500/20">
          {(Object.keys(suraSubFilterLabels) as SuraSubFilter[]).map((subFilter) => (
            <button
              key={subFilter}
              onClick={() => handleSuraSubFilterChange(subFilter)}
              className={`px-3 py-1.5 rounded-md text-[9px] font-bold transition-all whitespace-nowrap ${
                filter.suraSubFilter === subFilter
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-300 hover:text-white hover:bg-purple-500/20'
              }`}
            >
              {suraSubFilterLabels[subFilter]}
            </button>
          ))}
        </div>
      )}

      {showSubFilters && filter.mainFilter === 'villa' && (
        <div className="flex items-center gap-1 bg-blue-900/10 p-1 rounded-lg border border-blue-500/20">
          {(Object.keys(villaSubFilterLabels) as VillaSubFilter[]).map((subFilter) => (
            <button
              key={subFilter}
              onClick={() => handleVillaSubFilterChange(subFilter)}
              className={`px-3 py-1.5 rounded-md text-[9px] font-bold transition-all whitespace-nowrap ${
                filter.villaSubFilter === subFilter
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-300 hover:text-white hover:bg-blue-500/20'
              }`}
            >
              {villaSubFilterLabels[subFilter]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
