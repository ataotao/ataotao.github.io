import { Modal } from './Modal';
import { UnitItem } from './UnitItem';
import { Unit } from '../types';

export interface UnitManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: Unit[];
  editing: { index: number; title: string } | null;
  deleteConfirm: number | null;
  onStartEdit: (index: number, title: string) => void;
  onSaveEdit: (index: number, title: string) => void;
  onCancelEdit: () => void;
  onEditChange: (title: string) => void;
  onDelete: (index: number) => void;
  onConfirmDelete: (index: number) => void;
  onCancelDelete: () => void;
  onAddUnit: (title: string) => void;
}

/** 单元管理弹窗组件 */
export function UnitManageModal({
  isOpen,
  onClose,
  units,
  editing,
  deleteConfirm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onAddUnit,
}: UnitManageModalProps) {
  if (!isOpen) return null;

  const handleAddClick = () => {
    const title = prompt('请输入新单元名称:');
    if (title) onAddUnit(title);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="单元管理">
      <div className="space-y-3 mb-6">
        {units.map((unit, idx) => (
          <div key={unit.id} className="p-3 bg-bg-card-back rounded-lg">
            <UnitItem
              unit={unit}
              isEditing={editing?.index === idx}
              isDeleteConfirm={deleteConfirm === idx}
              editTitle={editing?.title || ''}
              onStartEdit={() => onStartEdit(idx, unit.title)}
              onSaveEdit={(title) => onSaveEdit(idx, title)}
              onCancelEdit={onCancelEdit}
              onEditChange={onEditChange}
              onDelete={() => onDelete(idx)}
              onConfirmDelete={() => onConfirmDelete(idx)}
              onCancelDelete={onCancelDelete}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleAddClick}
        className="w-full py-3 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        添加新单元
      </button>
    </Modal>
  );
}
