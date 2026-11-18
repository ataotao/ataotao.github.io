import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Word, Unit, AllRecords } from '../types';
import { updateRecord } from '../utils';

// ── 类型定义 ──

interface DataState {
  /** 学习记录（正确/错误次数） */
  records: AllRecords; 
  /** 用户添加的自定义单词（已废弃，保留兼容） */
  customWords: Word[]; 
  /** 用户对内置单元词表的修改，key 为 unitId */
  modifiedWords: Record<string, Word[]>; 
  /** 用户新建的自定义单元 */
  customUnits: Unit[]; 
  /** 背诵位置进度：key 为 unitId，value 为当前单词的英文（用于跨词表修改恢复） */  
  positionProgress: Record<string, string>;
  /** 用户为单词添加的例句，key 为 `${unitId}|${wordEnglish}` */
  wordSentences: Record<string, string[]>;
}

// ── 工具函数 ──

/** 生成复合单元键，确保跨分类的唯一性（用于 records 的查找） */
export const getCompositeUnitId = (sourceId: string, categoryId: string, unitId: string): string => {
  return `${sourceId}__${categoryId}__${unitId}`;
};

/** 迁移旧版 localStorage 数据，清理重复键问题 */
/** positionProgress: 保留旧数据，新保存会使用复合键 */
const migratePositionProgress = (oldData: Record<string, string>): Record<string, string> => {
  const newData: Record<string, string> = {};
  for (const [key, value] of Object.entries(oldData)) {
    newData[key] = value;
  }
  return newData;
};

/** 迁移旧版 records 数据到复合键格式 */
/** 旧格式: { "unit1": {...}, "unit1 ": {...} } - 有重复键和空格问题 */
export const migrateRecords = (
  oldRecords: AllRecords,
  sources: Array<{ id: string; categories: Array<{ id: string; units: Array<{ id: string }> }> }>
): AllRecords => {
  const newRecords: AllRecords = {};
  
  for (const [unitId, wordRecords] of Object.entries(oldRecords)) {
    // 跳过已经是新格式的键
    if (unitId.includes('__')) {
      newRecords[unitId] = wordRecords;
      continue;
    }
    
    // 查找这个 unitId 属于哪个 source 和 category
    for (const source of sources) {
      for (const category of source.categories) {
        const unit = category.units.find(u => u.id === unitId || u.id === unitId.trim());
        if (unit) {
          const compositeKey = getCompositeUnitId(source.id, category.id, unit.id);
          newRecords[compositeKey] = wordRecords;
          break;
        }
      }
    }
  }
  
  return newRecords;
};

/** 从 localStorage 安全读取 JSON，失败时返回默认值 */
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    const parsed = JSON.parse(saved);
    // 对 positionProgress 执行迁移
    if (key === 'vocab-position-progress' && typeof parsed === 'object') {
      return migratePositionProgress(parsed as Record<string, string>) as T;
    }
    return parsed;
  } catch {
    return defaultValue;
  }
};

// ── 初始状态（从 localStorage 恢复）──
const initialState: DataState = {
  /** 学习记录（正确/错误次数） */
  records: loadFromStorage('vocab-memorizer-records', {}),
  /** 用户添加的自定义单词（已废弃，保留兼容） */
  customWords: loadFromStorage('vocab-custom-words', []),
  /** 用户对内置单元词表的修改，key 为 unitId */
  modifiedWords: loadFromStorage('vocab-modified-words', {}),
  /** 用户新建的自定义单元 */
  customUnits: loadFromStorage('vocab-custom-units', []),
  /** 背诵位置进度：key 为 unitId，value 为当前单词的英文（用于跨词表修改恢复） */
  positionProgress: loadFromStorage('vocab-position-progress', {}),
  /** 用户为单词添加的例句 */
  wordSentences: loadFromStorage('vocab-word-sentences', {}),
};

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    // ── 学习记录 ──

    /** 直接覆盖全量记录（用于导入） */
    setRecords: (state, action: PayloadAction<AllRecords>) => {
      state.records = action.payload;
      localStorage.setItem('vocab-memorizer-records', JSON.stringify(action.payload));
    },
    /** 更新单个单词的对/错计数 */
    updateWordRecord: (state, action: PayloadAction<{ unitId: string; wordEnglish: string; isCorrect: boolean }>) => {
      const { unitId, wordEnglish, isCorrect } = action.payload;
      state.records = updateRecord(state.records, unitId, wordEnglish, isCorrect);
      localStorage.setItem('vocab-memorizer-records', JSON.stringify(state.records));
    },
    /** 手动修改某个单词的对/错数值（历史面板用） */
    modifyRecord: (state, action: PayloadAction<{ unitId: string; wordEnglish: string; field: 'correct' | 'incorrect'; value: string }>) => {
      const { unitId, wordEnglish, field, value } = action.payload;
      if (!state.records[unitId]) state.records[unitId] = {};
      if (!state.records[unitId][wordEnglish]) {
        state.records[unitId][wordEnglish] = { correct: 0, incorrect: 0, lastReview: null };
      }
      state.records[unitId][wordEnglish][field] = Math.max(0, parseInt(value) || 0);
      localStorage.setItem('vocab-memorizer-records', JSON.stringify(state.records));
    },
    /** 重置指定单元的学习记录 */
    resetUnitRecords: (state, action: PayloadAction<string>) => {
      delete state.records[action.payload];
      localStorage.setItem('vocab-memorizer-records', JSON.stringify(state.records));
    },
    /** 重置所有学习记录 */
    resetAllRecords: (state) => {
      state.records = {};
      localStorage.setItem('vocab-memorizer-records', JSON.stringify(state.records));
    },

    // ── 自定义单词 ──

    /** 删除指定索引的自定义单词 */
    deleteCustomWord: (state, action: PayloadAction<number>) => {
      state.customWords = state.customWords.filter((_, i) => i !== action.payload);
      localStorage.setItem('vocab-custom-words', JSON.stringify(state.customWords));
    },

    // ── 内置单元词表修改 ──

    /** 更新指定单元的词列表（新增/编辑词时调用） */
    updateModifiedWords: (state, action: PayloadAction<{ unitId: string; words: Word[] }>) => {
      state.modifiedWords[action.payload.unitId] = action.payload.words;
      localStorage.setItem('vocab-modified-words', JSON.stringify(state.modifiedWords));
    },
    /** 删除指定单元的修改记录（恢复原始词表） */
    deleteModifiedWords: (state, action: PayloadAction<string>) => {
      delete state.modifiedWords[action.payload];
      localStorage.setItem('vocab-modified-words', JSON.stringify(state.modifiedWords));
    },

    // ── 自定义单元 ──

    /** 添加自定义单元 */
    addCustomUnit: (state, action: PayloadAction<Unit>) => {
      state.customUnits.push(action.payload);
      localStorage.setItem('vocab-custom-units', JSON.stringify(state.customUnits));
    },
    /** 编辑指定索引的自定义单元标题 */
    editCustomUnit: (state, action: PayloadAction<{ index: number; title: string }>) => {
      state.customUnits[action.payload.index] = {
        ...state.customUnits[action.payload.index],
        title: action.payload.title,
      };
      localStorage.setItem('vocab-custom-units', JSON.stringify(state.customUnits));
    },
    /** 删除指定索引的自定义单元 */
    deleteCustomUnit: (state, action: PayloadAction<number>) => {
      state.customUnits = state.customUnits.filter((_, i) => i !== action.payload);
      localStorage.setItem('vocab-custom-units', JSON.stringify(state.customUnits));
    },

    // ── 背诵位置进度 ──

    /** 设置指定单元的背诵位置（当前单词的英文） */
    setUnitPosition: (state, action: PayloadAction<{ unitId: string; wordEnglish: string }>) => {
      state.positionProgress[action.payload.unitId] = action.payload.wordEnglish;
      localStorage.setItem('vocab-position-progress', JSON.stringify(state.positionProgress));
    },

    // ── 单词例句 ──

    /** 获取复合键：`${unitId}|${wordEnglish}` */
    /** 为单词添加一条例句 */
    addWordSentence: (state, action: PayloadAction<{ key: string; sentence: string }>) => {
      const { key, sentence } = action.payload;
      if (!state.wordSentences[key]) {
        state.wordSentences[key] = [];
      }
      state.wordSentences[key].push(sentence);
      localStorage.setItem('vocab-word-sentences', JSON.stringify(state.wordSentences));
    },
    /** 删除单词的一条例句（按索引） */
    removeWordSentence: (state, action: PayloadAction<{ key: string; index: number }>) => {
      const { key, index } = action.payload;
      if (state.wordSentences[key]) {
        state.wordSentences[key] = state.wordSentences[key].filter((_, i) => i !== index);
        if (state.wordSentences[key].length === 0) {
          delete state.wordSentences[key];
        }
      }
      localStorage.setItem('vocab-word-sentences', JSON.stringify(state.wordSentences));
    },
  },
});

export const {
  setRecords,
  updateWordRecord,
  modifyRecord,
  resetUnitRecords,
  resetAllRecords,
  deleteCustomWord,
  updateModifiedWords,
  deleteModifiedWords,
  addCustomUnit,
  editCustomUnit,
  deleteCustomUnit,
  setUnitPosition,
  addWordSentence,
  removeWordSentence,
} = dataSlice.actions;

export default dataSlice.reducer;
