import { Source } from '../types';

interface HeaderProps {
  sources: Source[];
  currentSource: number;
  currentCategory: number;
  currentSourceData: Source | undefined;
  customWordsCount: number;
  onSourceChange: (index: number) => void;
  onCategoryChange: (index: number) => void;
  onShowWordList: () => void;
  onShowUnitManage: () => void;
  onShowAddWord: () => void;
  onShowSyncPanel: () => void;
  onShowHistory: () => void;
}

/** 顶部导航栏组件 */
export function Header({
  sources,
  currentSource,
  currentCategory,
  currentSourceData,
  customWordsCount,
  onSourceChange,
  onCategoryChange,
  onShowWordList,
  onShowUnitManage,
  onShowAddWord,
  onShowSyncPanel,
  onShowHistory,
}: HeaderProps) {
  return (
    <header className="h-14 sm:h-16 bg-bg-primary/80 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-3 sm:px-6 sticky top-0 z-50 w-full overflow-hidden">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h1 className="font-display text-lg sm:text-2xl font-bold text-text-primary whitespace-nowrap">
            <span className="hidden sm:inline">单词记背</span>
            <span className="sm:hidden">词</span>
          </h1>
          <div className="hidden sm:flex items-center gap-2">
            <select
              value={currentSource}
              onChange={(e) => {
                onSourceChange(Number(e.target.value));
              }}
              className="bg-bg-card border border-border-subtle rounded-lg px-2 py-1 text-sm text-text-primary min-w-0"
            >
              {sources.map((source, idx) => (
                <option key={source.id} value={idx}>{source.name}</option>
              ))}
            </select>
            <select
              value={currentCategory}
              onChange={(e) => {
                onCategoryChange(Number(e.target.value));
              }}
              className="bg-bg-card border border-border-subtle rounded-lg px-2 py-1 text-sm text-text-primary min-w-0"
            >
              {currentSourceData?.categories.map((cat, idx) => (
                <option key={cat.id} value={idx}>{cat.title}</option>
              ))}
            </select>
          </div>
          <div className="flex sm:hidden items-center gap-1">
            <select
              value={currentSource}
              onChange={(e) => {
                onSourceChange(Number(e.target.value));
              }}
              className="bg-bg-card border border-border-subtle rounded-lg px-1.5 py-1 text-xs text-text-primary min-w-0 max-w-20 truncate"
            >
              {sources.map((source, idx) => (
                <option key={source.id} value={idx}>{source.name}</option>
              ))}
            </select>
            <select
              value={currentCategory}
              onChange={(e) => {
                onCategoryChange(Number(e.target.value));
              }}
              className="bg-bg-card border border-border-subtle rounded-lg px-1.5 py-1 text-xs text-text-primary min-w-0 max-w-20 truncate"
            >
              {currentSourceData?.categories.map((cat, idx) => (
                <option key={cat.id} value={idx}>{cat.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
        <button
          onClick={onShowWordList}
          className="p-2 sm:px-4 sm:py-2 rounded-lg bg-bg-card hover:bg-border-subtle transition-all duration-200 text-text-secondary hover:text-text-primary flex items-center justify-center"
        >
          <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span className="hidden sm:inline ml-2 text-sm">词表</span>
        </button>
        <button
          onClick={onShowUnitManage}
          className="p-2 sm:px-4 sm:py-2 rounded-lg bg-bg-card hover:bg-border-subtle transition-all duration-200 text-text-secondary hover:text-text-primary flex items-center justify-center"
        >
          <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="hidden sm:inline ml-2 text-sm">单元</span>
        </button>
        <button
          onClick={onShowAddWord}
          className="p-2 sm:px-4 sm:py-2 rounded-lg bg-bg-card hover:bg-border-subtle transition-all duration-200 text-text-secondary hover:text-text-primary flex items-center justify-center relative"
        >
          <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline ml-2 text-sm">添加</span>
          {customWordsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-accent-green text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {customWordsCount}
            </span>
          )}
        </button>
        <button
          onClick={onShowSyncPanel}
          className="p-2 sm:px-4 sm:py-2 rounded-lg bg-bg-card hover:bg-border-subtle transition-all duration-200 text-text-secondary hover:text-text-primary flex items-center justify-center"
        >
          <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="hidden sm:inline ml-2 text-sm">同步</span>
        </button>
        <button
          onClick={onShowHistory}
          className="p-2 sm:px-4 sm:py-2 rounded-lg bg-bg-card hover:bg-border-subtle transition-all duration-200 text-text-secondary hover:text-text-primary flex items-center justify-center"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="hidden sm:inline ml-2 text-sm">历史</span>
        </button>
      </div>
    </header>
  );
}
