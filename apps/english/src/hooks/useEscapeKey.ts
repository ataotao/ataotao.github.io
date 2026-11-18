import { useEffect, useCallback } from 'react';

/** 键盘事件监听器，用于检测按下了Escape键 */
export function useEscapeKey(isActive: boolean, onEscape: () => void) {
    /** 监听键盘事件，当按下了Escape键时调用onEscape函数 */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onEscape();
    }
  }, [onEscape]);

  useEffect(() => {
    if (!isActive) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleKeyDown]);
}
