/* 生成《北斗·产融智航系统 功能介绍》Word 文档
   结构：R1 封面(IG-1) → 正文 10 个区块：说明在上(标题+入口+描述) → 截图在下 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  TableLayoutType, VerticalAlign, TableOfContents,
} = require("docx");
const fs = require("fs");
const path = require("path");
const { imageSize } = require("image-size");

const ROOT = __dirname;
const SHOT = path.join(ROOT, "截图");

/* ================= 调色板 IG-1（金融墨金） ================= */
const PAL = {
  bg: "1A1A1A", primary: "FFFFFF", accent: "C9A84C",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "C9A84C", headerText: "1A1A1A", accentLine: "C9A84C", innerLine: "DDD5C0", surface: "F5F2E8" },
};
const BRAND = "C0202C"; // 品牌红（标题/强调）

/* ================= 封面辅助（design-system 配方函数） ================= */
function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([..."\uff0c\u3002\u3001\uff1b\uff1a\uff01\uff1f", ..."\u7684\u4e0e\u548c\u53ca\u4e4b\u5728\u4e8e\u4e3a", ..."-_\u2014\u2013\u00b7/", ..." \t"]);
  const lines = []; let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) { if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; } }
    }
    if (breakAt === -1) {
      breakAt = charsPerLine;
      const prevChar = remaining[breakAt - 1], nextChar = remaining[breakAt];
      if (prevChar && nextChar && !breakAfter.has(prevChar) && !breakAfter.has(nextChar) &&
          /[\u4e00-\u9fff]/.test(prevChar) && /[\u4e00-\u9fff]/.test(nextChar)) breakAt -= 1;
    }
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop(); lines[lines.length - 1] += last;
  }
  return lines;
}
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / (pt * 20));
  let titlePt = preferredPt, lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) { lines = splitTitleLines(title, charsPerLine(minPt)); titlePt = minPt; }
  return { titlePt, titleLines: lines };
}
function calcCoverSpacing(params) {
  const { titleLineCount = 1, titlePt = 36, hasSubtitle = false, hasEnglishLabel = false,
    metaLineCount = 0, fixedHeight = 800, pageHeight = 16838, marginTop = 0, marginBottom = 0 } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + fixedHeight + implicitParaHeight;
  const safeRemaining = Math.max(usableHeight - contentHeight, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45), rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing, midSpacing: Math.max(safeRemaining - topSpacing - bottomSpacing, 0), bottomSpacing };
}
const noBorders = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };
const allNoBorders = { ...noBorders, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } };

function buildCoverR1(config) {
  const P = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length, fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
      children: [new TextRun({ text: config.englishLabel.split("").join("  "), size: 18, color: P.accent, font: { ascii: "Calibri", eastAsia: "SimHei" }, characterSpacing: 40 })],
    }));
  }
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true, color: P.cover.titleColor, font: { eastAsia: "SimHei", ascii: "Arial" } })],
    }));
  }
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: P.cover.subtitleColor, font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    }));
  }
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: P.cover.metaColor, font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: P.cover.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: P.cover.footerColor, font: { ascii: "Arial" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders, children })],
    })],
  })];
}

/* ================= 正文构件 ================= */
// 功能区块：标题(带序号色块) → 入口行 → 描述(理念加粗红字) → 截图(居中,带细边框)
function block(no, title, entry, descRuns, imgFile, imgType, maxW) {
  const els = [];
  // 标题行
  els.push(new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 420, after: 120, line: 380, lineRule: "atLeast" },
    keepNext: true,
    children: [
      new TextRun({ text: " " + no + " ", size: 26, bold: true, color: "FFFFFF", font: { ascii: "Arial", eastAsia: "SimHei" }, shading: { type: ShadingType.CLEAR, fill: BRAND } }),
      new TextRun({ text: "  " + title, size: 30, bold: true, color: "1A1A1A", font: { eastAsia: "SimHei", ascii: "Arial" } }),
    ],
  }));
  // 入口行
  els.push(new Paragraph({
    spacing: { after: 100, line: 312 }, keepNext: true,
    border: { left: { style: BorderStyle.SINGLE, size: 10, color: PAL.accent, space: 8 } },
    indent: { left: 160 },
    children: [new TextRun({ text: "\u3010\u5165\u53e3\u3011", size: 21, bold: true, color: BRAND, font: { eastAsia: "SimHei" } }),
               ...entryRuns(entry)],
  }));
  // 描述段
  els.push(new Paragraph({
    spacing: { after: 160, line: 330 }, keepNext: true, alignment: AlignmentType.JUSTIFIED,
    children: descRuns,
  }));
  // 截图（等比缩放，PC 图最大 ~560pt 宽，移动端图 ~250pt 宽）
  const buf = fs.readFileSync(path.join(SHOT, imgFile));
  const dim = imageSize(buf);
  const displayWidth = maxW || 560;
  const displayHeight = Math.round(displayWidth * dim.height / dim.width);
  els.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new ImageRun({ data: buf, transformation: { width: displayWidth, height: displayHeight }, type: imgType })],
  }));
  // 图注
  els.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: entry.caption, size: 18, color: "8C9BAE", font: { eastAsia: "Microsoft YaHei" } })],
  }));
  return els;
}
// entry 字符串中的「xxx」片段加粗红字
function entryRuns(entry) {
  const runs = [];
  const re = /\u300c[^\u300d]+\u300d/g;
  let last = 0, m;
  while ((m = re.exec(entry)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: entry.slice(last, m.index), size: 21, color: "5A6B7E", font: { eastAsia: "Microsoft YaHei" } }));
    runs.push(new TextRun({ text: m[0], size: 21, bold: true, color: BRAND, font: { eastAsia: "Microsoft YaHei" } }));
    last = m.index + m[0].length;
  }
  if (last < entry.length) runs.push(new TextRun({ text: entry.slice(last), size: 21, color: "5A6B7E", font: { eastAsia: "Microsoft YaHei" } }));
  return runs;
}
// 描述 runs：数组 [text, isBold] 交替；"看得见/锁得准/推得动"等理念词由调用方标红
function desc(parts) {
  return parts.map(([t, style]) => {
    if (style === "red") return new TextRun({ text: t, size: 22, bold: true, color: BRAND, font: { eastAsia: "Microsoft YaHei" } });
    if (style === "bold") return new TextRun({ text: t, size: 22, bold: true, color: "1C2B3A", font: { eastAsia: "Microsoft YaHei" } });
    return new TextRun({ text: t, size: 22, color: "1C2B3A", font: { eastAsia: "Microsoft YaHei" } });
  });
}

/* ================= 文档 ================= */
const body = [];

// 文档主标题
body.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { before: 100, after: 60, line: 500, lineRule: "atLeast" },
  children: [new TextRun({ text: "\u5317\u6597\u00b7\u4ea7\u878d\u667a\u822a\u7cfb\u7edf", size: 44, bold: true, color: "1A1A1A", font: { eastAsia: "SimHei", ascii: "Arial" } })],
}));
body.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { after: 80, line: 380, lineRule: "atLeast" },
  children: [new TextRun({ text: "\u7cfb\u7edf\u529f\u80fd\u4ecb\u7ecd \u00b7 \u770b\u56fe\u8bf4\u8bdd", size: 28, bold: true, color: BRAND, font: { eastAsia: "SimHei" } })],
}));
body.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { after: 240 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PAL.accent, space: 6 } },
  children: [new TextRun({ text: "\u8ba9\u4ea7\u4e1a\u673a\u4f1a \u770b\u5f97\u89c1 \u00b7 \u9501\u5f97\u51c6 \u00b7 \u63a8\u5f97\u52a8 \u2014\u2014 \u6bcf\u5f20\u56fe\u544a\u8bc9\u4f60\uff1a\u70b9\u54ea\u91cc\u3001\u770b\u4ec0\u4e48", size: 22, color: "5A6B7E", font: { eastAsia: "Microsoft YaHei" } })],
}));

// 引言段
body.push(new Paragraph({
  spacing: { after: 120, line: 330 }, alignment: AlignmentType.JUSTIFIED,
  children: desc([
    ["\u66fe\u7ecf\uff0c\u9876\u7ea7\u54a8\u8be2\u624d\u80fd\u4ea4\u4ed8\u7684\u4ea7\u4e1a\u91d1\u878d\u65b9\u6cd5\u8bba\uff1b\u4eca\u5929\uff0cAI \u628a\u5b83\u53d8\u6210\u53ef\u590d\u5236\u7684\u81ea\u52a9\u80fd\u529b\u3002", "bold"],
    ["\u4ee5\u300c\u5341\u4e94\u4e94\u300d\u516d\u5f20\u7f51\u8d85 26 \u4e07\u4ebf\u6295\u8d44\u4e3a\u9996\u4e2a\u8d5b\u9053\uff0cAI \u628a\u5b8f\u89c2\u89c4\u5212\u7a7f\u900f\u6210\u4e00\u5f20\u53ef\u843d\u5730\u7684\u5ba2\u6237\u6e05\u5355\u2014\u2014\u65b9\u6cd5\u8bba\u53ef\u590d\u5236\u5230\u4efb\u4f55\u4ea7\u4e1a\u8d5b\u9053\u3002", ""],
  ]),
}));
body.push(new Paragraph({
  spacing: { after: 200, line: 330 }, alignment: AlignmentType.JUSTIFIED,
  children: desc([
    ["\u9876\u90e8\u4e00\u7ea7\u5bfc\u822a\u4ec5 5 \u9879\uff0c\u4efb\u610f\u7ad9\u70b9\u4e24\u6b21\u70b9\u51fb\u5185\u5230\u8fbe\uff0c\u5168\u7a0b\u65e0\u591a\u7ea7\u83dc\u5355\u3002\u4ee5\u4e0b\u6309\u4e1a\u52a1\u94fe\u8def\u9010\u533a\u5757\u4ecb\u7ecd\uff1a\u6bcf\u533a\u5757\u5148\u8bf4\u660e\u5165\u53e3\u4e0e\u529f\u80fd\uff0c\u518d\u9644\u5b9e\u62cd\u754c\u9762\u3002", ""],
  ]),
}));

// 01 首页
body.push(...block("01", "\u9996\u9875\uff1a\u673a\u4f1a\u5168\u666f\u4e0e\u4efb\u52a1\u5230\u4eba",
  "\u767b\u5f55\u5373\u8fbe\uff0c\u65e0\u9700\u70b9\u51fb\u3002\u53f3\u4e0a\u89d2\u5934\u50cf\u4e3a\u552f\u4e00\u89d2\u8272\u5207\u6362\u5165\u53e3\u3002\u56fe 1 \u00b7 \u5ba2\u6237\u7ecf\u7406\u9996\u9875\uff1a\u4efb\u52a1\u5f85\u529e\u4e0e\u91cd\u70b9\u673a\u4f1a\u6316\u6398",
  desc([
    ["\u770b\u5f97\u89c1", "red"],
    [" \u2014\u2014 \u673a\u4f1a\u4e0d\u7528\u7ffb\u62a5\u544a\u3002", ""],
    ["\u2460 \u4efb\u52a1\u5f85\u529e", "bold"],
    ["\u628a\u4eca\u5929\u8be5\u62dc\u8bbf\u8c01\u3001\u4e3a\u4ec0\u4e48\u662f\u5b83\u3001\u4e3b\u63a8\u4ec0\u4e48\u4ea7\u54c1\u76f4\u63a5\u5230\u4eba\u5230\u5361\uff1b\u9875\u9762\u4e0b\u65b9\u7684\u201c\u91cd\u70b9\u673a\u4f1a\u6316\u6398\u201d\u7531 AI \u4ece\u6807\u8baf\u3001\u4ea7\u4e1a\u52a8\u6001\u3001\u8206\u60c5\u7b49\u516c\u5f00\u4fe1\u53f7\u6301\u7eed\u7b5b\u51fa\uff0c\u6bcf\u6761\u5e26\u5339\u914d\u5ea6\u8bc4\u5206\u4e0e\u5b8c\u6574\u4f9d\u636e\uff0c\u53ef\u4e00\u952e\u8f6c\u4e3a\u8ddf\u8fdb\u4efb\u52a1\u3002", ""],
    ["\u2461 \u53f3\u4e0a\u89d2", "bold"],
    ["\u662f\u552f\u4e00\u7684\u89d2\u8272\u5207\u6362\u5165\u53e3\uff0c\u5ba2\u6237\u7ecf\u7406\u3001\u652f\u884c\u957f\u3001\u4ea7\u54c1\u7ecf\u7406\u3001\u90e8\u95e8\u8d1f\u8d23\u4eba\u56db\u4e2a\u89c6\u89d2\u4e00\u70b9\u5373\u6362\uff0c\u5168\u7a0b\u6ca1\u6709\u591a\u7ea7\u83dc\u5355\u3002", ""],
  ]),
  "01-\u9996\u9875-\u5ba2\u6237\u7ecf\u7406.jpg", "jpg"));

// 02 机会漏斗
body.push(...block("02", "\u673a\u4f1a\u6f0f\u6597\uff1a26 \u4e07\u4ebf\u7a7f\u900f\u6210\u53ef\u6570\u6e05\u5355",
  "\u9876\u90e8\u5bfc\u822a\u300c\u673a\u4f1a\u6f0f\u6597\u300d\uff0c1 \u6b21\u70b9\u51fb\u3002\u56fe 2 \u00b7 \u673a\u4f1a\u6f0f\u6597\u4f01\u4e1a\u603b\u89c8\uff1a389 \u5bb6\u516d\u5f20\u7f51\u4f01\u4e1a\u6e05\u5355",
  desc([
    ["\u770b\u5f97\u89c1", "red"],
    [" \u2014\u2014 \u300c\u5341\u4e94\u4e94\u300d\u516d\u5f20\u7f51\u8d85 26 \u4e07\u4ebf\u6295\u8d44\uff0c\u88ab AI \u7a7f\u900f\u6210 ", ""],
    ["389 \u5bb6\u53ef\u6570\u7684\u4f01\u4e1a\u6e05\u5355", "bold"],
    ["\uff1a\u6309\u65b0\u578b\u7535\u7f51\u3001\u7b97\u529b\u7f51\u3001\u7269\u6d41\u7f51\u7b49\u516d\u5f20\u7f51\u5206\u7ec4\uff0c\u6bcf\u5bb6\u5e26\u65b9\u5411\u00b7\u8fdb\u5c55\u00b7\u5730\u4f4d\u00b7\u6743\u91cd\u56db\u7ef4\u6807\u7b7e\u4e0e\u7efc\u5408\u8bc4\u5206\uff1b\u6807\u7b7e\u70b9\u9009\u5373\u7b5b\uff0c\u5b8f\u89c2\u673a\u4f1a\u843d\u5230\u4e00\u4efd\u53ef\u76f4\u63a5\u6267\u884c\u7684\u540d\u5355\u3002\u70b9\u4efb\u610f\u4e00\u884c\u7684\u300c\u8be6\u60c5\u300d\uff0c\u8fdb\u5165\u9501\u5b9a\u73af\u8282\u3002", ""],
  ]),
  "02-\u673a\u4f1a\u6f0f\u6597-\u4f01\u4e1a\u603b\u89c8.jpg", "jpg"));

// 03 企业详情
body.push(...block("03", "\u4f01\u4e1a\u8be6\u60c5\uff1a\u8bb2\u6e05\u201c\u4e3a\u4ec0\u4e48\u662f\u5b83\u201d",
  "\u4e0a\u4e00\u533a\u5757\u6f0f\u6597\u5217\u8868\u884c\u5185\u300c\u8be6\u60c5\u300d\u6309\u94ae\uff0c\u5171 2 \u6b21\u70b9\u51fb\u3002\u56fe 3 \u00b7 \u6c5f\u82cf\u4e2d\u5929\u79d1\u6280\u4f01\u4e1a\u8be6\u60c5\uff1a\u5ba2\u6237\u753b\u50cf\u4e0e\u591a\u6e90\u6570\u636e",
  desc([
    ["\u9501\u5f97\u51c6", "red"],
    [" \u2014\u2014 \u4e3a\u4ec0\u4e48\u662f\u5b83\uff0c\u4e00\u5c4f\u8bb2\u6e05\u3002", ""],
    ["\u2460 \u5ba2\u6237\u753b\u50cf", "bold"],
    ["\u7ed9\u51fa\u56db\u7ebf\u5f97\u5206 100\u3001\u6218\u7565\u5ba2\u6237\u3001\u7a81\u7834\u6863\u3001\u9ad8\u5ea6\u76f8\u5173\u7684\u5b8c\u6574\u4f9d\u636e\uff0c\u753b\u50cf\u5c0f\u7ed3\u76f4\u63a5\u5199\u660e\u5207\u5165\u8def\u5f84\u4e0e\u65f6\u70b9\u5efa\u8bae\uff1b\u5f80\u4e0b\u80a1\u4efd\u7a7f\u900f\u3001\u4e0a\u4e0b\u6e38\u3001AI \u4fe1\u53f7\u591a\u6e90\u4ea4\u53c9\u9a8c\u8bc1\uff0c\u4e0d\u662f\u62cd\u8111\u888b\u3002\u70b9", ""],
    ["\u2461\u300c\u67e5\u770b\u7efc\u5408\u670d\u52a1\u65b9\u6848\u203a\u300d", "bold"],
    ["\uff0c\u8fdb\u5165\u6253\u6cd5\u73af\u8282\u3002", ""],
  ]),
  "03-\u4f01\u4e1a\u8be6\u60c5-\u753b\u50cf.jpg", "jpg"));

// 04 综合服务方案
body.push(...block("04", "\u7efc\u5408\u670d\u52a1\u65b9\u6848\uff1a\u6253\u6cd5\u81ea\u52a8\u751f\u6210",
  "\u4e0a\u4e00\u533a\u5757\u300c\u67e5\u770b\u7efc\u5408\u670d\u52a1\u65b9\u6848\u203a\u300d\uff0c\u5171 3 \u6b65\uff08\u5185\u5bb9\u7eb5\u6df1\uff0c\u975e\u83dc\u5355\u5c42\u7ea7\uff09\u3002\u56fe 4 \u00b7 \u7efc\u5408\u670d\u52a1\u65b9\u6848\uff1a\u516d\u5927\u6a21\u5757\u4e0e\u989d\u5ea6\u7ed3\u6784",
  desc([
    ["\u9501\u5f97\u51c6", "red"],
    [" \u2014\u2014 \u65b9\u6848\u81ea\u52a8\u751f\u6210\u3002", ""],
    ["\u2461 \u65b9\u6848\u603b\u89c8", "bold"],
    ["\u628a\u516d\u4e2a\u4ea4\u6d41\u8bae\u9898\u3001\u5bf9\u5e94\u65b9\u6848\u6a21\u5757\u3001\u53ef\u9a8c\u8bc1\u7684\u8bc4\u4ef7\u6307\u6807\u4e00\u4e00\u914d\u5bf9\uff1b2 \u4ebf\u5143\u4fe1\u8d37\u989d\u5ea6\u7ed3\u6784\u3001\u975e\u4fe1\u8d37\u7ec4\u5408\u3001\u7efc\u5408\u6536\u76ca\u6d4b\u7b97\u3001T0\u2013T6 \u63a8\u8fdb\u8def\u7ebf\u56fe\u540c\u9875\u5448\u73b0\u3002\u70b9", ""],
    ["\u2461\u300c\u4e0b\u8f7d\u670d\u52a1\u65b9\u6848\u300d", "bold"],
    ["\u5373\u53ef\u5e26\u53bb\u62dc\u8bbf\u2014\u2014\u8fc7\u53bb\u54a8\u8be2\u9879\u76ee\u6570\u5468\u4ea4\u4ed8\u7684\u65b9\u6848\uff0c\u73b0\u5728\u51e0\u5206\u949f\u81ea\u52a9\u5b8c\u6210\u3002", ""],
  ]),
  "04-\u7efc\u5408\u670d\u52a1\u65b9\u6848.jpg", "jpg"));

// 05 订阅下发
body.push(...block("05", "\u8ba2\u9605\u4e0e\u4e0b\u53d1\uff1a\u4e00\u6b21\u52fe\u9009\u6d3e\u5355\u5230\u4eba\uff08\u4ea7\u54c1\u7ecf\u7406\uff09",
  "\u673a\u4f1a\u6f0f\u6597\u9875\u5185\u9875\u7b7e\u300c\u8ba2\u9605\u7684\u4f01\u4e1a\u300d\uff1b\u53f3\u4e0a\u89d2\u5207\u6362\u201c\u5206\u884c\u4ea7\u54c1\u7ecf\u7406\u201d\u89c6\u89d2\u3002\u56fe 5 \u00b7 \u8ba2\u9605\u7684\u4f01\u4e1a\uff1a\u673a\u4f1a\u8f6c\u5316\u6f0f\u6597\u4e0e\u4e00\u952e\u4e0b\u53d1",
  desc([
    ["\u63a8\u5f97\u52a8", "red"],
    [" \u2014\u2014 \u673a\u4f1a\u8981\u52a8\u8d77\u6765\uff0c\u9760\u534f\u540c\u3002\u8f6c\u5316\u6f0f\u6597 389 \u2192 10 \u2192 6 \u2192 1 \u5168\u7a0b\u5728\u7ebf\u53ef\u89c1\uff1b\u8ba2\u9605\u6c60\u52fe\u9009\u4f01\u4e1a\u3001AI \u9884\u586b\u4efb\u52a1\u8bf4\u660e\uff0c\u70b9", ""],
    ["\u300c\u4e0b\u53d1\u9009\u4e2d\u300d", "bold"],
    ["\u4e00\u952e\u6d3e\u5355\u5230\u5ba2\u6237\u7ecf\u7406\uff1b\u4e0b\u53d1\u540e\u5728\u300c\u4efb\u52a1\u4e0b\u53d1\u4e0e\u8ddf\u8e2a\u300d\u770b\u72b6\u6001\u6d41\u3001\u8ddf\u8fdb\u65f6\u95f4\u8f74\u4e0e\u50ac\u529e\u7559\u75d5\u3002", ""],
  ]),
  "09-\u8ba2\u9605\u4f01\u4e1a-\u8f6c\u5316\u6f0f\u6597.jpg", "jpg"));

// 06 移动端三步
const mob = (t) => 250; // 移动端图宽
body.push(...block("06", "\u79fb\u52a8\u7aef\u4e09\u6b65\uff1a\u770b\u4efb\u52a1 \u2192 \u505a\u529f\u8bfe \u2192 \u6c89\u7559\u75d5\uff08\u4e0a\u4e0b\u4e24\u56fe\u62fc\u677f\uff09",
  "\u624b\u673a\u6253\u5f00\u300c\u79fb\u52a8\u5de5\u4f5c\u53f0\u300d\uff1a\u5e95\u90e8\u9875\u7b7e \u4efb\u52a1 / \u4e00\u9875\u7eb8 / \u7eaa\u8981\u3002\u56fe 6 \u00b7 \u79fb\u52a8\u7aef\u7b2c\u4e00\u6b65\uff1a\u627f\u63a5\u4efb\u52a1\u5217\u8868",
  desc([
    ["\u63a8\u5f97\u52a8", "red"],
    [" \u2014\u2014 \u540c\u6837\u7684\u80fd\u529b\u88c5\u8fdb\u5ba2\u6237\u7ecf\u7406\u53e3\u888b\u3002", ""],
    ["\u7b2c\u4e00\u6b65 \u770b\u4efb\u52a1\uff1a", "bold"],
    ["\u6253\u5f00\u5373\u662f\u627f\u63a5\u4efb\u52a1\uff0c\u8d85\u671f\u9884\u8b66\u9876\u90e8\u53ef\u89c1\uff1b", ""],
    ["\u7b2c\u4e8c\u6b65 \u505a\u529f\u8bfe\uff1a", "bold"],
    ["\u51fa\u53d1\u524d\u70b9\u5f00\u8bbf\u524d\u4e00\u9875\u7eb8\u2014\u2014\u91cd\u70b9\u4ecb\u5165\u3001\u516d\u9879\u5173\u952e\u6307\u6807\u3001\u5efa\u8bae\u5bf9\u63a5\u4eba\u3001\u516d\u5927\u4ea4\u6d41\u8bae\u8bae\u4e00\u9875\u8bfb\u5b8c\uff0c\u9501\u5f97\u51c6\u7684\u7ed3\u8bba\u88c5\u8fdb\u53e3\u888b\uff1b", ""],
    ["\u7b2c\u4e09\u6b65 \u6c89\u7559\u75d5\uff1a", "bold"],
    ["\u62dc\u8bbf\u73b0\u573a\u6309\u5f55\u97f3\u952e\u53e3\u8ff0\u8fc7\u7a0b\uff0c\u505c\u6b62\u540e\u81ea\u52a8\u8f6c\u5199\uff0cAI \u751f\u6210\u7eaa\u8981\u6574\u7406\u5361\uff08\u8bc6\u522b\u9700\u6c42\u3001\u5efa\u8bae\u7efc\u5408\u65b9\u6848\u3001\u98ce\u9669\u63d0\u793a\uff09\uff0c\u786e\u8ba4\u5f52\u6863\u5373\u5b8c\u6210\u7559\u75d5\u3002", ""],
  ]),
  "07a-\u79fb\u52a8\u7aef-\u4efb\u52a1\u9996\u9875.jpg", "jpg", 240));

// 06b 访前一页纸（移动端第二张）
body.push(...block("\u2033", "\u8bbf\u524d\u4e00\u9875\u7eb8\uff08\u79fb\u52a8\u7aef\u00b7\u505a\u529f\u8bfe\uff09",
  "\u4efb\u52a1\u5361\u4e0a\u70b9\u300c\u8bbf\u524d\u4e00\u9875\u7eb8\u300d\u6216\u5e95\u90e8\u9875\u7b7e\u201c\u4e00\u9875\u7eb8\u201d\u3002\u56fe 7 \u00b7 \u79fb\u52a8\u7aef\u7b2c\u4e8c\u6b65\uff1a\u8bbf\u524d\u4e00\u9875\u7eb8",
  desc([
    ["\u91cd\u70b9\u4ecb\u5165\u3001\u516d\u9879\u5173\u952e\u6307\u6807\uff08\u7efc\u5408\u8bc4\u5206 100\u3001AI \u4fe1\u53f7 A \u7ea7\u3001\u5efa\u8bae\u5207\u5165 5 \u9879\uff09\u3001\u5ba2\u6237\u753b\u50cf\u3001\u5efa\u8bae\u5bf9\u63a5\u4eba\u3001\u516d\u5927\u4ea4\u6d41\u8bae\u8bae\u3001\u8d2f\u540e\u52a8\u4f5c\u8ba1\u5212\u4e0e\u201c\u4e0b\u8f7d\u8bbf\u524d\u51c6\u5907\u201d\u6309\u94ae\u5168\u90e8\u5728\u4e00\u9875\u5185\u2014\u2014", ""],
    ["\u89c1\u5230\u5ba2\u6237\u5c31\u77e5\u9053\u8c08\u4ec0\u4e48\u3002", "bold"],
  ]),
  "07b-\u79fb\u52a8\u7aef-\u8bbf\u524d\u4e00\u9875\u7eb8.jpg", "jpg", 240));

// 06c 纪要录音（移动端第三张）
body.push(...block("\u2033", "\u7eaa\u8981\u5f55\u97f3\u4e0e AI \u6574\u7406\uff08\u79fb\u52a8\u7aef\u00b7\u6c89\u7559\u75d5\uff09",
  "\u5e95\u90e8\u9875\u7b7e\u300c\u7eaa\u8981\u300d\u2014\u2014\u62dc\u8bbf\u73b0\u573a\u5c31\u80fd\u7528\u3002\u56fe 8 \u00b7 \u79fb\u52a8\u7aef\u7b2c\u4e09\u6b65\uff1a\u7eaa\u8981\u5f55\u97f3\u4e0e AI \u6574\u7406",
  desc([
    ["\u6309\u5f55\u97f3\u952e\u53e3\u8ff0\u62dc\u8bbf\u8fc7\u7a0b\uff0c\u505c\u6b62\u540e\u81ea\u52a8\u8f6c\u5199\u586b\u5165\u4ea4\u6d41\u8981\u70b9\uff1b\u70b9\u201c\u2726 AI \u6574\u7406\u201d\u751f\u6210", ""],
    ["\u7eaa\u8981\u6574\u7406\u5361", "bold"],
    ["\uff1a\u8bc6\u522b\u878d\u8d44\u4e0e\u975e\u4fe1\u8d37\u9700\u6c42\u3001\u5efa\u8bae\u4e2d\u53f0\u534f\u540c\u7684\u7efc\u5408\u65b9\u6848\u3001\u98ce\u9669\u63d0\u793a\uff0c\u786e\u8ba4\u5f52\u6863\u540e\u5386\u53f2\u7559\u75d5\u540c\u6b65\u66f4\u65b0\u2014\u2014\u52a8\u4f5c\u6c89\u6dc0\u5728\u7cfb\u7edf\u91cc\uff0c\u4e0d\u7559\u5728\u7b14\u8bb0\u672c\u4e0a\u3002", ""],
  ]),
  "07c-\u79fb\u52a8\u7aef-\u7eaa\u8981\u5f55\u97f3AI\u6574\u7406.jpg", "jpg", 240));

// 07 驾驶舱
body.push(...block("07", "\u7ba1\u7406\u9a7e\u9a76\u8231\uff1a\u770b\u5230\u8fc7\u7a0b\u672c\u8eab\uff08\u90e8\u95e8\u8d1f\u8d23\u4eba\uff09",
  "\u9876\u90e8\u5bfc\u822a\u300c\u7ba1\u7406\u9a7e\u9a76\u8231\u300d\uff08\u652f\u884c\u957f/\u4ea7\u54c1\u7ecf\u7406/\u8d1f\u8d23\u4eba\u53ef\u89c1\uff09\uff0c1 \u6b21\u70b9\u51fb\u3002\u56fe 9 \u00b7 \u7ba1\u7406\u9a7e\u9a76\u8231\u4e1a\u52a1\u5206\u6790\uff1a\u652f\u884c\u4efb\u52a1\u5b8c\u6210\u7387\u603b\u89c8",
  desc([
    ["\u63a8\u5f97\u52a8\u7684\u7ba1\u7406\u95ed\u73af", "red"],
    [" \u2014\u2014 \u5207\u201c\u90e8\u95e8\u8d1f\u8d23\u4eba\u201d\u8fdb\u9a7e\u9a76\u8231\uff1a\u4ea7\u4e1a\u5206\u6790\u770b\u666f\u6c14\u4eea\u8868\u76d8\u4e0e\u8d5b\u9053\u8d8b\u52bf\uff1b\u4e1a\u52a1\u5206\u6790\u770b\u5168\u8f96 KPI\u3001\u6bcf\u5bb6\u652f\u884c\u7684\u4e1a\u52a1\u62a5\u8868\u3001\u4ea7\u54c1\u7ed3\u6784\u3001\u4efb\u52a1\u5b8c\u6210\u7387\u6392\u884c\u2014\u2014\u54ea\u4e00\u73af\u5361\u4f4f\uff0c\u4e00\u76ee\u4e86\u7136\u3002", ""],
  ]),
  "11-\u9a7e\u9a76\u8231-\u4e1a\u52a1\u5206\u6790.jpg", "jpg"));

// 08 AI 智能分析
body.push(...block("08", "AI \u667a\u80fd\u5206\u6790\uff1a14 \u8282\u62a5\u544a\u51e0\u5206\u949f\u81ea\u52a9\u751f\u6210",
  "\u9876\u90e8\u5bfc\u822a\u300cAI\u667a\u80fd\u5206\u6790\u300d\uff0c1 \u6b21\u70b9\u51fb\u3002\u56fe 10 \u00b7 AI \u667a\u80fd\u5206\u6790\uff1a\u4f01\u4e1a\u5206\u6790\u62a5\u544a",
  desc([
    ["\u770b\u5f97\u89c1 \u00b7 \u9501\u5f97\u51c6\u7684\u5e95\u5c42\u5f15\u64ce", "red"],
    [" \u2014\u2014 \u6a21\u7cca\u641c\u7d22\u4f01\u4e1a\uff0c14 \u8282\u5206\u6790\u62a5\u544a\uff08\u753b\u50cf/\u7ade\u4e89\u529b/\u8d22\u52a1/\u8206\u60c5/\u540c\u4e1a\u5bf9\u6bd4/\u4ea7\u54c1\u63a8\u8350/\u8425\u9500\u6307\u5f15\uff09\u51e0\u5206\u949f\u81ea\u52a9\u751f\u6210\uff0c\u4e00\u952e\u5bfc\u51fa\u8bbf\u524d\u4e00\u9875\u7eb8\u3002", ""],
    ["\u66fe\u7ecf\u91cd\u91d1\u6295\u5165\u624d\u80fd\u4ea4\u4ed8\u7684\u4ea7\u4e1a\u91d1\u878d\u65b9\u6cd5\u8bba\uff0c\u4eca\u5929 AI \u628a\u5b83\u53d8\u6210\u6bcf\u4e2a\u4e00\u7ebf\u4eba\u5458\u53ef\u590d\u5236\u7684\u81ea\u52a9\u80fd\u529b\u2014\u2014\u516d\u5f20\u7f51\u53ea\u662f\u7b2c\u4e00\u53d1\u70ae\u5f39\u3002", "bold"],
  ]),
  "12-AI\u667a\u80fd\u5206\u6790-\u62a5\u544a.jpg", "jpg"));

/* ================= 组装文档 ================= */
const doc = new Document({
  creator: "\u5317\u6597\u00b7\u4ea7\u878d\u667a\u822a\u7cfb\u7edf",
  title: "\u5317\u6597\u00b7\u4ea7\u878d\u667a\u822a\u7cfb\u7edf \u00b7 \u7cfb\u7edf\u529f\u80fd\u4ecb\u7ecd",
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 22, color: "1C2B3A" },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 32, bold: true, color: "1A1A1A" },
        paragraph: { spacing: { before: 360, after: 160, line: 312 } },
      },
      heading2: {
        run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 30, bold: true, color: "1A1A1A" },
        paragraph: { spacing: { before: 420, after: 120, line: 380 } },
      },
    },
  },
  sections: [
    // 封面（独立节，边距 0）
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1({
        title: "\u5317\u6597\u00b7\u4ea7\u878d\u667a\u822a\u7cfb\u7edf\u7cfb\u7edf\u529f\u80fd\u4ecb\u7ecd",
        subtitle: "\u770b\u56fe\u8bf4\u8bdd\uff1a\u8ba9\u4ea7\u4e1a\u673a\u4f1a\u770b\u5f97\u89c1 \u00b7 \u9501\u5f97\u51c6 \u00b7 \u63a8\u5f97\u52a8",
        englishLabel: "BOB WUXI INDUSTRIAL FINANCE INTELLIGENCE",
        metaLines: [
          "\u5317\u4eac\u94f6\u884c\u65e0\u9521\u5206\u884c \u00b7 \u516c\u53f8\u94f6\u884c\u90e8",
          "\u4ee5\u300c\u5341\u4e94\u4e94\u300d\u516d\u5f20\u7f51\u8d85 26 \u4e07\u4ebf\u6295\u8d44\u4e3a\u9996\u4e2a\u8d5b\u9053",
          "\u65b9\u6cd5\u8bba\u53ef\u590d\u5236\u5230\u4efb\u4f55\u4ea7\u4e1a\u8d5b\u9053",
        ],
        footerLeft: "BEIJING BANK WUXI BRANCH",
        footerRight: "2026.11",
        palette: PAL,
      }),
    },
    // 正文
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1417, bottom: 1417, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: { default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: PAL.accent, space: 4 } },
        children: [new TextRun({ text: "\u5317\u6597\u00b7\u4ea7\u878d\u667a\u822a\u7cfb\u7edf \u00b7 \u7cfb\u7edf\u529f\u80fd\u4ecb\u7ecd", size: 16, color: "8C9BAE", font: { eastAsia: "Microsoft YaHei" } })],
      })] }) },
      footers: { default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "8C9BAE", font: { ascii: "Arial" } })],
      })] }) },
      children: body,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(ROOT, "\u5317\u6597\u00b7\u4ea7\u878d\u667a\u822a\u7cfb\u7edf-\u7cfb\u7edf\u529f\u80fd\u4ecb\u7ecd.docx");
  fs.writeFileSync(out, buf);
  console.log("written:", out, (buf.length / 1024 / 1024).toFixed(1) + "MB");
});
