import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')

# 路径从脚本位置推导：换电脑 / 换目录不用改
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # 物理/
QDIR = os.path.join(ROOT, '题库')
for fn in sorted(os.listdir(QDIR)):
    if not (fn.startswith('pack-') and fn.endswith('.json')) or '模板' in fn or '全部' in fn:
        continue
    d = json.load(open(os.path.join(QDIR, fn), encoding='utf-8'))
    print('=' * 70)
    print(d['id'], '|', d['name'], '| q=', len(d['questions']))
    print('topics', d.get('topics'), '| note:', (d.get('note') or '')[:100])
    for q in d['questions']:
        ai = q.get('askImg')
        ai = ai if isinstance(ai, list) else ([ai] if ai else [])
        ei = q.get('ansImg')
        ei = ei if isinstance(ei, list) else ([ei] if ei else [])
        flds = [f.get('ans') for f in (q.get('fields') or [])]
        print('%3s %-4s %-9s ans=%-6s fields=%-22s focus=%-5s tags=%s img=%d ansimg=%d' % (
            q.get('no'), q.get('group'), q.get('type'), str(q.get('ans')),
            str(flds), q.get('focus'), ','.join(q.get('tags') or []), len(ai), len(ei)))
