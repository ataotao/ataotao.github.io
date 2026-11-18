import { SlideModal } from './Modal';
import { WordItem } from './WordItem';
import { Word, Unit } from '../types';

export interface WordListModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: Unit;
  unitIndex: number;
  editing: { unitIndex: number; wordIndex: number } | null;
  editData: Word;
  deleteConfirm: { unitIndex: number; wordIndex: number } | null;
  onStartEdit: (unitIndex: number, wordIndex: number, word: Word) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (data: Word) => void;
  onDelete: (unitIndex: number, wordIndex: number) => void;
  onConfirmDelete: (unitIndex: number, wordIndex: number) => void;
  onCancelDelete: () => void;
}

/** 单词列表弹窗组件 */
export function WordListModal({
  isOpen,
  onClose,
  unit,
  unitIndex,
  editing,
  editData,
  deleteConfirm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: WordListModalProps) {
  if (!isOpen) return null;

  return (
    <SlideModal isOpen={isOpen} onClose={onClose} title="词表">
      <div className="p-4">
        <div className="bg-bg-card rounded-xl p-4">
          <h3 className="font-medium text-text-primary text-sm mb-3">{unit.title}</h3>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {unit.words.map((word, idx) => (
              <div key={idx} className="p-2 bg-bg-card-back rounded-lg">
                <WordItem
                  word={word}
                  isEditing={editing?.unitIndex === unitIndex && editing?.wordIndex === idx}
                  editData={editData}
                  isDeleteConfirm={deleteConfirm?.unitIndex === unitIndex && deleteConfirm?.wordIndex === idx}
                  onStartEdit={() => onStartEdit(unitIndex, idx, word)}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  onEditChange={onEditChange}
                  onDelete={() => onDelete(unitIndex, idx)}
                  onConfirmDelete={() => onConfirmDelete(unitIndex, idx)}
                  onCancelDelete={onCancelDelete}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-text-secondary mt-3 text-center">
            共 {unit.words.length} 个词条
          </p>
        </div>
      </div>
    </SlideModal>
  );
}
