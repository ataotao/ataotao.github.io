import { useEffect, useCallback, useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { sources } from './data';
import {
  WordListModal, AddWordModal, UnitManageModal,
  Header, UnitTabs, ModeControls, Flashcard, Footer,
  SyncPanel, HistoryPanel, CustomWordsPanel, HistorySelector,
} from './components';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import {
  changeSource, changeCategory, changeUnit,
  setCurrentIndex, setMode, toggleShuffle, toggleReview, setShuffledIndices,
  showModal, hideModal,
  setWordListEditing, setWordListEditData, setWordListDeleteConfirm,
  setEditingUnit, setDeleteUnitConfirm,
  setNewWord, setSelectedUnitIndex, setImportStatus,
  updateWordRecord, modifyRecord, resetUnitRecords, resetAllRecords,
  deleteCustomWord, updateModifiedWords, deleteModifiedWords,
  addCustomUnit, editCustomUnit, deleteCustomUnit, setRecords,
  setUnitPosition, getCompositeUnitId, migrateRecords,
  addWordSentence,
} from './store';
import { downloadJson, downloadText, getRecord, getAccuracy, getUnitProgress, getTotalStats } from './utils';
import { getDisplaySentences, getWordSentenceKey } from './utils/sentenceGenerator';
import { fetchRealSentences } from './utils/realSentences';
import { Word, SentenceItem } from './types';

function AppContent() {
  const dispatch = useAppDispatch();

  // ── Redux 状态：导航 + 学习设置 + UI（全部集中在 Redux，避免跨状态系统的异步错位）──
  const {
    currentSource, currentCategory, currentUnit, currentIndex,
    mode, shuffleMode, reviewMode, shuffledIndices,
    modals, editing, forms,
  } = useAppSelector((state) => state.app);
  
  // ── Redux 状态：持久化数据 ──
  const { records, customWords, modifiedWords, customUnits, positionProgress, wordSentences } = useAppSelector((state) => state.data);

  // ── 派生数据：从 Redux state 纯计算，不引入额外副作用 ──

  // 当前教材来源数据
  const currentSourceData = useMemo(
    () => sources[currentSource],
    [currentSource],
  );

  // 当前分类数据（如：沪教版七下）
  const currentCategoryData = useMemo(
    () => currentSourceData?.categories[currentCategory],
    [currentSourceData, currentCategory],
  );

  // 当前分类下的原始单元列表
  const currentUnits = useMemo(
    () => currentCategoryData?.units ?? [],
    [currentCategoryData],
  );

  // 合并后的单元列表：原始单元（含用户修改的词）+ 自定义单元
  const mergedUnits = useMemo(() => {
    const base = currentUnits.map((unit) => ({
      ...unit,
      words: modifiedWords[unit.id] ?? unit.words,
    }));
    return [...base, ...customUnits];
  }, [currentUnits, modifiedWords, customUnits]);

  // 当前选中的单元数据
  const currentUnitData = useMemo(
    () => mergedUnits[currentUnit] ?? mergedUnits[0],
    [mergedUnits, currentUnit],
  );

  // 当前单元的完整词列表
  const words = useMemo(() => currentUnitData?.words ?? [], [currentUnitData]);

  // 生成当前单元的复合键（包含 source + category + unit，确保跨分类唯一）
  const compositeUnitKey = useMemo(() => {
    if (!currentSourceData?.id || !currentCategoryData?.id || !currentUnitData?.id) return '';
    return getCompositeUnitId(currentSourceData.id, currentCategoryData.id, currentUnitData.id);
  }, [currentSourceData?.id, currentCategoryData?.id, currentUnitData?.id]);

  // 复习模式下过滤出有错误记录的词；非复习模式直接返回全部
  const filteredWords = useMemo(() => {
    if (!reviewMode) return words;
    const unitRecords = records[compositeUnitKey || currentUnitData?.id || ''] ?? {};
    const incorrect = words.filter((w) => unitRecords[w.english]?.incorrect > 0);
    return incorrect.length > 0 ? incorrect : words;
  }, [words, reviewMode, records, compositeUnitKey, currentUnitData?.id]);

  // 乱序模式下按 shuffledIndices 重排；否则直接使用 filteredWords
  const displayWords = useMemo(() => {
    if (shuffleMode && shuffledIndices.length > 0) {
      return shuffledIndices.map((i) => filteredWords[i]).filter(Boolean);
    }
    return filteredWords;
  }, [shuffleMode, shuffledIndices, filteredWords]);

  // 当前展示的单词及其学习记录
  const currentWord = displayWords[currentIndex];
  const record = currentWord
    ? getRecord(records, compositeUnitKey || currentUnitData?.id || '', currentWord.english)
    : { correct: 0, incorrect: 0, lastReview: null };
  const { totalCorrect, totalIncorrect } = getTotalStats(records);

  // 从网络获取真实例句
  const [realSentences, setRealSentences] = useState<SentenceItem[]>([]);

  // 当前单词的例句：合并内置 + 用户自定义 + 自动生成 + 网络真实例句，随机取 2 条
  const wordSentenceKey = useMemo(
    () => currentWord && compositeUnitKey
      ? getWordSentenceKey(compositeUnitKey, currentWord.english)
      : '',
    [currentWord?.english, compositeUnitKey],
  );
  const currentSentences = useMemo(
    () => currentWord && words.length > 0
      ? getDisplaySentences(currentWord, wordSentences, realSentences, wordSentenceKey, 2)
      : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentWord?.english, words.length, wordSentenceKey, wordSentences, realSentences],
  );

  // ── 副作用 ──

  // 应用启动时迁移旧版 records 到复合键格式
  useEffect(() => {
    const hasOldFormatRecords = Object.keys(records).some(key => !key.includes('__'));
    if (hasOldFormatRecords) {
      const migrated = migrateRecords(records, sources);
      dispatch(setRecords(migrated));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 切换单词时，从网络获取真实例句
  useEffect(() => {
    if (!currentWord?.english) return;
    setRealSentences([]); // 先清空
    fetchRealSentences(currentWord.english, currentWord.pos).then(items => {
      if (items.length > 0) setRealSentences(items);
    });
  }, [currentWord?.english]);

  // 切换单元时，恢复保存的背诵位置（基于单词文本 + 复合键）
  useEffect(() => {
    if (!compositeUnitKey || displayWords.length === 0) return;
    const savedWord = positionProgress[compositeUnitKey];
    if (savedWord) {
      const savedIndex = displayWords.findIndex(w => w.english === savedWord);
      if (savedIndex > 0) {
        dispatch(setCurrentIndex(savedIndex));
      } else if (savedIndex === -1 && displayWords.length > 0) {
        dispatch(setCurrentIndex(displayWords.length - 1));
      }
    }
  }, [compositeUnitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 背诵位置变化时，自动保存当前单词文本
  useEffect(() => {
    if (!compositeUnitKey || !currentWord) return;
    dispatch(setUnitPosition({ unitId: compositeUnitKey, wordEnglish: currentWord.english }));
  }, [currentIndex, compositeUnitKey, currentWord?.english]); // eslint-disable-line react-hooks/exhaustive-deps

  // 当乱序开关、当前单元或复习模式变化时，重新生成随机索引
  // 依赖 currentUnitData?.id 而非整个 filteredWords 数组，避免引用变化导致无限重跑
  useEffect(() => {
    if (!shuffleMode || filteredWords.length === 0) {
      dispatch(setShuffledIndices([]));
      return;
    }
    const indices = filteredWords.map((_, i) => i);
    // Fisher-Yates 洗牌
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    dispatch(setShuffledIndices(indices));
  }, [shuffleMode, currentUnitData?.id, reviewMode, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 学习操作 ──

  /** 标记当前单词对/错，并自动跳到下一张卡片 */
  const handleMark = useCallback((isCorrect: boolean) => {
    if (!currentWord) return;
    dispatch(updateWordRecord({
      unitId: compositeUnitKey || currentUnitData?.id || '',
      wordEnglish: currentWord.english,
      isCorrect,
    }));
    setTimeout(() => {
      const next = currentIndex + 1;
      dispatch(setCurrentIndex(next < displayWords.length ? next : 0));
    }, 150);
  }, [currentWord, compositeUnitKey, currentUnitData?.id, currentIndex, displayWords.length, dispatch]);

  /** 获取指定单元的学习进度，供 UnitTabs 显示进度条 */
  const handleGetProgress = useCallback(
    (index: number) => {
      const unit = currentUnits[index];
      if (!unit || !currentSourceData?.id || !currentCategoryData?.id) {
        return getUnitProgress(unit!, records);
      }
      const key = getCompositeUnitId(currentSourceData.id, currentCategoryData.id, unit.id);
      return getUnitProgress(unit, records, key);
    },
    [currentUnits, records, currentSourceData?.id, currentCategoryData?.id],
  );

  const handlePrevWord = useCallback(() => {
    if (displayWords.length === 0) return;
    dispatch(setCurrentIndex((currentIndex - 1 + displayWords.length) % displayWords.length));
  }, [displayWords.length, currentIndex, dispatch]);

  const handleNextWord = useCallback(() => {
    if (displayWords.length === 0) return;
    dispatch(setCurrentIndex((currentIndex + 1) % displayWords.length));
  }, [displayWords.length, currentIndex, dispatch]);

  /** 为当前单词添加一条用户自定义例句 */
  const handleAddSentence = useCallback((sentence: string) => {
    if (!wordSentenceKey || !sentence.trim()) return;
    dispatch(addWordSentence({ key: wordSentenceKey, sentence: sentence.trim() }));
  }, [wordSentenceKey, dispatch]);

  // ── 词/单元 增删改 ──

  /** 向指定单元添加新单词 */
  const handleAddWord = useCallback(() => {
    if (!forms.newWord.english || !forms.newWord.chinese) return;
    const word: Word = {
      english: forms.newWord.english,
      phonetic: forms.newWord.phonetic || '',
      pos: forms.newWord.pos || '',
      chinese: forms.newWord.chinese,
    };
    const unitId = mergedUnits[forms.selectedUnitIndex].id;
    const existing = modifiedWords[unitId] ?? [...mergedUnits[forms.selectedUnitIndex].words];
    dispatch(updateModifiedWords({ unitId, words: [...existing, word] }));
    dispatch(setNewWord({ english: '', phonetic: '', pos: '', chinese: '' }));
    dispatch(hideModal('showAddWord'));
  }, [forms.newWord, forms.selectedUnitIndex, mergedUnits, modifiedWords, dispatch]);

  /** 新建自定义单元 */
  const handleAddUnit = useCallback((title: string) => {
    dispatch(addCustomUnit({ id: `custom-unit-${Date.now()}`, title: title || '新单元', words: [] }));
  }, [dispatch]);

  /** 保存单元标题编辑（仅自定义单元可改标题） */
  const handleEditUnit = useCallback((unitIndex: number, newTitle: string) => {
    if (unitIndex >= currentUnits.length) {
      dispatch(editCustomUnit({ index: unitIndex - currentUnits.length, title: newTitle }));
    }
    dispatch(setEditingUnit(null));
  }, [currentUnits.length, dispatch]);

  /** 删除单元：自定义单元直接删除，内置单元则清除其修改记录 */
  const handleDeleteUnit = useCallback((unitIndex: number) => {
    if (unitIndex >= currentUnits.length) {
      dispatch(deleteCustomUnit(unitIndex - currentUnits.length));
    } else {
      const unitId = currentUnits[unitIndex]?.id;
      if (unitId) dispatch(deleteModifiedWords(unitId));
    }
    // 若当前选中的是最后一个单元，删除后退一位
    if (currentUnit >= mergedUnits.length - 1) {
      dispatch(changeUnit(Math.max(0, mergedUnits.length - 2)));
    }
    dispatch(setDeleteUnitConfirm(null));
  }, [currentUnits, currentUnit, mergedUnits.length, dispatch]);

  /** 保存词表内联编辑 */
  const handleWordListSaveEdit = useCallback(() => {
    if (!editing.wordListEditData.english || !editing.wordListEditData.chinese) return;
    const { unitIndex, wordIndex } = editing.wordListEditing!;
    const unitId = mergedUnits[unitIndex].id;
    const existing = modifiedWords[unitId] ?? [...mergedUnits[unitIndex].words];
    const updated = [...existing];
    updated[wordIndex] = editing.wordListEditData;
    dispatch(updateModifiedWords({ unitId, words: updated }));
    dispatch(setWordListEditing(null));
    dispatch(setWordListEditData({ english: '', phonetic: '', pos: '', chinese: '' }));
  }, [editing.wordListEditData, editing.wordListEditing, mergedUnits, modifiedWords, dispatch]);

  /** 删除词表中的单词（首次点击进入确认态，再次点击执行删除） */
  const handleWordListDelete = useCallback((unitIndex: number, wordIndex: number) => {
    const unitId = mergedUnits[unitIndex].id;
    const isConfirming =
      editing.wordListDeleteConfirm?.unitIndex === unitIndex &&
      editing.wordListDeleteConfirm?.wordIndex === wordIndex;
    if (isConfirming) {
      const existing = modifiedWords[unitId] ?? [...mergedUnits[unitIndex].words];
      dispatch(updateModifiedWords({ unitId, words: existing.filter((_, i) => i !== wordIndex) }));
      dispatch(setWordListDeleteConfirm(null));
    } else {
      dispatch(setWordListDeleteConfirm({ unitIndex, wordIndex }));
      dispatch(setWordListEditing(null));
    }
  }, [editing.wordListDeleteConfirm, mergedUnits, modifiedWords, dispatch]);

  // ── 导入 / 导出 ──

  const handleExportRecords = (): Promise<void> => {
    try {
      downloadJson(records, `vocab-records-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (e) {
      console.error('导出失败:', e);
    }
    return Promise.resolve();
  };

  const handleImportFile = (file: File): Promise<void> => {
    return file.text().then((text) => {
      try {
        const data = JSON.parse(text);
        if (!data || typeof data !== 'object') {
          dispatch(setImportStatus('导入失败：文件格式错误'));
          return;
        }
        dispatch(setRecords(data));
        dispatch(setImportStatus('导入成功！'));
      } catch (e) {
        dispatch(setImportStatus('导入失败：' + (e as Error).message));
      }
      setTimeout(() => dispatch(setImportStatus('')), 3000);
    });
  };

  /** 导出所有词（含自定义词）为 JSON */
  const handleExportAllWords = useCallback(() => {
    const data = sources.flatMap((s) => s.categories).map((cat) => ({
      source: cat.source,
      categoryId: cat.id,
      categoryTitle: cat.title,
      units: cat.units.map((unit) => ({
        ...unit,
        words: [...unit.words, ...customWords.filter((w) => w.english.startsWith(unit.id))],
      })),
    }));
    downloadJson(data, `vocab-all-${new Date().toISOString().slice(0, 10)}.json`);
  }, [customWords]);

  /** 导出自定义词为 JSON */
  const handleExportCustomWords = useCallback(() => {
    downloadJson(customWords, `custom-words-${new Date().toISOString().slice(0, 10)}.json`);
  }, [customWords]);

  /** 导出自定义词为 TypeScript 源文件 */
  const handleExportCustomWordsAsTs = useCallback(() => {
    const body = customWords
      .map((w) => `  { english: '${w.english}', phonetic: '${w.phonetic}', pos: '${w.pos}', chinese: '${w.chinese}' }`)
      .join(',\n');
    downloadText(
      `export const customWords = [\n${body}\n];`,
      `custom-words-${new Date().toISOString().slice(0, 10)}.ts`,
      'text/typescript',
    );
  }, [customWords]);

  // ── 渲染 ──

  return (
    <div className="min-h-dvh bg-bg-primary flex flex-col">
      <Header
        sources={sources}
        currentSource={currentSource}
        currentCategory={currentCategory}
        currentSourceData={currentSourceData}
        customWordsCount={customWords.length}
        onSourceChange={(i) => dispatch(changeSource(i))}
        onCategoryChange={(i) => dispatch(changeCategory(i))}
        onShowWordList={() => dispatch(showModal('showWordList'))}
        onShowUnitManage={() => dispatch(showModal('showUnitManage'))}
        onShowAddWord={() => dispatch(showModal('showAddWord'))}
        onShowSyncPanel={() => dispatch(showModal('showSyncPanel'))}
        onShowHistory={() => dispatch(showModal('showHistory'))}
      />

      <UnitTabs
        units={currentUnits}
        currentUnit={currentUnit}
        onUnitChange={(i) => dispatch(changeUnit(i))}
        getProgress={handleGetProgress}
      />

      <ModeControls
        mode={mode}
        shuffleMode={shuffleMode}
        reviewMode={reviewMode}
        onModeChange={(m) => dispatch(setMode(m))}
        onShuffleToggle={() => dispatch(toggleShuffle())}
        onReviewToggle={() => dispatch(toggleReview())}
        words={displayWords}
        currentWordIndex={currentIndex}
        onWordSelect={(idx) => dispatch(setCurrentIndex(idx))}
      />

      <main className="flex-1 flex flex-col items-center p-4 sm:p-6">
        {/* ── 合并导航行：历史进度 + 卡片前后翻 ── */}
        <div className="w-full max-w-lg flex items-center justify-between mb-3">
          <HistorySelector
            positionProgress={positionProgress}
            onNavigate={(sourceIdx, categoryIdx, unitIdx) => {
              dispatch(changeSource(sourceIdx));
              setTimeout(() => {
                dispatch(changeCategory(categoryIdx));
                setTimeout(() => {
                  dispatch(changeUnit(unitIdx));
                }, 0);
              }, 0);
            }}
          />
          <div className="text-text-secondary text-sm flex items-center gap-3">
            <button
              onClick={handlePrevWord}
              className="p-1.5 rounded-lg hover:bg-bg-card hover:text-text-primary transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="tabular-nums">{currentIndex + 1}/{displayWords.length}</span>
            <button
              onClick={handleNextWord}
              className="p-1.5 rounded-lg hover:bg-bg-card hover:text-text-primary transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <Flashcard
          word={currentWord}
          mode={mode}
          currentIndex={currentIndex}
          totalCount={displayWords.length}
          record={record}
          accuracy={getAccuracy(record)}
          sentences={currentSentences}
          unitWords={words}
          onPrev={handlePrevWord}
          onNext={handleNextWord}
          onMark={handleMark}
          onAddSentence={handleAddSentence}
        />
      </main>

      <Footer
        totalCorrect={totalCorrect}
        totalIncorrect={totalIncorrect}
        currentCategoryTitle={currentCategoryData?.title}
      />

      <SyncPanel
        isOpen={modals.showSyncPanel}
        onClose={() => dispatch(hideModal('showSyncPanel'))}
        customWords={customWords}
        onExportRecords={handleExportRecords}
        onImport={handleImportFile}
        onExportAllWords={handleExportAllWords}
        onExportCustomWords={handleExportCustomWords}
        onExportCustomWordsAsTs={handleExportCustomWordsAsTs}
        importStatus={forms.importStatus}
      />

      <HistoryPanel
        isOpen={modals.showHistory}
        onClose={() => dispatch(hideModal('showHistory'))}
        units={currentUnits}
        records={records}
        sourceId={currentSourceData?.id || ''}
        categoryId={currentCategoryData?.id || ''}
        onResetAll={() => dispatch(resetAllRecords())}
        onResetUnit={(unitId) => dispatch(resetUnitRecords(unitId))}
        onModifyRecord={(unitId, wordEnglish, field, value) =>
          dispatch(modifyRecord({ unitId, wordEnglish, field, value }))
        }
      />

      {modals.showWordList && (
        <WordListModal
          isOpen={modals.showWordList}
          onClose={() => dispatch(hideModal('showWordList'))}
          unit={currentUnitData}
          unitIndex={currentUnit}
          editing={editing.wordListEditing}
          editData={editing.wordListEditData}
          deleteConfirm={editing.wordListDeleteConfirm}
          onStartEdit={(ui, wi, w) => {
            dispatch(setWordListEditing({ unitIndex: ui, wordIndex: wi }));
            dispatch(setWordListEditData(w));
            dispatch(setWordListDeleteConfirm(null));
          }}
          onSaveEdit={handleWordListSaveEdit}
          onCancelEdit={() => {
            dispatch(setWordListEditing(null));
            dispatch(setWordListEditData({ english: '', phonetic: '', pos: '', chinese: '' }));
          }}
          onEditChange={(data) => dispatch(setWordListEditData(data))}
          onDelete={handleWordListDelete}
          onConfirmDelete={handleWordListDelete}
          onCancelDelete={() => dispatch(setWordListDeleteConfirm(null))}
        />
      )}

      {modals.showUnitManage && (
        <UnitManageModal
          isOpen={modals.showUnitManage}
          onClose={() => dispatch(hideModal('showUnitManage'))}
          units={mergedUnits}
          editing={editing.editingUnit}
          deleteConfirm={editing.deleteUnitConfirm}
          onStartEdit={(index, title) => dispatch(setEditingUnit({ index, title }))}
          onSaveEdit={handleEditUnit}
          onCancelEdit={() => dispatch(setEditingUnit(null))}
          onEditChange={(title) =>
            dispatch(setEditingUnit(editing.editingUnit ? { ...editing.editingUnit, title } : null))
          }
          onDelete={(index) => dispatch(setDeleteUnitConfirm(index))}
          onConfirmDelete={handleDeleteUnit}
          onCancelDelete={() => dispatch(setDeleteUnitConfirm(null))}
          onAddUnit={handleAddUnit}
        />
      )}

      {modals.showAddWord && (
        <AddWordModal
          isOpen={modals.showAddWord}
          onClose={() => dispatch(hideModal('showAddWord'))}
          units={mergedUnits}
          selectedUnitIndex={forms.selectedUnitIndex}
          newWord={forms.newWord}
          onSelectUnit={(idx) => dispatch(setSelectedUnitIndex(idx))}
          onNewWordChange={(word) => dispatch(setNewWord(word))}
          onAdd={handleAddWord}
        />
      )}

      <CustomWordsPanel
        customWords={customWords}
        onExportJson={handleExportCustomWords}
        onExportTs={handleExportCustomWordsAsTs}
        onDelete={(i) => dispatch(deleteCustomWord(i))}
      />
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
