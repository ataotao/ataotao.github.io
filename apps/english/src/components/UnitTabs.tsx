import { Unit } from '../types';

interface UnitTabsProps {
  units: Unit[];
  currentUnit: number;
  onUnitChange: (index: number) => void;
  getProgress: (index: number) => { total: number; mastered: number };
}
/** 单元选项卡组件 */
export function UnitTabs({ units, currentUnit, onUnitChange, getProgress }: UnitTabsProps) {
  return (
    <div className="flex gap-2 px-2 sm:px-4 py-2 sm:py-3 overflow-x-auto scrollbar-hide border-b border-border-subtle">
      {units.map((unit, index) => {
        const progress = getProgress(index);
        const isActive = index === currentUnit;
        return (
          <button
            key={unit.id}
            onClick={() => onUnitChange(index)}
            className={`px-3 sm:px-4 py-2 rounded-full whitespace-nowrap text-xs sm:text-sm font-medium transition-all duration-200 flex-shrink-0 ${
              isActive
                ? 'bg-accent-blue text-white'
                : 'bg-bg-card text-text-secondary hover:bg-border-subtle hover:text-text-primary'
            }`}
          >
            <span className="block sm:hidden">{unit.title.split(':')[0]}</span>
            <span className="hidden sm:inline">{unit.title.replace(': ', '\n')}</span>
            <span className="ml-1 sm:ml-2 text-xs opacity-70">
              {progress.mastered}/{progress.total}
            </span>
          </button>
        );
      })}
    </div>
  );
}
