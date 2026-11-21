/* 自动生成：python 题库工具/qb.py build 从 题库/pack-*.json 生成，勿手改 */
/* 卷：第二十九章《圆》单元测试卷（GD6）（23 题） */
(window.__PACKS__ = window.__PACKS__ || []).push({
  "id": "pk-circle29",
  "name": "第二十九章《圆》单元测试卷（GD6）",
  "source": "题库/第12周周末练习卷及参考答案.pdf（4 页：卷面 21–24）",
  "exam": "九上第二十九章《圆》单元测试：选择 10×3 ＋ 填空 5×3 ＋ 解答 16–18（7+7+10）＋ 19–21（9×3）＋ 22–23（12×2），满分 120 分",
  "note": "23 题按原卷逐题录入，分值照卷面；原 PDF（含扫描噪点，答案页缺失/不可辨）在本机 OneDrive「仓库内副本」，未入版本库，本题包是唯一可复现的源。答案解析按逐题复算给出（2026-11-21），第 3 题的「∠D」在原卷是 ∠BDC 的简写（原卷图形如此，见该题 stem）。含根号 / π / 分数的填空答案改成四选一以便自动判分；16、17、20 题是证明与作图，标 selfCheck 不判分，参考答案写在解析里。配图按原卷描图（fig 字段，脚本 题库工具/figs29.py 生成）。",
  "questions": [
    {
      "id": "c29q1",
      "no": "1",
      "group": "选择",
      "type": "choice",
      "score": 3,
      "diff": 1,
      "focus": "model",
      "kp": [
        "圆的基本性质",
        "连半径得等腰"
      ],
      "formula": "① 同圆半径相等：OA = OB\n② 三边相等 ⟹ 等边三角形，每个内角 60°\n③ 弦长 = 半径 ⟹ 圆心角 60°（这条要背下来）",
      "ask": "如图，AB 是 ⊙O 的弦，AB = OA，则 ∠BAO 的度数为（　）",
      "fig": {
        "w": 220,
        "h": 200,
        "need": 1,
        "svg": "<circle cx=\"105\" cy=\"100\" r=\"78\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M177.3 70.8L96.8 22.4\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><path d=\"M105 100L177.3 70.8\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><circle cx=\"105\" cy=\"100\" r=\"2.4\" fill=\"#e37400\"/><text x=\"91\" y=\"116\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\">O</text><text x=\"181.3\" y=\"84.8\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\" font-style=\"italic\">A</text><text x=\"90.8\" y=\"16.4\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\" font-style=\"italic\">B</text>"
      },
      "tip": "看到「弦 = 半径」，先把 OB 连上：OA = OB = AB。",
      "opts": [
        "40°",
        "50°",
        "60°",
        "65°"
      ],
      "ans": 2,
      "solution": [
        "连 OB。OA、OB 都是半径，所以 OA = OB；题目又给 AB = OA，于是 AB = OA = OB。",
        "三边相等的三角形是等边三角形，所以 △OAB 是等边三角形，每个内角都是 60°。",
        "∠BAO 就是等边三角形在 A 处的内角，等于 60°，选 C。",
        "坑：把 ∠BAO 当成圆心角 ∠AOB 的一半去算。∠BAO 是底角，不是圆周角。"
      ]
    },
    {
      "id": "c29q2",
      "no": "2",
      "group": "选择",
      "type": "choice",
      "score": 3,
      "diff": 1,
      "focus": "model",
      "kp": [
        "圆的基本性质",
        "垂径定理"
      ],
      "formula": "① 垂直于弦的直径平分弦：CE = ED = ½CD\n② 连半径得直角三角形：OC² = OE² + CE²\n③ 弦长、弦心距、半径三者知二求一",
      "ask": "如图，AB 是 ⊙O 的直径，弦 CD ⊥ AB 于点 E，OC = 5 cm，CD = 8 cm，则 OE 的长为（　）",
      "fig": {
        "w": 300,
        "h": 230,
        "need": 1,
        "svg": "<circle cx=\"130\" cy=\"105\" r=\"82\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M48 105L212 105\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><path d=\"M156 27.2L156 182.8\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><path d=\"M130 105L156 27.2\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><circle cx=\"130\" cy=\"105\" r=\"2.4\" fill=\"#e37400\"/><text x=\"36\" y=\"110\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" font-style=\"italic\" fill=\"#1b2430\">A</text><text x=\"216\" y=\"110\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" font-style=\"italic\" fill=\"#1b2430\">B</text><text x=\"152\" y=\"21.2\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" font-style=\"italic\" fill=\"#1b2430\">C</text><text x=\"152\" y=\"198.8\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" font-style=\"italic\" fill=\"#1b2430\">D</text><text x=\"162\" y=\"121\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"14\" font-style=\"italic\" fill=\"#1b2430\">E</text><text x=\"118\" y=\"123\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\">O</text>"
      },
      "tip": "CD ⊥ AB 且 AB 过圆心 ⟹ E 是 CD 中点，先写 CE = 4。",
      "opts": [
        "8 cm",
        "5 cm",
        "3 cm",
        "2 cm"
      ],
      "ans": 2,
      "solution": [
        "AB 是直径且 CD ⊥ AB 于 E，由垂径定理，E 平分 CD：CE = ED = ½ × 8 = 4 cm。",
        "连 OC（OC 本来就是半径），在 Rt△OEC 中：OE² = OC² − CE² = 5² − 4² = 9，所以 OE = 3 cm。",
        "选 C。坑：把 CD = 8 直接当半弦用，或者忘了 CE 只有 4。"
      ]
    },
    {
      "id": "c29q3",
      "no": "3",
      "group": "选择",
      "type": "choice",
      "score": 3,
      "diff": 2,
      "focus": "trans",
      "kp": [
        "圆的基本性质",
        "圆周角定理",
        "直径所对的圆周角"
      ],
      "formula": "① 直径所对的圆周角是直角：AB 是直径 ⟹ ∠ACB = 90°\n② 同弧所对的圆周角相等：∠BAC = ∠BDC\n③ 同弧上的圆周角 = 圆心角的一半",
      "ask": "如图，C、D 是 ⊙O 上直径 AB 两侧的点，若 ∠D = 75°，则 ∠ABC 等于（　）",
      "fig": {
        "w": 290,
        "h": 220,
        "need": 1,
        "svg": "<circle cx=\"140\" cy=\"105\" r=\"82\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M58 105L222 105\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><path d=\"M114.7 27L58 105\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><path d=\"M114.7 27L222 105\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><path d=\"M112 182.1L58 105\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><path d=\"M112 182.1L222 105\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><circle cx=\"140\" cy=\"105\" r=\"2.4\" fill=\"#e37400\"/><text x=\"134\" y=\"123\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\">O</text><text x=\"44\" y=\"110\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" font-style=\"italic\" fill=\"#1b2430\">A</text><text x=\"227\" y=\"110\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" font-style=\"italic\" fill=\"#1b2430\">B</text><text x=\"102.7\" y=\"23\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" font-style=\"italic\" fill=\"#1b2430\">C</text><text x=\"110\" y=\"200.1\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" font-style=\"italic\" fill=\"#1b2430\">D</text>"
      },
      "stem": "原卷把 D 处的角简写成 ∠D，结合图形它是 ∠BDC（由 DB、DC 两边夹出来的角）。",
      "tip": "先由「AB 是直径」得 ∠ACB = 90°，再把 75° 搬到三角形 ABC 里去。",
      "opts": [
        "15°",
        "20°",
        "25°",
        "35°"
      ],
      "ans": 0,
      "solution": [
        "∠BDC = 75° 是圆周角，它对着弧 BC，所以弧 BC 的度数是 2 × 75° = 150°。",
        "∠BAC 也对着弧 BC，由同弧所对的圆周角相等，∠BAC = ∠BDC = 75°。",
        "AB 是直径，所以 ∠ACB = 90°。在 Rt△ABC 中：∠ABC = 180° − 90° − 75° = 15°。",
        "选 A。坑：读完「同弧相等」就把 75° 直接当答案，忘了还要求的是另一个锐角。"
      ]
    },
    {
      "id": "c29q4",
      "no": "4",
      "group": "选择",
      "type": "choice",
      "score": 3,
      "diff": 1,
      "focus": "trans",
      "kp": [
        "圆的基本性质",
        "点与圆的位置关系"
      ],
      "formula": "设 ⊙O 半径为 r，点 A 到圆心距离为 d：\n① d < r ⟹ 点在圆内\n② d = r ⟹ 点在圆上\n③ d > r ⟹ 点在圆外",
      "ask": "⊙O 的半径为 5 cm，点 A 到圆心 O 的距离 OA = 3 cm，则点 A 和 ⊙O 的位置关系为（　）",
      "tip": "只比较两个数：点到圆心的距离 d 和半径 r。",
      "opts": [
        "点 A 在圆上",
        "点 A 在圆内",
        "点 A 在圆外",
        "无法确定"
      ],
      "ans": 1,
      "solution": [
        "r = 5 cm，d = OA = 3 cm。",
        "d < r（3 < 5），所以点 A 在 ⊙O 内。选 B。",
        "坑：把「距离小」想成「圆小」。判位置只看 d 与 r 的大小，与圆的大小无关。"
      ]
    },
    {
      "id": "c29q5",
      "no": "5",
      "group": "选择",
      "type": "choice",
      "score": 3,
      "diff": 1,
      "focus": "trans",
      "kp": [
        "推理与证明",
        "反证法"
      ],
      "formula": "反证法第一步：否定结论，写出结论的反面\n「至少有一个 ≥ 90°」的反面 =「每一个都 < 90°」\n关键词对：至少一个 ↔ 一个也没有；都是 ↔ 不都是",
      "ask": "用反证法证明命题「四边形中至少有一个角是钝角或直角」，应先假设（　）",
      "tip": "把结论整句反过来：至少有一个 → 一个也没有。",
      "opts": [
        "有一个内角小于 90°",
        "有一个内角大于等于 90°",
        "每一个内角都小于 90°",
        "每一个内角都大于等于 90°"
      ],
      "ans": 2,
      "solution": [
        "结论是「至少有一个角是钝角或直角」，也就是「至少有一个角 ≥ 90°」。",
        "它的反面是「一个都没有」，即每一个角都小于 90°，与选项 C 一致。",
        "坑：只否定「钝角」，写成「有一个内角小于 90°」；或者否定得不彻底，写成「每一个都大于等于 90°」（那是原命题的加强，不是反面）。"
      ]
    },
    {
      "id": "c29q6",
      "no": "6",
      "group": "选择",
      "type": "choice",
      "score": 3,
      "diff": 2,
      "focus": "plan",
      "kp": [
        "圆的基本概念",
        "确定圆的条件"
      ],
      "formula": "① 不在同一直线上的三点确定一个圆\n② 过两点、半径给定的圆：圆心在 AB 的垂直平分线上，且到 A 的距离 = r\n③ 圆心到 AB 中点 M 的距离 = √(r² − (½AB)²)，两侧对称 ⟹ 一般有 2 个（相切时 1 个，够不着时 0 个）",
      "ask": "已知线段 AB = 7，经过 A、B 两点且半径为 5 的圆有（　）",
      "tip": "先算圆心到 AB 中点的距离，看有几个位置。",
      "opts": [
        "0 个",
        "1 个",
        "2 个",
        "无数个"
      ],
      "ans": 2,
      "solution": [
        "半径 5 的圆要经过 A、B，圆心必须同时满足：到 A、B 距离都等于 5。",
        "取 AB 中点 M，则 MA = 3.5；圆心 P 在 AB 的垂直平分线上，且 PM = √(5² − 3.5²) = √12.75 ≈ 3.57。",
        "垂直平分线上到 M 距离为 3.57 的点有上下两个，所以这样的圆有 2 个。选 C。",
        "校验：2r = 10 > AB = 7，两圆能「架」在 AB 上；若 2r < AB 则一个也没有。"
      ]
    },
    {
      "id": "c29q7",
      "no": "7",
      "group": "选择",
      "type": "choice",
      "score": 3,
      "diff": 2,
      "focus": "model",
      "kp": [
        "圆的基本性质",
        "弧长",
        "连半径得等腰"
      ],
      "formula": "① 弦长 = 半径 ⟹ 圆心角 60°\n② 弧长 l = nπr/180\n③ r = 18、n = 60° ⟹ l = 6π",
      "ask": "如图 1 是博物馆屋顶的图片，屋顶由图 2 中的瓦片构成，瓦片横截面如图 3 所示，弧 AB 是以点 O 为圆心、18 cm 为半径的弧，弦 AB 的长为 18 cm，则弧 AB 的长是（　）",
      "fig": {
        "w": 300,
        "h": 200,
        "need": 1,
        "svg": "<polyline points=\"89.6,131.5 92.3,133.3 95,135 97.8,136.6 100.6,138.1 103.5,139.5 106.4,140.8 109.4,142.1 112.4,143.2 115.4,144.3 118.4,145.3 121.5,146.2 124.6,147 127.7,147.7 130.9,148.3 134,148.8 137.2,149.2 140.4,149.6 143.6,149.8 146.8,150 150,150 153.2,150 156.4,149.8 159.6,149.6 162.8,149.2 166,148.8 169.1,148.3 172.3,147.7 175.4,147 178.5,146.2 181.6,145.3 184.6,144.3 187.6,143.2 190.6,142.1 193.6,140.8 196.5,139.5 199.4,138.1 202.2,136.6 205,135 207.7,133.3 210.4,131.5\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/><path d=\"M89.6 131.5L210.4 131.5\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.1\" stroke-linecap=\"round\" stroke-dasharray=\"5 4\"/><path d=\"M150 42L89.6 131.5M150 42L210.4 131.5\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><circle cx=\"150\" cy=\"42\" r=\"2.4\" fill=\"#1b2430\"/><text x=\"158\" y=\"48\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">O</tspan></text><text x=\"75.6\" y=\"135.5\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">A</tspan></text><text x=\"218.4\" y=\"135.5\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">B</tspan></text>"
      },
      "stem": "图 1、图 2 是实物照片，题目真正用到的是图 3：圆心 O、半径 OA = OB = 18，弦 AB = 18。",
      "tip": "弦和半径一样长 ⟹ △OAB 是等边三角形 ⟹ 圆心角 60°。",
      "opts": [
        "24π cm",
        "12π cm",
        "10π cm",
        "6π cm"
      ],
      "ans": 3,
      "solution": [
        "OA = OB = 18（半径），又弦 AB = 18，所以 OA = OB = AB，△OAB 是等边三角形。",
        "圆心角 ∠AOB = 60°。",
        "弧长 l = nπr/180 = 60 × π × 18 ÷ 180 = 6π（cm）。选 D。",
        "坑：把弦长 18 当弧长的一部分硬凑；或者圆心角写成 120°（那是把等边三角形外接圆的情形套上来了）。"
      ]
    },
    {
      "id": "c29q8",
      "no": "8",
      "group": "选择",
      "type": "choice",
      "score": 3,
      "diff": 3,
      "focus": "model",
      "kp": [
        "圆的基本性质",
        "垂径定理",
        "拱形建模"
      ],
      "formula": "① 弦 AB、拱高（吃水深度）CD、半径 r 的关系：r² = (r − CD)² + (½AB)²\n② 展开得 r = [CD² + (½AB)²] ÷ (2CD)\n③ 直径 = 2r，别把半径当直径",
      "ask": "南宋李皋发明了「桨轮船」，这种船是原始形态的轮船，是近代轮船航行模式之先导。如图，某桨轮船的轮子被水面截得的弦 AB 长 4 m，轮子的吃水深度 CD 为 1 m，则该桨轮船的轮子直径为（　）",
      "fig": {
        "w": 300,
        "h": 230,
        "need": 1,
        "svg": "<circle cx=\"150\" cy=\"100\" r=\"80\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M16 138L284 138\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.2\" stroke-linecap=\"round\" stroke-dasharray=\"6 4\"/><path d=\"M20 138L13 145M32 138L25 145M44 138L37 145M56 138L49 145M68 138L61 145M80 138L73 145M92 138L85 145M104 138L97 145M116 138L109 145M128 138L121 145M140 138L133 145M152 138L145 145M164 138L157 145M176 138L169 145M188 138L181 145M200 138L193 145M212 138L205 145M224 138L217 145M236 138L229 145M248 138L241 145M260 138L253 145M272 138L265 145\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"0.9\" stroke-linecap=\"round\"/><path d=\"M79.6 138L220.4 138M150 100L150 180\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><circle cx=\"150\" cy=\"100\" r=\"2.4\" fill=\"#1b2430\"/><text x=\"156\" y=\"94\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">O</tspan></text><text x=\"67.6\" y=\"134\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">A</tspan></text><text x=\"224.4\" y=\"134\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">B</tspan></text><text x=\"146\" y=\"130\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">D</tspan></text><text x=\"146\" y=\"198\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">C</tspan></text><text x=\"22\" y=\"130\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"12\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan>水面</tspan></text>"
      },
      "tip": "吃水深度就是弓形的「拱高」：r² = (r − 1)² + 2²。",
      "opts": [
        "5/2 m",
        "4 m",
        "5 m",
        "6 m"
      ],
      "ans": 2,
      "solution": [
        "设轮子半径为 r。水面截得的弦 AB = 4，半弦为 2；吃水深度 CD = 1 就是弦到弧顶的距离。",
        "圆心 O、弦中点 D、弧顶 C 共线，OD = r − 1。在 Rt△O D A 中：r² = (r − 1)² + 2²。",
        "展开：r² = r² − 2r + 1 + 4，得 2r = 5，r = 2.5。",
        "题目问直径：2r = 5 m，选 C。坑：算出 2.5 就直接选 A（那是半径，卷面故意放了 5/2 这个干扰项）。"
      ]
    },
    {
      "id": "c29q9",
      "no": "9",
      "group": "选择",
      "type": "choice",
      "score": 3,
      "diff": 3,
      "focus": "plan",
      "kp": [
        "圆的基本性质",
        "垂径定理",
        "弧、弦、圆心角"
      ],
      "formula": "① 等弦 ⟹ 等弧：AD = BC ⟹ 弧 AD = 弧 BC\n② 两弦相交成 90°：∠AEB = ½(弧 AB + 弧 CD) = 90°\n③ 弧 AB = 90° ⟹ 弦 AB = √2 r",
      "ask": "如图，半径为 4 的 ⊙O 的弦 AD = BC，AD ⊥ BC 于点 E，连接 AB，AC，则 AB 的长为（　）",
      "fig": {
        "w": 300,
        "h": 230,
        "need": 1,
        "svg": "<circle cx=\"150\" cy=\"112\" r=\"80\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M136.1 33.2L229.8 106.4M136.1 33.2L75.8 142M136.1 33.2L190 181.3M229.8 106.4L75.8 142M75.8 142L136.1 33.2\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><circle cx=\"150\" cy=\"112\" r=\"2.2\" fill=\"#1b2430\"/><text x=\"147\" y=\"130\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">O</tspan></text><text x=\"130.1\" y=\"25.2\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">A</tspan></text><text x=\"233.8\" y=\"112.4\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">B</tspan></text><text x=\"61.8\" y=\"146\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">C</tspan></text><text x=\"192\" y=\"197.3\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">D</tspan></text><text x=\"175.9\" y=\"136.7\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"14\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">E</tspan></text>"
      },
      "tip": "先把「等弦」翻成「等弧」，再用「两弦夹角 = 两弧和的一半」定出弧 AB。",
      "opts": [
        "4√2",
        "4",
        "2√2",
        "2"
      ],
      "ans": 0,
      "solution": [
        "AD = BC 是同圆中的等弦，所以它们所对的弧相等：弧 AD = 弧 BC。",
        "设弧 AB = x、弧 DC = z（这两段是弦 AD、BC 夹出来的两段弧）。等弧条件给出 x = z。",
        "弦 AD 与 BC 相交于 E 成 90°，由「两弦夹角 = 它所夹两段弧和的一半」：∠AEB = ½(弧 AB + 弧 DC) = ½(x + z) = x。",
        "所以 x = 90°，即弧 AB = 90°。弦 AB = 2r·sin45° = 2 × 4 × (√2/2) = 4√2。选 A。",
        "另一种算法：弧 AB = 90° ⟹ △OAB 是等腰直角三角形，AB = √2·OA = 4√2。"
      ]
    },
    {
      "id": "c29q10",
      "no": "10",
      "group": "选择",
      "type": "choice",
      "score": 3,
      "diff": 3,
      "focus": "trans",
      "kp": [
        "圆的基本性质",
        "直径所对的圆周角",
        "扇形面积"
      ],
      "formula": "① ∠ABC = 90° 且 A、B、C 在圆上 ⟹ AC 是直径\n② 扇形（半圆）面积 S = nπr²/360，n = 180° 时 S = ½πr²\n③ 直径 8 ⟹ r = 4",
      "ask": "从一块直径为 8 cm 的圆形玉料中刻出一个如图所示的扇形玉佩（A、B、C 在圆上，且 ∠ABC = 90°），则这个扇形玉佩的面积是（　）",
      "fig": {
        "w": 300,
        "h": 230,
        "need": 1,
        "svg": "<polygon points=\"68,118 68,118 68.1,113.7 68.4,109.4 69,105.2 69.8,101 70.8,96.8 72,92.7 73.4,88.6 75.1,84.6 76.9,80.8 79,77 81.2,73.3 83.7,69.8 86.3,66.4 89.1,63.1 92,60 95.1,57.1 98.4,54.3 101.8,51.7 105.3,49.2 109,47 112.8,44.9 116.6,43.1 120.6,41.4 124.7,40 128.8,38.8 133,37.8 137.2,37 141.4,36.4 145.7,36.1 150,36 154.3,36.1 158.6,36.4 162.8,37 167,37.8 171.2,38.8 175.3,40 179.4,41.4 183.4,43.1 187.2,44.9 191,47 194.7,49.2 198.2,51.7 201.6,54.3 204.9,57.1 208,60 210.9,63.1 213.7,66.4 216.3,69.8 218.8,73.3 221,77 223.1,80.8 224.9,84.6 226.6,88.6 228,92.7 229.2,96.8 230.2,101 231,105.2 231.6,109.4 231.9,113.7 232,118 232,118\" fill=\"#dfe6ee\" stroke=\"none\"/><circle cx=\"150\" cy=\"118\" r=\"82\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M68 118L150 36M150 36L232 118\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><path d=\"M68 118L232 118\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.1\" stroke-linecap=\"round\" stroke-dasharray=\"5 4\"/><text x=\"54\" y=\"123\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">A</tspan></text><text x=\"145\" y=\"28\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">B</tspan></text><text x=\"237\" y=\"123\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">C</tspan></text>"
      },
      "tip": "90° 的圆周角所对的弦是直径——先把 AC 认成直径，半径就有了。",
      "opts": [
        "4π cm²",
        "8π cm²",
        "16π cm²",
        "16√2π cm²"
      ],
      "ans": 1,
      "solution": [
        "A、B、C 三点在圆上，且 ∠ABC = 90°。90° 的圆周角所对的弦是直径，所以 AC 是玉料圆的直径，AC = 8，半径 r = 4。",
        "刻出的扇形就是由弧 AC 和半径 OA、OC 围成的那一块，圆心角 180°（半圆）。",
        "S = 180/360 × π × 4² = 8π（cm²）。选 B。",
        "坑：误以为扇形圆心是 B、半径是 BA = 4√2，虽然算出来也是 8π，但「扇形半径 5.66 的扇形」根本塞不进半径 4 的玉料里——几何上讲不通。"
      ]
    },
    {
      "id": "c29q11",
      "no": "11",
      "group": "填空",
      "type": "fill",
      "score": 3,
      "diff": 1,
      "focus": "trans",
      "kp": [
        "圆的基本性质",
        "圆周角定理"
      ],
      "formula": "同弧所对的圆周角等于圆心角的一半：∠ACB = ½∠AOB\n先确认两个角对着同一段弧 AB",
      "ask": "如图，A、B、C 三点在 ⊙O 上，且 ∠AOB = 50°，则 ∠C 的度数为______。",
      "fig": {
        "w": 300,
        "h": 230,
        "need": 1,
        "svg": "<circle cx=\"150\" cy=\"115\" r=\"82\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M150 115L82.8 162M150 115L217.2 162M207 56L82.8 162M207 56L217.2 162\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><circle cx=\"150\" cy=\"115\" r=\"2.4\" fill=\"#1b2430\"/><text x=\"144\" y=\"121\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">O</tspan></text><text x=\"74.8\" y=\"178\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">A</tspan></text><text x=\"219.2\" y=\"178\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">B</tspan></text><text x=\"209\" y=\"50\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">C</tspan></text>"
      },
      "tip": "∠C 与 ∠AOB 都对着弧 AB，直接除 2。",
      "fields": [
        {
          "type": "num",
          "label": "∠C =",
          "ans": 25,
          "unit": "°"
        }
      ],
      "solution": [
        "∠AOB 是弧 AB 所对的圆心角，∠ACB（即 ∠C）是同一段弧所对的圆周角。",
        "由圆周角定理：∠C = ½∠AOB = ½ × 50° = 25°。",
        "坑：把 50° 直接填上去，或者乘 2 得 100°——只有「已知圆周角求圆心角」才乘 2。"
      ]
    },
    {
      "id": "c29q12",
      "no": "12",
      "group": "填空",
      "type": "fill",
      "score": 3,
      "diff": 3,
      "focus": "plan",
      "kp": [
        "圆的基本性质",
        "圆内接四边形",
        "直径所对的圆周角"
      ],
      "formula": "① 圆内接四边形对角互补：∠ABC = 180° − ∠ADC\n② AB 是直径 ⟹ ∠ACB = 90°\n③ Rt△ABC 中 sin∠ABC = AC/AB ⟹ AB = AC ÷ sin∠ABC",
      "ask": "如图，四边形 ABCD 内接于 ⊙O，且 AB 为直径，∠ADC = 120°，若 AC = 3，则 ⊙O 的直径为______。",
      "fig": {
        "w": 300,
        "h": 230,
        "need": 1,
        "svg": "<circle cx=\"150\" cy=\"115\" r=\"82\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M68 115L232 115M89.1 60.1L172.6 36.2M172.6 36.2L68 115\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><circle cx=\"150\" cy=\"115\" r=\"2.2\" fill=\"#1b2430\"/><text x=\"146\" y=\"109\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">O</tspan></text><text x=\"54\" y=\"120\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">A</tspan></text><text x=\"237\" y=\"120\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">B</tspan></text><text x=\"176.6\" y=\"30.2\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">C</tspan></text><text x=\"75.1\" y=\"58.1\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">D</tspan></text>"
      },
      "tip": "120° 的对角是 60°，再让 AB 当斜边。",
      "fields": [
        {
          "type": "choice",
          "label": "直径 AB =",
          "options": [
            "2√3",
            "3√3",
            "4",
            "2√2"
          ],
          "ans": 0
        }
      ],
      "solution": [
        "四边形 ABCD 内接于 ⊙O，对角互补：∠ABC = 180° − ∠ADC = 180° − 120° = 60°。",
        "AB 是直径，所以 ∠ACB = 90°，△ABC 是直角三角形。",
        "在 Rt△ABC 中，sin∠ABC = AC/AB，即 sin60° = 3/AB，AB = 3 ÷ (√3/2) = 2√3。",
        "所以直径是 2√3（半径 √3）。含根号的答案，卷面用四选一给分。"
      ]
    },
    {
      "id": "c29q13",
      "no": "13",
      "group": "填空",
      "type": "fill",
      "score": 3,
      "diff": 2,
      "focus": "model",
      "kp": [
        "圆的基本性质",
        "圆锥的侧面积"
      ],
      "formula": "① 侧面展开图是扇形：扇形半径 = 母线 l，弧长 = 底面周长 2πr\n② 侧面积 S侧 = ½ × 2πr × l = πrl\n③ S全 = πr(l + r)",
      "ask": "已知圆锥的底面半径为 10，母线长为 30，则圆锥的侧面积是______。",
      "tip": "公式只有一条：S侧 = πrl，l 是母线不是高。",
      "fields": [
        {
          "type": "choice",
          "label": "侧面积 =",
          "options": [
            "300π",
            "150π",
            "600π",
            "300"
          ],
          "ans": 0
        }
      ],
      "solution": [
        "圆锥侧面展开后是一个扇形：扇形半径等于母线 l = 30，扇形弧长等于底面周长 2πr = 20π。",
        "S侧 = ½ × 弧长 × 扇形半径 = ½ × 20π × 30 = 300π。",
        "也可以直接用 S侧 = πrl = π × 10 × 30 = 300π。",
        "坑：把母线 30 当成高去算 πr²；或者算成全面积 300π + 100π = 400π。"
      ]
    },
    {
      "id": "c29q14",
      "no": "14",
      "group": "填空",
      "type": "fill",
      "score": 3,
      "diff": 3,
      "focus": "plan",
      "kp": [
        "圆的基本性质",
        "扇形面积",
        "弓形面积"
      ],
      "formula": "① 直径所对的圆周角为 90°，等边三角形每个角 60° ⟹ △ADE 也是等边三角形\n② 弓形面积 = 扇形面积 − 三角形面积\n③ S扇 = nπr²/360，S△ = ½absinC",
      "ask": "如图，等边 △ABC 的边长为 4，以 AB 边为直径作半圆，分别与 AC、BC 相交于点 D、E，则阴影部分的面积为______。",
      "fig": {
        "w": 280,
        "h": 220,
        "need": 1,
        "svg": "<polygon points=\"92.5,130 93.9,129.3 95.3,128.5 96.7,127.8 98.1,127.1 99.5,126.5 101,125.9 102.4,125.3 103.9,124.7 105.3,124.2 106.8,123.7 108.3,123.2 109.8,122.8 111.4,122.4 112.9,122 114.4,121.6 116,121.3 117.5,121 119.1,120.8 120.6,120.6 122.2,120.4 123.7,120.3 125.3,120.1 126.9,120.1 128.4,120 130,120 131.6,120 133.1,120.1 134.7,120.1 136.3,120.3 137.8,120.4 139.4,120.6 140.9,120.8 142.5,121 144,121.3 145.6,121.6 147.1,122 148.6,122.4 150.2,122.8 151.7,123.2 153.2,123.7 154.7,124.2 156.1,124.7 157.6,125.3 159,125.9 160.5,126.5 161.9,127.1 163.3,127.8 164.7,128.5 166.1,129.3 167.5,130 167.5,130 92.5,130\" fill=\"#dfe6ee\" stroke=\"none\"/><path d=\"M55 195L205 195M205 195L130 65M130 65L55 195\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><polyline points=\"55,195 55.2,189.1 55.9,183.3 57.1,177.5 58.7,171.8 60.7,166.3 63.2,161 66.1,155.8 69.3,150.9 73,146.3 77,142 81.3,138 85.9,134.3 90.8,131.1 96,128.2 101.3,125.7 106.8,123.7 112.5,122.1 118.3,120.9 124.1,120.2 130,120 135.9,120.2 141.7,120.9 147.5,122.1 153.2,123.7 158.7,125.7 164,128.2 169.2,131.1 174.1,134.3 178.7,138 183,142 187,146.3 190.7,150.9 193.9,155.8 196.8,161 199.3,166.3 201.3,171.8 202.9,177.5 204.1,183.3 204.8,189.1 205,195\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/><path d=\"M92.5 130L167.5 130\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.1\" stroke-linecap=\"round\"/><circle cx=\"130\" cy=\"195\" r=\"2.2\" fill=\"#1b2430\"/><text x=\"126\" y=\"212\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">O</tspan></text><text x=\"126\" y=\"57\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">C</tspan></text><text x=\"41\" y=\"200\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">A</tspan></text><text x=\"211\" y=\"200\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">B</tspan></text><text x=\"78.5\" y=\"132\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">D</tspan></text><text x=\"173.5\" y=\"132\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">E</tspan></text>"
      },
      "tip": "阴影是「弧 DE + 弦 DE」围成的弓形：扇形 ODE 减 △ODE。",
      "fields": [
        {
          "type": "choice",
          "label": "阴影面积 =",
          "options": [
            "2π/3 − √3",
            "2π/3 + √3",
            "4π/3 − √3",
            "π/3 − √3"
          ],
          "ans": 0
        }
      ],
      "solution": [
        "AB 是半圆的直径，D 在半圆上，所以 ∠ADB = 90°。而 ∠A = 60°，于是 ∠ABD = 30°，∠DBO = 30°（O 为 AB 中点）。",
        "设半圆圆心为 O（半径 2）。由 OB = OD 得 ∠ODB = ∠OBD = 30°，所以 ∠DOB = 120°，同理 ∠EOA = 120°。于是 ∠DOE = 180° − 120° = 60°（D、O、E 之间这段圆心角）。",
        "阴影部分 = 扇形 ODE − △ODE。S扇 = 60π × 2²/360 = 2π/3；△ODE 是边长 2 的等边三角形，S△ = (√3/4) × 2² = √3。",
        "所以阴影面积 = 2π/3 − √3。",
        "坑：把阴影当成整个半圆减三角形；或者把圆心角当成 120°（那会把 △ODE 换成需要用到弓形另一侧的图形）。"
      ]
    },
    {
      "id": "c29q15",
      "no": "15",
      "group": "填空",
      "type": "fill",
      "score": 3,
      "diff": 3,
      "focus": "model",
      "kp": [
        "圆的基本性质",
        "垂径定理",
        "拱形建模"
      ],
      "formula": "① 弦 AB、弦中点 D、圆心 O、弧顶 C 共线（垂径定理的推论）\n② 设半径 R：R² = (½AB)² + (R − CD)²\n③ 本题 R² = 0.9² + (R − 2.7)² ⟹ R = 1.5",
      "ask": "在某古典园林的景观设计中，园林计划建造一座「月亮门」，其门洞形状是圆形的一部分（如图所示）。在圆形月亮门洞的截面中，AB 表示门洞下的宽度，D 为弦 AB 的中点，DC 经过圆心 O 并延伸至门洞顶部最高点 C。已知 AB = 1.8 m，点 C 到点 D 的距离 CD = 2.7 m，则该圆形门洞的半径为______m。",
      "fig": {
        "w": 300,
        "h": 230,
        "need": 1,
        "svg": "<circle cx=\"150\" cy=\"112\" r=\"88\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M96.7 182L203.3 182\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><path d=\"M150 24L150 182\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.1\" stroke-linecap=\"round\" stroke-dasharray=\"5 4\"/><circle cx=\"150\" cy=\"112\" r=\"2.4\" fill=\"#1b2430\"/><text x=\"156\" y=\"108\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">O</tspan></text><text x=\"146\" y=\"16\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">C</tspan></text><text x=\"146\" y=\"200\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">D</tspan></text><text x=\"82.7\" y=\"187\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">A</tspan></text><text x=\"209.3\" y=\"187\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">B</tspan></text>"
      },
      "tip": "DC 过圆心且过弦中点 ⟹ DC ⊥ AB，勾股列方程。",
      "fields": [
        {
          "type": "num",
          "label": "半径 R =",
          "ans": 1.5,
          "unit": "m"
        }
      ],
      "solution": [
        "D 是弦 AB 的中点，DC 过圆心 O，由垂径定理的推论，OC ⊥ AB，且 OD = |R − CD| = |R − 2.7|。",
        "连 OA。在 Rt△OAD 中：OA² = OD² + AD²，即 R² = (R − 2.7)² + 0.9²。",
        "展开：R² = R² − 5.4R + 7.29 + 0.81，5.4R = 8.1，R = 1.5。",
        "所以半径 1.5 m（门洞高度 2.7 m 大于半径 1.5 m，说明这个门洞是「超过半圆」的优弧段，图形上也能看出来）。",
        "坑：把 CD = 2.7 直接当半径；或者把 CD 当直径得 1.35（那样 AB 就成了完全用不上的条件）。"
      ]
    },
    {
      "id": "c29q16",
      "no": "16",
      "group": "解答",
      "type": "solve",
      "score": 7,
      "diff": 2,
      "focus": "plan",
      "selfCheck": true,
      "kp": [
        "圆的基本性质",
        "垂径定理",
        "同心圆"
      ],
      "formula": "① 过圆心作弦的垂线 ⟹ 平分这条弦（大圆、小圆各用一次）\n② AC = AM − CM，BD = MB − MD，两式相减即得\n③ 同圆（同心圆也各自成立）里「垂直于弦的直径平分弦」是通用工具",
      "ask": "如图，两个圆都以点 O 为圆心，大圆的弦 AB 交小圆于 C、D 两点。求证：AC = BD。",
      "fig": {
        "w": 300,
        "h": 230,
        "need": 1,
        "svg": "<circle cx=\"150\" cy=\"112\" r=\"88\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><circle cx=\"150\" cy=\"112\" r=\"50\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M72.7 154L227.3 154\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><circle cx=\"150\" cy=\"112\" r=\"2.4\" fill=\"#1b2430\"/><text x=\"155\" y=\"107\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">O</tspan></text><text x=\"58.7\" y=\"159\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">A</tspan></text><text x=\"233.3\" y=\"159\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">B</tspan></text><text x=\"116.9\" y=\"172\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">C</tspan></text><text x=\"173.1\" y=\"172\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">D</tspan></text>"
      },
      "tip": "作 OM ⊥ AB：一次垂径定理管大圆，一次管小圆。",
      "solution": [
        "过 O 作 OM ⊥ AB，垂足为 M。",
        "在大圆中：OM ⊥ AB 且 OM 过圆心，由垂径定理，M 是 AB 的中点，即 AM = MB。",
        "在小圆中：C、D 是小圆上的点，OM ⊥ CD 且 OM 过圆心，同样由垂径定理，M 是 CD 的中点，即 CM = MD。",
        "两式相减：AM − CM = MB − MD，即 AC = BD。",
        "要点：这类「同心圆被一条直线截出四条线段」的题，辅助线永远是「过圆心作垂线」，一次辅助线同时服务两个圆。"
      ]
    },
    {
      "id": "c29q17",
      "no": "17",
      "group": "解答",
      "type": "solve",
      "score": 7,
      "diff": 2,
      "focus": "plan",
      "selfCheck": true,
      "kp": [
        "圆的基本性质",
        "弧、弦、圆心角",
        "全等三角形"
      ],
      "formula": "① 等弧 ⟹ 等弦：⌒AB = ⌒CD ⟹ AB = CD\n② 等弧所对的圆周角相等\n③ 全等判定：ASA / AAS，注意找「公共边 BC」",
      "ask": "如图，A、B、C、D 是 ⊙O 上的四点，且 ⌒AB = ⌒CD。求证：△ABC ≌ △DCB。",
      "fig": {
        "w": 300,
        "h": 230,
        "need": 1,
        "svg": "<circle cx=\"150\" cy=\"112\" r=\"82\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M135.8 31.2L70.8 133.2M70.8 133.2L175.3 190M175.3 190L230.2 95M230.2 95L135.8 31.2M135.8 31.2L175.3 190M70.8 133.2L230.2 95\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><circle cx=\"150\" cy=\"112\" r=\"2.2\" fill=\"#1b2430\"/><text x=\"146\" y=\"130\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">O</tspan></text><text x=\"129.8\" y=\"23.2\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">A</tspan></text><text x=\"54.8\" y=\"135.2\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">B</tspan></text><text x=\"177.3\" y=\"206\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">C</tspan></text><text x=\"236.2\" y=\"93\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">D</tspan></text>"
      },
      "tip": "两个三角形共用 BC；再用等弧把两组角凑齐。",
      "solution": [
        "由 ⌒AB = ⌒CD 得 AB = CD（同圆中等弧对等弦）。",
        "∠ABC 对着弧 ADC（= 弧 AD + 弧 DC），∠DCB 对着弧 DAB（= 弧 DA + 弧 AB）。因为弧 AB = 弧 DC，所以 ∠ABC = ∠DCB。",
        "∠ACB 对着弧 AB，∠DBC 对着弧 DC。因为弧 AB = 弧 DC，所以 ∠ACB = ∠DBC。",
        "在 △ABC 和 △DCB 中：∠ABC = ∠DCB，BC = CB（公共边），∠ACB = ∠DBC，所以 △ABC ≌ △DCB（ASA）。",
        "要点：全等题的顺序是「先找公共边 / 公共角，再用已知条件补两角」；等弧在这里的作用就是把角搬过去。"
      ]
    },
    {
      "id": "c29q18",
      "no": "18",
      "group": "解答",
      "type": "solve",
      "score": 10,
      "diff": 3,
      "focus": "model",
      "kp": [
        "圆的基本性质",
        "垂径定理",
        "拱形建模"
      ],
      "formula": "① 弦心距 d = √(R² − (½AB)²)\n② 最大高度 CD = R + d（圆心在路面之上时是 R + d，在路面之下时是 R − d）\n③ 本题 R = 6、½AB = √35 ⟹ d = 1，CD = 7",
      "ask": "天山胜利隧道是世界最长的高速公路隧道，2025 年 12 月 26 日正式通车，标志着 G0711 乌鲁木齐至尉犁高速公路全线投入使用，这是天山南北交通的一个历史性突破。如图所示，隧道主洞断面可以抽象成直径为 12 m 的 ⊙O 的一部分，路面最大宽度 AB 约为 2√35 m，求隧道主洞断面的最大高度 CD。",
      "tip": "先求圆心到路面的距离，再加上半径。",
      "steps": [
        {
          "pt": 5,
          "type": "num",
          "label": "圆心 O 到路面 AB 的距离 OD =",
          "ans": 1,
          "unit": "m"
        },
        {
          "pt": 5,
          "type": "num",
          "label": "断面最大高度 CD =",
          "ans": 7,
          "unit": "m"
        }
      ],
      "solution": [
        "直径 12 m ⟹ 半径 R = 6 m。路面 AB 是圆的一条弦，D 为其中点，OD ⊥ AB。",
        "AD = ½AB = √35。在 Rt△OAD 中：OD = √(R² − AD²) = √(36 − 35) = 1（m）。",
        "断面最大高度是弧顶到路面的距离，即 CD = CO + OD = R + OD = 6 + 1 = 7（m）。",
        "所以隧道主洞断面的最大高度为 7 m。",
        "坑：把 OD = 1 当成高度（那是圆心到路面的距离，还差一个半径）。"
      ]
    },
    {
      "id": "c29q19",
      "no": "19",
      "group": "解答",
      "type": "solve",
      "score": 9,
      "diff": 3,
      "focus": "plan",
      "kp": [
        "圆的基本性质",
        "圆内接四边形",
        "圆周角定理"
      ],
      "formula": "① 圆内接四边形的外角等于它的内对角：∠EAD = ∠BCD\n② 同弧所对的圆周角相等：∠BAC = ∠BDC\n③ 等弦对等角：BD = BC ⟹ ∠BCD = ∠BDC\n④ 圆外一点引两条割线：∠E = ½(弧 BC − 弧 AD)",
      "ask": "如图，四边形 ABCD 为 ⊙O 的内接四边形，BD = BC，BA、CD 的延长线交于点 E。\n(1) 求证：∠EAD = ∠BAC；\n(2) 若 ∠ACB = 32°，则 ∠E 的度数为______。",
      "fig": {
        "w": 300,
        "h": 270,
        "need": 1,
        "svg": "<circle cx=\"150\" cy=\"170\" r=\"72\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M88.9 208.2L150.3 19.4M194.3 226.7L150.3 19.4\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.1\" stroke-linecap=\"round\" stroke-dasharray=\"5 4\"/><path d=\"M123 103.2L88.9 208.2M88.9 208.2L194.3 226.7M194.3 226.7L167.4 100.1M167.4 100.1L123 103.2M123 103.2L194.3 226.7M88.9 208.2L167.4 100.1\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><circle cx=\"150\" cy=\"170\" r=\"2.2\" fill=\"#1b2430\"/><text x=\"146\" y=\"188\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">O</tspan></text><text x=\"146.3\" y=\"11.4\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">E</tspan></text><text x=\"109\" y=\"101.2\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">A</tspan></text><text x=\"70.9\" y=\"214.2\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">B</tspan></text><text x=\"198.3\" y=\"238.7\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">C</tspan></text><text x=\"173.4\" y=\"96.1\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">D</tspan></text>"
      },
      "tip": "(1) 把 ∠EAD 换成内对角 ∠BCD，再用 BD = BC 转一次；(2) 用割线夹角公式最快。",
      "steps": [
        {
          "pt": 4,
          "type": "choice",
          "label": "(1) ∠EAD 等于哪个角（圆内接四边形外角 = 内对角）",
          "options": [
            "∠BCD",
            "∠ABC",
            "∠BDC",
            "∠BAD"
          ],
          "ans": 0
        },
        {
          "pt": 5,
          "type": "num",
          "label": "(2) ∠E =",
          "ans": 32,
          "unit": "°"
        }
      ],
      "solution": [
        "(1) E 在 BA 的延长线上，∠EAD 是圆内接四边形 ABCD 在顶点 A 处的外角，由「外角等于内对角」得 ∠EAD = ∠BCD。",
        "(1) 又 BD = BC，等弦对等角，∠BCD = ∠BDC；而 ∠BDC 与 ∠BAC 对着同一段弧 BC，所以 ∠BDC = ∠BAC。三式串起来：∠EAD = ∠BCD = ∠BDC = ∠BAC。",
        "(2) ∠ACB = 32° 对着弧 AB，所以弧 AB = 64°。设弧 BC = 弧 BD = t（BD = BC 给出等弧）。",
        "(2) 由 BD = BC 得 t = 弧 BA + 弧 AD = 64° + 弧 AD（D 在弧 AB 与 C 之间这一侧的另一点，短弧 BD 要经过 A）。",
        "(2) 圆外一点 E 引两条割线 E-A-B、E-D-C，∠E = ½(弧 BC − 弧 AD) = ½ × 64° = 32°。",
        "结论：∠E = 32°。另法：∠EAD = ∠BAC = ½弧 BC，∠EDA = 180° − ∠ADC = ∠ABC = ½(弧 AD + 弧 DC)，代入 △EAD 的内角和一样得 32°。"
      ]
    },
    {
      "id": "c29q20",
      "no": "20",
      "group": "解答",
      "type": "solve",
      "score": 9,
      "diff": 3,
      "focus": "plan",
      "selfCheck": true,
      "kp": [
        "圆的基本性质",
        "尺规作图",
        "垂径定理"
      ],
      "formula": "① 弧的中点 + 圆心 ⟹ 该点与圆心的连线垂直平分弦\n② 到两边距离相等的点在角平分线上\n③ 到两点距离相等的点在垂直平分线上；圆心 = 两条轨迹的交点",
      "ask": "(1) 如图 1，△ABC 内接于 ⊙O，D 是弧 BC 的中点，请用无刻度的直尺作 △ABC 的中线 AE。\n(2) 如图 2，已知 △ABC，请用无刻度的直尺和圆规作 ⊙P，使圆心 P 到 AB、AC 边的距离相等，且 ⊙P 经过 A、B 两点。（不写作法，保留作图痕迹，标上相应字母）",
      "fig": {
        "w": 320,
        "h": 210,
        "need": 1,
        "svg": "<circle cx=\"78\" cy=\"100\" r=\"60\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M71.7 40.3L27.1 131.8\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><path d=\"M27.1 131.8L128.9 131.8\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><path d=\"M128.9 131.8L71.7 40.3\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><path d=\"M71.7 40.3L78 160\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><circle cx=\"78\" cy=\"100\" r=\"2.2\" fill=\"#e37400\"/><text x=\"83\" y=\"96\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"14\" fill=\"#1b2430\">O</text><text x=\"67.7\" y=\"32.3\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"14\" font-style=\"italic\" fill=\"#1b2430\">A</text><text x=\"13.1\" y=\"135.8\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"14\" font-style=\"italic\" fill=\"#1b2430\">B</text><text x=\"132.9\" y=\"139.8\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"14\" font-style=\"italic\" fill=\"#1b2430\">C</text><text x=\"74\" y=\"176\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"14\" font-style=\"italic\" fill=\"#1b2430\">D</text><text x=\"66\" y=\"192\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"12\" fill=\"#6b7684\">图 1</text><path d=\"M185 150L285 150L245 82Z\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><text x=\"171\" y=\"154\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"14\" font-style=\"italic\" fill=\"#1b2430\">A</text><text x=\"289\" y=\"154\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"14\" font-style=\"italic\" fill=\"#1b2430\">B</text><text x=\"247\" y=\"74\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"14\" font-style=\"italic\" fill=\"#1b2430\">C</text><text x=\"222\" y=\"192\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"12\" fill=\"#6b7684\">图 2</text>"
      },
      "tip": "(1) D 与 O 的连线就是 BC 的垂直平分线；(2) 角平分线 ∩ AB 的垂直平分线 = P。",
      "solution": [
        "(1) 作直线 DO，交 BC 于点 E，连接 AE，AE 就是所求的中线。",
        "(1) 理由：D 是弧 BC 的中点，由垂径定理的推论，过圆心 O 与弧中点的直线垂直平分弦 BC，所以 E 是 BC 的中点，AE 是中线。",
        "(2) ① 作 ∠BAC 的平分线（尺规：以 A 为圆心画弧交 AB、AC，再以两交点为圆心等半径画弧，交点与 A 连线）；",
        "(2) ② 作 AB 的垂直平分线（分别以 A、B 为圆心、大于 ½AB 为半径画弧，两交点连线）；",
        "(2) ③ 两线交点即为 P，以 P 为圆心、PA 为半径画圆，⊙P 即为所求。",
        "(2) 理由：P 在角平分线上 ⟹ P 到 AB、AC 距离相等；P 在 AB 的垂直平分线上 ⟹ PA = PB ⟹ ⊙P 过 A、B 两点。",
        "要点：作图题的两个条件各对应一条「轨迹」（角平分线、垂直平分线），交点就是圆心；答题时把这两条轨迹写出来，得分点就齐了。"
      ]
    },
    {
      "id": "c29q21",
      "no": "21",
      "group": "解答",
      "type": "solve",
      "score": 9,
      "diff": 3,
      "focus": "plan",
      "kp": [
        "圆的基本性质",
        "垂径定理",
        "弧、弦、圆心角"
      ],
      "formula": "① 直径垂直于弦 ⟹ 平分弦、平分弦所对的弧\n② 等弧对等弦 ⟹ AC = AD，△ACD 是等腰三角形\n③ 方程：R² = (AE − R)² + (½CD)²",
      "ask": "如图，在 ⊙O 中，AB 是直径，CD 是弦，AB ⊥ CD 于点 E，连接 AC，AD。\n(1) 求证：∠ACD = ∠ADC；\n(2) 当 AE = 9，CD = 6 时，求 ⊙O 的半径。",
      "fig": {
        "w": 300,
        "h": 230,
        "need": 1,
        "svg": "<circle cx=\"145\" cy=\"110\" r=\"82\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M145 28L145 192M70.4 144L219.6 144M145 28L70.4 144M145 28L219.6 144\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><circle cx=\"145\" cy=\"110\" r=\"2.4\" fill=\"#1b2430\"/><text x=\"150\" y=\"105\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">O</tspan></text><text x=\"141\" y=\"22\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">A</tspan></text><text x=\"141\" y=\"208\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">B</tspan></text><text x=\"56.4\" y=\"149\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">C</tspan></text><text x=\"225.6\" y=\"149\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">D</tspan></text><text x=\"151\" y=\"160\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"14\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">E</tspan></text>"
      },
      "tip": "(1) 先证弧 AC = 弧 AD；(2) 设半径 R，把 OE 写成 9 − R。",
      "steps": [
        {
          "pt": 4,
          "type": "choice",
          "label": "(1) AB ⊥ CD 且 AB 过圆心，直接得到",
          "options": [
            "弧 AC = 弧 AD，所以 AC = AD",
            "弧 AC = 弧 BC",
            "CD = AB",
            "∠ACD = 90°"
          ],
          "ans": 0
        },
        {
          "pt": 5,
          "type": "num",
          "label": "(2) ⊙O 的半径 R =",
          "ans": 5
        }
      ],
      "solution": [
        "(1) AB 是直径且 AB ⊥ CD，由垂径定理，AB 平分弦 CD，也平分 CD 所对的弧，即弧 AC = 弧 AD。",
        "(1) 等弧对等弦，所以 AC = AD，△ACD 是等腰三角形，底角相等：∠ACD = ∠ADC。",
        "(2) 设半径为 R，则 CE = ½CD = 3，OE = AE − AO = 9 − R。",
        "(2) 在 Rt△OEC 中：OC² = OE² + CE²，即 R² = (9 − R)² + 9。",
        "(2) 展开：R² = 81 − 18R + R² + 9，18R = 90，R = 5。",
        "校验：R = 5 时 OE = 4，CE = 3，4² + 3² = 5² ✓。"
      ]
    },
    {
      "id": "c29q22",
      "no": "22",
      "group": "解答",
      "type": "solve",
      "score": 12,
      "diff": 3,
      "focus": "plan",
      "kp": [
        "圆的基本性质",
        "圆周角定理",
        "平行线",
        "弓形面积"
      ],
      "formula": "① 平行线 + 半径 ⟹ 内错角相等，等腰三角形顶角可求\n② 圆周角 30° ⟹ 所对弧 60°\n③ 弓形面积 = 扇形 − 等腰三角形 = nπR²/360 − ½R²sin n",
      "ask": "如图，已知 AB 是 ⊙O 直径，且 AB = 8，C、D 是 ⊙O 上的点，OC ∥ BD，OC 交 AD 于点 E，连接 BC，∠CBD = 30°。\n(1) 求 ∠COA 的度数；\n(2) 求图中弧 BD 与弦 BD 围成的阴影部分的面积（结果保留 π）。",
      "fig": {
        "w": 300,
        "h": 240,
        "need": 1,
        "svg": "<polygon points=\"108,45.3 106.1,46.4 104.3,47.6 102.4,48.8 100.6,50 98.9,51.4 97.1,52.7 95.4,54.1 93.8,55.6 92.2,57.1 90.6,58.6 89.1,60.2 87.6,61.8 86.1,63.4 84.7,65.1 83.4,66.9 82,68.6 80.8,70.4 79.6,72.3 78.4,74.1 77.3,76 76.2,77.9 75.2,79.9 74.2,81.8 73.3,83.8 72.4,85.9 71.6,87.9 70.8,90 70.1,92 69.5,94.1 68.9,96.3 68.3,98.4 67.8,100.5 67.4,102.7 67,104.9 66.7,107 66.5,109.2 66.3,111.4 66.1,113.6 66,115.8 66,118 108,45.3 234,118\" fill=\"#dfe6ee\" stroke=\"none\"/><circle cx=\"150\" cy=\"118\" r=\"84\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M66 118L234 118M234 118L192 45.3M66 118L108 45.3M150 118L192 45.3M234 118L108 45.3\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><circle cx=\"150\" cy=\"118\" r=\"2.4\" fill=\"#1b2430\"/><text x=\"144\" y=\"136\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"15\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">O</tspan></text><text x=\"52\" y=\"123\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">A</tspan></text><text x=\"240\" y=\"123\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">B</tspan></text><text x=\"188\" y=\"37.3\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">C</tspan></text><text x=\"112\" y=\"39.3\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"16\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">D</tspan></text><text x=\"94\" y=\"116\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"14\" fill=\"#1b2430\" text-anchor=\"middle\"><tspan font-style=\"italic\">E</tspan></text>"
      },
      "tip": "先把 30° 顺着「平行 → 内错角 → 等腰」搬到 △OBC 里，定出 C 的位置。",
      "steps": [
        {
          "pt": 5,
          "type": "num",
          "label": "(1) ∠COA =",
          "ans": 60,
          "unit": "°"
        },
        {
          "pt": 7,
          "type": "choice",
          "label": "(2) 阴影部分面积 =",
          "options": [
            "8π/3 − 4√3",
            "8π/3 − 8√3",
            "16π/3 − 4√3",
            "4π/3 − 2√3"
          ],
          "ans": 0
        }
      ],
      "solution": [
        "(1) OC ∥ BD，BC 是截线，内错角相等：∠BCO = ∠CBD = 30°。",
        "(1) OB = OC（半径），所以 ∠OBC = ∠BCO = 30°，△OBC 中 ∠BOC = 180° − 30° − 30° = 120°。",
        "(1) ∠CBD = 30° 是圆周角，对着弧 CD，所以弧 CD = 60°。于是弧 BC = 120°，D 在 C 的另一侧距 60°，弧 BD = 120° − 60° = 60°。",
        "(1) AB 是直径，∠AOB = 180°；∠AOC = 180° − ∠BOC = 180° − 120° = 60°，即 ∠COA = 60°。",
        "(2) 阴影是弧 BD 与弦 BD 围成的弓形，圆心角 ∠BOD = 弧 BD = 60°，R = 4。",
        "(2) S扇 = 60π × 4²/360 = 8π/3；△OBD 是等边三角形（OB = OD = 4，夹角 60°），S△ = (√3/4) × 16 = 4√3。",
        "(2) 阴影面积 = 8π/3 − 4√3。",
        "坑：把阴影当成扇形（漏减三角形）；或者误以为 BD 是直径去算半圆。"
      ]
    },
    {
      "id": "c29q23",
      "no": "23",
      "group": "解答",
      "type": "solve",
      "score": 12,
      "diff": 3,
      "focus": "plan",
      "kp": [
        "圆的基本性质",
        "圆锥的侧面积",
        "侧面展开图"
      ],
      "formula": "① 底面周长 = 展开扇形的弧长：2πr = nπl/180\n② 圆心角 n = 360r/l（即 n/360 = r/l）\n③ 表面上两点间最短路径：把侧面展开成扇形，用「两点之间线段最短」",
      "ask": "综合与实践：如图 1，有一个圆锥草帽，其底面半径为 r。当把这个圆锥草帽的侧面展开后，会得到一个半径为 l、圆心角为 120° 的扇形。\n(1) 探索尝试：圆锥草帽底面周长与其侧面展开图的弧长______（填「相等」或「不相等」）；若 r = 2，则 l = ______；\n(2) 问题抽象：图 2 中，对于任意一个圆锥体，其底面半径为 r，侧面展开图会得到一个半径为 l、圆心角为 n° 的扇形，请用含 r、l 的式子表示 n；\n(3) 拓展延伸：图 3 是一种纸质圆锥形草帽，AB = 6 cm，l = 6 cm，C 是线段 PB 的中点。如果计划要从点 A 到点 C 再到点 A 之间拉一条装饰彩带，需提前备好一根长度为 13 cm 的装饰彩带，请问该彩带的长度是否够长，并说明理由。",
      "fig": {
        "w": 330,
        "h": 180,
        "need": 1,
        "svg": "<path d=\"M58 34L20 120M58 34L96 120\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><ellipse cx=\"58\" cy=\"120\" rx=\"38\" ry=\"10\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><text x=\"62\" y=\"30\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"13\" fill=\"#1b2430\">P</text><text x=\"64\" y=\"126\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"13\" font-style=\"italic\" fill=\"#1b2430\">r</text><text x=\"30\" y=\"164\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"12\" fill=\"#6b7684\">图 1</text><path d=\"M185 34L152.2 124.2\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><path d=\"M185 34L217.8 124.2\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><polyline points=\"152.2,124.2 153.7,124.8 155.3,125.3 156.9,125.8 158.5,126.3 160.2,126.7 161.8,127.1 163.4,127.5 165,127.9 166.7,128.2 168.3,128.5 170,128.8 171.6,129.1 173.3,129.3 175,129.5 176.6,129.6 178.3,129.8 180,129.9 181.6,129.9 183.3,130 185,130 186.7,130 188.4,129.9 190,129.9 191.7,129.8 193.4,129.6 195,129.5 196.7,129.3 198.4,129.1 200,128.8 201.7,128.5 203.3,128.2 205,127.9 206.6,127.5 208.2,127.1 209.8,126.7 211.5,126.3 213.1,125.8 214.7,125.3 216.3,124.8 217.8,124.2\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><text x=\"181\" y=\"28\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"13\" fill=\"#1b2430\">P</text><text x=\"145\" y=\"96\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"13\" font-style=\"italic\" fill=\"#1b2430\">l</text><text x=\"199\" y=\"90\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"12\" fill=\"#1b2430\">n°</text><text x=\"173\" y=\"164\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"12\" fill=\"#6b7684\">图 2</text><path d=\"M272 34L238 118M272 34L306 118\" stroke=\"#1b2430\" stroke-width=\"1.5\" fill=\"none\"/><ellipse cx=\"272\" cy=\"118\" rx=\"34\" ry=\"9\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><path d=\"M238 118L289 76L238 118\" stroke=\"#c0392b\" stroke-width=\"1.2\" fill=\"none\" stroke-dasharray=\"4 3\"/><text x=\"224\" y=\"126\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"13\" font-style=\"italic\" fill=\"#1b2430\">A</text><text x=\"309\" y=\"126\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"13\" font-style=\"italic\" fill=\"#1b2430\">B</text><text x=\"294\" y=\"73\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"13\" font-style=\"italic\" fill=\"#1b2430\">C</text><text x=\"276\" y=\"30\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"13\" fill=\"#1b2430\">P</text><text x=\"258\" y=\"164\" font-family=\"'Times New Roman', 'Songti SC', 'SimSun', Georgia, serif\" font-size=\"12\" fill=\"#6b7684\">图 3</text>"
      },
      "tip": "(1)(2) 只有一条关系：弧长 = 底面周长；(3) 展开成扇形算两段线段和最短路。",
      "steps": [
        {
          "pt": 4,
          "type": "choice",
          "label": "(1) 底面周长与展开图弧长的关系",
          "options": [
            "相等",
            "不相等",
            "无法确定",
            "有时相等"
          ],
          "ans": 0
        },
        {
          "pt": 3,
          "type": "num",
          "label": "(1) r = 2 时 l =",
          "ans": 6
        },
        {
          "pt": 5,
          "type": "choice",
          "label": "(3) 13 cm 的彩带够长吗",
          "options": [
            "不够，最短要 6√5 ≈ 13.4 cm",
            "够，最短只要 3√5 ≈ 6.7 cm",
            "刚好够，正好 13 cm",
            "无法判断"
          ],
          "ans": 0
        }
      ],
      "solution": [
        "(1) 侧面展开时，扇形的弧就是原来底面圆卷起来的那条边，长度不变，所以底面周长与展开图的弧长相等。",
        "(1) 2πr = nπl/180，代入 r = 2、n = 120：4π = (2π/3)l，l = 6。",
        "(2) 由 2πr = nπl/180 得 n = 360r/l。也可以记成 n/360 = r/l（圆心角占 360° 的比 = 底面半径占母线的比）。",
        "(3) 草帽的底面直径 AB = 6，所以 r = 3；母线 l = 6，于是展开扇形的圆心角 n = 360 × 3 ÷ 6 = 180°，是一个半径 6 的半圆。",
        "(3) 展开后 A 出现两次（扇形的两条半径边各一个，记作 A₁、A₂），B 在扇形中间，PB 是半径方向的一条线段，PC = ½PB = 3。",
        "(3) 彩带 A→C→A 的最短长度 = A₁C + CA₂。两个三角形都是直角（PA₁ ⊥ PC，PA₂ ⊥ PC），A₁C = √(6² + 3²) = 3√5，CA₂ 同样为 3√5。",
        "(3) 总长 3√5 + 3√5 = 6√5 ≈ 13.42 cm > 13 cm，所以 13 cm 的彩带不够长，至少要 6√5 cm。",
        "要点：圆锥表面上的最短路径题，一律「展开 → 连线段 → 勾股算长度」，别在立体图上硬画。"
      ]
    }
  ]
});
