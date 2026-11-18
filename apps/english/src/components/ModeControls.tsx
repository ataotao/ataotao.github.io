import { useState } from 'react';
import { StudyMode, Word } from '../types';
import { useEscapeKey } from '../hooks';

interface ModeControlsProps {
  mode: StudyMode;
  shuffleMode: boolean;
  reviewMode: boolean;
  onModeChange: (mode: StudyMode) => void;
  onShuffleToggle: () => void;
  onReviewToggle: () => void;
  // 单词快速跳转
  words?: Word[];
  currentWordIndex?: number;
  onWordSelect?: (index: number) => void;
}

/** 学习模式控制 + 单词快速跳转组合组件 */
export function ModeControls({
  mode,
  shuffleMode,
  reviewMode,
  onModeChange,
  onShuffleToggle,
  onReviewToggle,
  words,
  currentWordIndex,
  onWordSelect,
}: ModeControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEscapeKey(isOpen, () => {
    setIsOpen(false);
    setSearchTerm('');
  });

  const filteredWords = searchTerm && words
    ? words.filter(w =>
        w.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.chinese.includes(searchTerm)
      )
    : words ?? [];

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 border-b border-border-subtle">
      {/* ── 中英文切换 ── */}
      <div className="flex rounded-lg overflow-hidden border border-border-subtle">
        <button
          onClick={() => onModeChange('en-cn')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${
            mode === 'en-cn'
              ? 'bg-accent-purple text-white'
              : 'bg-bg-card text-text-secondary hover:text-text-primary'
          }`}
        >
          EN→CN
        </button>
        <button
          onClick={() => onModeChange('cn-en')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors border-l border-border-subtle ${
            mode === 'cn-en'
              ? 'bg-accent-purple text-white'
              : 'bg-bg-card text-text-secondary hover:text-text-primary'
          }`}
        >
          CN→EN
        </button>
      </div>

      {/* ── 随机/顺序 ── */}
      <button
        onClick={onShuffleToggle}
        className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors border border-border-subtle ${
          shuffleMode
            ? 'bg-accent-green text-white border-accent-green'
            : 'bg-bg-card text-text-secondary hover:text-text-primary'
        }`}
      >
        {shuffleMode ? '随机' : '顺序'}
      </button>

      {/* ── 复习/学习 ── */}
      <button
        onClick={onReviewToggle}
        className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors border border-border-subtle ${
          reviewMode
            ? 'bg-accent-red text-white border-accent-red'
            : 'bg-bg-card text-text-secondary hover:text-text-primary'
        }`}
      >
        {reviewMode ? '复习' : '学习'}
      </button>

      {/* ── 分隔线 ── */}
      <div className="w-px h-5 sm:h-6 bg-border-subtle hidden sm:block"></div>

      {/* ── 单词快速跳转 ── */}
      {words && currentWordIndex !== undefined && onWordSelect && (
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-bg-card border border-border-subtle text-text-secondary hover:text-text-primary hover:border-accent-blue transition-colors text-xs sm:text-sm"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="hidden sm:inline">{currentWordIndex + 1}/{words.length}</span>
            <span className="sm:hidden">{currentWordIndex + 1}</span>
            <svg
              className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* ── 下拉菜单 ── */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 sm:w-72 bg-bg-card border border-border-subtle rounded-xl shadow-xl overflow-hidden z-50">
              <div className="p-2 border-b border-border-subtle">
                <input
                  type="text"
                  placeholder="搜索单词..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-1.5 bg-bg-primary border border-border-subtle rounded-lg text-text-primary text-sm placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue"
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredWords.length === 0 ? (
                  <div className="p-4 text-center text-text-secondary text-sm">
                    未找到匹配的单词
                  </div>
                ) : (
                  filteredWords.map((word, idx) => {
                    const originalIdx = words.indexOf(word);
                    const isCurrent = originalIdx === currentWordIndex;
                    return (
                      <button
                        key={`${word.english}-${idx}`}
                        onClick={() => {
                          onWordSelect(originalIdx);
                          setIsOpen(false);
                          setSearchTerm('');
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-bg-primary transition-colors ${
                          isCurrent ? 'bg-accent-blue/10 border-l-2 border-accent-blue' : ''
                        }`}
                      >
                        <span className="text-text-secondary text-xs w-6 shrink-0 text-right">
                          {originalIdx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className={`block truncate text-sm ${isCurrent ? 'text-accent-blue font-medium' : 'text-text-primary'}`}>
                            {word.english}
                          </span>
                          {word.chinese !== word.english && (
                            <span className="text-text-secondary text-xs truncate block">
                              {word.chinese}
                            </span>
                          )}
                        </div>
                        {isCurrent && (
                          <span className="text-accent-blue text-xs shrink-0">当前</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
