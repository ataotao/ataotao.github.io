export interface Word {
  english: string;
  phonetic: string;
  pos: string;
  chinese: string;
  /** 结合本单元单词的例句（内置） */
  sentences?: string[];
}

export interface Unit {
  id: string;
  title: string;
  words: Word[];
}

export interface Category {
  id: string;
  title: string;
  source: string;
  units: Unit[];
}

export interface Source {
  id: string;
  name: string;
  categories: Category[];
}

export interface WordRecord {
  correct: number;
  incorrect: number;
  lastReview: string | null;
}

export interface UnitRecords {
  [wordEnglish: string]: WordRecord;
}

export interface AllRecords {
  [categoryUnitId: string]: UnitRecords;
}

export type StudyMode = 'en-cn' | 'cn-en';

/** 例句对：英文 + 可选中文翻译 */
export interface SentenceItem {
  en: string;
  zh?: string;
}
