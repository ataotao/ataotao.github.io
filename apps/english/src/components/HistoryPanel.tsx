import { Unit, AllRecords } from '../types';
import { getCompositeUnitId } from '../store';
import { useEscapeKey } from '../hooks';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  units: Unit[];
  records: AllRecords;
  sourceId: string;
  categoryId: string;
  onResetAll: () => void;
  onResetUnit: (unitId: string) => void;
  onModifyRecord: (unitId: string, wordEnglish: string, field: 'correct' | 'incorrect', value: string) => void;
}

/** 学习历史记录面板组件 */
export function HistoryPanel({
  isOpen,
  onClose,
  units,
  records,
  sourceId,
  categoryId,
  onResetAll,
  onResetUnit,
  onModifyRecord,
}: HistoryPanelProps) {
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md bg-bg-primary h-full overflow-y-auto animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-border-subtle flex justify-between items-center sticky top-0 bg-bg-primary z-10">
          <h2 className="font-display text-lg sm:text-xl font-bold">学习记录</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-card rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3 sm:p-4 flex gap-2">
          <button
            onClick={onResetAll}
            className="px-3 sm:px-4 py-2 bg-accent-red/20 text-accent-red rounded-lg text-sm hover:bg-accent-red hover:text-white transition-colors"
          >
            重置全部
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
          {units.map(unit => {
            const recordKey = getCompositeUnitId(sourceId, categoryId, unit.id);
            const unitRecords = records[recordKey] || {};
            const hasRecords = Object.keys(unitRecords).length > 0;

            return (
              <div key={unit.id} className="bg-bg-card rounded-xl p-3 sm:p-4">
                <div className="flex justify-between items-center mb-2 sm:mb-3">
                  <h3 className="font-medium text-text-primary text-sm sm:text-base truncate">{unit.title}</h3>
                  {hasRecords && (
                    <button
                      onClick={() => onResetUnit(recordKey)}
                      className="text-xs text-accent-red hover:underline flex-shrink-0 ml-2"
                    >
                      重置
                    </button>
                  )}
                </div>

                {!hasRecords ? (
                  <p className="text-text-secondary text-sm">暂无记录</p>
                ) : (
                  <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                    {unit.words.map((word) => {
                      const record = unitRecords[word.english] || { correct: 0, incorrect: 0 };
                      const total = record.correct + record.incorrect;
                      const isMastered = record.correct > record.incorrect && record.correct > 0;

                      return (
                        <div key={word.english} className="flex items-center justify-between p-2 bg-bg-card-back rounded-lg">
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="font-medium text-text-primary text-sm truncate">{word.english}</p>
                            <p className="text-xs text-text-secondary truncate">{word.chinese}</p>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1">
                              <span className="text-accent-green text-xs sm:text-sm w-6 sm:w-8 text-right hidden sm:inline">{record.correct}</span>
                              <input
                                type="number"
                                min="0"
                                value={record.correct}
                                onChange={(e) => onModifyRecord(recordKey, word.english, 'correct', e.target.value)}
                                className="w-10 sm:w-12 bg-bg-card border border-border-subtle rounded px-1 py-0.5 text-center text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-accent-red text-xs sm:text-sm w-6 sm:w-8 text-right hidden sm:inline">{record.incorrect}</span>
                              <input
                                type="number"
                                min="0"
                                value={record.incorrect}
                                onChange={(e) => onModifyRecord(recordKey, word.english, 'incorrect', e.target.value)}
                                className="w-10 sm:w-12 bg-bg-card border border-border-subtle rounded px-1 py-0.5 text-center text-xs"
                              />
                            </div>
                            {total > 0 && (
                              <span className={`text-xs px-1.5 sm:px-2 py-0.5 rounded ${isMastered ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-red/20 text-accent-red'}`}>
                                {Math.round((record.correct / total) * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
