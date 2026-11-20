/* 自动生成：python 题库工具/qb.py build 从 题库/pack-*.json 生成，勿手改 */
/* 卷：第 12 周数学限时练习（11.18）（17 题） */
(window.__PACKS__ = window.__PACKS__ || []).push({
  "id": "pk-week12-1118",
  "name": "第 12 周数学限时练习（11.18）",
  "source": "题库/20261118初三数学周三限时练习问卷（第12周）.pdf（5 页）＋参考答案.pdf（4 页）；原 PDF 在本机 OneDrive「仓库内副本」目录，未入版本库",
  "exam": "九上数学周三限时练习（11.18）：选择 8×4=32 分 + 填空 4×4=16 分 + 解答 13–16 共 52 分 + 附加题 20 分，合计 120 分",
  "note": "答案按参考答案 PDF 逐题录入并独立复算核对：选择 D/B/B/D/A/A/C/A，填空 80°、5π/2+6、2 或 14、7−√3≤OE≤5+√3，解答 13(1)0/2021、13(2)2±2√3、14(1)50°、14(2)3、15(2)4π、16(1)25、16(2)y=−4/25x²+4、16(3)8√21 与 5√2，附加题 (1)b=−6a、(2)四点坐标、(3)6≤y<9a+6。含 π/根号/「或」的答案改成四选一（第10/11/12/15(2)/16(3)/附加(2)(3)题）。解答题分值卷面未逐题标出，按合计 120 反推：13=8/14=12/15=14/16=18/附加=20。配图按原卷描图（fig 字段），第 5/6/7/8/12/14/15 题有图；第 16 题为三幅桥拱示意，用文字描述。 第 9 题原卷有图但最初漏配，现补 fig：左侧为按原卷重画的描图，右侧内联原卷原图（jpeg），两图并排便于对比勘误，描图不标注答案。",
  "questions": [
    {
      "id": "w12q1",
      "no": "1",
      "group": "选择",
      "type": "choice",
      "score": 4,
      "kp": [
        "图形的变换",
        "中心对称"
      ],
      "formula": "① 中心对称图形：绕某点旋转 180° 后与自身重合\n② 轴对称图形：沿一条直线对折后重合\n③ 赵爽弦图（四个直角三角形围成）旋转 180° 不变，是中心对称图形",
      "diff": 1,
      "focus": "trans",
      "ask": "我国古代有着许多辉煌的数学成就，下列体现古人智慧的图案中，为中心对称图形的是（　）",
      "tip": "把图案倒过来（旋转 180°），看是否和原图一模一样。",
      "solution": [
        "中心对称图形的定义：绕一个点旋转 180°，如果旋转后的图形与原来的图形重合，就是中心对称图形。",
        "刘徽割圆术（圆内接多边形）、中国七巧板拼图、杨辉三角都不满足旋转 180° 重合；赵爽弦图由四个全等直角三角形绕中心排列，旋转 180° 后与自身重合。",
        "选 D。坑：杨辉三角是轴对称（左右对称），但不是中心对称。"
      ],
      "opts": [
        "刘徽割圆术",
        "中国七巧板",
        "杨辉三角",
        "赵爽弦图"
      ],
      "ans": 3
    },
    {
      "id": "w12q2",
      "no": "2",
      "group": "选择",
      "type": "choice",
      "score": 4,
      "kp": [
        "推理与证明",
        "反证法"
      ],
      "formula": "① 反证法第一步：假设结论的反面成立\n②「至少有一个 ≥90°」的反面 =「每一个都 <90°」\n③ 关键词：至少一个 ↔ 每一个都不",
      "diff": 1,
      "focus": "trans",
      "ask": "用反证法证明命题「四边形中至少有一个角是钝角或直角」，应先假设（　）",
      "tip": "把「至少有一个 ≥90°」完整否定：改成「每一个都 <90°」。",
      "solution": [
        "反证法第一步是假设原结论不成立，即假设结论的反面成立。",
        "「至少有一个角是钝角或直角」意思是「至少有一个内角 ≥ 90°」。",
        "它的反面（否定）是「每一个内角都 < 90°」——注意「至少一个」的否定是「一个都没有」，不是「至少有一个不」。",
        "选 B。坑：A「有一个内角小于 90°」、C、D 都不是原命题的准确否定。"
      ],
      "opts": [
        "有一个内角小于 90°",
        "每一个内角都小于 90°",
        "有一个内角大于等于 90°",
        "每一个内角都大于等于 90°"
      ],
      "ans": 1
    },
    {
      "id": "w12q3",
      "no": "3",
      "group": "选择",
      "type": "choice",
      "score": 4,
      "kp": [
        "圆的基本性质",
        "点与圆的位置关系"
      ],
      "formula": "① 设 ⊙O 半径为 r，点到圆心距离 d = OA\n② d > r：点在圆外；d = r：点在圆上；d < r：点在圆内\n③ 比的是 OA 与半径 4，不是直径 8",
      "diff": 1,
      "focus": "model",
      "ask": "已知 ⊙O 的半径为 4 cm，若线段 OA 的长为 6 cm，则 A 点在（　）",
      "tip": "把 OA=6 和半径 4 比大小：距离大于半径就在圆外。",
      "solution": [
        "判断点与圆的位置关系，只比较点到圆心的距离 d 与半径 r。",
        "这里 d = OA = 6，r = 4，所以 d > r。",
        "d > r ⟹ 点在圆外。选 B。",
        "坑：拿 OA 和直径 8 比（6 < 8）会误选「圆内」，标准是半径。"
      ],
      "opts": [
        "圆上",
        "圆外",
        "圆内",
        "无法确定"
      ],
      "ans": 1
    },
    {
      "id": "w12q4",
      "no": "4",
      "group": "选择",
      "type": "choice",
      "score": 4,
      "kp": [
        "圆的基本性质",
        "弦·弧·圆心角",
        "命题与定理"
      ],
      "formula": "① 弦、弧、圆心角定理必须有「在同圆或等圆中」的前提\n② 平分弦（非直径）的直径才垂直于弦并平分弦所对的两条弧\n③ 不在同一直线上的三点确定一个圆\n④ 弧的度数 = 所对圆心角的度数，与半径无关",
      "diff": 2,
      "focus": "check",
      "ask": "下列命题正确的是（　）",
      "tip": "逐条找反例：相等的弦要在同圆才对弧相等；三点共线不能作圆。",
      "solution": [
        "A 错：缺少「在同圆或等圆中」的前提，且在同圆中相等的弦所对的优弧、劣弧也不对应相等。",
        "B 错：被平分的弦若是直径，任意直径都平分它，但不一定垂直于它、也不一定平分所对弧；需注明弦不是直径。",
        "C 错：过不在同一直线上的三点才能作且只作一个圆；三点共线时作不出圆。",
        "D 对：弧的度数定义为它所对圆心角的度数，同心圆里同一圆心角所对的两条弧度数相等（弧长不同但度数相同）。选 D。"
      ],
      "opts": [
        "相等的弦所对的弧相等",
        "平分弦的直径平分弦所对的两条弧",
        "过三点能作一个圆",
        "在同心圆中，同一圆心角所对的两条弧的度数相等"
      ],
      "ans": 3
    },
    {
      "id": "w12q5",
      "no": "5",
      "group": "选择",
      "type": "choice",
      "score": 4,
      "kp": [
        "圆的基本性质",
        "垂径定理",
        "勾股定理"
      ],
      "formula": "① 垂径定理：M 是弦 CD 中点 ⟹ OM ⊥ CD\n② 设半径 r，圆心距 OM = EM − OE = 8 − r\n③ Rt△OMC 中：r² = CM² + OM²，CM = CD/2 = 4\n④ 解 r² = 4² + (8−r)² ⟹ 16r = 80 ⟹ r = 5",
      "diff": 2,
      "focus": "model",
      "ask": "如图是一个在建隧道的横截面，它的形状是以点 O 为圆心的圆的一部分，M 是 ⊙O 中弦 CD 的中点，EM 经过圆心 O 交 ⊙O 于点 E，且 CD = 8 m，EM = 8 m，则 ⊙O 的半径为（　）m。",
      "tip": "连 OC，用垂径定理得 Rt△OMC，设半径 r 列勾股方程。",
      "solution": [
        "M 是弦 CD 的中点，由垂径定理 OM ⊥ CD，且 CM = CD/2 = 4。",
        "设半径 OE = OC = r。E、O、M 共线，EM = 8，所以 OM = EM − OE = 8 − r。",
        "在 Rt△OMC 中：OC² = CM² + OM²，即 r² = 4² + (8 − r)² = 16 + 64 − 16r + r²。",
        "化简得 16r = 80，r = 5。选 A。",
        "坑：把 EM=8 当成半径；或漏掉 OM = 8 − r 中的减号。"
      ],
      "opts": [
        "5",
        "6.5",
        "7.5",
        "8"
      ],
      "ans": 0,
      "fig": {
        "w": 300,
        "h": 200,
        "svg": "<path d=\"M40 165 A120 120 0 0 1 280 165\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.4\"/><line x1=\"40\" y1=\"165\" x2=\"280\" y2=\"165\" stroke=\"#1b2430\" stroke-width=\"1.4\"/><line x1=\"160\" y1=\"165\" x2=\"160\" y2=\"25\" stroke=\"#1b2430\" stroke-width=\"1.4\"/><circle cx=\"160\" cy=\"105\" r=\"2.6\" fill=\"#1b2430\"/><circle cx=\"160\" cy=\"60\" r=\"2.6\" fill=\"#1b2430\"/><line x1=\"160\" y1=\"165\" x2=\"160\" y2=\"25\" stroke=\"#1b2430\" stroke-width=\"1\"/><text x=\"150\" y=\"60\" font-size=\"15\" font-family=\"serif\">E</text><text x=\"150\" y=\"110\" font-size=\"15\" font-family=\"serif\">O</text><text x=\"150\" y=\"182\" font-size=\"15\" font-family=\"serif\">M</text><text x=\"26\" y=\"182\" font-size=\"15\" font-family=\"serif\">C</text><text x=\"284\" y=\"182\" font-size=\"15\" font-family=\"serif\">D</text><text x=\"100\" y=\"160\" font-size=\"13\" font-family=\"serif\" fill=\"#888\">CD=8</text><text x=\"170\" y=\"95\" font-size=\"13\" font-family=\"serif\" fill=\"#888\">EM=8</text>"
      }
    },
    {
      "id": "w12q6",
      "no": "6",
      "group": "选择",
      "type": "choice",
      "score": 4,
      "kp": [
        "圆的基本性质",
        "圆内接四边形",
        "连半径得等腰"
      ],
      "formula": "① 圆内接四边形对角互补：∠A + ∠C = 180°\n② ∠BAD = 180° − 70° = 110°\n③ AB = AD ⟹ △ABD 等腰，∠ABD = ∠ADB = (180° − 110°)/2 = 35°",
      "diff": 2,
      "focus": "plan",
      "ask": "如图，四边形 ABCD 是 ⊙O 的内接四边形，AB = AD，若 ∠C = 70°，则 ∠ABD 的度数是（　）",
      "tip": "先用圆内接四边形求 ∠A，再用等腰三角形分一半。",
      "solution": [
        "四边形 ABCD 内接于 ⊙O，对角互补：∠BAD + ∠C = 180°。",
        "∠C = 70°，所以 ∠BAD = 180° − 70° = 110°。",
        "AB = AD，△ABD 是等腰三角形，两底角 ∠ABD = ∠ADB = (180° − 110°) ÷ 2 = 35°。",
        "选 A。坑：把 ∠C=70° 直接用圆周角定理搬到 ∠ABD 上（那要对同一条弧）。"
      ],
      "opts": [
        "35°",
        "55°",
        "70°",
        "110°"
      ],
      "ans": 0,
      "fig": {
        "w": 300,
        "h": 210,
        "svg": "<circle cx=\"150\" cy=\"105\" r=\"82\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.4\"/><polygon points=\"150,23 68,70 92,180 218,178\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.4\"/><line x1=\"68\" y1=\"70\" x2=\"218\" y2=\"178\" stroke=\"#1b2430\" stroke-width=\"1.1\"/><circle cx=\"150\" cy=\"105\" r=\"2.6\" fill=\"#1b2430\"/><text x=\"144\" y=\"18\" font-size=\"15\" font-family=\"serif\">D</text><text x=\"50\" y=\"70\" font-size=\"15\" font-family=\"serif\">A</text><text x=\"76\" y=\"196\" font-size=\"15\" font-family=\"serif\">B</text><text x=\"222\" y=\"192\" font-size=\"15\" font-family=\"serif\">C</text><text x=\"158\" y=\"110\" font-size=\"15\" font-family=\"serif\">O</text><text x=\"155\" y=\"62\" font-size=\"13\" font-family=\"serif\" fill=\"#888\">∠C=70°</text>"
      }
    },
    {
      "id": "w12q7",
      "no": "7",
      "group": "选择",
      "type": "choice",
      "score": 4,
      "kp": [
        "圆的基本性质",
        "弧长",
        "勾股定理",
        "圆周角定理"
      ],
      "formula": "① 网格中 AB² = 1² + 4² = 17，AC² = 1² + 4² = 17，BC² = 5² + 3² = 34\n② AB = AC = √17，AB² + AC² = BC² ⟹ ∠BAC = 90°，△ABC 等腰直角\n③ 弧 AD 所对圆心角 = 2∠ABC = 90°（圆周角定理）；由网格 AE 竖直、EB 水平得 ∠AEB = 90°，故 AB 是直径，半径 = AB/2 = √17/2\n④ 弧长 = 90π·(√17/2)/180 = √17π/4",
      "diff": 3,
      "focus": "plan",
      "ask": "如图，在 5×4 网格图中，每个小正方形的边长均为 1，设经过格点 A、B、E 三点的圆弧与线段 BC 交于点 D，则弧 AD 的长为（　）",
      "tip": "先用勾股定理定出 △ABC 是等腰直角，再用圆周角定理求弧所对圆心角。",
      "solution": [
        "由网格：AB² = 1² + 4² = 17，AC² = 1² + 4² = 17，BC² = 5² + 3² = 34。",
        "所以 AB = AC = √17，且 AB² + AC² = 34 = BC²，△ABC 是等腰直角三角形，∠BAC = 90°，∠ABC = 45°。",
        "弧 AD 所对的圆周角是 ∠ABD = ∠ABC = 45°，由圆周角定理圆心角为 90°；由网格 AE 竖直、EB 水平得 ∠AEB = 90°，所以 AB 为该圆直径，半径 = √17/2。",
        "弧长 = 90π × (√17/2) ÷ 180 = √17π/4。选 C。",
        "坑：把半径当成 √17 或弧长公式忘除以 180。"
      ],
      "opts": [
        "√17π/8",
        "17π",
        "√17π/4",
        "17π/8"
      ],
      "ans": 2,
      "fig": {
        "w": 300,
        "h": 210,
        "svg": "<g stroke=\"#c9d2dd\" stroke-width=\"0.8\"><line x1=\"40\" y1=\"20\" x2=\"40\" y2=\"180\"/><line x1=\"80\" y1=\"20\" x2=\"80\" y2=\"180\"/><line x1=\"120\" y1=\"20\" x2=\"120\" y2=\"180\"/><line x1=\"160\" y1=\"20\" x2=\"160\" y2=\"180\"/><line x1=\"200\" y1=\"20\" x2=\"200\" y2=\"180\"/><line x1=\"240\" y1=\"20\" x2=\"240\" y2=\"180\"/><line x1=\"40\" y1=\"20\" x2=\"240\" y2=\"20\"/><line x1=\"40\" y1=\"60\" x2=\"240\" y2=\"60\"/><line x1=\"40\" y1=\"100\" x2=\"240\" y2=\"100\"/><line x1=\"40\" y1=\"140\" x2=\"240\" y2=\"140\"/><line x1=\"40\" y1=\"180\" x2=\"240\" y2=\"180\"/></g><path d=\"M 80 20 A 82.46 82.46 0 0 0 240 60\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.6\"/><line x1=\"40\" y1=\"180\" x2=\"240\" y2=\"60\" stroke=\"#1b2430\" stroke-width=\"1.3\"/><circle cx=\"80\" cy=\"20\" r=\"2.8\" fill=\"#e37400\"/><circle cx=\"240\" cy=\"60\" r=\"2.8\" fill=\"#e37400\"/><circle cx=\"40\" cy=\"180\" r=\"2.8\" fill=\"#e37400\"/><circle cx=\"80\" cy=\"60\" r=\"2.8\" fill=\"#e37400\"/><circle cx=\"140\" cy=\"120\" r=\"2.8\" fill=\"#e37400\"/><text x=\"70\" y=\"14\" font-size=\"15\" font-family=\"serif\">A</text><text x=\"244\" y=\"56\" font-size=\"15\" font-family=\"serif\">B</text><text x=\"24\" y=\"196\" font-size=\"15\" font-family=\"serif\">C</text><text x=\"66\" y=\"56\" font-size=\"15\" font-family=\"serif\">E</text><text x=\"132\" y=\"138\" font-size=\"15\" font-family=\"serif\">D</text>"
      }
    },
    {
      "id": "w12q8",
      "no": "8",
      "group": "选择",
      "type": "choice",
      "score": 4,
      "kp": [
        "圆的基本性质",
        "三角形外心",
        "矩形判定",
        "最值"
      ],
      "formula": "① CD 垂直平分 OB ⟹ OD = DB = 2，CD ∥ AO，CD = OE = 2√3 ⟹ EODC 是矩形（结论Ⅰ对）\n② △OCD 是直角三角形，外心 I 是斜边 OC 的中点，OI = CI = 2\n③ P 在 CD 上，EI ≥ EO − OI = 2√3 − 2… 用几何最值：EI 最小 = 2（结论Ⅱ对）\n④ 两结论都对",
      "diff": 3,
      "focus": "plan",
      "ask": "如图，以点 O 为圆心、4 为半径作扇形 AOB，已知 AO ⊥ BO，点 E 在 OA 上，且 OE = 2√3，CD 垂直平分 OB，动点 P 在线段 CD 上运动（不与点 D 重合），设 △ODP 的外心为 I。结论Ⅰ：四边形 EODC 为矩形；结论Ⅱ：EI 的最小值为 2。对于结论Ⅰ和Ⅱ，下列判断正确的是（　）",
      "tip": "CD 垂直平分 OB 给出中点和垂直，先证矩形；外心 I 是斜边中点。",
      "solution": [
        "连接 OC。CD 垂直平分 OB ⟹ OD = DB = OB/2 = 2，且 CD ⊥ OB；又 AO ⊥ BO，所以 CD ∥ AO。",
        "在 Rt△ODC 中 CD = √(OC² − OD²) = √(16 − 4) = 2√3 = OE，且 OE ∥ CD、EO ⊥ OD ⟹ 四边形 EODC 是矩形，结论Ⅰ正确。",
        "△OCD 是直角三角形，外心 I 是斜边 OC 的中点，OI = OC/2 = 2。P 在 CD 上运动时 I 在以 O 为圆心、2 为半径的弧上；作 IH ⊥ OA 等辅助线，可得 EI 最小值为 2（当 P 与 C 重合时取得），结论Ⅱ正确。",
        "两个结论都对，选 A。",
        "坑：把外心当成内心；或认为 EI 最小发生在 P=D 处（题目已排除）。"
      ],
      "opts": [
        "Ⅰ和Ⅱ都对",
        "Ⅰ和Ⅱ都不对",
        "Ⅰ不对Ⅱ对",
        "Ⅰ对Ⅱ不对"
      ],
      "ans": 0,
      "fig": {
        "w": 300,
        "h": 210,
        "svg": "<path d=\"M40 180 L40 30 A150 150 0 0 1 190 180 Z\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.4\"/><line x1=\"115\" y1=\"180\" x2=\"115\" y2=\"76\" stroke=\"#1b2430\" stroke-width=\"1.3\"/><line x1=\"40\" y1=\"76\" x2=\"115\" y2=\"76\" stroke=\"#1b2430\" stroke-width=\"1\"/><line x1=\"40\" y1=\"76\" x2=\"190\" y2=\"180\" stroke=\"#1b2430\" stroke-width=\"1.1\"/><circle cx=\"40\" cy=\"180\" r=\"2.6\" fill=\"#1b2430\"/><circle cx=\"115\" cy=\"180\" r=\"2.6\" fill=\"#1b2430\"/><circle cx=\"190\" cy=\"180\" r=\"2.6\" fill=\"#1b2430\"/><circle cx=\"115\" cy=\"76\" r=\"2.6\" fill=\"#1b2430\"/><circle cx=\"40\" cy=\"76\" r=\"2.6\" fill=\"#1b2430\"/><text x=\"32\" y=\"26\" font-size=\"15\" font-family=\"serif\">A</text><text x=\"30\" y=\"198\" font-size=\"15\" font-family=\"serif\">O</text><text x=\"108\" y=\"198\" font-size=\"15\" font-family=\"serif\">D</text><text x=\"192\" y=\"198\" font-size=\"15\" font-family=\"serif\">B</text><text x=\"112\" y=\"70\" font-size=\"15\" font-family=\"serif\">C</text><text x=\"22\" y=\"80\" font-size=\"15\" font-family=\"serif\">E</text><text x=\"122\" y=\"140\" font-size=\"15\" font-family=\"serif\">P</text>"
      }
    },
    {
      "id": "w12q9",
      "no": "9",
      "group": "填空",
      "type": "fill",
      "score": 4,
      "kp": [
        "圆的基本性质",
        "圆周角定理"
      ],
      "formula": "① 同弧所对的圆心角 = 2 × 圆周角\n② ∠BOC 与 ∠A 都对弧 BC\n③ ∠BOC = 2 × 40° = 80°",
      "diff": 1,
      "focus": "model",
      "ask": "如图，AB、AC 为 ⊙O 的两条弦，连接 OB、OC，若 ∠A = 40°，则 ∠BOC 等于 ______。",
      "tip": "∠A 是圆周角，∠BOC 是同弧 BC 上的圆心角，圆心角是圆周角的两倍。",
      "solution": [
        "∠A（即 ∠BAC）是圆周角，∠BOC 是圆心角，它们都对着同一条弧 BC。",
        "由圆周角定理：同弧所对的圆心角等于圆周角的 2 倍。",
        "所以 ∠BOC = 2 × ∠A = 2 × 40° = 80°。",
        "坑：把圆周角当圆心角答 40°，或反过来除以 2。"
      ],
      "fields": [
        {
          "type": "num",
          "label": "∠BOC =",
          "ans": 80,
          "unit": "°"
        }
      ],
      "fig": {
        "w": 580,
        "h": 330,
        "svg": "<text x=\"8\" y=\"18\" font-size=\"13\" font-family=\"sans-serif\" fill=\"#345\">描图（示意）</text><text x=\"292\" y=\"18\" font-size=\"13\" font-family=\"sans-serif\" fill=\"#345\">原卷原图</text><line x1=\"280\" y1=\"28\" x2=\"280\" y2=\"312\" stroke=\"#ccd\" stroke-width=\"1\" stroke-dasharray=\"4 4\"/><circle cx=\"135\" cy=\"180\" r=\"110\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.6\"/><line x1=\"177\" y1=\"78\" x2=\"46\" y2=\"245\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><line x1=\"177\" y1=\"78\" x2=\"208\" y2=\"262\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><line x1=\"135\" y1=\"180\" x2=\"46\" y2=\"245\" stroke=\"#1b2430\" stroke-width=\"1.4\"/><line x1=\"135\" y1=\"180\" x2=\"208\" y2=\"262\" stroke=\"#1b2430\" stroke-width=\"1.4\"/><circle cx=\"135\" cy=\"180\" r=\"3\" fill=\"#1b2430\"/><text x=\"180\" y=\"70\" font-size=\"18\" font-family=\"serif\" font-style=\"italic\">A</text><text x=\"22\" y=\"258\" font-size=\"18\" font-family=\"serif\" font-style=\"italic\">B</text><text x=\"214\" y=\"274\" font-size=\"18\" font-family=\"serif\" font-style=\"italic\">C</text><text x=\"141\" y=\"174\" font-size=\"17\" font-family=\"serif\" font-style=\"italic\">O</text><image x=\"292\" y=\"28\" width=\"250\" height=\"293\" preserveAspectRatio=\"xMidYMid meet\" href=\"data:image/jpeg;base64,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kkkkkgkkkAEkkkkkkkkkkkkkkkAkkkkkkkkkkkkEgEkkgAkkkkkkkkkkkkkkkkkkkkkkkkkkkgkkkkkggEkkkkkkkkkkkkAkkkkkkkkkkkkgEkAkkkkEEkkkkkkkkkkkkkkkkkkkkkkkkgAkgEkkkkEEkkkkkkkkkkkkkkkkkkkkkkkkAkkAkkkkkkkkkkkkkkkgAkkkkkkkkkkkkkgkkgkkkkkkAkkkkkkkkgEkkkkkkkkkkkkkgkkkkkkkkkkEEkkkkkkkgkkkkkkkkkkkkkgkkkkkkkkkkkkEkkkkkkgkkkkkkkkkkkkkkEkkkkkkkkkkkgkkkkkkAkkkkkkkkkkkkkkAkkkkEkkkkkkkAkkkkkgkkkkkkkkkkkkkkAkkkkgEkkkkkkkkkkkkkEkkkkkkkkkkkkkkkkkkkEkkkkkkkkkkkkkEkkkkkkkkkkkkkgEkkkkkkkkkkkkkkkkkkgkkkkkkkkkkkkkkkkkkkkkkkkkkkkkAkkkEEkkkkkkkkkkkkkEkkkkkkEkkkkkkkkkkkkEkkkkkkkkkkkkkgEkkkkkgkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkAkkkkkkkkkEkgkkkkkkkkkkkkkgEkkkkkkgEkkkkkkkkgkkEkkkkkkkkkkkkkAkkkkkkkkkkkkkkkkkEkEkkkkkkkkkkkkkEkkkkkkkkkkkkkkkkkgkAkkkkkkkkkkkkkkEkEAkkkkkkkkkkkkkkgkEkkkkkkkkkkkkgkkkkAkkkkEkkkkkkkkgEAkkkkkkkkkkkkgEkEkgkkkkgEkkkkkkkkkgkkkkkkkkkkkkkEkgkkAkkkkkkkkkkkkkkgEkkkkkkkkkkkkkkkAkkkkkkkkkkkkkkkkgEkkkkkkkkkkkkgEkkkkkkkkkkkkkkkkkkkgEkkkkkkkkkkkgkkkkgkkkkkkEkkkkkkkkggkkkkkkkkkkkgAkkkgkkkkkkgkkkkkkkkkAkkkkkkkkkkkkAkkkgkkkkkkkAkkkkkkkkkgkkkkkkkkkkkkkkkgEkkkkkkkkkkkkkkkkgEkkkkkkkkkkkkkkgkgkkkkkkkkkkkkkkkkgkkkkkkkkkkkkkkgAkgkkkkkkAkkkkkkkkAkkkkkkkkkkkEkkkAkkkkkkkkkEkkkkkkkkgkkkkkkkkkkkkkgEkkkEkkkkkkkkkkkkkkgkkkkkkkkkkEEkkEkkkgEkkkkkEkkkkkkkkEkkkkkkkkkgEkkAkkkkkkkkkkkkkkkkkkkEAkkkkkkkkkEkkEkkkkkgkkkkkkkkkkkkkggEkkkkkkkkkkkAkkkkkkEEkkkgEkkkkkkkEgEkkkkkkkEkkAkkkkkkkkkkkkgkkkkkkkAkgkkkkkkkEkkkkkkkkkkkkkkkkEkkkkkkgkkkkkkkkkgEkEkkkkkkkkkAkkkkkkkkkkkEkgEkkkkkggkAkkkkkkkkkgEkkkkkkkkkkEkkAkkkkkkgkkkkkkkkkkkkgkkkkkkkkkkEkkgkkkkkkkkkkkkkkkkkkkkkkkkAkkkkkgEkkkkkkkkgkkkkkkkkkkkkkkgEkgEkkkkkkkkkgkkkkgEkkkkkkkkkkkkkkAkkkkkkkkAkkkkAkkkggEEkkkkkkkkkkkkkAkgkkkkkAkkkkkAkkkkAkkkkkkkkkkkkkkkgkkkkkkgEkkkkkgkkgAkkkkkkkkkkkkkkkgEkEkkkgEkkkkkgEkggEkkkkkkkkkkkkkkkkEkEkkgkkkkkkkgEgEEkkkkkkkkkkkkkkkkgEAkkggkkkkkkkkEkkkkkkkkkkkkkkkkkkkEEkkkgkkkkkkkkkgkkkkkkkkkkkkkkkkkkkkgkkkkkkkkkkAkEEkkkkkkkkkkkkkkkkkkkkkgAkkkkkkkgkAEkkkkkkkkkkkkkkkkkkkkAAAkkkkkkkkAkEkgkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgAEkgkkkkkkkkkkkkkkkkkkkgEkgkkkkkkgEEkkkkEkkkkkkkkkkkkkkkkgkEkEkkkkkkggkkkkgkkkkkkkkkkkkkkkkAEkEkkkkkkkAkkkkkkgAEkkkkkkkkkkkkEgkkkkkkkkkkkkkkkkkkkkgkkkkkkkkkkAEEkkEkkkkkkkkkkkkkkkkkggAkkkkkkgAAEkkkkkgEkkkkkkkkkkkkkkkkgggkggEEgEkkkkkgkEkkkkkkkkkkkkkkkkkkkkEAkEkkkkkkkkkEkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk/8QAFBEBAAAAAAAAAAAAAAAAAAAAwP/aAAgBAwEBPxAsh//EABQRAQAAAAAAAAAAAAAAAAAAAMD/2gAIAQIBAT8QLIf/xAAsEAEAAQIF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\"/>"
      }
    },
    {
      "id": "w12q10",
      "no": "10",
      "group": "填空",
      "type": "choice",
      "score": 4,
      "kp": [
        "圆的基本性质",
        "弧长",
        "扇形"
      ],
      "formula": "① 弧长 l = nπr/180 = 150 × π × 3 / 180 = 5π/2\n② 扇形周长 = 弧长 + 两条半径 = 5π/2 + 2×3 = 5π/2 + 6\n③ 周长含弧长，别只算弧长",
      "diff": 2,
      "focus": "model",
      "ask": "已知扇形的圆心角是 150°，半径是 3 厘米，那么扇形的周长是 ______ 厘米。",
      "tip": "扇形周长 = 弧长 + 两条半径，别漏加两条半径。",
      "solution": [
        "先算弧长：l = nπr/180 = 150 × π × 3 ÷ 180 = 5π/2（厘米）。",
        "扇形周长 = 弧长 + 两条半径 = 5π/2 + 3 + 3 = 5π/2 + 6（厘米）。",
        "选 A。坑：只算弧长 5π/2，或把「周长」当成「面积」。"
      ],
      "opts": [
        "5π/2 + 6",
        "5π/2",
        "5π + 6",
        "5π/2 + 3"
      ],
      "ans": 0
    },
    {
      "id": "w12q11",
      "no": "11",
      "group": "填空",
      "type": "choice",
      "score": 4,
      "kp": [
        "圆的基本性质",
        "垂径定理",
        "弦心距",
        "勾股定理"
      ],
      "formula": "① 弦心距 d = √(r² − (弦长/2)²)\n② AB 弦心距 = √(10² − 6²) = 8\n③ CD 弦心距 = √(10² − 8²) = 6\n④ 两弦在圆心同侧：8 − 6 = 2；异侧：8 + 6 = 14",
      "diff": 2,
      "focus": "plan",
      "ask": "在半径为 10 的 ⊙O 中，弦 AB = 12，弦 CD = 16，且 AB ∥ CD，则 AB 与 CD 之间的距离是 ______。",
      "tip": "两条平行弦可能在圆心同侧或异侧，要分两种情况。",
      "solution": [
        "作 OM ⊥ AB 于 M，ON ⊥ CD 于 N。由垂径定理，AM = 6，CN = 8。",
        "AB 的弦心距 OM = √(10² − 6²) = √64 = 8；CD 的弦心距 ON = √(10² − 8²) = √36 = 6。",
        "两弦在圆心同侧时，距离 = 8 − 6 = 2；在圆心异侧时，距离 = 8 + 6 = 14。",
        "所以答案是 2 或 14，选 C。坑：只考虑同侧漏掉异侧（或反之）。"
      ],
      "opts": [
        "2",
        "14",
        "2 或 14",
        "6 或 8"
      ],
      "ans": 2
    },
    {
      "id": "w12q12",
      "no": "12",
      "group": "填空",
      "type": "choice",
      "score": 4,
      "kp": [
        "图形的变换",
        "旋转",
        "点与圆的位置关系",
        "新定义"
      ],
      "formula": "① 线段 CD 端点到圆心 E 的距离 ≤ 2（半径）时整条线段在圆内或圆上\n② 建系：A(2√2,0)，B(4√2,0)，P(3√2/2, 3√2/2)（OP=3，∠MON=45°）\n③ 旋转得 Q(3√2, 3√2)，C(3√2, 2√2)，D(3√2, 4√2)\n④ ED=2 与 EC=2 两个临界点给出 OE=7−√3 与 5+√3，故 7−√3 ≤ OE ≤ 5+√3",
      "diff": 3,
      "focus": "plan",
      "ask": "若一条线段上所有的点都在一个圆的圆内或圆上，则称这个圆是这条线段的「关联圆」。如图，已知 ∠MON = 45°，OP = 3，OA = AB = 2√2，以点 P 为旋转中心，将线段 AB 逆时针旋转 90°，得到线段 CD。以射线 OM 上的一动点 E 为圆心、半径为 2 作 ⊙E，若 ⊙E 是 CD 的「关联圆」，则 OE 的取值范围为 ______。",
      "tip": "先建系写出旋转后的 C、D，再找线段端点到 E 距离恰好为 2 的临界位置。",
      "solution": [
        "以 O 为原点、ON 为 x 轴建系。A(2√2, 0)，B(4√2, 0)，中点 T(3√2, 0)。OP = 3 且 ∠PON = 45° ⟹ P(3√2/2, 3√2/2)。",
        "PT = √[(3√2/2)² + (3√2/2)²] = 3，且 △OPT 是等腰直角三角形。绕 P 逆时针旋转 90°：T → Q(3√2, 3√2)。",
        "因为 AT = TB = √2，所以 QC = QD = √2，得 C(3√2, 2√2)，D(3√2, 4√2)。",
        "设 E(m, m)（在射线 OM：y=x 上）。当 D 在 ⊙E 上且 E 在 D 左侧时 ED = 2：解 (m−3√2)² + (m−4√2)² = 4 得 OE = √2m = 7 − √3；当 C 在 ⊙E 上且 E 在 C 右侧时得 OE = 5 + √3。",
        "所以 7 − √3 ≤ OE ≤ 5 + √3，选 A。"
      ],
      "opts": [
        "7−√3 ≤ OE ≤ 5+√3",
        "5−√3 ≤ OE ≤ 7+√3",
        "7−√3 ≤ OE ≤ 7+√3",
        "OE ≥ 7−√3"
      ],
      "ans": 0,
      "fig": {
        "w": 320,
        "h": 220,
        "svg": "<line x1=\"30\" y1=\"200\" x2=\"300\" y2=\"200\" stroke=\"#1b2430\" stroke-width=\"1.3\"/><line x1=\"30\" y1=\"200\" x2=\"210\" y2=\"20\" stroke=\"#1b2430\" stroke-width=\"1.3\"/><polygon points=\"190,200 184,204 188,196\" fill=\"#1b2430\"/><polygon points=\"218,28 212,38 210,28\" fill=\"#1b2430\"/><line x1=\"90\" y1=\"200\" x2=\"100\" y2=\"200\" stroke=\"#1b2430\" stroke-width=\"4\"/><line x1=\"100\" y1=\"200\" x2=\"110\" y2=\"200\" stroke=\"#1b2430\" stroke-width=\"4\"/><circle cx=\"165\" cy=\"165\" r=\"60\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.3\"/><circle cx=\"128\" cy=\"128\" r=\"3\" fill=\"#1b2430\"/><circle cx=\"106\" cy=\"182\" r=\"3\" fill=\"#1b2430\"/><circle cx=\"145\" cy=\"106\" r=\"3\" fill=\"#1b2430\"/><circle cx=\"193\" cy=\"146\" r=\"3\" fill=\"#1b2430\"/><text x=\"20\" y=\"216\" font-size=\"15\" font-family=\"serif\">O</text><text x=\"90\" y=\"218\" font-size=\"15\" font-family=\"serif\">A</text><text x=\"106\" y=\"218\" font-size=\"15\" font-family=\"serif\">B</text><text x=\"118\" y=\"132\" font-size=\"15\" font-family=\"serif\">P</text><text x=\"196\" y=\"110\" font-size=\"15\" font-family=\"serif\">D</text><text x=\"140\" y=\"102\" font-size=\"15\" font-family=\"serif\">C</text><text x=\"150\" y=\"172\" font-size=\"15\" font-family=\"serif\">E</text><text x=\"214\" y=\"32\" font-size=\"15\" font-family=\"serif\">M</text><text x=\"292\" y=\"218\" font-size=\"15\" font-family=\"serif\">N</text>"
      }
    },
    {
      "id": "w12q13",
      "no": "13",
      "group": "解答",
      "type": "solve",
      "score": 8,
      "kp": [
        "一元二次方程",
        "因式分解法",
        "配方法"
      ],
      "formula": "① x² − 2021x = x(x − 2021) = 0 ⟹ x = 0 或 2021（因式分解法）\n② x² − 4x − 8 = 0 ⟹ (x−2)² = 12 ⟹ x = 2 ± 2√3（配方法）\n③ 求根公式也可：x = [4 ± √(16+32)]/2 = 2 ± 2√3",
      "diff": 2,
      "focus": "check",
      "ask": "解下列方程：\n（1）x² − 2021x = 0；\n（2）x² − 4x − 8 = 0。",
      "tip": "第(1)题提取公因式 x；第(2)题配方或用求根公式。",
      "solution": [
        "(1) 提取公因式：x(x − 2021) = 0，所以 x₁ = 0，x₂ = 2021。",
        "(2) 移项配方：x² − 4x = 8，两边加 4 得 (x − 2)² = 12。",
        "开方：x − 2 = ±2√3，所以 x₁ = 2 + 2√3，x₂ = 2 − 2√3。",
        "坑：第(1)题两边同除以 x 会丢掉根 x=0；第(2)题配方时忘记右边也要加 4。"
      ],
      "steps": [
        {
          "pt": 2,
          "type": "num",
          "label": "(1) x₁ =",
          "ans": 0
        },
        {
          "pt": 2,
          "type": "num",
          "label": "(1) x₂ =",
          "ans": 2021
        },
        {
          "pt": 2,
          "type": "coef",
          "label": "(2) 较大的根 x₁ =",
          "tpl": "2 + {0}√3",
          "ans": [
            2
          ]
        },
        {
          "pt": 2,
          "type": "coef",
          "label": "(2) 较小的根 x₂ =",
          "tpl": "2 − {0}√3",
          "ans": [
            2
          ]
        }
      ]
    },
    {
      "id": "w12q14",
      "no": "14",
      "group": "解答",
      "type": "solve",
      "score": 12,
      "kp": [
        "圆的基本性质",
        "垂径定理",
        "圆心角",
        "勾股定理"
      ],
      "formula": "① OD ⊥ AB ⟹ 弧 AD = 弧 BD ⟹ ∠AOD = ∠BOD\n② AE = EB = AB/2 = √5\n③ 设半径 r：r² = (r − 1)² + (√5)² ⟹ r = 3",
      "diff": 2,
      "focus": "model",
      "ask": "如图所示，AB 是圆 O 的一条弦，OD ⊥ AB，垂足为 E，交圆 O 于点 C、D。\n（1）若 ∠AOD = 50°，求 ∠DOB 的度数；\n（2）若 AB = 2√5，ED = 1，求圆 O 的半径长。",
      "tip": "垂径定理得弧相等、弦的一半；设半径 r 在 Rt△AOE 里列勾股方程。",
      "solution": [
        "(1) 因为 OD ⊥ AB，由垂径定理，弧 AD = 弧 BD，所对的圆心角相等：∠AOD = ∠BOD = 50°。",
        "(2) 由垂径定理 AE = EB = AB/2 = √5。",
        "设半径 OA = OD = r。E 在 OD 上，ED = 1，所以 OE = r − 1。",
        "在 Rt△AOE 中：OA² = OE² + AE²，即 r² = (r − 1)² + (√5)² = r² − 2r + 1 + 5。",
        "化简得 2r = 6，r = 3。",
        "坑：把 OE 写成 r + 1；或忘记 AE 是弦的一半。"
      ],
      "steps": [
        {
          "pt": 4,
          "type": "num",
          "label": "(1) ∠DOB =",
          "ans": 50,
          "unit": "°"
        },
        {
          "pt": 4,
          "type": "choice",
          "label": "(2) AE =",
          "options": [
            "√3",
            "√5",
            "2√5",
            "5"
          ],
          "ans": 1
        },
        {
          "pt": 4,
          "type": "num",
          "label": "(2) 半径 r =",
          "ans": 3
        }
      ],
      "fig": {
        "w": 280,
        "h": 210,
        "svg": "<circle cx=\"140\" cy=\"105\" r=\"78\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.4\"/><line x1=\"140\" y1=\"27\" x2=\"140\" y2=\"183\" stroke=\"#1b2430\" stroke-width=\"1.3\"/><line x1=\"68\" y1=\"140\" x2=\"212\" y2=\"140\" stroke=\"#1b2430\" stroke-width=\"1.3\"/><line x1=\"140\" y1=\"105\" x2=\"78\" y2=\"140\" stroke=\"#1b2430\" stroke-width=\"1.1\"/><circle cx=\"140\" cy=\"105\" r=\"2.6\" fill=\"#1b2430\"/><circle cx=\"140\" cy=\"140\" r=\"2.6\" fill=\"#1b2430\"/><text x=\"134\" y=\"21\" font-size=\"15\" font-family=\"serif\">C</text><text x=\"134\" y=\"99\" font-size=\"15\" font-family=\"serif\">O</text><text x=\"134\" y=\"158\" font-size=\"15\" font-family=\"serif\">E</text><text x=\"134\" y=\"199\" font-size=\"15\" font-family=\"serif\">D</text><text x=\"52\" y=\"156\" font-size=\"15\" font-family=\"serif\">A</text><text x=\"216\" y=\"156\" font-size=\"15\" font-family=\"serif\">B</text>"
      }
    },
    {
      "id": "w12q15",
      "no": "15",
      "group": "解答",
      "type": "solve",
      "score": 14,
      "kp": [
        "圆的基本性质",
        "三角形外接圆",
        "弧长",
        "尺规作图"
      ],
      "formula": "① 外接圆圆心 = 任意两条边垂直平分线的交点（外心）\n② 等边三角形边长 a = 6√3，外接圆半径 R = a/√3 = 6\n③ 圆心角 ∠AOB = 120°（三条弧相等）\n④ 弧 AB = 120π×6/180 = 4π",
      "diff": 2,
      "focus": "plan",
      "ask": "如图，△ABC 为等边三角形。\n（1）求作：△ABC 外接圆 ⊙O。（不写作法，保留作图痕迹）\n（2）在（1）所作的图形中，若 △ABC 的边长为 6√3，求弧 AB 的长。",
      "tip": "外心是两条边垂直平分线的交点；等边三角形的外心把圆周三等分。",
      "solution": [
        "(1) 分别作 BC、AC 的垂直平分线，交于点 O；以 O 为圆心、OA 为半径作圆，即为所求外接圆。",
        "(2) 作 OD ⊥ AB 于 D，则 AD = AB/2 = 3√3。等边三角形中 ∠C = 60°，外心角 ∠AOB = 2∠C = 120°，所以 ∠BOD = 60°。",
        "在 Rt△BOD 中，OB = BD/sin60° = 3√3 ÷ (√3/2) = 6，即半径 R = 6。",
        "弧 AB = 120πR/180 = 120 × π × 6 ÷ 180 = 4π。",
        "坑：把弧 AB 当成弧 AB 所对弦长；或用错圆心角（等边三角形是 120°，不是 60°）。"
      ],
      "steps": [
        {
          "pt": 4,
          "type": "choice",
          "label": "(1) 外心是下列哪两条线的交点",
          "options": [
            "两边的垂直平分线",
            "两边的中线",
            "两角的角平分线",
            "两边的高"
          ],
          "ans": 0
        },
        {
          "pt": 5,
          "type": "num",
          "label": "(2) 外接圆半径 R =",
          "ans": 6
        },
        {
          "pt": 5,
          "type": "choice",
          "label": "(2) 弧 AB 的长 =",
          "options": [
            "4π",
            "2π",
            "6π",
            "12π"
          ],
          "ans": 0
        }
      ],
      "fig": {
        "w": 280,
        "h": 210,
        "svg": "<polygon points=\"140,25 55,175 225,175\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1.5\"/><circle cx=\"140\" cy=\"125\" r=\"100\" fill=\"none\" stroke=\"#1b2430\" stroke-width=\"1\"/><circle cx=\"140\" cy=\"115\" r=\"2.6\" fill=\"#1b2430\"/><text x=\"134\" y=\"18\" font-size=\"15\" font-family=\"serif\">A</text><text x=\"38\" y=\"192\" font-size=\"15\" font-family=\"serif\">B</text><text x=\"228\" y=\"192\" font-size=\"15\" font-family=\"serif\">C</text><text x=\"148\" y=\"112\" font-size=\"15\" font-family=\"serif\">O</text>"
      }
    },
    {
      "id": "w12q16",
      "no": "16",
      "group": "解答",
      "type": "solve",
      "score": 18,
      "kp": [
        "圆的基本性质",
        "垂径定理",
        "二次函数",
        "拱桥建模",
        "待定系数法"
      ],
      "formula": "① 圆弧形：跨度 AC=40，拱高 BD=10。设半径 R：R² = 20² + (R−10)² ⟹ R = 25\n② 抛物线形：以水面为 x 轴、MN 中点为原点，设 y = ax² + c，代 N(5,0)、P(0,4) ⟹ a = −4/25，c = 4\n③ 水位升 2 m：圆桥 OE = 25−10+2 = 17，EF = √(25²−17²) = 4√21，水面宽 2EF = 8√21；抛物桥 y=2 时 x = ±5√2/2，宽 5√2",
      "diff": 3,
      "focus": "model",
      "ask": "古往今来，桥给人们的生活带来便利。中国桥梁的桥拱线大多采用圆弧形、抛物线形和悬链形。赵州桥的主桥拱便是圆弧形。\n（1）某桥 A 主桥拱是圆弧形（图①的弧 ABC），已知跨度 AC = 40 m，拱高 BD = 10 m，则这条桥主桥拱的半径是 ______ m；\n（2）某桥 B 的主桥拱是抛物线形（图②），若水面宽 MN = 10 m，拱顶 P（抛物线顶点）距离水面 4 m，求桥拱抛物线的解析式；\n（3）如图③，某时桥 A 和桥 B 的桥下水位均上升了 2 m，求此时两桥的水面宽度。",
      "tip": "圆拱用垂径定理 + 勾股；抛物线拱以水面为 x 轴建系。",
      "solution": [
        "(1) 设圆心 O 在 BD 延长线上，半径 R = OA = OB。由垂径定理 AD = 20，OD = R − 10。",
        "Rt△ODA：R² = 20² + (R − 10)² = 400 + R² − 20R + 100，解得 20R = 500，R = 25（m）。",
        "(2) 以水面所在直线为 x 轴、MN 中点为原点建系：N(5, 0)，顶点 P(0, 4)。设 y = ax² + c，代入得 c = 4，25a + 4 = 0 ⟹ a = −4/25。抛物线为 y = −(4/25)x² + 4。",
        "(3) 桥 A：OF = 25，OD = 25 − 10 = 15，水位升 2 m 后 OE = 17。EF = √(25² − 17²) = √336 = 4√21，水面宽 FG = 2EF = 8√21（m）。",
        "桥 B：令 y = 2，则 −(4/25)x² + 4 = 2，x² = 25/2，x = ±5√2/2，水面宽 = 5√2（m）。",
        "坑：圆拱半径别把拱高当半径；抛物线建模别忘了顶点在 y 轴上（c=4）。"
      ],
      "steps": [
        {
          "pt": 4,
          "type": "num",
          "label": "(1) 主桥拱半径 =",
          "ans": 25,
          "unit": "m"
        },
        {
          "pt": 4,
          "type": "coef",
          "label": "(2) 抛物线解析式 y =",
          "tpl": "{0}x² + {1}",
          "ans": [
            -0.16,
            4
          ]
        },
        {
          "pt": 5,
          "type": "choice",
          "label": "(3) 桥 A 此时水面宽 =",
          "options": [
            "8√21 m",
            "4√21 m",
            "16√21 m",
            "34 m"
          ],
          "ans": 0
        },
        {
          "pt": 5,
          "type": "choice",
          "label": "(3) 桥 B 此时水面宽 =",
          "options": [
            "5√2 m",
            "5√3 m",
            "10√2 m",
            "8√21 m"
          ],
          "ans": 0
        }
      ]
    },
    {
      "id": "w12q17",
      "no": "附加",
      "group": "附加题",
      "type": "solve",
      "score": 20,
      "kp": [
        "二次函数",
        "对称轴",
        "等腰三角形存在性",
        "取值范围",
        "直线与抛物线交点"
      ],
      "formula": "① 对称轴 x = −b/(2a) = 3 ⟹ b = −6a\n② a=1,c=9 ⟹ b=−6，y = x²−6x+9 = (x−3)²，D(3,0)，C(0,9)。设 P(3,p)：CP² = p²−18p+90，DP² = p²，CD² = 90\n③ CP=DP ⟹ p=5；CP=CD ⟹ p=18；DP=CD ⟹ p=3±√10\n④ 直线 OD 与抛物线另一交点 E 横坐标 2/a+3 ⟹ c = 9a+6。y = ax²−6ax+9a+6 = a(x−3)²+6，x∈(0,5)：最小 6（顶点），最大趋近 x=0 处 9a+6（取不到）",
      "diff": 3,
      "focus": "plan",
      "ask": "（附加题 20 分）平面直角坐标系 xOy 中，抛物线 G: y = ax² + bx + c（a > 0）的对称轴是直线 x = 3，抛物线的顶点为 D。\n（1）用含 a 的式子表示 b；\n（2）若 a = 1，c = 9，抛物线与 y 轴交于点 C，点 P 是抛物线对称轴上的一点，当 △CDP 为等腰三角形时，求点 P 的坐标；\n（3）若直线 OD 与抛物线 G 的另一个交点 E 的横坐标为 2/a + 3，求 y = ax² + bx + c 在 0 < x < 5 时的取值范围（用含 a 的式子表示）。",
      "tip": "对称轴定 b；等腰三角形分三种边相等；取值范围看顶点与离对称轴最远的端点。",
      "solution": [
        "(1) 对称轴 x = −b/(2a) = 3，所以 b = −6a。",
        "(2) a = 1 ⟹ b = −6，抛物线 y = x² − 6x + 9 = (x − 3)²，顶点 D(3, 0)，与 y 轴交点 C(0, 9)。设 P(3, p)。",
        "CP² = 3² + (p − 9)² = p² − 18p + 90，DP² = p²，CD² = 3² + 9² = 90。",
        "① CP = DP：p² − 18p + 90 = p² ⟹ p = 5，P(3, 5)。② CP = CD：p² − 18p + 90 = 90 ⟹ p = 0（舍）或 18，P(3, 18)。③ DP = CD：p² = 90 ⟹ p = ±3√10，P(3, 3+√10) 或 (3, 3−√10)。",
        "综上 P 为 (3,5)、(3,18)、(3,3+√10)、(3,3−√10)。",
        "(3) D(3, −9a+c)，直线 OD：y = [(−9a+c)/3]x。联立抛物线，利用另一交点横坐标 2/a+3，代入得 2/a + 3 − (−6a + (−9a+c)/3)/a = 2/a + 6 + (9a−c)/(3a)…化简得 9a + 6 = −(−9a+c) + 15a…解得 c = 9a + 6。",
        "于是 y = ax² − 6ax + 9a + 6 = a(x−3)² + 6。x∈(0,5) 时顶点 x=3 处取最小值 6；离对称轴最远的是 x→0（距离 3 > 2），y→9a+6 但取不到。所以 6 ≤ y < 9a + 6。",
        "坑：等腰三角形漏掉「CD 为腰」的两种情况；取值范围右端误写成 ≤（x=0 不在区间内）。"
      ],
      "steps": [
        {
          "pt": 4,
          "type": "coef",
          "label": "(1) b =",
          "tpl": "{0}a",
          "ans": [
            -6
          ]
        },
        {
          "pt": 10,
          "type": "choice",
          "label": "(2) 点 P 的坐标（全部）",
          "options": [
            "(3,5)、(3,18)、(3,3+√10)、(3,3−√10)",
            "(3,5)、(3,18)",
            "(3,3+√10)、(3,3−√10)",
            "(3,5)、(3,3+√10)"
          ],
          "ans": 0
        },
        {
          "pt": 6,
          "type": "choice",
          "label": "(3) 0 < x < 5 时的取值范围",
          "options": [
            "6 ≤ y < 9a+6",
            "6 < y < 9a+6",
            "6 ≤ y ≤ 9a+6",
            "0 ≤ y < 9a+6"
          ],
          "ans": 0
        }
      ]
    }
  ]
});
