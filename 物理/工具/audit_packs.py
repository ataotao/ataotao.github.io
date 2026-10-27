import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
QDIR = r'C:\work\my-work\learning-training\物理\题库'
ROOT = r'C:\work\my-work\learning-training\物理'
tot_q = 0
problems = []
for fn in sorted(os.listdir(QDIR)):
    if not fn.startswith('pack-w') or not fn.endswith('.json'):
        continue
    p = json.load(open(os.path.join(QDIR, fn), encoding='utf-8'))
    graded = [q for q in p['questions'] if q['type'] != 'selfcheck']
    selfc = [q for q in p['questions'] if q['type'] == 'selfcheck']
    miss_ans = [q['no'] for q in p['questions'] if q['type'] in ('fill', 'solve', 'selfcheck')
                and not q.get('ansImg') and not q.get('solution')]
    miss_sol = [q['no'] for q in p['questions'] if not q.get('solution')]
    no_img = [q['no'] for q in p['questions'] if not q.get('askImg')]
    tot_q += len(p['questions'])
    print('%-8s q=%-3d graded=%-3d self=%-2d 缺答案(no ansImg&no solution)=%-10s 无solution=%-12s 无askImg=%s' % (
        p['id'], len(p['questions']), len(graded), len(selfc), str(miss_ans), str(miss_sol), str(no_img)))
    if miss_ans: problems.append((p['id'], 'no answer', miss_ans))
    if no_img: problems.append((p['id'], 'no askImg', no_img))
print('\n总题数', tot_q)
# image size
tot = 0
for d, _, fs in os.walk(os.path.join(ROOT, '图片')):
    for f in fs:
        tot += os.path.getsize(os.path.join(d, f))
print('图片总大小 %.1f MB / %d 张' % (tot / 1e6, sum(len(fs) for _, _, fs in os.walk(os.path.join(ROOT, '图片')))))
