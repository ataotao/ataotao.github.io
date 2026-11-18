/**
 * 多 API 真实例句获取
 *   1. Free Dictionary API（Wiktionary，词性过滤）
 *   2. Tatoeba API（含中文翻译，回退方案）
 * 结果缓存到 localStorage
 */

import { SentenceItem } from '../types';

const CACHE_KEY = 'vocab-real-sentences';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const CACHE_VERSION = 2; // 版本递增以清除旧格式缓存
const MAX_LEN = 100;

interface CacheEntry {
  data: SentenceItem[];
  fetchedAt: number;
  version: number;
}

function getCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    // 过滤掉旧版本的缓存条目
    const valid: Record<string, CacheEntry> = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if ((entry as any).version === CACHE_VERSION) {
        valid[key] = entry as CacheEntry;
      }
    }
    return valid;
  } catch { return {}; }
}

function setCache(word: string, data: SentenceItem[]) {
  const cache = getCache();
  cache[word] = { data, fetchedAt: Date.now(), version: CACHE_VERSION };
  const entries = Object.entries(cache);
  if (entries.length > 500) {
    const sorted = entries.sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
    delete cache[sorted[0][0]];
  }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }
  catch {
    const entries = Object.entries(cache);
    const sorted = entries.sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
    for (const [key] of sorted.slice(0, Math.floor(entries.length / 2))) delete cache[key];
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
  }
}

// ── 词形生成 ──

function getWordForms(word: string): string[] {
  const forms = [word];
  const l = word.toLowerCase();
  if (!l.endsWith('s')) forms.push(l + 's');
  if (l.endsWith('e')) { forms.push(l + 'd'); } else if (!l.endsWith('ed')) forms.push(l + 'ed');
  if (l.endsWith('e')) { forms.push(l.slice(0, -1) + 'ing'); } else if (!l.endsWith('ing')) forms.push(l + 'ing');
  if (l.endsWith('y')) { const b = l.slice(0, -1); if (!forms.includes(b + 'ied')) forms.push(b + 'ied'); }
  return [...new Set(forms)].slice(0, 5);
}

// ── API 1：Free Dictionary ──

function posMatches(apiPos: string, target: string): boolean {
  const a = apiPos.toLowerCase();
  const t = target.toLowerCase().replace('.', '');
  if (a === t || a.startsWith(t) || t.startsWith(a)) return true;
  const map: Record<string, string[]> = { n: ['noun'], v: ['verb'], adj: ['adjective'], adv: ['adverb'] };
  for (const [s, f] of Object.entries(map)) {
    if ((s === t || s === a) && f.includes(a)) return true;
    if (f.includes(t) && (a === s || a === t)) return true;
  }
  return false;
}

function isGoodSentence(t: string): boolean {
  if (t.length < 15 || t.length > MAX_LEN) return false;
  if (!/^[A-Z"']/i.test(t)) return false;
  if (/^to\s+[a-z]/i.test(t)) return false;
  return true;
}

async function fetchFromDictionary(word: string, targetPos: string): Promise<SentenceItem[]> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items: SentenceItem[] = [];
    for (const entry of data) {
      for (const meaning of entry.meanings || []) {
        const apiPos: string = (meaning.partOfSpeech || '').toLowerCase();
        if (!posMatches(apiPos, targetPos)) continue;
        for (const def of meaning.definitions || []) {
          if (def.example && isGoodSentence(def.example)) {
            const t = def.example.trim();
            items.push({ en: /[.?!]$/.test(t) ? t : t + '.' });
          }
        }
      }
    }
    return items;
  } catch { return []; }
}

// ── API 2：Tatoeba（含中文翻译） ──

async function fetchFromTatoeba(word: string): Promise<SentenceItem[]> {
  try {
    const url =
      'https://api.tatoeba.org/v1/sentences' +
      '?lang=eng' +
      '&q=' + encodeURIComponent(word) +
      '&word_count=5-15' +
      '&trans:1:lang=cmn' +
      '&sort=relevance' +
      '&limit=5';
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const items: SentenceItem[] = [];
    for (const s of data?.data || []) {
      const text: string = (s.text || '').trim();
      if (!isGoodSentence(text) || !s.translations?.length) continue;
      // 取第一条中文翻译
      const zhText = s.translations[0]?.text?.trim();
      if (!zhText) continue;
      items.push({ en: /[.?!]$/.test(text) ? text : text + '.', zh: zhText });
    }
    return items;
  } catch { return []; }
}

// ── 主入口 ──

/**
 * 获取真实例句，依次尝试多个 API
 *  ① Free Dictionary API（Wiktionary，按词性过滤）
 *  ② Tatoeba API（含中文翻译）
 * 结果合并去重后缓存
 */
export async function fetchRealSentences(word: string, pos: string = ''): Promise<SentenceItem[]> {
  const lower = word.toLowerCase().trim();
  if (!lower || lower.length < 2) return [];
  const targetPos = pos.replace('.', '').toLowerCase();

  // 查缓存
  const cache = getCache();
  const cached = cache[lower];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.data;

  const all: SentenceItem[] = [];
  const seen = new Set<string>();

  // ① Free Dictionary API（多词形 = 原形、+s、+ed、+ing）
  const forms = getWordForms(lower);
  for (const form of forms) {
    if (all.length >= 3) break;
    const items = await fetchFromDictionary(form, targetPos);
    for (const item of items) {
      const key = item.en.toLowerCase();
      if (!seen.has(key)) { seen.add(key); all.push(item); }
    }
  }

  // ② Tatoeba API（如果还不够）
  if (all.length < 2) {
    const tatoebaItems = await fetchFromTatoeba(lower);
    for (const item of tatoebaItems) {
      if (all.length >= 2) break;
      const key = item.en.toLowerCase();
      if (!seen.has(key)) { seen.add(key); all.push(item); }
    }
  }

  // 缓存结果
  setCache(lower, all);
  return all;
}

// ── 例句翻译（MyMemory API） ──

const TRANS_CACHE_KEY = 'vocab-sentence-translations';

export async function translateSentence(en: string): Promise<string | null> {
  const key = en.toLowerCase().trim();
  if (!key || key.length < 5) return null;
  try {
    const raw = localStorage.getItem(TRANS_CACHE_KEY);
    const cache: Record<string, string> = raw ? JSON.parse(raw) : {};
    if (cache[key]) return cache[key];
  } catch {}

  try {
    const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(en) + '&langpair=en|zh-CN';
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const translated: string = data?.responseData?.translatedText;
    if (!translated || translated.length < 2) return null;
    try {
      const raw = localStorage.getItem(TRANS_CACHE_KEY);
      const cache: Record<string, string> = raw ? JSON.parse(raw) : {};
      cache[key] = translated;
      const entries = Object.keys(cache);
      if (entries.length > 1000) delete cache[entries[0]];
      localStorage.setItem(TRANS_CACHE_KEY, JSON.stringify(cache));
    } catch {}
    return translated;
  } catch { return null; }
}
