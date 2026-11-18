import { ReactNode } from 'react';
import { useEscapeKey } from '../hooks';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/** 模态框 通用弹窗组件 */
export function Modal({ isOpen, onClose, title, children, className = '' }: ModalProps) {
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`w-full max-w-md bg-bg-card rounded-2xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-bg-card-back rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export interface SlideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  position?: 'left' | 'right';
}

/** 侧边栏 滑动弹窗组件 */
export function SlideModal({ isOpen, onClose, title, children, position = 'right' }: SlideModalProps) {
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const positionClass = position === 'right' ? 'justify-end' : 'justify-start';

  return (
    <div className={`fixed inset-0 bg-black/50 z-50 flex ${positionClass}`} onClick={onClose}>
      <div
        className="w-full max-w-md bg-bg-primary h-full overflow-y-auto animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-border-subtle flex justify-between items-center sticky top-0 bg-bg-primary z-10">
          <h2 className="font-display text-lg sm:text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-bg-card rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
