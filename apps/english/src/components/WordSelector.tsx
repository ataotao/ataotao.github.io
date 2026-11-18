import { useState } from 'react';
import { Word } from '../types';
import { useEscapeKey } from '../hooks';

interface WordSelectorProps {
  words: Word[];
  currentIndex: number;
  onSelect: (index: number) => void;
}
/** 单词选择器组件 */
export function WordSelector({ words, currentIndex, onSelect }: WordSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEscapeKey(isOpen, () => {
    setIsOpen(false);
    setSearchTerm('');
  });

  const filteredWords = searchTerm
    ? words.filter(w =>
        w.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.chinese.includes(searchTerm)
      )
    : words;

  const displayWord = words[currentIndex];

  if (!displayWord) return null;

  return (
    <div className="w-full max-w-lg mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-bg-card border border-border-subtle rounded-xl text-left hover:border-accent-blue transition-colors flex items-center justify-between"
      >
        <div className="flex-1 min-w-0">
          <span className="text-text-secondary text-sm mr-2">快速跳转:</span>
          {/* <span className="text-text-primary font-medium truncate">
            {displayWord.english}
          </span>
          {displayWord.chinese !== displayWord.english && (
            <span className="text-text-secondary text-sm ml-2 hidden sm:inline">
              {displayWord.chinese}
            </span>
          )} */}
        </div>
        <svg
          className={`w-5 h-5 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 bg-bg-card border border-border-subtle rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border-subtle">
            <input
              type="text"
              placeholder="搜索单词..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue"
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
                const isCurrent = originalIdx === currentIndex;
                return (
                  <button
                    key={`${word.english}-${idx}`}
                    onClick={() => {
                      onSelect(originalIdx);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-bg-primary transition-colors ${
                      isCurrent ? 'bg-accent-blue/10 border-l-2 border-accent-blue' : ''
                    }`}
                  >
                    <span className="text-text-secondary text-sm w-8">
                      {originalIdx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={`block truncate ${isCurrent ? 'text-accent-blue font-medium' : 'text-text-primary'}`}>
                        {word.english}
                      </span>
                      {word.chinese !== word.english && (
                        <span className="text-text-secondary text-sm truncate block">
                          {word.chinese}
                        </span>
                      )}
                    </div>
                    {isCurrent && (
                      <span className="text-accent-blue text-sm">当前</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
