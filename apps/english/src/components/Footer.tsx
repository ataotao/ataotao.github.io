interface FooterProps {
  totalCorrect: number;
  totalIncorrect: number;
  currentCategoryTitle?: string;
}

/** 底部导航栏组件 */
export function Footer({ totalCorrect, totalIncorrect, currentCategoryTitle }: FooterProps) {
  return (
    <footer className="py-3 sm:py-4 px-4 sm:px-6 border-t border-border-subtle flex flex-wrap justify-between items-center text-xs sm:text-sm text-text-secondary gap-2">
      <div className="flex gap-3 sm:gap-4">
        <span>总正确: <span className="text-accent-green">{totalCorrect}</span></span>
        <span>总错误: <span className="text-accent-red">{totalIncorrect}</span></span>
      </div>
      <div>
        {currentCategoryTitle && (
          <span className="text-text-secondary">{currentCategoryTitle}</span>
        )}
      </div>
    </footer>
  );
}
