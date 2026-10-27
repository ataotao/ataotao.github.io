"""选择题答案体检：把题包里的选择题 ans 与 docx 文末「题号/答案」表逐题比对。

用法（只读，不需要写权限）：
    & "C:\\Users\\Tao\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe" 物理\\工具\\check_answers.py
"""
import json, sys, os, re
sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # 物理/
QDIR = os.path.join(ROOT, '题库')

MAP = {
    'pk-w1': '第1周', 'pk-w2': '第2周', 'pk-w4': '第4周', 'pk-w5a': '第5周_1',
    'pk-w5b': '第5周_2', 'pk-w6': '第6周', 'pk-w8': '第8周', 'pk-w9': '第9周',
}


def answer_tables(docx_path):
    """从 docx 表格里找「题号 / 答案」两行，返回 {题号: 'A'/'BC'}"""
    try:
        from docx import Document
    except ImportError:
        print('✗ 缺少 python-docx 依赖：请运行  python -m pip install python-docx')
        sys.exit(2)

    doc = Document(docx_path)
    best = {}
    for t in doc.tables:
        if not len(t.rows):
            continue
        head = [c.text.strip() for c in t.rows[0].cells]
        if not any('题号' in c for c in head):
            continue
        nums, ans = None, None
        for row in t.rows:
            cells = [c.text.strip() for c in row.cells]
            if any('题号' in c for c in cells):
                nums = [c for c in cells if re.fullmatch(r'\d{1,2}', c)]
            if cells and '答案' in cells[0]:
                ans = [c.upper().replace(' ', '') for c in cells[1:]]
        if nums and ans:
            for n, a in zip(nums, ans):
                if a:
                    best[n] = a
    return best


rows, total_bad, no_key = [], 0, 0
for fn in sorted(os.listdir(QDIR)):
    if not fn.startswith('pack-w') or not fn.endswith('.json'):
        continue
    pack = json.load(open(os.path.join(QDIR, fn), encoding='utf-8'))
    pid = pack['id']
    docx = None
    for f in os.listdir(QDIR):
        if f.startswith(MAP.get(pid, '###')) and f.endswith('.docx') and not f.startswith('~$'):
            docx = os.path.join(QDIR, f)
            break
    if not docx:
        rows.append((pid, '--', 'NO_DOCX', '', ''))
        continue
    keys = answer_tables(docx)
    bad = 0
    checked = 0
    for q in pack['questions']:
        if q['type'] != 'choice':
            continue
        checked += 1
        want = keys.get(str(q['no']))
        if not want:
            no_key += 1
            rows.append((pid, q['no'], 'NO_KEY', '', ''))
            continue
        want_idx = sorted('ABCD'.index(ch) for ch in want if ch in 'ABCD')
        got = q['ans'] if isinstance(q['ans'], list) else [q['ans']]
        if want_idx != sorted(got):
            bad += 1
            total_bad += 1
            rows.append((pid, q['no'], 'MISMATCH', want, str(q['ans'])))
    rows.append((pid, '--', 'checked=%d bad=%d' % (checked, bad), '', ''))

for r in rows:
    print('%-8s q%-3s %-24s want=%-4s got=%s' % r)
print('')
if no_key:
    print('⚠ 有 %d 题在答案表里找不到对应题号（答案表解析可能失败，或题号对不上）' % no_key)
ok = (total_bad == 0 and no_key == 0)
print('结论：%s' % ('全部一致 ✓' if ok else '有 %d 题不一致 ✗，%d 题缺答案键' % (total_bad, no_key)))
if not ok:
    sys.exit(1)
