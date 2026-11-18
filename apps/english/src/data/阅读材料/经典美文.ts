import { Category } from '../../types';

export const 经典美文: Category = {
  id: 'reading-classic',
  title: '经典',
  source: '阅读',
  units: [
    {
      id: 'article1',
      title: 'The Gift of the Magi',
      words: [
        { english: 'dime', phonetic: '/daɪm/', pos: 'n.', chinese: '一角硬币' },
        { english: 'impulsive', phonetic: '/ɪmˈpʌlsɪv/', pos: 'adj.', chinese: '冲动的' },
        { english: 'sacrifice', phonetic: '/ˈsækrɪfaɪs/', pos: 'v.', chinese: '牺牲' },
        { english: 'cherish', phonetic: '/ˈtʃerɪʃ/', pos: 'v.', chinese: '珍爱' }
      ]
    }
  ]
};
