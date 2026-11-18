import { Word } from '../types';

export interface WordItemProps {
  word: Word;
  isEditing: boolean;
  editData: Word;
  isDeleteConfirm: boolean;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (data: Word) => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

/** 单词项组件 */
export function WordItem({
  word,
  isEditing,
  editData,
  isDeleteConfirm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: WordItemProps) {
  if (isEditing) {
    return (
      <div className="space-y-2">
        <input
          type="text"
          value={editData.english}
          onChange={(e) => onEditChange({ ...editData, english: e.target.value })}
          className="w-full bg-bg-card border border-border-subtle rounded px-2 py-1 text-sm text-text-primary"
        />
        <input
          type="text"
          value={editData.phonetic}
          onChange={(e) => onEditChange({ ...editData, phonetic: e.target.value })}
          className="w-full bg-bg-card border border-border-subtle rounded px-2 py-1 text-sm text-text-primary"
          placeholder="音标"
        />
        <input
          type="text"
          value={editData.pos}
          onChange={(e) => onEditChange({ ...editData, pos: e.target.value })}
          className="w-full bg-bg-card border border-border-subtle rounded px-2 py-1 text-sm text-text-primary"
          placeholder="词性"
        />
        <input
          type="text"
          value={editData.chinese}
          onChange={(e) => onEditChange({ ...editData, chinese: e.target.value })}
          className="w-full bg-bg-card border border-border-subtle rounded px-2 py-1 text-sm text-text-primary"
        />
        <div className="flex gap-2">
          <button onClick={onSaveEdit} className="flex-1 py-1 bg-accent-green text-white rounded text-xs">
            保存
          </button>
          <button onClick={onCancelEdit} className="flex-1 py-1 bg-bg-card text-text-secondary rounded text-xs">
            取消
          </button>
        </div>
      </div>
    );
  }

  if (isDeleteConfirm) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 mr-2">
          <p className="font-medium text-text-primary text-sm truncate">{word.english}</p>
          <p className="text-xs text-text-secondary truncate">确定删除？</p>
        </div>
        <div className="flex gap-1">
          <button onClick={onConfirmDelete} className="p-1 text-accent-red hover:bg-accent-red/20 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button onClick={onCancelDelete} className="p-1 text-text-secondary hover:bg-bg-card rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0 mr-2">
        <p className="font-medium text-text-primary text-sm truncate">{word.english}</p>
        <p className="text-xs text-text-secondary truncate">{word.chinese}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 bg-accent-blue/20 text-accent-blue rounded flex-shrink-0">
          {word.pos || 'word'}
        </span>
        <button onClick={onStartEdit} className="p-1 text-accent-blue hover:bg-accent-blue/20 rounded">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={onDelete} className="p-1 text-accent-red hover:bg-accent-red/20 rounded">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
