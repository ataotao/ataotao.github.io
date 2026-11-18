import { Word, SentenceItem } from '../types';

/** Fisher-Yates 洗牌 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 从数组中随机取 n 个元素 */
function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

/**
 * 获取展示用例句（合并内置 + 用户自定义 + 网络真实例句）
 * 不再使用模板生成句子，全部来源真实语料
 */
export function getDisplaySentences(
  word: Word,
  userSentences: Record<string, string[]>,
  realSentences: SentenceItem[],
  wordKey: string,
  count: number = 2,
): SentenceItem[] {
  const all: SentenceItem[] = [];

  // 1. 网络真实例句（SentenceItem[]，可能含中文翻译）
  for (const item of realSentences) {
    all.push(item);
  }

  // 2. 内置例句（来自数据文件）
  if (word.sentences && word.sentences.length > 0) {
    for (const s of word.sentences) {
      const parts = s.split('|');
      all.push({ en: parts[0].trim(), zh: parts[1]?.trim() });
    }
  }

  // 3. 用户自定义例句
  if (userSentences[wordKey]?.length) {
    for (const s of userSentences[wordKey]) {
      all.push({ en: s });
    }
  }

  // 去重后随机取
  const seen = new Set<string>();
  const unique = all.filter(s => {
    const item = s as any;
    const key = (typeof item === 'string' ? item : (item.en || '')).toLowerCase();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return pickRandom(unique, Math.min(count, unique.length));
}

/** 生成单词在单元中的复合键 */
export function getWordSentenceKey(unitId: string, wordEnglish: string): string {
  return `${unitId}|${wordEnglish}`;
}
