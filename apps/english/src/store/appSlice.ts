import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { StudyMode, Word } from '../types';

// ── 类型定义 ──

interface ModalsState {
  showHistory: boolean;
  showSyncPanel: boolean;
  showWordList: boolean;
  showAddWord: boolean;
  showUnitManage: boolean;
}

// 词表内联编辑 & 单元管理的临时 UI 状态
interface EditingState {
  wordListEditing: { unitIndex: number; wordIndex: number } | null;
  wordListEditData: Word;
  wordListDeleteConfirm: { unitIndex: number; wordIndex: number } | null;
  editingUnit: { index: number; title: string } | null;
  deleteUnitConfirm: number | null;
}

interface FormsState {
  newWord: Word;
  selectedUnitIndex: number;
  importStatus: string;
}

interface AppState {
  // 导航状态：全部放在 Redux，保证切换时原子更新，避免跨状态系统的异步错位
  currentSource: number;
  currentCategory: number;
  currentUnit: number;
  currentIndex: number;
  // 学习设置
  mode: StudyMode;
  shuffleMode: boolean;
  reviewMode: boolean;
  shuffledIndices: number[];
  // UI 状态
  modals: ModalsState;
  editing: EditingState;
  forms: FormsState;
}

const initialState: AppState = {
  /** 当前选中的教材来源索引 */
  currentSource: 0,
  /** 当前选中的分类索引 */
  currentCategory: 0,
  /** 当前选中的单元索引 */
  currentUnit: 0,
  /** 当前选中的卡片索引 */
  currentIndex: 0,
  /** 学习模式：英中或中英 */
  mode: 'en-cn',
  /** 是否开启随机模式 */
  shuffleMode: false,
  /** 是否开启复习模式 */
  reviewMode: false,
  /** 随机模式下的索引序列 */
  shuffledIndices: [],
  /** 弹窗显示状态 */
  modals: {
    showHistory: false,
    showSyncPanel: false,
    showWordList: false,
    showAddWord: false,
    showUnitManage: false,
  },
  /** 编辑状态 */
  editing: {
    /** 词表中正在编辑的单词位置 */
    wordListEditing: null,
    /** 词表中正在编辑的单词数据 */
    wordListEditData: { english: '', phonetic: '', pos: '', chinese: '' },
    /** 词表中待删除的单词确认位置 */
    wordListDeleteConfirm: null,
    /** 正在编辑的单元信息 */
    editingUnit: null,
    /** 待删除的单元索引 */
    deleteUnitConfirm: null,
  },
  /** 表单状态 */
  forms: {
    /** 新添加单词的表单数据 */
    newWord: { english: '', phonetic: '', pos: '', chinese: '' },
    /** 选中的单元索引 */
    selectedUnitIndex: 0,
    /** 导入状态信息 */
    importStatus: '',
  },
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // ── 原子导航 action：切换时同步重置下游索引，确保同一 render 内数据一致 ──

    /** 切换教材来源（如：沪教版 → 阅读材料），重置分类/单元/卡片索引 */
    changeSource: (state, action: PayloadAction<number>) => {
      state.currentSource = action.payload;
      state.currentCategory = 0;
      state.currentUnit = 0;
      state.currentIndex = 0;
      state.shuffledIndices = [];
    },
    /** 切换分类（如：七下 → 八上），重置单元/卡片索引 */
    changeCategory: (state, action: PayloadAction<number>) => {
      state.currentCategory = action.payload;
      state.currentUnit = 0;
      state.currentIndex = 0;
      state.shuffledIndices = [];
    },
    /** 切换单元，重置卡片索引 */
    changeUnit: (state, action: PayloadAction<number>) => {
      state.currentUnit = action.payload;
      state.currentIndex = 0;
      state.shuffledIndices = [];
    },

    // ── 卡片导航 ──
    /** 设置当前卡片索引 */
    setCurrentIndex: (state, action: PayloadAction<number>) => {
      state.currentIndex = action.payload;
    },

    // ── 学习设置 ──
    /** 设置学习模式（英中/中英） */
    setMode: (state, action: PayloadAction<StudyMode>) => {
      state.mode = action.payload;
    },
    /** 切换随机模式 */
    toggleShuffle: (state) => {
      state.shuffleMode = !state.shuffleMode;
    },
    /** 切换复习模式时同步重置索引，避免越界 */
    toggleReview: (state) => {
      state.reviewMode = !state.reviewMode;
      state.currentIndex = 0;
      state.shuffledIndices = [];
    },
    /** 设置随机索引，用于复习模式 */
    setShuffledIndices: (state, action: PayloadAction<number[]>) => {
      state.shuffledIndices = action.payload;
    },

    // ── 弹窗控制 ──
    /** 显示指定弹窗 */
    showModal: (state, action: PayloadAction<keyof ModalsState>) => {
      state.modals[action.payload] = true;
    },
    /** 隐藏指定弹窗 */
    hideModal: (state, action: PayloadAction<keyof ModalsState>) => {
      state.modals[action.payload] = false;
    },

    // ── 词表编辑 ──
    /** 设置词表中正在编辑的单词位置 */
    setWordListEditing: (state, action: PayloadAction<{ unitIndex: number; wordIndex: number } | null>) => {
      state.editing.wordListEditing = action.payload;
    },
    /** 设置词表中正在编辑的单词数据 */
    setWordListEditData: (state, action: PayloadAction<Word>) => {
      state.editing.wordListEditData = action.payload;
    },
    /** 设置词表中待删除的单词确认位置 */
    setWordListDeleteConfirm: (state, action: PayloadAction<{ unitIndex: number; wordIndex: number } | null>) => {
      state.editing.wordListDeleteConfirm = action.payload;
    },

    // ── 单元管理 ──
    /** 设置正在编辑的单元信息 */
    setEditingUnit: (state, action: PayloadAction<{ index: number; title: string } | null>) => {
      state.editing.editingUnit = action.payload;
    },
    /** 设置待删除的单元索引 */
    setDeleteUnitConfirm: (state, action: PayloadAction<number | null>) => {
      state.editing.deleteUnitConfirm = action.payload;
    },

    // ── 表单 ──
    /** 设置新添加单词的表单数据 */
    setNewWord: (state, action: PayloadAction<Word>) => {
      state.forms.newWord = action.payload;
    },
    /** 设置选中的单元索引 */
    setSelectedUnitIndex: (state, action: PayloadAction<number>) => {
      state.forms.selectedUnitIndex = action.payload;
    },
    /** 设置导入状态信息 */
    setImportStatus: (state, action: PayloadAction<string>) => {
      state.forms.importStatus = action.payload;
    },
  },
});

export const {
  changeSource,
  changeCategory,
  changeUnit,
  setCurrentIndex,
  setMode,
  toggleShuffle,
  toggleReview,
  setShuffledIndices,
  showModal,
  hideModal,
  setWordListEditing,
  setWordListEditData,
  setWordListDeleteConfirm,
  setEditingUnit,
  setDeleteUnitConfirm,
  setNewWord,
  setSelectedUnitIndex,
  setImportStatus,
} = appSlice.actions;

export default appSlice.reducer;
