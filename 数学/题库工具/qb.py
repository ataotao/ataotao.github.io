#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
题库工具：问卷(pack JSON) + 答卷(answers txt) 的快速核对、批量更新与同步。

命令：
  template <pack.json>            生成答卷答案录入模板（带题号与字段类型提示）
  check    <pack.json> <ans.txt>  对比答卷答案与题库答案，输出差异表（不写文件）
  apply    <pack.json> <ans.txt>  把答卷答案写回 pack（可选 --dry-run），并自动 build
  build                           合并 题库/pack-*.json -> pack-全部.json，并注入 HTML
  verify                          校验 JSON 可解析、HTML 内嵌脚本语法、数据一致性
  sheets   <答卷图片>              按网格切页 + 自动分栏 + 放大，输出便于阅读的切片

答案文件（answers/*.txt）格式：
  # 注释行
  1 D                 # 选择题：填 A/B/C/D（或 1-4）
  9 A
  12 -1               # 数值题直接写数（可写分数 -2/3）
  13 A C C (1,-2)     # 多个空的题，按 fields 顺序空格分隔
  21 8 40 13
"""
import argparse
import ast
import datetime
import glob
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile

# ---------- 路径 ----------
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)                       # learning-training
TDIR = os.path.join(BASE, '题库')
ALL_JSON = os.path.join(TDIR, 'pack-全部.json')
DRILLS_JSON = os.path.join(TDIR, 'drills.json')
HTML = os.path.join(BASE, '函数思维脚手架.html')
SKIP = {'pack-全部.json', 'pack-模板.json'}
LETTERS = 'ABCD'


def ts():
    return datetime.datetime.now().strftime('%Y%m%d-%H%M%S')


def die(msg):
    print('✗ ' + msg, file=sys.stderr)
    sys.exit(1)


def read_json(path):
    with open(path, 'rb') as f:
        return json.loads(f.read().decode('utf-8'))


# ---------- 写入（某些受限环境下 python 子进程无权写仓库目录，自动走暂存区） ----------
STAGE = os.path.join(tempfile.gettempdir(), 'qb_stage')
MANIFEST = os.path.join(STAGE, 'manifest.json')


def _manifest():
    if os.path.exists(MANIFEST):
        try:
            return read_json(MANIFEST)
        except Exception:
            pass
    return {'backups': [], 'files': []}


def _save_manifest(m):
    os.makedirs(STAGE, exist_ok=True)
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)


def _stage(path, text):
    os.makedirs(STAGE, exist_ok=True)
    name = re.sub(r'[^\w.\-【】（）]+', '_', os.path.basename(path))
    staged = os.path.join(STAGE, name)
    with open(staged, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    m = _manifest()
    m['files'] = [x for x in m['files'] if x['target'] != path]
    m['files'].append({'target': path, 'staged': staged})
    _save_manifest(m)


def backup(path):
    if not os.path.exists(path):
        return
    try:
        shutil.copy2(path, path + '.bak-' + ts())
    except PermissionError:
        m = _manifest()
        if path not in m['backups']:
            m['backups'].append(path)
            _save_manifest(m)


def write_text(path, text):
    try:
        with open(path, 'w', encoding='utf-8', newline='') as f:
            f.write(text)
        return True
    except PermissionError:
        _stage(path, text)
        print('⚠ 当前环境 python 无权直接写：%s' % path)
        print('  已暂存，随后执行：pwsh -File "%s" -StageDir "%s"'
              % (os.path.join(HERE, 'sync.ps1'), STAGE))
        return False


def dump_json(path, data):
    backup(path)
    return write_text(path, json.dumps(data, ensure_ascii=False, indent=2).replace('\n', '\r\n'))


def load_pack_file(path, pack_id=None):
    if not os.path.exists(path):
        die('找不到文件：%s' % path)
    data = read_json(path)
    packs = data['packs'] if isinstance(data, dict) and 'packs' in data else data
    if pack_id:
        hits = [p for p in packs if p.get('id') == pack_id]
        if len(hits) != 1:
            die('按 --pack-id=%s 找到 %d 个题包' % (pack_id, len(hits)))
        return data, hits[0]
    if len(packs) != 1:
        die('该文件含 %d 个题包，请用 --pack-id 指定其中一个（%s）'
            % (len(packs), ', '.join(p.get('id', '?') for p in packs)))
    return data, packs[0]


# ---------- 答案解析 ----------
def parse_rat(s):
    s = s.strip().strip('()（）')
    m = re.fullmatch(r'(-?\d+(?:\.\d+)?)\s*/\s*(-?\d+(?:\.\d+)?)', s)
    if m:
        return float(m.group(1)) / float(m.group(2))
    try:
        return float(s)
    except ValueError:
        return None


def parse_for_field(field, tok):
    t = field.get('type')
    if t == 'choice':
        s = tok.strip()
        opts = field.get('options') or []
        up = s.upper()
        if up in LETTERS and LETTERS.index(up) < len(opts):
            return LETTERS.index(up)
        if re.fullmatch(r'[1-9]\d*', s) and int(s) - 1 < len(opts):
            return int(s) - 1
        for i, o in enumerate(opts):
            if s == str(o).strip():
                return i
        return None
    if t == 'num':
        return parse_rat(tok)
    if t == 'coef':
        s = tok.strip().strip('()（）')
        out = []
        for part in re.split(r'[,，\s]+', s):
            if not part:
                continue
            v = parse_rat(part)
            if v is None:
                return None
            out.append(v)
        return out or None
    return None


def field_expected(field):
    t = field.get('type')
    if t == 'choice':
        opts = field.get('options') or []
        i = field.get('ans')
        ltr = LETTERS[i] if isinstance(i, int) and 0 <= i < 4 else '?'
        txt = opts[i] if isinstance(i, int) and 0 <= i < len(opts) else ''
        return '%s. %s' % (ltr, txt)
    if t == 'num':
        return fmt_num(field.get('ans'))
    if t == 'coef':
        return '(' + ', '.join(fmt_num(x) for x in (field.get('ans') or [])) + ')'
    return '?'


def fmt_num(v):
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def eq_num(a, b):
    return abs(float(a) - float(b)) <= 1e-6 * max(1.0, abs(float(b)))


def check_field(field, tok):
    """返回 (status, got)。status: ok / diff / form"""
    got = parse_for_field(field, tok)
    if got is None:
        return 'form', None
    t = field.get('type')
    ans = field.get('ans')
    if t == 'choice':
        return ('ok' if got == ans else 'diff'), got
    if t == 'num':
        return ('ok' if eq_num(got, ans) else 'diff'), got
    if t == 'coef':
        if not isinstance(ans, list) or len(ans) != len(got):
            return 'diff', got
        return ('ok' if all(eq_num(g, a) for g, a in zip(got, ans)) else 'diff'), got
    return 'form', None


def question_fields(q):
    """把题目统一成 field 列表（选择题本身就是一种 field；steps 去掉 pt）。"""
    if q.get('type') == 'choice':
        return [{'type': 'choice', 'options': q.get('opts') or [], 'ans': q.get('ans'),
                 '_single': True}]
    if q.get('steps'):
        return [{k: v for k, v in s.items() if k != 'pt'} for s in q['steps']]
    return list(q.get('fields') or [])


def need_tokens(field):
    """该字段需要几个答案 token：coef 按占位符/答案个数，其余 1 个。"""
    if field.get('type') == 'coef':
        return max(1, len(field.get('ans') or []))
    return 1


def split_tokens(fields, toks):
    """把一条答案的 token 按字段顺序切分；不够分返回 None。"""
    out, i = [], 0
    for f in fields:
        n = need_tokens(f)
        if i >= len(toks):
            return None
        first = toks[i]
        if f.get('type') == 'coef' and re.search(r'[,，()（）]', first):
            chunk = [first]
            i += 1
        else:
            chunk = toks[i:i + n]
            i += n
            if len(chunk) < n:
                return None
        out.append((f, chunk))
    return out


def chunk_token(field, chunk):
    return ','.join(chunk) if field.get('type') == 'coef' else chunk[0]


def check_pack(pack, entries):
    """对比题库与答卷，返回 (rows, stats)。"""
    by_no = {}
    for q in pack['questions']:
        by_no[str(q.get('no'))] = q
    rows = []
    stats = {'ok': 0, 'diff': 0, 'form': 0, 'missing': 0, 'noq': 0}
    seen = set()
    for no, toks in entries:
        seen.add(no)
        q = by_no.get(no)
        if not q:
            rows.append((no, 'noq', '', '', '题库里没有这一题'))
            stats['noq'] += 1
            continue
        fields = question_fields(q)
        if not fields:
            rows.append((no, 'self', '', '', '自评题/无判分字段，跳过'))
            continue
        split = split_tokens(fields, toks)
        if split is None:
            rows.append((no, 'missing', ' '.join(toks), ' / '.join(field_expected(f) for f in fields),
                         '答案个数不足（需要 %d 个数值/字母，实际 %d 个）'
                         % (sum(need_tokens(f) for f in fields), len(toks))))
            stats['missing'] += 1
            continue
        statuses, gets = [], []
        for f, chunk in split:
            tok = chunk_token(f, chunk)
            st, got = check_field(f, tok)
            statuses.append(st)
            gets.append(tok)
        exp = ' / '.join(field_expected(f) for f in fields)
        if all(s == 'ok' for s in statuses):
            stats['ok'] += 1
            rows.append((no, 'ok', ' '.join(gets), exp, ''))
        elif any(s == 'form' for s in statuses):
            stats['form'] += 1
            rows.append((no, 'form', ' '.join(gets), exp,
                         '答案形式与题库字段不同，需人工确认（多半是"答案不唯一/坐标/文字"类）'))
        else:
            stats['diff'] += 1
            rows.append((no, 'diff', ' '.join(gets), exp, '答案不一致'))
    for no in by_no:
        if no not in seen:
            rows.append((no, 'absent', '', '', '答卷里没有录入这一题'))
            stats['absent'] = stats.get('absent', 0) + 1
    return rows, stats


def print_rows(rows, stats, title=''):
    if title:
        print(title)
    mark = {'ok': '✓', 'diff': '≠', 'form': '?', 'missing': '…', 'noq': '!', 'self': '-', 'absent': '·'}
    for no, st, got, exp, msg in rows:
        if st == 'ok' and not msg:
            continue
        print('  %-3s %-8s 答卷:%-18s 题库:%-28s %s'
              % (no, mark.get(st, st), got[:18], exp[:28], msg))
    print('  合计：一致 %(ok)d，不一致 %(diff)d，形式待确认 %(form)d，缺答案 %(missing)d，'
          '题库无此题 %(noq)d' % stats)


# ---------- 命令 ----------
def cmd_template(args):
    data, pack = load_pack_file(args.pack, args.pack_id)
    print('# 试卷：%s' % pack.get('name', ''))
    print('# pack id: %s' % pack.get('id', ''))
    print('# 格式：题号 答案...（选择题填 A/B/C/D；数值直接写，可写分数；多空按顺序空格分隔）')
    for q in pack['questions']:
        fields = question_fields(q)
        score = q.get('score')
        head = '%-4s %s' % (q.get('no'), ('[%s 分]' % fmt_num(score)) if score else '[分值未录]')
        if q.get('type') == 'choice':
            print('%s  [choice]   # %s' % (head, ' '.join('%s.%s' % (LETTERS[i], o)
                  for i, o in enumerate(q.get('opts') or []) if isinstance(o, str))))
        elif not fields:
            print('%s  # 自评题（无判分字段）' % head)
        else:
            print('%s  %s' % (head, ' '.join(
                '[%s%s]' % (f.get('type'), ('×%d' % need_tokens(f)) if need_tokens(f) > 1 else '')
                for f in fields)))


def cmd_check(args):
    _, pack = load_pack_file(args.pack, args.pack_id)
    entries = parse_answers(args.answers)
    rows, stats = check_pack(pack, entries)
    print('题库：%s（%s，%d 题）' % (pack.get('name'), pack.get('id'), len(pack['questions'])))
    print('答卷：%s（%d 条）' % (args.answers, len(entries)))
    print_rows(rows, stats)
    if args.report:
        with open(args.report, 'w', encoding='utf-8') as f:
            json.dump({'pack': pack.get('id'), 'stats': stats,
                       'rows': [dict(zip(('no', 'status', 'answer', 'expected', 'note'), r)) for r in rows]},
                      f, ensure_ascii=False, indent=2)
        print('已写出报告：%s' % args.report)
    return 0 if stats['diff'] == 0 else 2


def parse_answers(path):
    if not os.path.exists(path):
        die('找不到答卷答案文件：%s' % path)
    entries = []
    with open(path, encoding='utf-8-sig') as f:
        for raw in f:
            line = raw.split('#')[0].strip() if raw.lstrip().startswith('#') else raw.strip()
            if not line or line.startswith('#'):
                continue
            parts = line.split()
            no = parts[0].rstrip('.、:：')
            entries.append((no, parts[1:]))
    return entries


def cmd_apply(args):
    data, pack = load_pack_file(args.pack, args.pack_id)
    entries = parse_answers(args.answers)
    rows, stats = check_pack(pack, entries)
    by_no = {str(q.get('no')): q for q in pack['questions']}
    changes = []
    for no, toks in entries:
        q = by_no.get(no)
        if not q:
            continue
        fields = question_fields(q)
        if not fields:
            continue
        split = split_tokens(fields, toks)
        if split is None:
            continue
        statuses = []
        parsed = []
        for f, chunk in split:
            st, got = check_field(f, chunk_token(f, chunk))
            statuses.append(st)
            parsed.append((f, got))
        if any(s != 'diff' for s in statuses):   # 只改"能比较且不一致"的；form/ok 跳过
            continue
        if q.get('type') == 'choice':
            got = parsed[0][1]
            old = q.get('ans')
            if old != got:
                changes.append((no, '选择题', str(old), str(got)))
                if not args.dry_run:
                    q['ans'] = got
        else:
            for f, got in parsed:
                old = f.get('ans')
                if f.get('type') == 'num':
                    newv = int(got) if isinstance(old, int) and float(got).is_integer() else got
                    if not eq_num(old, newv):
                        changes.append((no, f.get('label', ''), fmt_num(old), fmt_num(newv)))
                        if not args.dry_run:
                            f['ans'] = newv
                elif f.get('type') == 'coef':
                    newv = [int(v) if isinstance(o, int) and float(v).is_integer() else v
                            for v, o in zip(got, old or [])] or got
                    if not (isinstance(old, list) and len(old) == len(newv)
                            and all(eq_num(a, b) for a, b in zip(old, newv))):
                        changes.append((no, f.get('label', ''), '(' + ', '.join(fmt_num(x) for x in (old or [])) + ')',
                                        '(' + ', '.join(fmt_num(x) for x in newv) + ')'))
                        if not args.dry_run:
                            f['ans'] = newv
    print_rows(rows, stats)
    if not changes:
        print('无需修改（答案已一致；"形式待确认"的题请人工判断）。')
    else:
        print('%s %d 处：' % ('将修改' if args.dry_run else '已修改', len(changes)))
        for no, label, old, new in changes:
            print('  第 %-3s 题 %-14s %s -> %s' % (no, label, old, new))
    if args.dry_run or not changes:
        return 0
    # 写回
    if isinstance(data, dict) and 'packs' in data:
        okw = dump_json(args.pack, data)
    else:
        okw = dump_json(args.pack, {'version': 1, 'packs': [pack]})
    if okw:
        print('已写回：%s（原文件已备份 *.bak-*）' % args.pack)
    else:
        print('已生成新版本（暂存在 %s，需 sync.ps1 落盘）' % STAGE)
    if not args.no_build:
        cmd_build(argparse.Namespace(quiet=False), override={pack.get('id'): pack})
    return 0


def pack_files():
    out = []
    for f in sorted(glob.glob(os.path.join(TDIR, 'pack-*.json'))):
        name = os.path.basename(f)
        if name in SKIP or '.bak' in name:
            continue
        out.append(f)
    return out


def cmd_build(args, override=None):
    files = pack_files()
    if not files:
        die('题库目录里没有 pack-*.json')
    order = []
    if os.path.exists(ALL_JSON):
        try:
            order = [p['id'] for p in read_json(ALL_JSON)['packs']]
        except Exception:
            order = []
    packs, byid = [], {}
    for f in files:
        d = read_json(f)
        ps = d['packs'] if isinstance(d, dict) and 'packs' in d else d
        for p in ps:
            pid = p.get('id')
            if override and pid in override:
                p = override[pid]          # 用内存里的最新版本（apply 刚改完还没落盘时用）
            if pid in byid:
                die('题包 id 重复：%s（%s）' % (pid, f))
            byid[pid] = p
    ids = [i for i in order if i in byid] + [i for i in byid if i not in order]
    packs = [byid[i] for i in ids]
    dump_json(ALL_JSON, {'version': 1,
                         'exportedAt': datetime.datetime.now(datetime.timezone.utc)
                         .strftime('%Y-%m-%dT%H:%M:%S.000Z'),
                         'packs': packs})
    # 注入 HTML
    if not os.path.exists(HTML):
        die('找不到 %s' % HTML)
    html = open(HTML, 'rb').read().decode('utf-8')

    # 1) 闪练题库
    if not os.path.exists(DRILLS_JSON):
        die('找不到 %s' % DRILLS_JSON)
    dj = read_json(DRILLS_JSON)
    drills = dj.get('drills') if isinstance(dj, dict) else dj
    if not drills:
        die('drills.json 里没有 drills')
    bmark, emark = '/* DRILLS:BEGIN */', '/* DRILLS:END */'
    if html.count(bmark) != 1 or html.count(emark) != 1:
        die('HTML 里 DRILLS:BEGIN/END 标记数量异常，拒绝改写')
    bs = html.index(bmark) + len(bmark)
    be = html.index(emark)
    dblock = '\r\nvar DRILLS = ' + json.dumps(drills, ensure_ascii=False, indent=2).replace('\n', '\r\n') + ';\r\n'
    html = html[:bs] + dblock + html[be:]

    # 2) 试卷题包（替换到 DRILLS:BEGIN 之前，避免吃掉标记）
    if html.count('var PACKS = [') != 1 or html.count('var DRILLS = [') != 1:
        die('HTML 里 PACKS/DRILLS 标记数量异常，拒绝改写')
    s = html.index('var PACKS = [')
    e = html.index(bmark, s)
    block = 'var PACKS = ' + json.dumps(packs, ensure_ascii=False, indent=2).replace('\n', '\r\n') + ';\r\n'
    html = html[:s] + block + html[e:]
    backup(HTML)
    write_text(HTML, html)
    qn = sum(len(p['questions']) for p in packs)
    if not getattr(args, 'quiet', False):
        print('✓ build 完成：%d 套卷 / %d 题 ＋ 闪练 %d 题 -> pack-全部.json + HTML' % (len(packs), qn, len(drills)))
        print('  ' + ', '.join('%s(%d题)' % (p['id'], len(p['questions'])) for p in packs))


def find_node():
    cand = os.environ.get('QB_NODE')
    if cand and os.path.exists(cand):
        return cand
    w = shutil.which('node')
    if w:
        return w
    for pat in (r'C:\Users\*\.dsh\dsh-runtimes\*\node\bin\node.exe',):
        hits = glob.glob(pat)
        if hits:
            return hits[0]
    return None


def cmd_checkall(args):
    """把所有能配到答卷答案文件（answers/<文件名>.txt 或 <id>/<name>.txt）的题包批量核对一遍。"""
    files = pack_files()
    bad = []
    for f in files:
        data = read_json(f)
        packs = data['packs'] if isinstance(data, dict) and 'packs' in data else data
        for p in packs:
            stem = (os.path.basename(f)[len('pack-'):-len('.json')]
                    if os.path.basename(f).startswith('pack-') else os.path.basename(f))
            cands = [os.path.join(HERE, 'answers', stem + '.txt'),
                     os.path.join(HERE, 'answers', (p.get('id') or '') + '.txt'),
                     os.path.join(HERE, 'answers', (p.get('name') or '').replace('/', '-') + '.txt')]
            ans = next((c for c in cands if os.path.exists(c)), None)
            if not ans:
                print('· %-38s 无答卷答案文件，跳过' % (p.get('name') or p.get('id')))
                continue
            entries = parse_answers(ans)
            rows, stats = check_pack(p, entries)
            flag = '✓' if stats['diff'] == 0 else '✗'
            print('%s %-34s 一致 %2d / 不一致 %d / 形式待确认 %d / 缺答案 %d'
                  % (flag, p.get('name') or p.get('id'), stats['ok'], stats['diff'],
                     stats['form'], stats['missing']))
            if stats['diff']:
                bad.append(p.get('id'))
    if bad:
        print('存在答案不一致：%s（用 check 子命令看细节）' % ', '.join(bad))
        return 1
    print('全部一致 ✓')
    return 0


# ---------- 闪练题库校验 ----------
_ALLOWED_FUNCS = {'sqrt': math.sqrt, 'abs': abs}


def _norm_expr(s):
    """把应用里的写法转成 Python 表达式：2x / x^2 / 0.5x^2 / sqrt()。"""
    s = str(s).replace('²', '^2').replace('×', '*').replace('÷', '/')
    s = s.replace('^', '**')
    s = re.sub(r'(?<=[0-9x)])\s*(?=[x(])', '*', s)
    return s


def _eval_ast(node, x):
    if isinstance(node, ast.Expression):
        return _eval_ast(node.body, x)
    if isinstance(node, ast.Constant):
        return float(node.value)
    if isinstance(node, ast.Name):
        if node.id == 'x':
            return x
        raise ValueError('未知变量 %s' % node.id)
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
        v = _eval_ast(node.operand, x)
        return -v if isinstance(node.op, ast.USub) else v
    if isinstance(node, ast.BinOp):
        a, b = _eval_ast(node.left, x), _eval_ast(node.right, x)
        for cls, fn in ((ast.Add, lambda p, q: p + q), (ast.Sub, lambda p, q: p - q),
                        (ast.Mult, lambda p, q: p * q), (ast.Div, lambda p, q: p / q),
                        (ast.Pow, lambda p, q: p ** q)):
            if isinstance(node.op, cls):
                return fn(a, b)
        raise ValueError('不支持的运算')
    if isinstance(node, ast.Call):
        f = node.func
        if not isinstance(f, ast.Name) or f.id not in _ALLOWED_FUNCS:
            raise ValueError('不支持的函数')
        return _ALLOWED_FUNCS[f.id](*[_eval_ast(a, x) for a in node.args])
    raise ValueError('不支持的语法')


def expr_value(expr, x):
    return _eval_ast(ast.parse(_norm_expr(expr), mode='eval'), x)


def check_drills(path):
    errs, warns = [], []
    data = read_json(path)
    drills = data.get('drills') if isinstance(data, dict) else data
    pools = [p.get('id') for p in (data.get('pools') or [])] if isinstance(data, dict) else []
    ids = set()
    for i, d in enumerate(drills):
        tag = '第 %d 题(%s)' % (i + 1, d.get('id', '?'))
        if not d.get('id'):
            errs.append(tag + ' 缺 id')
        elif d['id'] in ids:
            errs.append(tag + ' id 重复')
        ids.add(d.get('id'))
        if not d.get('ask'):
            errs.append(tag + ' 缺 ask')
        if not d.get('why'):
            errs.append(tag + ' 缺 why')
        if pools and d.get('pool') not in pools:
            errs.append(tag + ' pool 不在 pools 里')
        if not d.get('skill'):
            errs.append(tag + ' 缺 skill')
        opts = d.get('opts') or []
        ans = d.get('ans')
        if len(opts) < 2:
            errs.append(tag + ' 选项少于 2 个')
        if not isinstance(ans, int) or not (0 <= ans < len(opts)):
            errs.append(tag + ' ans 越界')
        texts, curves = [], []
        for j, o in enumerate(opts):
            if not o.get('why') and j != ans:
                warns.append(tag + ' 第 %d 项没有 why' % (j + 1))
            if 't' in o:
                if o['t'] in texts:
                    errs.append(tag + ' 文本选项重复')
                texts.append(o['t'])
            elif (o.get('plot') or {}).get('expr'):
                try:
                    vals = [expr_value(o['plot']['expr'], x) for x in (-3, -2, -1, 0.5, 1, 2, 3)]
                except Exception as ex:
                    errs.append(tag + ' 第 %d 项表达式无法解析：%s（%s）'
                                % (j + 1, o['plot']['expr'], ex))
                    continue
                curves.append((j, vals))
            else:
                errs.append(tag + ' 第 %d 项既没有 t 也没有 plot.expr' % (j + 1))
        if isinstance(ans, int):
            correct = dict(curves).get(ans)
            if correct:
                for j, vals in curves:
                    if j == ans:
                        continue
                    diff = sum(1 for a, b in zip(vals, correct) if abs(a - b) > 1e-6)
                    if diff < 2:
                        errs.append(tag + ' 第 %d 项与正确项几乎重合（%d 个采样点不同）' % (j + 1, diff))
        sp = (d.get('stemPlot') or {}).get('expr')
        if sp:
            try:
                expr_value(sp, 1)
            except Exception as ex:
                errs.append(tag + ' stemPlot 无法解析：%s' % ex)
    counts = {}
    skills = {}
    for d in drills:
        counts[d.get('pool')] = counts.get(d.get('pool'), 0) + 1
        skills[d.get('skill')] = skills.get(d.get('skill'), 0) + 1
    rnd = (data.get('round') if isinstance(data, dict) else None) or 12
    per = max(1, round(rnd / max(1, len(counts))))
    for p, n in counts.items():
        if n < per:
            errs.append('池 %s 只有 %d 题，少于每轮要抽的 %d 题' % (p, n, per))
    for s, n in skills.items():
        if n < 3:
            errs.append('易错点 %s 只有 %d 题（目标 ≥3）' % (s, n))
    summary = ['闪练 %d 题，每轮 %d 题，分池 %s' % (len(drills), rnd,
                                                ', '.join('%s:%d' % (k, v) for k, v in sorted(counts.items()))),
               '易错点 %d 个：%s' % (len(skills), ', '.join('%s=%d' % (k, v) for k, v in sorted(skills.items())))]
    return errs, warns, summary


def cmd_verify(args):
    ok = True
    if os.path.exists(MANIFEST):
        m = _manifest()
        ok = False
        print('⚠ 还有 %d 个暂存文件未同步（备份待做 %d 个）：'
              '请先运行 pwsh -File "%s" -StageDir "%s"'
              % (len(m['files']), len(m['backups']),
                 os.path.join(HERE, 'sync.ps1'), STAGE))
    files = pack_files()
    ids = {}
    for f in files:
        try:
            d = read_json(f)
        except Exception as ex:
            ok = False
            print('✗ JSON 解析失败：%s（%s）' % (f, ex))
            continue
        ps = d['packs'] if isinstance(d, dict) and 'packs' in d else d
        for p in ps:
            if p.get('id') in ids:
                ok = False
                print('✗ 题包 id 重复：%s' % p.get('id'))
            ids[p.get('id')] = f
        print('✓ %-18s %2d 套 / %3d 题' % (os.path.basename(f), len(ps),
                                           sum(len(p['questions']) for p in ps)))
    # 分值 / 知识点 / 分步 的形状检查
    for f in files:
        d = read_json(f)
        ps = d['packs'] if isinstance(d, dict) and 'packs' in d else d
        for p in ps:
            n_score, n_kp, total = 0, 0, 0
            for q in p['questions']:
                no = q.get('no', '?')
                s = q.get('score')
                if s is not None:
                    if not (isinstance(s, (int, float)) and s > 0):
                        ok = False
                        print('✗ %s 第 %s 题：score 必须是正数' % (p.get('id'), no))
                    else:
                        n_score += 1
                        total += s
                kp = q.get('kp')
                if kp is not None:
                    if not (isinstance(kp, list) and kp and all(isinstance(x, str) and x for x in kp)):
                        ok = False
                        print('✗ %s 第 %s 题：kp 必须是非空字符串数组' % (p.get('id'), no))
                    else:
                        n_kp += 1
                st = q.get('steps')
                if st and s is not None:
                    pts = sum((x.get('pt') or 0) for x in st)
                    if abs(pts - s) > 1e-6:
                        ok = False
                        print('✗ %s 第 %s 题：steps 的 pt 合计 %s ≠ score %s'
                              % (p.get('id'), no, pts, s))
                fg = q.get('fig')
                if fg is not None:
                    if not isinstance(fg, dict) or not isinstance(fg.get('svg'), str) or not fg['svg'].strip():
                        ok = False
                        print('✗ %s 第 %s 题：fig 需要 {w, h, svg}（svg 是内层 SVG 片段，由 figs.py 生成）'
                              % (p.get('id'), no))
                    elif not (isinstance(fg.get('w'), (int, float)) and isinstance(fg.get('h'), (int, float))
                              and fg['w'] > 0 and fg['h'] > 0):
                        ok = False
                        print('✗ %s 第 %s 题：fig 的 w / h 必须是正数（viewBox 宽高）'
                              % (p.get('id'), no))
                    elif '<script' in fg['svg'].lower():
                        ok = False
                        print('✗ %s 第 %s 题：fig.svg 里不能有 script' % (p.get('id'), no))
            print('  %-20s 分值 %2d/%2d 题（合计 %s）　知识点 %2d 题'
                  % (p.get('id'), n_score, len(p['questions']),
                     fmt_num(total) if n_score else '—', n_kp))
    # 闪练题库
    if os.path.exists(DRILLS_JSON):
        try:
            derrs, dwarns, dsum = check_drills(DRILLS_JSON)
        except Exception as ex:
            derrs, dwarns, dsum = ['drills.json 读取失败：%s' % ex], [], []
        for m in dsum:
            print('  ' + m)
        for w in dwarns:
            print('· ' + w)
        for e in derrs:
            ok = False
            print('✗ ' + e)
        if not derrs:
            print('✓ drills.json 结构 / 表达式 / 选项区分度检查通过')
    else:
        print('· 没有 drills.json，跳过闪练检查')
    # 全部.json 与单卷一致性
    try:
        allp = {p['id']: p for p in read_json(ALL_JSON)['packs']}
        for pid, f in ids.items():
            d = read_json(f)
            ps = d['packs'] if isinstance(d, dict) and 'packs' in d else d
            p = [x for x in ps if x['id'] == pid][0]
            if allp.get(pid) != p:
                ok = False
                print('✗ pack-全部.json 与 %s 不一致（%s），请运行 build' % (os.path.basename(f), pid))
        print('✓ pack-全部.json 与各单卷一致（%d 套）' % len(allp))
    except Exception as ex:
        ok = False
        print('✗ pack-全部.json 校验失败：%s' % ex)
    # HTML 语法
    node = find_node()
    if node:
        html = open(HTML, 'rb').read().decode('utf-8')
        import re as _re
        blocks = _re.findall(r'<script[^>]*>(.*?)</script>', html, _re.S)
        tmp = os.path.join(tempfile.gettempdir(), 'qb_inline_check.js')
        with open(tmp, 'w', encoding='utf-8') as f:
            f.write('\n;\n'.join(blocks))
        r = subprocess.run([node, '--check', tmp], capture_output=True, text=True)
        if r.returncode == 0:
            print('✓ HTML 内嵌脚本语法正确（node --check）')
        else:
            ok = False
            print('✗ HTML 内嵌脚本语法错误：\n' + (r.stderr or '')[:800])
        os.remove(tmp)
    else:
        print('· 未找到 node，跳过 HTML 语法检查（可设 QB_NODE 指定 node 路径）')
    print('全部通过 ✓' if ok else '存在问题 ✗')
    return 0 if ok else 1


def cmd_sheets(args):
    try:
        from PIL import Image
    except ImportError:
        die('需要 Pillow：pip install pillow')
    if not os.path.exists(args.image):
        die('找不到图片：%s' % args.image)
    im = Image.open(args.image).convert('RGB')
    W, H = im.size
    rows, cols = [int(x) for x in args.grid.lower().split('x')]
    outdir = args.out or os.path.join(BASE, '答卷切图')
    try:
        os.makedirs(outdir, exist_ok=True)
        probe = os.path.join(outdir, '.wtest')
        open(probe, 'w').write('')
        os.remove(probe)
    except (PermissionError, OSError):
        outdir = os.path.join(tempfile.gettempdir(), '答卷切图')
        os.makedirs(outdir, exist_ok=True)
        print('⚠ 默认输出目录不可写，改输出到：%s' % outdir)
    base = os.path.splitext(os.path.basename(args.image))[0]
    made = []
    for r in range(rows):
        for c in range(cols):
            cell = im.crop((c * W // cols, r * H // rows, (c + 1) * W // cols, (r + 1) * H // rows))
            if args.inner_cols and args.inner_cols > 1:
                n = args.inner_cols
                segments = [(i * cell.width // n, (i + 1) * cell.width // n) for i in range(n)]
            else:
                segments = detect_columns(cell)
            for k, (x1, x2) in enumerate(segments):
                if x2 - x1 < 8:
                    continue
                part = cell.crop((x1, 0, x2, cell.height))
                if args.chunk == 'auto':
                    nch = max(1, -(-int(part.height * args.zoom) // int(args.max_h)))
                else:
                    nch = max(1, int(args.chunk))
                overlap = int(part.height * 0.04)
                step = max(1, (part.height - overlap) // nch)
                for j in range(nch):
                    y1 = j * step
                    y2 = min(part.height, y1 + step + overlap)
                    sub = part.crop((0, y1, part.width, y2))
                    if args.zoom != 1:
                        sub = sub.resize((int(sub.width * args.zoom), int(sub.height * args.zoom)),
                                         Image.LANCZOS)
                    name = '%s_r%dc%d_col%d_%d.png' % (base, r + 1, c + 1, k + 1, j + 1)
                    p = os.path.join(outdir, name)
                    sub.save(p)
                    made.append((p, sub.size))
    print('✓ 输出 %d 张切片 -> %s' % (len(made), outdir))
    for p, size in made:
        print('  %-52s %dx%d' % (os.path.basename(p), size[0], size[1]))
    return 0


def detect_columns(cell):
    """按竖直空白把一页切成若干栏（不用 numpy）。"""
    g = cell.convert('L')
    bw = g.point(lambda v: 255 if v < 200 else 0)
    proj = bw.resize((cell.width, 1), 1).tobytes()   # 1 = BOX 均值
    frac = [v / 255.0 for v in proj]
    thr = 0.004
    min_gap = max(10, int(cell.width * 0.02))
    cols = [i for i, v in enumerate(frac) if v > thr]
    if not cols:
        return [(0, cell.width)]
    segs, start, last = [], cols[0], cols[0]
    for i in cols[1:]:
        if i - last > min_gap:
            segs.append((max(0, start - 4), min(cell.width, last + 4)))
            start = i
        last = i
    segs.append((max(0, start - 4), min(cell.width, last + 4)))
    # 过滤过窄的栏
    segs = [s for s in segs if s[1] - s[0] > cell.width * 0.12]
    return segs or [(0, cell.width)]


# ---------- main ----------
def main():
    ap = argparse.ArgumentParser(description='题库核对/更新工具')
    sub = ap.add_subparsers(dest='cmd', required=True)

    p = sub.add_parser('template', help='生成答案录入模板')
    p.add_argument('pack')
    p.add_argument('--pack-id')
    p.set_defaults(func=cmd_template)

    p = sub.add_parser('checkall', help='批量核对所有能配到答案文件的题包')
    p.set_defaults(func=cmd_checkall)

    p = sub.add_parser('check', help='核对答卷答案')
    p.add_argument('pack')
    p.add_argument('answers')
    p.add_argument('--pack-id')
    p.add_argument('--report', help='把结果写成 JSON 报告')
    p.set_defaults(func=cmd_check)

    p = sub.add_parser('apply', help='把答卷答案写回 pack 并 build')
    p.add_argument('pack')
    p.add_argument('answers')
    p.add_argument('--pack-id')
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--no-build', action='store_true')
    p.set_defaults(func=cmd_apply)

    p = sub.add_parser('build', help='合并单卷到 pack-全部.json 并注入 HTML')
    p.set_defaults(func=cmd_build)

    p = sub.add_parser('verify', help='校验 JSON / HTML / 一致性')
    p.set_defaults(func=cmd_verify)

    p = sub.add_parser('sheets', help='答卷图片切片')
    p.add_argument('image')
    p.add_argument('--grid', default='2x2', help='页网格，行x列，默认 2x2')
    p.add_argument('--zoom', type=float, default=2.0)
    p.add_argument('--chunk', default='auto', help='每栏再纵向切几段（默认 auto 按 --max-h 自动）')
    p.add_argument('--max-h', type=int, default=1400, help='切片放大后的目标最大高度，默认 1400')
    p.add_argument('--inner-cols', type=int, default=0,
                   help='每页强制平均切成几栏（2 = 常见双栏试卷；0 = 自动按空白检测）')
    p.add_argument('--out')
    p.set_defaults(func=cmd_sheets)

    args = ap.parse_args()
    sys.exit(args.func(args) or 0)


if __name__ == '__main__':
    main()
