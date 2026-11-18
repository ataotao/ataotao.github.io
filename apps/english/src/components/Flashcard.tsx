import { useState, useRef, useCallback, useEffect } from 'react';
import { Word, StudyMode, WordRecord, SentenceItem } from '../types';
import { translateSentence } from '../utils/realSentences';

const isWeChatBrowser = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('micromessenger') !== -1;
};

interface FlashcardProps {
  word: Word | undefined;
  mode: StudyMode;
  currentIndex: number;
  totalCount: number;
  record: WordRecord;
  accuracy: number;
  sentences: SentenceItem[];
  unitWords: Word[];
  onPrev: () => void;
  onNext: () => void;
  onMark: (correct: boolean) => void;
  onAddSentence: (sentence: string) => void;
}

/** 单词卡片组件 */
export function Flashcard({
  word,
  mode,
  currentIndex,
  totalCount,
  record,
  accuracy,
  sentences,
  unitWords,
  onPrev,
  onNext,
  onMark,
  onAddSentence,
}: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [slideClass, setSlideClass] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showWeChatTip, setShowWeChatTip] = useState(false);
  const [accentType, setAccentType] = useState<'en-GB' | 'en-US'>('en-GB');
  const [showAddSentence, setShowAddSentence] = useState(false);
  const [newSentence, setNewSentence] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  const [revealedSentences, setRevealedSentences] = useState<number[]>([]);
  const [dynamicTranslations, setDynamicTranslations] = useState<Record<number, string>>({});
  const [translatingIdx, setTranslatingIdx] = useState<number | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isSwipe = useRef<boolean>(false);
  const touchHandledRef = useRef(false);

  const handleNav = useCallback((navFn: () => void, direction: 'left' | 'right') => {
    setIsFlipped(false);
    setSlideClass(`animate-slide-out-${direction}`);
    
    setTimeout(() => {
      navFn();
      setSlideClass(`animate-slide-in-${direction}`);
      
      setTimeout(() => {
        setSlideClass('');
      }, 200);
    }, 150);
  }, []);

  const handlePrev = useCallback(() => {
    handleNav(onPrev, 'right');
  }, [handleNav, onPrev]);

  const handleNext = useCallback(() => {
    handleNav(onNext, 'left');
  }, [handleNav, onNext]);

  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    if (currentIndexRef.current !== currentIndex) {
      currentIndexRef.current = currentIndex;
      if (slideClass) {
        setTimeout(() => setSlideClass(''), 200);
      }
      setRevealedSentences([]);
      setDynamicTranslations({});
      setTranslatingIdx(null);
      setShowProgress(false);
    }
  }, [currentIndex, slideClass]);

  const handleSpeak = () => {
    if (!word) return;
    
    if (isWeChatBrowser()) {
      setShowWeChatTip(true);
      setTimeout(() => setShowWeChatTip(false), 3000);
      return;
    }
    
    if (!('speechSynthesis' in window)) {
      setShowWeChatTip(true);
      setTimeout(() => setShowWeChatTip(false), 3000);
      return;
    }
    
    setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(word.english);
    utterance.lang = accentType;
    utterance.rate = 0.8;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    speechSynthesis.speak(utterance);
  };

  if (!word) {
    return (
      <div className="text-center text-text-secondary">
        <p className="text-xl">本单元暂无单词</p>
      </div>
    );
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
    isSwipe.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    const diff = Math.abs(touchStartX.current - touchEndX.current);
    if (diff > 10) {
      isSwipe.current = true;
    }
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const timeDiff = Date.now() - touchStartTime.current;
    
    if (isSwipe.current && Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    } else if (!isSwipe.current && timeDiff < 300) {
      setIsFlipped(!isFlipped);
    }
  };

  const progress = totalCount > 0 ? Math.round(((currentIndex + 1) / totalCount) * 100) : 0;

  /** 点击句子切换翻译显示 */
  const handleSentenceClick = useCallback((idx: number) => {
    setRevealedSentences(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx],
    );
  }, []);

  /** 统一点击/触屏处理，防止双击导致闪烁 */
  const handleSentenceToggle = useCallback((idx: number, isTouch: boolean, item: SentenceItem) => {
    if (isTouch) {
      touchHandledRef.current = true;
    }

    // 如果还没有中文翻译，且当前展开此句，触发翻译
    const willReveal = !revealedSentences.includes(idx);
    if (willReveal && !item.zh && !dynamicTranslations[idx] && translatingIdx !== idx) {
      setTranslatingIdx(idx);
      translateSentence(item.en).then(zh => {
        if (zh) {
          setDynamicTranslations(prev => ({ ...prev, [idx]: zh }));
        }
        setTranslatingIdx(null);
      });
    }

    handleSentenceClick(idx);
  }, [handleSentenceClick, revealedSentences, dynamicTranslations, translatingIdx]);

  /** 在句子中找出匹配的单元词汇 */
  const findVocabInSentence = (sentence: string): Word[] => {
    const lower = sentence.toLowerCase();
    return unitWords.filter(w => {
      const eng = w.english.toLowerCase();
      return eng.length > 1 && lower.includes(eng);
    });
  };

  return (
    <>
      {/* ── 翻转卡片 ── */}
      <div 
        className="perspective-1000 w-full max-w-lg select-none card-slide-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          onClick={() => {
            if (!('ontouchstart' in window)) {
              setIsFlipped(!isFlipped);
            }
          }}
          className={`relative w-full min-h-[18rem] sm:min-h-[22rem] cursor-pointer transition-transform duration-500 ${
            isFlipped ? 'rotate-y-180' : ''
          } ${slideClass}`}
          style={{ 
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* ═══ 卡片正面：单词 ═══ */}
          <div
            className="absolute inset-0 bg-bg-card rounded-2xl p-5 sm:p-8 flex flex-col border border-border-subtle"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2 z-10">
              {showWeChatTip && (
                <span className="text-xs bg-accent-blue/20 text-accent-blue px-2 py-1 rounded-lg animate-pulse whitespace-nowrap">
                  微信不支持播放发音
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setAccentType(accentType === 'en-GB' ? 'en-US' : 'en-GB'); }}
                onTouchStart={(e) => { e.stopPropagation(); }}
                onTouchEnd={(e) => { e.stopPropagation(); }}
                className="px-2 py-1 rounded-lg bg-bg-card border border-border-subtle text-text-secondary text-xs hover:border-accent-blue hover:text-accent-blue transition-colors touch-manipulation"
                aria-label="切换发音"
              >
                {accentType === 'en-GB' ? '英式' : '美式'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleSpeak(); }}
                onTouchStart={(e) => { e.stopPropagation(); }}
                onTouchEnd={(e) => { e.stopPropagation(); }}
                className={`p-2 sm:p-2.5 rounded-full transition-colors touch-manipulation ${
                  isPlaying 
                    ? 'bg-accent-blue/20 text-accent-blue animate-pulse' 
                    : 'hover:bg-border-subtle text-text-secondary'
                }`}
                aria-label="播放发音"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8" className="animate-pulse" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center -mt-6 sm:-mt-7">
              <span className="text-text-secondary text-xs sm:text-sm mb-1.5">{word.pos}</span>
              <h2 className="font-body text-3xl sm:text-5xl font-bold text-text-primary text-center mb-2 sm:mb-3">
                {mode === 'en-cn' ? word.english : word.chinese}
              </h2>
              <p className="font-mono text-sm sm:text-lg text-accent-blue">
                {mode === 'en-cn' ? word.phonetic : ''}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 text-text-secondary text-xs">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">点击翻转</span>
                <span className="sm:hidden">翻转</span>
              </span>
              {sentences.length > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {sentences.length} 例句
                </span>
              )}
            </div>
          </div>

          {/* ═══ 卡片背面：释义 + 例句 ═══ */}
          <div
            className="absolute inset-0 bg-bg-card-back rounded-2xl p-5 sm:p-6 flex flex-col border border-border-subtle overflow-y-auto"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="text-center mb-3 sm:mb-4">
              <span className="text-text-secondary text-xs sm:text-sm mb-1 block">
                {mode === 'en-cn' ? '中文释义' : 'English'}
              </span>
              <h2 className="font-body text-xl sm:text-2xl font-bold text-text-primary">
                {mode === 'en-cn' ? word.chinese : word.english}
              </h2>
            </div>

            {/* ── 例句区 ── */}
            <div className="border-t border-border-subtle pt-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-medium text-text-secondary tracking-wider flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  句型例句
                </h3>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAddSentence(!showAddSentence); }}
                  className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors flex items-center gap-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {showAddSentence ? '收起' : '添加'}
                </button>
              </div>

              {showAddSentence && (
                <div
                  className="mb-2 flex gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={newSentence}
                    onChange={(e) => setNewSentence(e.target.value)}
                    placeholder="输入新例句..."
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-bg-card border border-border-subtle text-text-primary text-xs placeholder:text-text-secondary/40 focus:outline-none focus:border-accent-blue transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSentence.trim()) {
                        onAddSentence(newSentence.trim());
                        setNewSentence('');
                        setShowAddSentence(false);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newSentence.trim()) {
                        onAddSentence(newSentence.trim());
                        setNewSentence('');
                        setShowAddSentence(false);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-accent-blue text-white text-xs hover:bg-accent-blue/80 transition-colors disabled:opacity-40 shrink-0"
                    disabled={!newSentence.trim()}
                  >
                    添加
                  </button>
                </div>
              )}

              {/* ── 例句列表 ── */}
              {sentences.length > 0 ? (
                <div className="space-y-2.5 min-h-0">
                  {sentences.map((item, idx) => {
                    const isRevealed = revealedSentences.includes(idx);
                    const matched = isRevealed ? findVocabInSentence(item.en) : [];
                    return (
                      <div key={`${item.en}-${idx}`}>
                        {/* 英文句 */}
                        <div
                          onClick={(e) => {
                            if (touchHandledRef.current) { touchHandledRef.current = false; return; }
                            e.stopPropagation();
                            handleSentenceToggle(idx, false, item);
                          }}
                          onTouchEnd={(e) => {
                            e.stopPropagation();
                            handleSentenceToggle(idx, true, item);
                          }}
                          className="cursor-pointer group"
                        >
                          <p className="text-text-primary text-sm sm:text-base leading-relaxed group-hover:text-accent-blue transition-colors inline">
                            <span className="text-accent-blue font-mono font-medium">{idx + 1}.</span>{' '}
                            {item.en}
                          </p>
                          <span className={`inline-flex items-center ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium align-middle transition-colors ${
                            isRevealed
                              ? 'bg-accent-blue/15 text-accent-blue'
                              : 'bg-bg-card text-text-secondary/60 group-hover:text-accent-blue group-hover:bg-accent-blue/10'
                          }`}>
                            {translatingIdx === idx ? '⋯' : (isRevealed ? '译' : '译')}
                          </span>
                        </div>

                        {/* 展开的翻译内容 */}
                        {isRevealed && (
                          <div className="mt-1.5 ml-0 animate-fade-in">
                            {/* 完整句子翻译：优先 item.zh，其次 dynamicTranslations */}
                            {(item.zh || dynamicTranslations[idx]) ? (
                              <p className="text-text-secondary text-sm sm:text-base leading-relaxed mb-1.5 pl-3 border-l-2 border-accent-blue/40">
                                {item.zh || dynamicTranslations[idx]}
                              </p>
                            ) : translatingIdx === idx ? (
                              <p className="text-text-secondary/50 text-xs italic pl-3 mb-1.5 animate-pulse">
                                翻译中...
                              </p>
                            ) : null}
                            {/* 句中单词释义 */}
                            {matched.length > 0 && (
                              <div className="pl-3 space-y-0.5">
                                {matched.map(w => (
                                  <p key={w.english} className="text-[11px] sm:text-xs text-text-secondary/70">
                                    <span className="text-accent-blue/70 font-mono">{w.english}</span>
                                    {' — '}{w.chinese}
                                    {w.pos && <span className="text-text-secondary/40 ml-1">({w.pos})</span>}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-text-secondary text-xs text-center py-2">
                  暂无例句，点击"添加"自定义
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 认识/不认识 按钮 ── */}
      <div className="flex gap-3 sm:gap-4 mt-4 sm:mt-5 w-full max-w-lg px-2">
        <button
          onClick={() => { 
            onMark(false); 
            setIsFlipped(false); 
          }}
          className="flex-1 px-4 sm:px-8 py-3.5 sm:py-5 rounded-xl bg-accent-red/20 text-accent-red hover:bg-accent-red hover:text-white transition-all duration-200 font-medium text-sm sm:text-lg flex items-center justify-center gap-2 active:scale-95 touch-manipulation min-h-[48px] sm:min-h-[60px]"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>不认识</span>
        </button>
        <button
          onClick={() => { 
            onMark(true); 
            setIsFlipped(false); 
          }}
          className="flex-1 px-4 sm:px-8 py-3.5 sm:py-5 rounded-xl bg-accent-green/20 text-accent-green hover:bg-accent-green hover:text-white transition-all duration-200 font-medium text-sm sm:text-lg flex items-center justify-center gap-2 active:scale-95 touch-manipulation min-h-[48px] sm:min-h-[60px]"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>认识</span>
        </button>
      </div>

      {/* ── 进度条（默认折叠） ── */}
      <div className="mt-3 w-full max-w-lg px-2">
        <button
          onClick={() => setShowProgress(!showProgress)}
          className="w-full flex items-center justify-center gap-1.5 text-text-secondary/50 hover:text-text-secondary transition-colors text-xs py-1"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${showProgress ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showProgress ? '隐藏进度' : '查看进度'}
        </button>

        {showProgress && (
          <div className="animate-fade-in">
            <div className="flex justify-between text-xs sm:text-sm text-text-secondary mb-1.5 mt-1">
              <span>进度</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 sm:h-2 bg-bg-card rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-green to-accent-blue transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
              <span className="text-accent-green">✓ {record.correct}</span>
              <span className="text-accent-red">✗ {record.incorrect}</span>
              {record.correct + record.incorrect > 0 && (
                <span className="text-accent-blue">{accuracy}%</span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
