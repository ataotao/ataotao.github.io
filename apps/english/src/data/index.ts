import { Source } from '../types';
import { 七上 } from './沪教版/七上';
import { 七下 } from './沪教版/七下';
import { 八上 } from './沪教版/八上';
import { 八下 } from './沪教版/八下';
import { 九上 } from './沪教版/九上';
import { 九下 } from './沪教版/九下';
import { 三上 } from './沪教牛津小学/三上';
import { 三下 } from './沪教牛津小学/三下';
import { 四上 } from './沪教牛津小学/四上';
import { 四下 } from './沪教牛津小学/四下';
import { 五上 } from './沪教牛津小学/五上';
import { 五下 } from './沪教牛津小学/五下';
import { 六上 } from './沪教牛津小学/六上';
import { 六下 } from './沪教牛津小学/六下';
import { 中考高频词汇 } from './中考/高频词汇';
import { 中考高频词组 } from './中考/高频词组';
import { 经典美文 } from './阅读材料/经典美文';
import { 书虫 } from './阅读材料/书虫';

export const sources: Source[] = [
  {
    id: 'primary',
    name: '小学',
    categories: [六下, 六上, 五下, 五上, 四下, 四上, 三下, 三上]
  },
  {
    id: 'hb',
    name: '沪教版',
    categories: [九下, 九上, 八下, 八上, 七下, 七上]
  },
  {
    id: 'zhongkao',
    name: '中考',
    categories: [中考高频词汇, 中考高频词组]
  },
  {
    id: 'reading',
    name: '阅读',
    categories: [经典美文, 书虫]
  }
];

export function getAllCategories() {
  return sources.flatMap(source => source.categories);
}

export function getCategoryById(id: string) {
  return getAllCategories().find(cat => cat.id === id);
}
