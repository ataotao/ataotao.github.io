import { useRef } from 'react';
import { Word } from '../types';
import { useEscapeKey } from '../hooks';

interface SyncPanelProps {
  isOpen: boolean;
  onClose: () => void;
  customWords: Word[];
  onExportRecords: () => Promise<void>;
  onImport: (file: File) => Promise<void>;
  onExportAllWords: () => void;
  onExportCustomWords: () => void;
  onExportCustomWordsAsTs: () => void;
  importStatus: string;
}

/** 数据同步面板组件 */
export function SyncPanel({
  isOpen,
  onClose,
  customWords,
  onExportRecords,
  onImport,
  onExportAllWords,
  onExportCustomWords,
  onExportCustomWordsAsTs,
  importStatus,
}: SyncPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onImport(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-bg-card rounded-2xl p-6 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-xl font-bold">数据同步</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-card-back rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-bg-card-back rounded-xl p-4">
            <h3 className="font-medium text-text-primary mb-2">导出数据</h3>
            <p className="text-sm text-text-secondary mb-3">将学习记录导出为 JSON 文件，可保存或分享到其他设备</p>
            <button
              onClick={onExportRecords}
              className="w-full py-3 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              导出记录
            </button>
          </div>

          <div className="bg-bg-card-back rounded-xl p-4">
            <h3 className="font-medium text-text-primary mb-2">导入数据</h3>
            <p className="text-sm text-text-secondary mb-3">从 JSON 文件导入学习记录（会覆盖当前数据）</p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className="w-full py-3 bg-bg-card border border-border-subtle hover:border-accent-blue text-text-primary rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              选择文件导入
            </label>
            {importStatus && (
              <p className={`mt-2 text-sm text-center ${importStatus.includes('成功') ? 'text-accent-green' : 'text-accent-red'}`}>
                {importStatus}
              </p>
            )}
          </div>

          <div className="bg-bg-card-back rounded-xl p-4">
            <h3 className="font-medium text-text-primary mb-2">导出全部单词</h3>
            <p className="text-sm text-text-secondary mb-3">导出所有来源和分类的单词为 JSON 文件</p>
            <button
              onClick={onExportAllWords}
              className="w-full py-3 bg-accent-purple hover:bg-accent-purple/80 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              导出完整词库
            </button>
          </div>

          {customWords.length > 0 && (
            <div className="bg-bg-card-back rounded-xl p-4">
              <h3 className="font-medium text-text-primary mb-2">导出自定义单词</h3>
              <p className="text-sm text-text-secondary mb-3">已添加 {customWords.length} 个自定义单词</p>
              <div className="flex gap-2">
                <button
                  onClick={onExportCustomWords}
                  className="flex-1 py-3 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  JSON
                </button>
                <button
                  onClick={onExportCustomWordsAsTs}
                  className="flex-1 py-3 bg-accent-green hover:bg-accent-green/80 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  TS代码
                </button>
              </div>
            </div>
          )}

          <div className="bg-bg-card-back rounded-xl p-4">
            <h3 className="font-medium text-text-primary mb-2">说明</h3>
            <ul className="text-sm text-text-secondary space-y-1">
              <li>• 数据保存在浏览器 IndexedDB 中</li>
              <li>• 导出后可复制到其他设备导入</li>
              <li>• 建议定期导出备份学习记录</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
