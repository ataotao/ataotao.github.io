import { Unit } from '../types';

export interface UnitItemProps {
  unit: Unit;
  isEditing: boolean;
  isDeleteConfirm: boolean;
  editTitle: string;
  onStartEdit: () => void;
  onSaveEdit: (title: string) => void;
  onCancelEdit: () => void;
  onEditChange: (title: string) => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

/** 单元项组件 */
export function UnitItem({
  unit,
  isEditing,
  isDeleteConfirm,
  editTitle,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: UnitItemProps) {
  if (isEditing) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => onEditChange(e.target.value)}
          className="flex-1 bg-bg-card border border-border-subtle rounded px-2 py-1 text-sm text-text-primary"
        />
        <button onClick={() => onSaveEdit(editTitle)} className="px-2 py-1 bg-accent-green text-white rounded text-xs">
          保存
        </button>
        <button onClick={onCancelEdit} className="px-2 py-1 bg-bg-card text-text-secondary rounded text-xs">
          取消
        </button>
      </div>
    );
  }

  if (isDeleteConfirm) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-text-primary text-sm">{unit.title}</span>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-accent-red">确定删除？</span>
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
      <span className="text-text-primary text-sm">{unit.title}</span>
      <div className="flex gap-1">
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
