import { useState, useMemo } from 'react';
import { sources } from '../data';
import { useEscapeKey } from '../hooks';

interface PositionHistory {
  unitKey: string;
  sourceName: string;
  categoryTitle: string;
  unitTitle: string;
  word: string;
  chinese: string;
  isOldFormat: boolean;
}

interface HistorySelectorProps {
  positionProgress: Record<string, string>;
  onNavigate: (sourceIndex: number, categoryIndex: number, unitIndex: number) => void;
}

/** 学习历史记录选择器组件 */
export function HistorySelector({ positionProgress, onNavigate }: HistorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEscapeKey(isOpen, () => setIsOpen(false));

  const historyList = useMemo(() => {
    const history: PositionHistory[] = [];
    for (const [unitKey, word] of Object.entries(positionProgress)) {
      let source = null, category = null, unit = null;
      let isOldFormat = false;

      if (unitKey.includes('__')) {
        const [sourceId, categoryId, unitId] = unitKey.split('__');
        source = sources.find(s => s.id === sourceId);
        category = source?.categories.find(c => c.id === categoryId);
        unit = category?.units.find(u => u.id === unitId);
      } else {
        isOldFormat = true;
        for (const s of sources) {
          for (const c of s.categories) {
            const u = c.units.find(u => u.id === unitKey || u.id === unitKey.trim());
            if (u) {
              source = s;
              category = c;
              unit = u;
              break;
            }
          }
          if (unit) break;
        }
      }

      if (source && category && unit) {
        const wordObj = unit.words.find(w => w.english === word);
        history.push({
          unitKey,
          sourceName: source.name,
          categoryTitle: category.title,
          unitTitle: unit.title,
          word: word || '未知',
          chinese: wordObj?.chinese || '',
          isOldFormat,
        });
      }
    }
    return history.sort((a, b) => 
      a.sourceName.localeCompare(b.sourceName) || 
      a.categoryTitle.localeCompare(b.categoryTitle)
    );
  }, [positionProgress]);

  const handleNavigate = (item: PositionHistory) => {
    let sourceId: string, categoryId: string, unitId: string;
    
    if (item.isOldFormat) {
      [sourceId, categoryId, unitId] = item.unitKey.split('__');
    } else {
      [sourceId, categoryId, unitId] = item.unitKey.split('__');
    }
    
    const sourceIndex = sources.findIndex(s => s.id === sourceId);
    const categoryIndex = sources[sourceIndex]?.categories.findIndex(c => c.id === categoryId) ?? -1;
    const unitIndex = sources[sourceIndex]?.categories[categoryIndex]?.units.findIndex(u => u.id === unitId) ?? -1;
    
    if (sourceIndex >= 0 && categoryIndex >= 0 && unitIndex >= 0) {
      onNavigate(sourceIndex, categoryIndex, unitIndex);
      setIsOpen(false);
    }
  };

  if (historyList.length === 0) return null;

  return (
    <div className="w-full max-w-lg mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-bg-card/50 border border-border-subtle/50 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-border-subtle transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>历史进度 ({historyList.length})</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 bg-bg-card border border-border-subtle rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {historyList.map((item) => (
              <button
                key={item.unitKey}
                onClick={() => handleNavigate(item)}
                className="w-full px-4 py-3 text-left hover:bg-bg-primary transition-colors border-b border-border-subtle/50 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                      <span className="bg-bg-primary px-1.5 py-0.5 rounded">
                        {item.sourceName}
                      </span>
                      <span>{item.categoryTitle}</span>
                      <span>·</span>
                      <span className="text-text-primary">{item.unitTitle}</span>
                      {item.isOldFormat && (
                        <span className="text-xs text-yellow-500">(旧格式)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary font-medium">
                        {item.word}
                      </span>
                      {item.chinese && (
                        <span className="text-text-secondary text-sm">
                          {item.chinese}
                        </span>
                      )}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
