#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把「带答案的选择题 docx 套卷」解析成 试卷数据.json（训练器的套卷模式吃这个格式）。

用法：
  python 工具/parse-paper.py 历史/images/xxx.docx 历史/试卷数据.json \
      --id ls-mid-01 --name "九上历史·选择题100题冲刺专练" --imgdir 历史/images/试卷 --imgbase images/试卷/

做三件事：
  1. 按「1．」题号切题，题干 / 选项 / 【答案】/ 【详解】分开；
  2. 题干里的配图、题表按出现顺序保留（顺序就是试卷上的顺序）；
  3. 自检：100 题 × 4 选项、答案字母合法、解析里「正确」那一项要和【答案】一致。
解析结果不满足以上条件时以非 0 退出，避免把错数据塞进网页。
"""
import argparse
import io
import json
import os
import re
import sys
import zipfile

import docx
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph

OPT_MARK = re.compile(r'([A-D])[．.]\s*')
QNUM = re.compile(r'^\s*(\d{1,3})\s*[．.]\s*')
ANS = re.compile(r'^【答案】\s*([A-D])\s*$')
JX = re.compile(r'^【详解】\s*')
NBSP = '\u00a0'

# 单元关键词（命中计分，得分最高者为准；打平或全不命中留给人工 override）
DEFAULT_UNITS = {
    '第一单元 文明的产生与古代亚非文明':
        ['汉谟拉比', '古巴比伦', '楔形文字', '巴比伦', '金字塔', '古埃及', '法老', '尼罗河',
         '种姓', '婆罗门', '刹帝利', '佛教', '释迦牟尼', '两河', '底格里斯', '幼发拉底',
         '苏美尔', '亚非文明', '大河文明', '哈拉帕', '摩亨佐', '象形文字'],
    '第二单元 古代欧洲文明':
        ['雅典', '伯里克利', '希腊', '罗马', '十二铜表法', '凯撒', '屋大维', '亚历山大',
         '斯巴达', '帕特农', '亚里士多德', '苏格拉底', '柏拉图', '城邦', '民主政治',
         '儒略历', '布匿', '西塞罗', '拉丁文'],
    '第三单元 封建时代的欧洲':
        ['西欧庄园', '庄园', '查士丁尼', '拜占庭', '封君', '封臣', '中世纪', '封建等级',
         '城市自治', '大学的兴起', '基督教会', '什一税', '农奴', '查理曼', '法兰克'],
    '第四单元 中古时期的亚洲、非洲和美洲':
        ['日本', '大化改新', '幕府', '武士', '源赖朝', '阿拉伯', '穆罕默德', '伊斯兰教',
         '马里', '曼萨', '桑海', '加纳', '美洲', '阿兹特克', '印加', '玛雅', '高丽', '朝鲜',
         '德里苏丹', '奥斯曼'],
    '第五单元 走向近代':
        ['文艺复兴', '人文主义', '手工工场', '租地农场', '新航路', '哥伦布', '达·伽马',
         '麦哲伦', '迪亚士', '三角贸易', '黑奴', '奴隶贸易', '殖民', '但丁', '达·芬奇',
         '莎士比亚', '彼特拉克', '薄伽丘', '大交换', '价格革命', '无敌舰队', '殖民扩张'],
    '第六单元 资本主义制度的初步确立':
        ['英国资产阶级革命', '克伦威尔', '权利法案', '光荣革命', '独立宣言', '美国独立',
         '1787年宪法', '华盛顿', '法国大革命', '人权宣言', '拿破仑', '马赛曲', '巴士底狱',
         '三级会议', '君主立宪', '三权分立', '殖民地', '法典', '拿破仑法典'],
    '第七单元 第一次工业革命和马克思主义的诞生':
        ['工业革命', '瓦特', '蒸汽机', '火车', '铁路', '工厂', '曼彻斯特', '马克思', '恩格斯',
         '共产党宣言', '马克思主义', '巴黎公社', '国际歌', '宪章运动', '欧文', '傅立叶',
         '圣西门', '棉纺', '珍妮机', '圈地运动'],
}


def clean(s):
    s = s.replace(NBSP, ' ')
    s = re.sub(r'[ \t]+', ' ', s)
    return s.strip()


def para_el_info(p_el, doc):
    par = Paragraph(p_el, doc)
    imgs = [b.get(qn('r:embed')) for b in p_el.findall('.//' + qn('a:blip'))]
    return clean(par.text), imgs


def table_el_info(tb_el, doc):
    tb = Table(tb_el, doc)
    rows = []
    for row in tb.rows:
        cells = []
        for cell in row.cells:
            txt, imgs = [], []
            for p in cell.paragraphs:
                t, im = para_el_info(p._p, doc)
                if t:
                    txt.append(t)
                imgs += im
            cells.append({'text': '\n'.join(txt), 'imgs': imgs})
        # 合并单元格在 python-docx 里会重复出现同一个 cell，去掉相邻重复
        dedup = []
        for c in cells:
            if dedup and c['text'] == dedup[-1]['text'] and not c['imgs'] and not dedup[-1]['imgs']:
                continue
            dedup.append(c)
        rows.append(dedup)
    rows = [r for r in rows if any(c['text'] or c['imgs'] for c in r)]
    return rows


def body_chunks(doc):
    """按文档顺序产出 chunk：{'kind':'p'|'tbl', 'text':..., 'imgs':[...], 'rows':...}"""
    for child in doc.element.body.iterchildren():
        tag = child.tag.split('}')[1]
        if tag == 'p':
            t, im = para_el_info(child, doc)
            if t or im:
                yield {'kind': 'p', 'text': t, 'imgs': im}
        elif tag == 'tbl':
            rows = table_el_info(child, doc)
            if any(c['text'] or c['imgs'] for r in rows for c in r):
                yield {'kind': 'tbl', 'rows': rows}


def split_options(lines):
    """把 'A．xx\tB．yy' 这种一行两个选项拆成 [('A','xx'),...]，保持顺序。"""
    text = '\n'.join(lines)
    marks = [(m.start(), m.group(1)) for m in OPT_MARK.finditer(text)]
    if not marks:
        return []
    out = []
    for i, (pos, letter) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(text)
        val = clean(text[pos + 2:end])
        out.append((letter, val))
    return out


def split_explain(lines):
    """解析分成两种：逐项（A./B./C./D.）存 why，整段（没有字母）存 sol。"""
    text = '\n'.join(lines).strip()
    marks = [(m.start(), m.group(1)) for m in OPT_MARK.finditer(text)]
    why = {}
    if marks and marks[0][0] == 0:
        for i, (pos, letter) in enumerate(marks):
            end = marks[i + 1][0] if i + 1 < len(marks) else len(text)
            why[letter] = clean(text[pos + 2:end])
        return why, ''
    return {}, clean(text)


def blocks_from(chunks):
    """题干块：文字段落 / 图片 / 题表，按文档顺序。题表里也可能夹图片。"""
    blocks = []
    buf = []
    for ch in chunks:
        if ch['kind'] == 'p':
            if ch['text']:
                buf.append(ch['text'])
            for rid in ch['imgs']:
                if buf:
                    blocks.append({'t': 'p', 'v': join_para(buf)})
                    buf = []
                blocks.append({'t': 'img', 'rid': rid})
        else:
            if buf:
                blocks.append({'t': 'p', 'v': join_para(buf)})
                buf = []
            blocks.append({'t': 'tbl', 'rows': [
                [{'t': c['text'], 'rids': c['imgs']} for c in r] for r in ch['rows']
            ]})
    if buf:
        blocks.append({'t': 'p', 'v': join_para(buf)})
    return blocks


def join_para(lines):
    """同一块里的多段文字：中文之间直接接，避免出现多余空格。"""
    out = ''
    for ln in lines:
        ln = ln.strip()
        if not ln:
            continue
        if out and re.search(r'[A-Za-z0-9]$', out) and re.match(r'[A-Za-z0-9]', ln):
            out += ' ' + ln
        else:
            out += ln
    return out


def parse(path):
    doc = docx.Document(path)
    questions = []
    cur = None
    mode = 'stem'          # stem | opt | why
    stem_buf, opt_buf, why_buf = [], [], []

    def flush():
        if not cur:
            return
        cur['blocks'] = blocks_from(stem_buf)
        opts = split_options([c['text'] for c in opt_buf if c['kind'] == 'p'])
        cur['opts'] = opts
        cur['why'], cur['sol'] = split_explain([c['text'] for c in why_buf if c['kind'] == 'p'])
        questions.append(cur)

    for ch in body_chunks(doc):
        if ch['kind'] == 'p':
            t = ch['text']
            m = QNUM.match(t)
            if m and len(t) > 3:
                flush()
                cur = {'no': int(m.group(1))}
                mode = 'stem'
                stem_buf = [{'kind': 'p', 'text': t[m.end():], 'imgs': ch['imgs']}]
                opt_buf, why_buf = [], []
                continue
            if cur is None:
                continue
            if ANS.match(t):
                cur['ans_letter'] = ANS.match(t).group(1)
                mode = 'why'
                continue
            if JX.match(t):
                t = JX.sub('', t)
                mode = 'why'
            if mode == 'stem':
                # 题干之后、选项之前的文字块，如果已经出现 A．/B． 开头就是选项
                if re.match(r'^[A-D][．.]', t):
                    mode = 'opt'
                    opt_buf.append({'kind': 'p', 'text': t, 'imgs': ch['imgs']})
                else:
                    stem_buf.append({'kind': 'p', 'text': t, 'imgs': ch['imgs']})
            elif mode == 'opt':
                opt_buf.append({'kind': 'p', 'text': t, 'imgs': ch['imgs']})
            else:
                why_buf.append({'kind': 'p', 'text': t, 'imgs': ch['imgs']})
        else:
            if cur is None:
                continue
            (stem_buf if mode == 'stem' else (opt_buf if mode == 'opt' else why_buf)).append(ch)
    flush()
    return doc, questions


def extract_images(doc, path, outdir, imgbase, questions):
    """media/*.png|jpeg → outdir/q005_1.webp，并把 rid 换成相对路径（含题表里的图）。"""
    try:
        from PIL import Image
    except ImportError:
        Image = None
    media = {}
    with zipfile.ZipFile(path) as z:
        for rid, rel in doc.part.rels.items():
            if 'image' not in rel.reltype:
                continue
            name = rel.target_ref            # media/image12.png
            try:
                media[rid] = (z.read('word/' + name), os.path.splitext(name)[1].lower())
            except KeyError:
                continue
    os.makedirs(outdir, exist_ok=True)

    def save(no, seq, rid, block):
        if rid not in media:
            print('  ! 图片 %s 找不到' % rid, file=sys.stderr)
            return
        data, ext = media[rid]
        fn = 'q%03d_%d.webp' % (no, seq)
        dst = os.path.join(outdir, fn)
        if Image:
            im = Image.open(io.BytesIO(data))
            if im.mode not in ('RGB', 'RGBA'):
                im = im.convert('RGB')
            if im.width > 1200:
                im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
            im.save(dst, 'WEBP', quality=88, method=6)
        else:
            fn = os.path.splitext(fn)[0] + ext
            dst = os.path.join(outdir, fn)
            open(dst, 'wb').write(data)
        block['src'] = imgbase + fn

    for q in questions:
        seq = 0
        for b in q['blocks']:
            if b['t'] == 'img':
                seq += 1
                save(q['no'], seq, b.pop('rid'), b)
            elif b['t'] == 'tbl':
                for row in b['rows']:
                    for cell in row:
                        srcs = []
                        for rid in cell.pop('rids', []):
                            seq += 1
                            fake = {}
                            save(q['no'], seq, rid, fake)
                            if fake.get('src'):
                                srcs.append(fake['src'])
                        cell['imgs'] = srcs


def render_plain(q):
    out = ['#%d %s' % (q['no'], q.get('ans_letter', '?'))]
    for b in q['blocks']:
        if b['t'] == 'p':
            out.append('  Q ' + b['v'])
        elif b['t'] == 'img':
            out.append('  IMG ' + b.get('src', b.get('rid', '')))
        else:
            out.append('  TBL ' + json.dumps(b['rows'], ensure_ascii=False))
    for k, v in q['opts']:
        out.append('  %s．%s' % (k, v))
    for k, v in q['why'].items():
        out.append('  why %s: %s' % (k, v))
    if q.get('sol'):
        out.append('  sol: ' + q['sol'])
    return '\n'.join(out)


def classify(q, units, override):
    """按关键词给每道题标一个单元；跨单元或不明显的标「综合」。"""
    if str(q['no']) in override:
        return override[str(q['no'])]
    stem = ' '.join(b.get('v', '') for b in q['blocks'] if b['t'] == 'p')
    detail = ' '.join(q['why'].values()) + q.get('sol', '')
    opts = ' '.join(v for _, v in q['opts'])
    score = {}
    for name, kws in units.items():
        s = 0
        for kw in kws:
            s += stem.count(kw) * 3 + opts.count(kw) + detail.count(kw)
        if s:
            score[name] = s
    if not score:
        return '综合'
    ranked = sorted(score.items(), key=lambda kv: -kv[1])
    top, second = ranked[0], (ranked[1] if len(ranked) > 1 else ('', 0))
    if top[1] < 3 or top[1] < second[1] * 1.6:
        return '综合'
    return top[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('docx')
    ap.add_argument('out')
    ap.add_argument('--id', default='paper-01')
    ap.add_argument('--name', default='选择题套卷')
    ap.add_argument('--exam', default='')
    ap.add_argument('--imgdir', default='')
    ap.add_argument('--imgbase', default='')
    ap.add_argument('--dump', default='')
    ap.add_argument('--units-json', default='', help='自定义单元关键词表（单元名 → 关键词数组）')
    ap.add_argument('--override', default='', help='人工指定单元：{"题号": "单元名"}')
    args = ap.parse_args()

    units = DEFAULT_UNITS
    if args.units_json:
        with open(args.units_json, encoding='utf-8') as f:
            units = json.load(f)
    override = {}
    if args.override:
        with open(args.override, encoding='utf-8') as f:
            override = json.load(f)

    doc, qs = parse(args.docx)
    qs = [q for q in qs if q.get('opts')]

    if args.imgdir:
        extract_images(doc, args.docx, args.imgdir, args.imgbase, qs)

    errs = []
    seen = set()
    NEG = ('不可能', '不正确', '不包括', '不属于', '不符合', '有误', '错误的是',
           '错误的一项', '不对的是', '不能体现', '无法体现', '没有体现', '不涉及', '无关的是')
    for q in qs:
        no = q['no']
        if no in seen:
            errs.append('题号重复 %d' % no)
        seen.add(no)
        if len(q['opts']) != 4:
            errs.append('#%d 选项 %d 个（应为 4）：%s' % (no, len(q['opts']), q['opts']))
        letters = [k for k, _ in q['opts']]
        if letters != ['A', 'B', 'C', 'D']:
            errs.append('#%d 选项字母 %s' % (no, letters))
        if not q.get('ans_letter'):
            errs.append('#%d 没有【答案】' % no)
            continue
        if q['ans_letter'] not in letters:
            errs.append('#%d 答案 %s 不在选项里' % (no, q['ans_letter']))
            continue
        stem = ' '.join(b.get('v', '') for b in q['blocks'] if b['t'] == 'p')
        negative = any(w in stem for w in NEG)
        why, sol = q['why'], q['sol']
        if why:
            # 逐项解析：答案那一项应当以「正确」结尾（否定题干则以「错误」结尾），其余相反
            tail = {k: ('正确' if v.rstrip('。 ').endswith('正确') else '错误' if v.rstrip('。 ').endswith('错误') else '?')
                    for k, v in why.items()}
            want_ans = '错误' if negative else '正确'
            want_oth = '正确' if negative else '错误'
            got = tail.get(q['ans_letter'])
            if got != want_ans:
                errs.append('#%d 答案 %s 的解析结尾是「%s」，按%s题干应为「%s」' %
                            (no, q['ans_letter'], got, '否定' if negative else '肯定', want_ans))
            bad = [k for k, t in tail.items() if k != q['ans_letter'] and t == want_ans]
            if bad:
                errs.append('#%d 其他选项 %s 的解析也以「%s」结尾，和答案矛盾' % (no, '/'.join(bad), want_ans))
            unk = [k for k, t in tail.items() if t == '?']
            if unk:
                errs.append('#%d 选项 %s 的解析没有「正确/错误」结论' % (no, '/'.join(unk)))
            if len(why) != 4:
                errs.append('#%d 逐项解析只有 %d 项' % (no, len(why)))
        elif sol:
            # 整段解析：必须以「故选X / 本题选X / 答案X」收口，且和【答案】一致
            picks = re.findall(r'故(?:本题)?选\s*([A-D])|本题(?:应)?选\s*([A-D])|答案(?:为|是)?\s*([A-D])', sol)
            picked = [(a or b or c) for a, b, c in picks]
            if not picked:
                errs.append('#%d 整段解析里找不到「故选X」' % no)
            elif picked[-1] != q['ans_letter']:
                errs.append('#%d 解析「故选%s」与【答案】%s 不一致' % (no, picked[-1], q['ans_letter']))
        if not why and not sol:
            errs.append('#%d 既没有逐项解析也没有整段解析' % no)
    nums = sorted(seen)
    if nums and nums != list(range(nums[0], nums[0] + len(nums))):
        miss = sorted(set(range(nums[0], nums[0] + len(nums))) - seen)
        errs.append('题号不连续，缺 %s' % miss)

    if args.dump:
        with open(args.dump, 'w', encoding='utf-8') as f:
            f.write('\n\n'.join(render_plain(q) for q in qs))

    for q in qs:
        q['unit'] = classify(q, units, override)
    by_unit = {}
    for q in qs:
        by_unit.setdefault(q['unit'], []).append(q['no'])

    pack = {
        'id': args.id,
        'name': args.name,
        'exam': args.exam,
        'source': os.path.basename(args.docx),
        'note': '每题带 ABCD 逐项解析',
        'questions': [
            {
                'no': q['no'],
                'id': '%s-q%03d' % (args.id, q['no']),
                'unit': q['unit'],
                'blocks': q['blocks'],
                'opts': [v for _, v in q['opts']],
                'ans': 'ABCD'.index(q['ans_letter']),
                'why': q['why'],
                'sol': q.get('sol', ''),
            }
            for q in qs
        ],
    }
    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump(pack, f, ensure_ascii=False, indent=1)
        f.write('\n')

    print('解析 %d 题 → %s' % (len(qs), args.out))
    order = list(units.keys()) + ['综合']
    for u in order:
        if u in by_unit:
            print('   %-28s %3d 题  %s' % (u, len(by_unit[u]),
                                          ','.join(str(n) for n in by_unit[u])[:70]))
    if errs:
        print('❌ %d 个问题：' % len(errs))
        for e in errs[:40]:
            print('  - ' + e)
        sys.exit(1)
    print('✅ 校验通过：%d 题，选项与答案、解析全部自洽' % len(qs))


if __name__ == '__main__':
    main()
