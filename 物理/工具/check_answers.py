"""选择题答案体检：把题包里的选择题 ans 与原卷文末「题号/答案」表逐题比对。

支持 docx（python-docx）与 PDF（pymupdf）两种原卷；题包 `source` 指向哪个就用哪个。
用法（只读，不需要写权限）：
    & "C:\\Users\\Tao\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe" 物理\\工具\\check_answers.py
"""
import json, sys, os, re
sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # 物理/
QDIR = os.path.join(ROOT, '题库')

# 旧题包没有 source 字段时按文件名猜（保留兼容）
MAP = {
    'pk-w1': '第1周', 'pk-w2': '第2周', 'pk-w4': '第4周', 'pk-w5a': '第5周_1',
    'pk-w5b': '第5周_2', 'pk-w6': '第6周', 'pk-w8': '第8周', 'pk-w9': '第9周',
    'pk-w11': '第11周周练',
}


def answer_tables_docx(docx_path):
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


def answer_tables_pdf(pdf_path):
    """从 PDF 的「题号/答案」表格行里取答案，返回 {题号: 'A'/'BC'}；没装 pymupdf 返回 None。"""
    try:
        import pymupdf
    except ImportError:
        return None

    doc = pymupdf.open(pdf_path)
    best = {}
    for page in doc:
        words = page.get_text('words')
        row_y = {}
        for w in words:
            if w[4] in ('题号', '答案'):
                row_y[w[4]] = (w[1] + w[3]) / 2
        if '题号' not in row_y or '答案' not in row_y:
            continue

        def cells_at(y):
            ws = [w for w in words if abs((w[1] + w[3]) / 2 - y) < 12]
            ws.sort(key=lambda w: w[0])
            return [w[4] for w in ws]

        nums = [c for c in cells_at(row_y['题号']) if re.fullmatch(r'\d{1,2}', c)]
        letters = [c.upper() for c in cells_at(row_y['答案'])
                   if re.fullmatch(r'[A-D]{1,4}', c.upper())]
        if nums and letters:
            for n, a in zip(nums, letters):
                best[n] = a
    return best


def find_source(pack):
    """优先用 pack.source（相对 物理/）；旧题包没有 source 时按 MAP 猜 docx。"""
    src = pack.get('source')
    if src:
        p = os.path.join(ROOT, src.replace('/', os.sep))
        if os.path.exists(p):
            return p
    guess = MAP.get(pack.get('id', ''), '###')
    for f in os.listdir(QDIR):
        if f.startswith(guess) and f.lower().endswith(('.docx', '.pdf')) and not f.startswith('~$'):
            return os.path.join(QDIR, f)
    return None


rows, total_bad, no_key, skipped = [], 0, 0, 0
for fn in sorted(os.listdir(QDIR)):
    if not fn.startswith('pack-w') or not fn.endswith('.json'):
        continue
    pack = json.load(open(os.path.join(QDIR, fn), encoding='utf-8'))
    pid = pack['id']
    src = find_source(pack)
    if not src:
        rows.append((pid, '--', 'NO_SOURCE', '', ''))
        continue
    if src.lower().endswith('.pdf'):
        keys = answer_tables_pdf(src)
        if keys is None:
            skipped += 1
            rows.append((pid, '--', 'SKIP_NO_PYMUPDF', '', ''))
            continue
    else:
        keys = answer_tables_docx(src)
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
if skipped:
    print('⚠ 有 %d 套 PDF 题包跳过答案体检（缺 pymupdf：python -m pip install pymupdf）' % skipped)
ok = (total_bad == 0 and no_key == 0)
if ok and skipped:
    print('结论：已检查的题包全部一致 ✓；%d 套 PDF 未检查（缺 pymupdf）' % skipped)
elif ok:
    print('结论：全部一致 ✓')
else:
    print('结论：有 %d 题不一致 ✗，%d 题缺答案键' % (total_bad, no_key))
if not ok:
    sys.exit(1)
