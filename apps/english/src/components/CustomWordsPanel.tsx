import { Word } from '../types';

interface CustomWordsPanelProps {
  customWords: Word[];
  onExportJson: () => void;
  onExportTs: () => void;
  onDelete: (index: number) => void;
}

/** 手动添加单词面板组件 */
export function CustomWordsPanel({
  customWords,
  onExportJson,
  onExportTs,
  onDelete,
}: CustomWordsPanelProps) {
  if (customWords.length === 0) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-end justify-center p-4" onClick={() => {}}>
      <div className="w-full max-w-md bg-bg-card-back rounded-xl p-4 pointer-events-auto max-h-60 overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-text-primary text-sm">已添加的单词 ({customWords.length})</h3>
          <div className="flex gap-2">
            <button
              onClick={onExportJson}
              className="px-2 py-1 text-xs bg-accent-blue/20 text-accent-blue rounded hover:bg-accent-blue/30"
            >
              导出JSON
            </button>
            <button
              onClick={onExportTs}
              className="px-2 py-1 text-xs bg-accent-green/20 text-accent-green rounded hover:bg-accent-green/30"
            >
              导出TS
            </button>
          </div>
        </div>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {customWords.map((word, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-bg-card rounded-lg">
              <div className="flex-1 min-w-0 mr-2">
                <p className="font-medium text-text-primary text-sm truncate">{word.english}</p>
                <p className="text-xs text-text-secondary truncate">{word.chinese}</p>
              </div>
              <button
                onClick={() => onDelete(idx)}
                className="p-1 text-accent-red hover:bg-accent-red/20 rounded flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
