import { AllRecords, WordRecord, Unit } from '../types';

/** 获取单词记录 */
export function getRecord(records: AllRecords, unitId: string, wordEnglish: string): WordRecord {
  return records[unitId]?.[wordEnglish] || { correct: 0, incorrect: 0, lastReview: null };
}

/** 更新单词记录 */
export function updateRecord(
  records: AllRecords,
  unitId: string,
  wordEnglish: string,
  isCorrect: boolean
): AllRecords {
  const currentRecord = getRecord(records, unitId, wordEnglish);
  return {
    ...records,
    [unitId]: {
      ...records[unitId],
      [wordEnglish]: {
        correct: currentRecord.correct + (isCorrect ? 1 : 0),
        incorrect: currentRecord.incorrect + (isCorrect ? 0 : 1),
        lastReview: new Date().toISOString(),
      },
    },
  };
}

/** 获取单词准确率 */
export function getAccuracy(record: WordRecord): number {
  const total = record.correct + record.incorrect;
  if (total === 0) return 0;
  return Math.round((record.correct / total) * 100);
}

/** 获取单元学习进度 */
export function getUnitProgress(unit: Unit, records: AllRecords, compositeKey?: string): { total: number; mastered: number } {
  const key = compositeKey || unit.id;
  const unitRecords = records[key] || {};
  const masteredCount = Object.values(unitRecords).filter(
    (r: WordRecord) => r.correct > r.incorrect && r.correct > 0
  ).length;
  return { total: unit.words.length, mastered: masteredCount };
}

/** 获取总学习统计 */
export function getTotalStats(records: AllRecords): { totalCorrect: number; totalIncorrect: number } {
  const totalCorrect = Object.values(records).reduce(
    (sum, unit) => sum + Object.values(unit).reduce((s, word: WordRecord) => s + word.correct, 0),
    0
  );
  const totalIncorrect = Object.values(records).reduce(
    (sum, unit) => sum + Object.values(unit).reduce((s, word: WordRecord) => s + word.incorrect, 0),
    0
  );
  return { totalCorrect, totalIncorrect };
}
