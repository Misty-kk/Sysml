import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, TableOfContents,
  AlignmentType, BorderStyle, ShadingType, WidthType,
  PageBreak, Header, Footer, PageNumber, NumberFormat,
  LevelFormat, convertInchesToTwip,
} from "docx";
import * as fs from "fs";

// ── Helpers ────────────────────────────────────────────────────────────────

const FONT = "Microsoft YaHei";
const FONT_SIZE = 22; // half-points = 11pt
const CODE_FONT = "Consolas";
const CODE_SIZE = 18; // 9pt
const PRIMARY_COLOR = "1a56db";
const HEADING_COLOR = "1e3a5f";
const TABLE_HEADER_BG = "1a56db";
const CODE_BG = "f4f5f7";
const BORDER_COLOR = "d1d5db";

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, font: FONT, size: 36, bold: true, color: HEADING_COLOR })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, font: FONT, size: 30, bold: true, color: HEADING_COLOR })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, font: FONT, size: 26, bold: true, color: HEADING_COLOR })],
  });
}

function para(text, opts = {}) {
  const runs = [];
  if (typeof text === "string") {
    runs.push(new TextRun({ text, font: FONT, size: FONT_SIZE, ...opts }));
  } else if (Array.isArray(text)) {
    text.forEach(t => {
      if (typeof t === "string") runs.push(new TextRun({ text: t, font: FONT, size: FONT_SIZE }));
      else runs.push(new TextRun({ font: FONT, size: FONT_SIZE, ...t }));
    });
  }
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    children: runs,
  });
}

function boldPara(label, text) {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    children: [
      new TextRun({ text: label, font: FONT, size: FONT_SIZE, bold: true }),
      new TextRun({ text, font: FONT, size: FONT_SIZE }),
    ],
  });
}

function bullet(text, level = 0) {
  const indent = level * 720;
  return new Paragraph({
    spacing: { after: 80, line: 340 },
    indent: { left: 360 + indent },
    children: [
      new TextRun({ text: "• ", font: FONT, size: FONT_SIZE, color: PRIMARY_COLOR }),
      new TextRun({ text, font: FONT, size: FONT_SIZE }),
    ],
  });
}

function numberedBullet(num, text) {
  return new Paragraph({
    spacing: { after: 80, line: 340 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: `${num}. `, font: FONT, size: FONT_SIZE, bold: true }),
      new TextRun({ text, font: FONT, size: FONT_SIZE }),
    ],
  });
}

function codeBlock(lines) {
  const content = Array.isArray(lines) ? lines : [lines];
  return content.map(line => new Paragraph({
    shading: { type: ShadingType.SOLID, color: CODE_BG, fill: CODE_BG },
    spacing: { after: 0, line: 280 },
    indent: { left: 360, right: 360 },
    children: [new TextRun({ text: line || " ", font: CODE_FONT, size: CODE_SIZE })],
  }));
}

function admonition(type, title, body) {
  const labelColors = {
    note: "2563eb", warning: "dc2626", tip: "16a34a",
    info: "0891b2", example: "9333ea", danger: "dc2626",
  };
  const color = labelColors[type] || "6b7280";
  const paragraphs = [
    new Paragraph({
      spacing: { before: 200, after: 80 },
      indent: { left: 240 },
      border: { left: { style: BorderStyle.SINGLE, size: 6, color } },
      children: [
        new TextRun({ text: `[${title}] `, font: FONT, size: FONT_SIZE, bold: true, color }),
      ],
    }),
  ];
  const bodyLines = Array.isArray(body) ? body : [body];
  bodyLines.forEach(b => {
    paragraphs.push(new Paragraph({
      spacing: { after: 80, line: 340 },
      indent: { left: 480 },
      children: [new TextRun({ text: b, font: FONT, size: FONT_SIZE })],
    }));
  });
  return paragraphs;
}

function makeTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      width: colWidths ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
      shading: { type: ShadingType.SOLID, color: TABLE_HEADER_BG, fill: TABLE_HEADER_BG },
      children: [new Paragraph({
        spacing: { after: 0, before: 0 },
        children: [new TextRun({ text: h, font: FONT, size: FONT_SIZE, bold: true, color: "ffffff" })],
      })],
    })),
  });

  const dataRows = rows.map(row => new TableRow({
    children: row.map((cell, i) => new TableCell({
      width: colWidths ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
      children: [new Paragraph({
        spacing: { after: 0, before: 0 },
        children: [new TextRun({ text: cell, font: FONT, size: FONT_SIZE })],
      })],
    })),
  }));

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 0 }, children: [] });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ── Cover Page ─────────────────────────────────────────────────────────────

function coverPage() {
  return [
    emptyLine(), emptyLine(), emptyLine(), emptyLine(),
    emptyLine(), emptyLine(), emptyLine(), emptyLine(),
    emptyLine(), emptyLine(), emptyLine(), emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new TextRun({ text: "SysML DocGen", font: FONT, size: 72, bold: true, color: PRIMARY_COLOR })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "用户手册", font: FONT, size: 56, bold: true, color: HEADING_COLOR })],
    }),
    emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: "基于 SysML 模型的文档自动生成系统", font: FONT, size: 28, color: "6b7280" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: "\"模型一次编辑，文档处处复用\"", font: FONT, size: 24, italics: true, color: "9ca3af" })],
    }),
    emptyLine(), emptyLine(), emptyLine(), emptyLine(),
    emptyLine(), emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "版本 1.0  |  2024年", font: FONT, size: FONT_SIZE, color: "9ca3af" })],
    }),
    pageBreak(),
  ];
}

// ── Chapter 1: 系统概述 ────────────────────────────────────────────────────

function chapter1() {
  return [
    h1("1. 系统概述"),
    para("SysML DocGen 是一个基于 SysML 模型的文档自动生成系统。核心理念是 “模型一次编辑，文档处处复用”——您在系统中建立的 SysML 模型作为唯一可信源，系统自动从中生成一致、可追溯的工程文档。"),

    h2("数据流"),
    para("系统的数据流如下：外部工程工具（Cameo/MagicDraw、Jupyter Notebook、MATLAB）通过 MDK 工具集成套件将模型数据和验证证据推送到 MMS 模型管理系统；MMS 通过 REST API 为 VE 视图编辑器提供数据，同时为 DocGen 文档生成引擎提供模板数据；DocGen 最终输出 HTML、Markdown、PDF 和 Word 格式的文档。"),

    h2("四大组件"),
    para([
      { text: "MMS（模型管理系统）：", bold: true },
      "模型存储、版本控制、分支管理、审计日志。",
    ]),
    para([
      { text: "VE（视图编辑器）：", bold: true },
      "Web 端模型浏览与编辑、图形化建模、追溯分析。",
    ]),
    para([
      { text: "MDK（工具集成套件）：", bold: true },
      "与 Jupyter、MATLAB、Cameo 等外部工具集成。",
    ]),
    para([
      { text: "DocGen（文档生成引擎）：", bold: true },
      "基于模板生成 HTML、Markdown、PDF、Word 文档。",
    ]),

    pageBreak(),
  ];
}

// ── Chapter 2: 快速入门 ────────────────────────────────────────────────────

function chapter2() {
  return [
    h1("2. 快速入门"),

    h2("2.1 启动系统"),
    h3("Windows 本地"),
    ...codeBlock([
      "# 1. 安装 Python 依赖",
      "pip install -r requirements.txt",
      "",
      "# 2. 构建前端",
      "cd frontend",
      "npm install",
      "npm run build",
      "cd ..",
      "",
      "# 3. 启动服务",
      "python server.py --host 127.0.0.1 --port 8000",
    ]),
    h3("Docker"),
    ...codeBlock(["docker compose up --build"]),
    ...admonition("warning", "注意", "如果 frontend/dist 目录不存在，服务会返回错误提示。请确保已执行 npm run build。"),

    h2("2.2 登录"),
    para("打开浏览器访问 http://127.0.0.1:8000，使用以下演示账号登录："),
    makeTable(
      ["用户名", "密码", "说明"],
      [
        ["teacher", "teacher123", "拥有独立的示例项目"],
        ["engineer", "engineer123", "拥有独立的示例项目"],
        ["reviewer", "reviewer123", "拥有独立的示例项目"],
      ],
      [25, 25, 50]
    ),
    ...admonition("info", "账号隔离", "每个账号登录后只能看到和操作自己的项目数据，互不干扰。所有账号都是普通用户。"),

    h2("2.3 典型工作流程"),
    para("登录系统 → 选择/创建项目 → 编辑 SysML 元素 → 图形建模建立关系 → 追溯矩阵检查需求闭环 → （如未闭环则继续编辑）→ 提交版本快照 → 生成文档 → 下载 HTML/PDF/MD/DOCX。"),

    pageBreak(),
  ];
}

// ── Chapter 3: 界面导航 ────────────────────────────────────────────────────

function chapter3() {
  return [
    h1("3. 界面导航"),
    para("登录后进入主界面，左侧为导航栏，右侧为内容区。"),

    h2("3.1 侧边栏"),
    para("侧边栏分为两个分组："),
    makeTable(
      ["分组", "菜单项", "功能"],
      [
        ["项目组合区", "总览 (Overview)", "查看所有项目概况和统计数据"],
        ["", "项目 (Projects)", "创建和管理项目"],
        ["", "工作区 (Workspace)", "进入模型工作台的入口面板"],
        ["项目工作区", "模型 (Model)", "浏览和编辑 SysML 模型元素"],
        ["", "视图 (Views)", "管理视图和视点"],
        ["", "图形 (Graph)", "交互式图形建模"],
        ["", "追溯 (Trace)", "需求追溯矩阵"],
        ["", "版本 (Versions)", "版本控制和分支管理"],
        ["", "文档 (Docs)", "文档生成模板编辑和导出"],
        ["", "MDK", "外部工具模型导入"],
        ["", "助手 (Assistant)", "AI 问答助手"],
      ],
      [20, 30, 50]
    ),

    h2("3.2 顶部栏"),
    makeTable(
      ["控件", "快捷键", "功能"],
      [
        ["搜索框", "Ctrl+K", "全局搜索命令"],
        ["主题切换", "—", "亮色 / 暗色 / 跟随系统"],
        ["用户头像", "—", "个人信息、退出登录"],
      ],
      [30, 25, 45]
    ),

    pageBreak(),
  ];
}

// ── Chapter 4: 项目管理 ────────────────────────────────────────────────────

function chapter4() {
  return [
    h1("4. 项目管理"),

    h2("4.1 项目类型"),
    makeTable(
      ["类型", "标识", "说明"],
      [
        ["个人工作台", "workspace", "每个用户私有的工作空间，登录后自动创建"],
        ["共享项目", "shared", "多人协作的项目，有成员和权限管理"],
        ["个人副本", "copy", "从共享项目复制到个人工作台的副本"],
      ],
      [20, 20, 60]
    ),
    para("工作流程：个人工作台 → 发布到共享库 → 共享项目；共享项目 → 复制到我的工作台 → 个人副本；共享项目可直接编辑（editor角色）或只读查看（viewer角色）。"),

    h2("4.2 创建项目"),
    numberedBullet("1", "点击左侧导航栏的 项目 (Projects)"),
    numberedBullet("2", "点击 新建共享项目"),
    numberedBullet("3", "填写项目信息："),
    bullet("项目 ID：唯一标识符（如 satellite-power）"),
    bullet("项目名称：显示名称（如“卫星电源系统”）"),
    bullet("描述：项目简要说明"),
    bullet("成员：添加协作者，格式为 用户名:角色"),
    ...admonition("example", "成员格式示例", "teacher:editor, reviewer:viewer（支持逗号、分号或换行分隔）"),

    h2("4.3 发布与复制"),
    boldPara("发布到共享库：", "将个人工作台中的项目发布为共享项目。在项目列表中找到要发布的项目，点击“发布到共享库”，设置项目名称和成员，系统会复制当前项目内容生成共享项目。"),
    ...admonition("tip", "提示", "发布后原项目不受影响，共享项目是一个独立的副本。"),
    boldPara("从共享库复制：", "将共享项目复制到自己的工作台。在项目列表中看到共享项目，点击“复制到我的工作台”，系统会在您的工作台创建一份私有副本。"),

    h2("4.4 管理成员"),
    ...admonition("warning", "权限要求", "只有项目所有者 (owner) 可以管理成员。"),
    para("操作步骤：打开共享项目 → 点击“管理成员” → 添加/修改/删除成员及其角色。"),

    pageBreak(),
  ];
}

// ── Chapter 5: 模型编辑 ────────────────────────────────────────────────────

function chapter5() {
  return [
    h1("5. 模型编辑"),
    para("模型编辑是系统的核心功能，用于创建和管理 SysML 模型元素。"),

    h2("5.1 选择项目与分支"),
    para("进入模型编辑页面前，先在顶部项目上下文栏中选择要操作的项目和分支。默认分支为 main。"),

    h2("5.2 元素类型总览"),
    para("系统支持 9 种 SysML 元素类型："),
    makeTable(
      ["类型", "含义", "示例"],
      [
        ["Requirement", "系统应满足的功能或约束", "电池容量不低于 100Ah"],
        ["Block", "系统的物理或逻辑组件", "太阳能电池板、电源控制器"],
        ["Interface", "组件间的交互规范", "电源总线接口"],
        ["Port", "模块的交互点", "电源输出端口"],
        ["Constraint", "系统必须遵守的规则或方程", "总功耗 ≤ 500W"],
        ["Activity", "系统的动态行为", "太阳能电池展开流程"],
        ["State", "系统或组件的状态机", "正常模式、安全模式"],
        ["TestCase", "验证需求是否满足的测试", "电池容量放电测试"],
        ["View", "从特定角度组织模型元素", "电源子系统视图"],
      ],
      [20, 40, 40]
    ),

    h2("5.3 浏览与搜索元素"),
    bullet("使用类型过滤器按元素类型筛选"),
    bullet("使用搜索框按 ID 或名称搜索"),
    bullet("点击元素行选中，右侧显示详情面板"),

    h2("5.4 创建元素"),
    numberedBullet("1", "点击 新建元素"),
    numberedBullet("2", "填写元素信息："),
    bullet("ID：唯一标识符，建议使用前缀约定"),
    bullet("名称：元素的显示名称"),
    bullet("类型：从 9 种类型中选择"),
    bullet("描述：元素的文字说明"),
    numberedBullet("3", "点击 保存"),
    ...admonition("tip", "ID 命名建议", [
      "推荐使用前缀约定方便管理：",
      "REQ-XXX — Requirement 需求",
      "BLK-XXX — Block 结构块",
      "IF-XXX — Interface 接口",
      "TST-XXX — TestCase 测试用例",
      "CST-XXX — Constraint 约束",
    ]),

    h2("5.5 编辑元素"),
    para("选中元素后，右侧详情面板可编辑："),
    bullet("基本信息：名称、描述、类型、所有者"),
    bullet("构造型 (stereotype)：元素的分类标记"),
    bullet("属性 (attributes)：自定义键值对扩展属性"),
    bullet("关系 (relations)：与其他元素的追溯关系"),
    para("修改后自动保存。"),

    h2("5.6 建立关系"),
    para("在元素的关系面板中，可以添加与其他元素的关系："),
    makeTable(
      ["关系类型", "说明", "源 → 目标"],
      [
        ["satisfy", "满足", "Block → Requirement"],
        ["verify", "验证", "TestCase → Requirement"],
        ["refine", "精化", "任意元素 → Requirement"],
        ["compose", "组成", "父 Block → 子 Block"],
        ["expose", "暴露", "Block → Interface"],
        ["connect", "连接", "Port → Port"],
        ["allocate", "分配", "Activity → Block"],
        ["flow", "流转", "State → State"],
        ["transition", "转换", "State → State"],
        ["constrain", "约束", "Constraint → Block"],
      ],
      [20, 35, 45]
    ),

    h2("5.7 语义校验"),
    para("系统自动对模型进行语义校验，检查以下问题："),
    bullet("元素是否缺少必要属性"),
    bullet("需求是否有对应的满足/验证关系"),
    bullet("接口是否被至少一个模块暴露"),
    bullet("关系目标元素是否存在"),
    bullet("视点中的元素是否符合过滤条件"),
    para("校验结果实时显示在校验面板中："),
    bullet("错误 (Error)：严重问题，影响模型完整性"),
    bullet("警告 (Warning)：建议修复的改进项"),
    ...admonition("tip", "AI 辅助修复", [
      "点击 AI 修复建议可以让 AI 分析问题并给出修复方案。",
      "点击自动修复可以直接应用规则化修复（如补充缺失的属性、清理无效关系等）。",
    ]),

    pageBreak(),
  ];
}

// ── Chapter 6: 视图与视点 ──────────────────────────────────────────────────

function chapter6() {
  return [
    h1("6. 视图与视点"),
    para("视图和视点用于从特定角度组织和查看模型元素。"),

    h2("6.1 概念对比"),
    makeTable(
      ["概念", "英文", "定义方式", "适用场景"],
      [
        ["视图", "View", "手动勾选元素", "为特定文档或评审准备固定的元素子集"],
        ["视点", "Viewpoint", "规则过滤（类型、所有者等）", "定义“从某个角度应该看到什么”的规则"],
      ],
      [15, 20, 30, 35]
    ),

    h2("6.2 创建视图"),
    numberedBullet("1", "进入 视图 (Views) 标签页"),
    numberedBullet("2", "点击 新建视图"),
    numberedBullet("3", "输入视图名称"),
    numberedBullet("4", "在元素列表中勾选要包含的元素"),
    numberedBullet("5", "保存"),

    h2("6.3 创建视点"),
    numberedBullet("1", "进入 视图 标签页"),
    numberedBullet("2", "点击 新建视点"),
    numberedBullet("3", "输入视点名称"),
    numberedBullet("4", "配置过滤条件：包含的元素类型、所有者筛选、关系类型筛选"),
    numberedBullet("5", "系统自动匹配符合条件的元素"),
    numberedBullet("6", "保存"),
    ...admonition("info", "视图/视点的用途", "创建好的视图和视点可以用于限定图形建模的展示范围和文档生成的输出范围。例如创建一个“电源子系统”视图，生成文档时只输出该子系统的相关内容。"),

    pageBreak(),
  ];
}

// ── Chapter 7: 图形建模 ────────────────────────────────────────────────────

function chapter7() {
  return [
    h1("7. 图形建模"),
    para("图形建模提供基于 ReactFlow 的交互式 SysML 模型关系图。"),

    h2("7.1 图类型"),
    boldPara("需求追溯图：", "展示 Requirement 及其 satisfy / verify / refine 关系。"),
    boldPara("结构与接口图：", "展示 Block、Interface、Port 及其 compose / expose / connect 关系。"),
    boldPara("行为与状态图：", "展示 Activity、State 及其 allocate / flow / transition 关系。"),
    boldPara("视图聚焦图：", "仅展示选定视图范围内的元素，适合关注特定子系统的建模。"),
    boldPara("完整模型图：", "展示所有元素和所有关系，适合全局概览。"),

    h2("7.2 交互操作"),
    makeTable(
      ["操作", "方式", "说明"],
      [
        ["拖拽节点", "鼠标拖拽", "自由调整节点位置，位置自动记忆"],
        ["缩放", "鼠标滚轮", "放大/缩小画布"],
        ["选中元素", "点击节点", "右侧面板显示详情，可直接编辑"],
        ["添加关系", "拖拽节点连接点", "从节点边缘拖出连线到目标节点"],
        ["切换图类型", "顶部下拉菜单", "在不同图类型间切换"],
      ],
      [20, 35, 45]
    ),
    ...admonition("tip", "提示", "节点位置会自动持久化，下次打开图形时保留上次的布局。"),

    pageBreak(),
  ];
}

// ── Chapter 8: 追溯矩阵 ────────────────────────────────────────────────────

function chapter8() {
  return [
    h1("8. 追溯矩阵"),
    para("追溯矩阵以表格形式展示需求的闭环情况，是 MBSE 中最关键的视图之一。"),

    h2("8.1 矩阵结构"),
    para("每行对应一个 Requirement，展示以下信息："),
    bullet("需求 ID / 名称 — 需求的基本信息"),
    bullet("满足 (Satisfy) — 哪些 Block 满足了该需求"),
    bullet("验证 (Verify) — 哪些 TestCase 验证了该需求"),
    bullet("约束 (Constrain) — 哪些 Constraint 约束了相关组件"),
    bullet("状态 — 闭环状态"),

    h2("8.2 闭环状态"),
    makeTable(
      ["状态", "条件"],
      [
        ["已闭环 (closed)", "需求同时有满足和验证关系"],
        ["部分闭环 (partial)", "只有满足或只有验证"],
        ["未闭环 (open)", "既无满足也无验证"],
      ],
      [35, 65]
    ),
    ...admonition("tip", "AI 闭环建议", "点击状态标签查看缺失的具体关系，点击 AI 闭环建议可以让 AI 推荐应添加的 TestCase 或 Constraint 来填补追溯缺口。"),

    pageBreak(),
  ];
}

// ── Chapter 9: 版本控制 ────────────────────────────────────────────────────

function chapter9() {
  return [
    h1("9. 版本控制"),
    para("系统内置轻量级版本控制，支持分支、提交、标签、差异比较和回滚。"),

    h2("9.1 版本控制工作流"),
    para("典型工作流：在 main 分支上进行初始开发 → 创建 feature 分支进行独立修改 → 在 feature 分支上完成修改后合并回 main → 为里程碑提交打上标签（如 v1.0）。"),

    h2("9.2 操作说明"),

    h3("分支管理"),
    bullet("默认分支：每个项目自动生成 main 分支"),
    bullet("创建分支：点击 新建分支，输入分支名称"),
    bullet("切换分支：使用顶部的分支切换器"),
    bullet("合并分支：选择源分支，合并到当前分支"),

    h3("提交快照"),
    numberedBullet("1", "在当前分支上完成模型修改"),
    numberedBullet("2", "进入 版本 (Versions) 标签页"),
    numberedBullet("3", "输入提交信息（如“添加电池需求”）"),
    numberedBullet("4", "点击 提交"),
    ...admonition("tip", "提交信息建议", [
      "使用清晰的提交信息便于后续追溯，如：",
      "“添加 REQ-001~REQ-005 卫星电源需求”",
      "“新增 BLK-SOLAR 太阳能电池板模块”",
      "“修复 TST-003 测试用例的验证关系”",
    ]),

    h3("标签"),
    para("为重要提交打上标签以标记里程碑：选择一个提交 → 点击 创建标签 → 输入标签名称（如 v1.0、baseline-review）。"),

    h3("差异比较"),
    para("比较两个版本之间的变化：选择两个提交（或一个提交与当前工作区）→ 点击 差异比较 → 查看新增、修改、删除的元素。"),
    ...admonition("info", "AI 影响分析", "差异比较同时支持 AI 影响分析，可以自动评估变更对系统的影响范围。"),

    h3("回滚"),
    para("将当前分支恢复到历史提交的状态：选择目标提交 → 点击 回滚 → 确认操作。"),
    ...admonition("warning", "注意", "回滚会重置当前分支的元素到历史状态，建议回滚前先创建一个备份分支。"),

    pageBreak(),
  ];
}

// ── Chapter 10: 文档生成 ───────────────────────────────────────────────────

function chapter10() {
  return [
    h1("10. 文档生成"),
    para("DocGen 允许您通过模板定义文档结构和内容，一键生成工程文档。"),

    h2("10.1 界面布局"),
    para("进入 文档 (Docs) 标签页："),
    bullet("左侧：Monaco 代码编辑器，编写模板"),
    bullet("右侧：生成的文档实时预览"),
    bullet("顶部工具栏：生成、下载、AI 辅助功能"),

    h2("10.2 模板语法"),

    h3("元素引用"),
    makeTable(
      ["语法", "说明", "示例输出"],
      [
        ["{{element:ID.name}}", "元素名称", "电池容量需求"],
        ["{{element:ID.description}}", "元素描述", "电池在标准工况下..."],
        ["{{element:ID.type}}", "元素类型", "Requirement"],
        ["{{element:ID.owner}}", "元素所有者", "电源组"],
        ["{{element:ID.attributes.key}}", "自定义属性", "对应属性值"],
        ["{{element:ID.stereotype}}", "构造型", "functional"],
      ],
      [30, 25, 45]
    ),

    h3("模型级标记"),
    makeTable(
      ["语法", "说明"],
      [
        ["{{model:summary}}", "生成模型统计摘要（元素数量、类型分布等）"],
        ["{{table:requirements}}", "生成所有 Requirement 的表格"],
        ["{{table:blocks}}", "生成所有 Block 的表格"],
        ["{{table:interfaces}}", "生成所有 Interface 和 Port 的表格"],
        ["{{table:constraints}}", "生成所有 Constraint 的表格"],
        ["{{table:tests}}", "生成所有 TestCase 的表格"],
        ["{{trace:matrix}}", "生成需求追溯矩阵"],
        ["{{validation:issues}}", "生成语义校验结果列表"],
      ],
      [35, 65]
    ),

    h3("模板示例"),
    ...codeBlock([
      "# {{element:REQ-001.name}} 需求规格说明",
      "",
      "## 1. 概述",
      "{{element:REQ-001.description}}",
      "",
      "## 2. 需求清单",
      "{{table:requirements}}",
      "",
      "## 3. 系统结构",
      "{{table:blocks}}",
      "",
      "## 4. 追溯矩阵",
      "{{trace:matrix}}",
      "",
      "## 5. 校验结果",
      "{{validation:issues}}",
      "",
      "## 6. 模型统计",
      "{{model:summary}}",
    ]),

    h2("10.3 生成与下载"),
    numberedBullet("1", "在左侧编辑模板"),
    numberedBullet("2", "选择生成范围（完整模型或特定视图）"),
    numberedBullet("3", "点击 生成文档"),
    numberedBullet("4", "预览生成的 HTML 文档"),
    numberedBullet("5", "选择格式下载："),
    makeTable(
      ["格式", "要求"],
      [
        ["HTML", "无需额外依赖"],
        ["Markdown", "无需额外依赖"],
        ["PDF", "推荐安装 Pandoc，也可使用内置 fallback"],
        ["DOCX", "需要 Pandoc"],
      ],
      [30, 70]
    ),

    h2("10.4 AI 辅助"),
    makeTable(
      ["功能", "触发方式", "说明"],
      [
        ["AI 起草", "点击 AI 起草按钮", "AI 根据当前模型内容自动生成文档模板"],
        ["AI 质量审查", "点击 AI 审查按钮", "AI 评估生成的文档质量（0-100分），检查覆盖率、一致性和可读性"],
      ],
      [20, 30, 50]
    ),
    ...admonition("tip", "提升输出质量", [
      "安装 Pandoc 可显著提升 PDF 和 Word 输出质量：",
      "winget install pandoc",
      "安装后系统会自动启用语法高亮、智能排版等增强功能。",
    ]),

    pageBreak(),
  ];
}

// ── Chapter 11: 外部工具集成 ───────────────────────────────────────────────

function chapter11() {
  return [
    h1("11. 外部工具集成"),
    para("MDK（Model Development Kit）用于与外部工程工具交换模型结构和验证证据。当前界面按两类来源组织：建模工具提供模型结构，分析/仿真工具提供验证证据，MMS 负责统一管理模型、追踪关系、版本和文档生成。"),

    h2("11.1 Web 端导入流程"),
    para("Web 端导入流程：选择适配器 → 上传文件/粘贴内容 → 解析并查看映射结果 → 确认无误后导入到当前项目。"),

    h2("11.2 支持的适配器"),

    h3("SysML JSON Exchange"),
    para("结构化 JSON 模型文件，适合程序化导入导出。"),
    ...codeBlock([
      "{",
      '  "elements": [',
      "    {",
      '      "id": "REQ-001",',
      '      "name": "电池容量需求",',
      '      "type": "Requirement",',
      '      "attributes": { "text": "不低于 100Ah" }',
      "    }",
      "  ]",
      "}",
    ]),

    h3("XMI / Cameo Export"),
    para("标准 XMI 格式，也支持 Cameo / MagicDraw 导出的 XMI 文件级导入。"),
    ...admonition("note", "Cameo 边界", "当前不是完整 Cameo 插件或双向同步；Cameo 原生集成属于后续扩展。"),

    h3("SysML v2 Text / SysON"),
    para("SysON 或其他 SysML v2 工具导出的文本模型，目前支持轻量文本子集。"),

    h3("Jupyter Analysis Evidence"),
    para("Jupyter Notebook（.ipynb）中的分析结果、验证关系和需求验证证据。"),

    h3("MATLAB Simulation Evidence"),
    para("MATLAB 脚本（.m）中的仿真结果、测试用例和验证证据。"),

    h2("11.3 命令行工具"),
    ...codeBlock([
      "# 解析文件，查看映射结果",
      "python tools/mdk_sync.py parse --file data/import_example.json --tool json",
      "",
      "# 推送模型到 MMS（含自动提交和校验）",
      "python tools/mdk_sync.py push --file data/import_example.json --tool json --commit --validate",
      "",
      "# 从 MMS 拉取模型",
      "python tools/mdk_sync.py pull --format json --out data/exported_model.json",
      "python tools/mdk_sync.py pull --format xmi --out data/exported_model.xmi",
      "",
      "# 从命令行生成文档",
      "python tools/mdk_sync.py generate --format pdf --out data/generated_document.pdf",
      "python tools/mdk_sync.py generate --format docx --out data/generated_document.docx",
    ]),

    h2("11.4 Jupyter Notebook 集成"),
    para("在 Notebook 单元格中直接定义和同步模型元素："),
    ...codeBlock([
      "# 加载扩展并连接 MMS",
      "%load_ext mdk.jupyter.sysml_docgen_notebook",
      "%sysml_config --server http://127.0.0.1:8000 --project satellite-power --branch main --user engineer",
      "",
      "# 使用 Cell Magic 创建需求",
      '%%sysml_requirement REQ-001 "电池容量需求" --owner 电源组 --satisfy BLK-BATTERY',
      "电池在标准工况下容量不低于 100Ah。",
      "",
      "# 创建关联的测试用例",
      '%%sysml_test TST-001 "电池容量验证" --verifies REQ-001',
      "按照 GB/T 标准进行容量放电测试。",
      "",
      "# 校验模型",
      "%sysml_validate",
    ]),
    ...admonition("info", "更多信息", "Jupyter 集成支持 IPython Magic 和普通 Python API 两种方式，详细说明见 MDK 集成文档。"),

    pageBreak(),
  ];
}

// ── Chapter 12: AI 助手 ────────────────────────────────────────────────────

function chapter12() {
  return [
    h1("12. AI 助手"),
    para("系统内置了基于 DeepSeek 大模型的 AI 助手。"),
    ...admonition("warning", "前置条件", "使用 AI 功能需要设置环境变量 DEEPSEEK_API_KEY。未配置时 AI 相关功能仍会显示但返回“未配置”提示。"),

    h2("12.1 模型问答（RAG）"),
    para("在 助手 (Assistant) 标签页中，可以直接向 AI 提问关于当前模型的问题："),
    bullet("当前模型有哪些需求还没有被满足？"),
    bullet("电池模块的接口定义是什么？"),
    bullet("所有跟电源相关的约束有哪些？"),
    bullet("帮我总结一下这个项目的整体架构"),
    para("AI 使用 RAG（检索增强生成）技术，从当前模型中检索相关内容后给出回答，确保回答基于实际模型数据。"),

    h2("12.2 AI 功能一览"),
    makeTable(
      ["功能", "入口", "说明"],
      [
        ["模型问答", "助手标签页", "基于 RAG 的模型内容问答"],
        ["起草模板", "文档 → AI 起草", "根据模型自动生成文档模板"],
        ["文档质量审查", "文档 → AI 审查", "评估文档质量（0-100分）"],
        ["模型审查", "模型 → AI 审查", "审查需求清晰度、闭环、接口完整性"],
        ["闭环建议", "追溯 → AI 建议", "推荐应补充的 TestCase 或 Constraint"],
        ["修复建议", "校验面板 → AI 修复", "分析校验问题并给出修复方案"],
        ["自动修复", "校验面板 → 自动修复", "自动应用规则化修复"],
        ["影响分析", "版本 → 差异分析", "分析版本变更的影响范围"],
      ],
      [20, 35, 45]
    ),

    pageBreak(),
  ];
}

// ── Chapter 13: 协作功能 ───────────────────────────────────────────────────

function chapter13() {
  return [
    h1("13. 协作功能"),

    h2("13.1 角色与权限"),
    makeTable(
      ["角色", "查看", "编辑", "发布", "管理成员", "删除"],
      [
        ["owner", "✓", "✓", "✓", "✓", "✓"],
        ["editor", "✓", "✓", "✗", "✗", "✗"],
        ["viewer", "✓", "✗", "✗", "✗", "✗"],
      ],
      [18, 14, 14, 14, 20, 20]
    ),

    h2("13.2 协作场景"),

    h3("教师发布模板 → 学生独立练习"),
    para("教师创建项目并添加模型元素 → 发布到共享库（成员设置为 student:viewer）→ 学生查看共享项目 → 复制到我的工作台 → 自由编辑模型。"),

    h3("多人协同编辑共享项目"),
    para("所有者创建共享项目，添加多个 editor 成员 → 各编辑者创建自己的分支进行修改 → 分别合并到 main 分支汇总成果。"),

    pageBreak(),
  ];
}

// ── Chapter 14: 设置 ──────────────────────────────────────────────────────

function chapter14() {
  return [
    h1("14. 设置"),
    para("点击右上角用户头像 → 设置："),
    makeTable(
      ["分类", "可配置项"],
      [
        ["个人信息", "用户名、邮箱、个人简介、网站链接"],
        ["账户", "语言偏好、时区"],
        ["外观", "字体、主题（亮色/暗色/跟随系统）"],
        ["通知", "各类通知的开关"],
      ],
      [25, 75]
    ),

    pageBreak(),
  ];
}

// ── Chapter 15: 常见问题 ───────────────────────────────────────────────────

function chapter15() {
  return [
    h1("15. 常见问题"),

    h2("启动与运行"),
    boldPara("Q: 启动后无法访问前端页面？", ""),
    para("确保已执行 npm run build 构建前端。如果 frontend/dist/index.html 文件不存在，请运行："),
    ...codeBlock([
      "cd frontend",
      "npm install",
      "npm run build",
      "cd ..",
    ]),

    boldPara("Q: 如何切换数据存储后端？", ""),
    para("默认使用 SQLite（data/store.sqlite3）。如需使用 MongoDB："),
    ...codeBlock([
      '$env:SYSML_STORAGE="mongodb"',
      '$env:SYSML_MONGO_STRICT="true"',
      '$env:MONGO_URL="mongodb://127.0.0.1:27017"',
      "python server.py --host 127.0.0.1 --port 8000",
    ]),
    para("验证：访问 http://127.0.0.1:8000/api/ready，检查返回的 storage 字段。"),

    h2("文档生成"),
    boldPara("Q: PDF 生成失败？", ""),
    para("系统内置 fallback 引擎，不依赖外部工具。安装 Pandoc 可显著提升输出质量："),
    ...codeBlock(["winget install pandoc"]),
    para("可选 PDF 引擎：pip install weasyprint（轻量 HTML/CSS → PDF）、winget install MiKTeX.MiKTeX（LaTeX → PDF，功能最强）、winget install wkhtmltopdf（WebKit → PDF）。"),

    h2("AI 与权限"),
    boldPara("Q: AI 功能不可用？", ""),
    para("需要设置 DEEPSEEK_API_KEY 环境变量。未配置时 AI 按钮仍然显示但会返回“未配置”提示。"),

    boldPara("Q: 不同用户能看到彼此的项目吗？", ""),
    para("不能。每个用户的个人工作台是隔离的。只有被添加为共享项目成员才能看到该项目。"),

    h2("其他"),
    boldPara("Q: 如何查看 API 文档？", ""),
    para("启动服务后访问 http://127.0.0.1:8000/docs 查看交互式 OpenAPI（Swagger）文档。"),

    boldPara("Q: 演示账号的密码是什么？", ""),
    para("所有演示账号的密码都是 用户名 + 123（如 engineer → engineer123）。"),

    pageBreak(),
  ];
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const doc = new Document({
    creator: "SysML DocGen",
    title: "SysML DocGen 用户手册",
    description: "基于 SysML 模型的文档自动生成系统 - 用户手册",
    styles: {
      default: {
        document: {
          run: { font: FONT, size: FONT_SIZE },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "SysML DocGen 用户手册", font: FONT, size: 18, color: "9ca3af", italics: true }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "第 ", font: FONT, size: 18, color: "9ca3af" }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: "9ca3af" }),
                  new TextRun({ text: " 页", font: FONT, size: 18, color: "9ca3af" }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...coverPage(),

          // TOC placeholder
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "目录", font: FONT, size: 36, bold: true, color: HEADING_COLOR })],
          }),
          new TableOfContents("目录", {
            hyperlink: true,
            headingStyleRange: "1-3",
          }),
          pageBreak(),

          ...chapter1(),
          ...chapter2(),
          ...chapter3(),
          ...chapter4(),
          ...chapter5(),
          ...chapter6(),
          ...chapter7(),
          ...chapter8(),
          ...chapter9(),
          ...chapter10(),
          ...chapter11(),
          ...chapter12(),
          ...chapter13(),
          ...chapter14(),
          ...chapter15(),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = "../../docs/SysML_DocGen_用户手册.docx";
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ 用户手册已生成: ${outPath}`);
  console.log(`  文件大小: ${(buffer.byteLength / 1024).toFixed(1)} KB`);
}

main().catch(err => { console.error(err); process.exit(1); });
