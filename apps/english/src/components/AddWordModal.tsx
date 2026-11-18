import { Modal } from './Modal';
import { Unit } from '../types';

export interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: Unit[];
  selectedUnitIndex: number;
  newWord: { english: string; phonetic: string; pos: string; chinese: string };
  onSelectUnit: (index: number) => void;
  onNewWordChange: (word: { english: string; phonetic: string; pos: string; chinese: string }) => void;
  onAdd: () => void;
}

/** 添加单词弹窗组件 */
export function AddWordModal({
  isOpen,
  onClose,
  units,
  selectedUnitIndex,
  newWord,
  onSelectUnit,
  onNewWordChange,
  onAdd,
}: AddWordModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="添加单词">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">选择单元 *</label>
          <select
            value={selectedUnitIndex}
            onChange={(e) => onSelectUnit(Number(e.target.value))}
            className="w-full bg-bg-card-back border border-border-subtle rounded-lg px-3 py-2 text-text-primary"
          >
            {units.map((unit, idx) => (
              <option key={unit.id} value={idx}>{unit.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">英文单词 *</label>
          <input
            type="text"
            value={newWord.english}
            onChange={(e) => onNewWordChange({ ...newWord, english: e.target.value })}
            className="w-full bg-bg-card-back border border-border-subtle rounded-lg px-3 py-2 text-text-primary"
            placeholder="e.g., hello"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">音标</label>
          <input
            type="text"
            value={newWord.phonetic}
            onChange={(e) => onNewWordChange({ ...newWord, phonetic: e.target.value })}
            className="w-full bg-bg-card-back border border-border-subtle rounded-lg px-3 py-2 text-text-primary"
            placeholder="e.g., /həˈloʊ/"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">词性</label>
          <input
            type="text"
            value={newWord.pos}
            onChange={(e) => onNewWordChange({ ...newWord, pos: e.target.value })}
            className="w-full bg-bg-card-back border border-border-subtle rounded-lg px-3 py-2 text-text-primary"
            placeholder="e.g., v., adj., n."
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">中文释义 *</label>
          <input
            type="text"
            value={newWord.chinese}
            onChange={(e) => onNewWordChange({ ...newWord, chinese: e.target.value })}
            className="w-full bg-bg-card-back border border-border-subtle rounded-lg px-3 py-2 text-text-primary"
            placeholder="e.g., 你好"
          />
        </div>

        <button
          onClick={onAdd}
          disabled={!newWord.english || !newWord.chinese}
          className="w-full py-3 bg-accent-blue hover:bg-accent-blue/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          添加单词
        </button>
      </div>
    </Modal>
  );
}
