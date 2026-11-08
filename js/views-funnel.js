/* ============================================================
   机会漏斗 V1：企业总览（AI筛选+导入+四维标签+自然语言筛选+订阅）
               / 订阅的企业（下发） / 任务下发与跟踪（仅已下发）
   数据：M().funnel（六张网企业库） + APP.S.fn 运行时状态
   ============================================================ */
(function () {
  const { $, esc, toast, openModal, openDrawer, closeDrawer, confirmDlg, renderTabs, switchTab } = APP;
  const M = () => window.MOCK;
  const S = APP.S;

  /* ---------- 维度常量（口径对齐客户全景看板 V4） ---------- */
  const NETS = () => M().funnel.nets;
  const PROGS = ['突破', '攻坚', '培育', '储备'];
  const POSS = ['战略', '腰部', '基础'];
  const WTS = ['主攻', '次攻', '择优', '承接'];
  const CATS = ['建设运营商', '上游供应商'];
  const SIGS = ['A', 'B', '观察'];
  const RELS = ['高度相关', '较高相关', '一般相关'];
  const CITIES = ['南京', '无锡', '徐州', '常州', '苏州', '南通', '连云港', '淮安', '盐城', '扬州', '镇江', '泰州', '宿迁'];
  const NET_PROD = {
    '新型电网': ['项目贷款', '绿色贷款', '供应链金融'], '新一代通信网': ['科创贷款', '并购贷款', '票据池'],
    '算力网': ['项目贷款', '科技贷', '设备更新贷'], '城市地下管网': ['项目贷', '资金监管', '债券承销'],
    '水网': ['项目贷款', '水利专项贷', '资金监管'], '物流网': ['项目贷', '供应链融资', '结算归集'],
  };
  const PROD_POOL = ['项目贷款', '流动资金贷款', '固定资产贷款', '科创e贷', '研发贷', '设备更新贷', '银团贷款', '供应链融资', '供应链票据', '票据池', '保函', '出口信贷', '跨境结算', '代发工资', '结算归集', '资金监管', '存款归集', '对公理财', '绿色贷款', '债券承销', '并购贷款', '技改贷款', '投行服务'];

  /* ---------- 标签渲染 ---------- */
  const progTag = v => ({ 突破: 'tag-solid-red', 攻坚: 'tag-orange', 培育: 'tag-blue' }[v] || 'tag-gray');
  const posTag = v => ({ 战略: 'tag-violet', 腰部: 'tag-cyan', 基础: 'tag-gray' }[v] || 'tag-gray');
  const wtTag = v => ({ 主攻: 'tag-red', 次攻: 'tag-orange', 择优: 'tag-blue', 承接: 'tag-gray' }[v] || 'tag-gray');
  const catTag = v => `<span class="text-sm">${v === '建设运营商' ? '建设运营商' : '上游供应商'}</span>`;
  const sigTag = v => `<span class="tag ${v === 'A' ? 'tag-red' : v === 'B' ? 'tag-blue' : 'tag-gray'}" style="height:19px;font-size:10px;padding:0 6px;font-weight:700">${v}</span>`;
  const srcTag = c => c.src === 'AI'
    ? `<span class="tag tag-cyan" style="height:19px;font-size:10px;padding:0 6px">✦ AI筛选</span>`
    : (c.src === 'MANUAL' || c.src === 'CLAIM')
      ? `<span class="tag tag-blue" style="height:19px;font-size:10px;padding:0 6px" title="${c.src === 'MANUAL' ? '客户经理手工录入' : '客户经理/支行主动认领'}">🙋 ${c.src === 'MANUAL' ? '手工录入' : '自认领'}</span>`
      : `<span class="tag tag-violet" style="height:19px;font-size:10px;padding:0 6px" title="导入人：${esc(c.imp.by)} · ${c.imp.d}${c.imp.note ? ' · ' + esc(c.imp.note) : ''}">📥 导入</span>`;
  const pmTag = id => (F().tags[id] || []).map(t => `<span class="tag tag-violet" style="height:17px;font-size:10px;padding:0 5px" title="${esc(t.by)} · ${t.d}"># ${esc(t.t)}</span>`).join(' ');
  const scoreBar = s => `<div class="fn-score"><b class="fs-num">${s}</b><div class="fn-score-bd"><i style="width:${s}%;background:${s >= 80 ? 'var(--brand-500)' : s >= 60 ? '#2458F5' : '#93A4C8'}"></i></div></div>`;

  /* ---------- 运行时状态 ---------- */
  function F() {
    if (!S.fn) S.fn = {
      subs: [...M().funnel.subsSeed],
      tasks: M().funnel.tasksSeed.map(t => Object.assign({}, t, { log: t.log.map(x => Object.assign({}, x)) })),
      tags: {},                /* coId -> [{t, by, d}] 产品经理备注标签 */
      f: { nets: [], track: '全部', prog: '全部', pos: '全部', wt: '全部', src: '全部', score: '全部', cat: '全部', sig: '全部', lst: '全部', rel: '全部', kw: '', acc: '全部', plist: '全部' },
      conds: [],               /* 自然语言解析出的筛选条件 chips */
      accChips: [],            /* 已选准入标准 chips（多选） */
      claims: [],              /* 客户经理/支行自认领的企业 id（留痕） */
      projSel: [],             /* 项目清单勾选 */
    };
    return S.fn;
  }
  /* 准入标准（总行/长三角两类） */
  const ACC = {
    '总行战略客户准入': { lv: '总行', cond: c => c.pos === '战略' && c.score >= 80, tip: '战略地位 + 四线得分≥80' },
    '总行科技金融白名单': { lv: '总行', cond: c => /专精特新|高新技术|小巨人/.test((c.qual || []).join('') + c.tags.join('') + c.name) || c.score >= 85, tip: '资质/高评分科技企业' },
    '长三角区域准入': { lv: '长三角', cond: c => true, tip: '苏/浙/沪/皖属地企业默认符合' },
    '长三角基建项目库': { lv: '长三角', cond: c => c.cat === '建设运营商' || /项目|基建|工程/.test(c.track), tip: '建设运营商或项目类赛道' },
  };
  /* 正负面清单 */
  const LISTS = {
    '正面清单·重大项目配套': { kind: 'pos', cond: c => (c.sig || []).join('').indexOf('重大项目') >= 0 || c.cat === '建设运营商' || c.score >= 82 },
    '正面清单·专精特新': { kind: 'pos', cond: c => /专精特新|小巨人|高新技术/.test((c.qual || []).join('') + c.tags.join('') + c.name) },
    '正面清单·上市/拟上市': { kind: 'pos', cond: c => c.listed.indexOf('是') === 0 || (c.ipo && c.ipo.length) },
    '负面清单·两高过剩产能': { kind: 'neg', cond: c => /化工|冶炼|铸造|电镀|印染/.test(c.track + c.name) },
    '负面清单·失信/涉诉预警': { kind: 'neg', cond: c => false },
  };
  const coById = id => M().funnel.cos.find(c => c.id === id);
  const rmById = id => M().funnel.rms.find(r => r.id === id);
  const taskOf = coId => F().tasks.find(t => t.co === coId);
  const tagListOf = coId => F().tags[coId] || [];
  const ROLE_KEY = () => APP.role().key;   /* rm 客户经理 / head 支行长 / pm 产品经理 / gm 负责人 */
  /* 预打标：给企业库补准入/清单命中口径（演示：命中=正面绿标，未命中负面=通过） */
  function accHit(c) { return Object.entries(ACC).filter(([k, a]) => a.cond(c)).map(([k]) => k); }
  function listHit(c) { const pos = Object.entries(LISTS).filter(([k, l]) => l.kind === 'pos' && l.cond(c)).map(([k]) => k); const neg = Object.entries(LISTS).filter(([k, l]) => l.kind === 'neg' && l.cond(c)).map(([k]) => k); return { pos, neg }; }

  /* ---------- 筛选 ---------- */
  function filteredCos() {
    const f = F().f, conds = F().conds, subs = F().subs, st = F();
    const minScore = f.score === '全部' ? 0 : +f.score.replace('+', '');
    const cv = k => { const arr = conds.filter(c => c.k === k).map(c => c.v); return arr.length ? arr : null; };
    const nlNet = cv('net'), nlCity = cv('city'), nlProg = cv('prog'), nlPos = cv('pos'), nlWt = cv('wt');
    const nlCat = cv('cat'), nlNat = cv('nat'), nlTrack = cv('track'), nlSig = cv('sig'), nlRel = cv('rel');
    const nlScore = (conds.find(c => c.k === 'score') || {}).v;
    const nlSrc = (conds.find(c => c.k === 'src') || {}).v;
    const nlSub = (conds.find(c => c.k === 'sub') || {}).v;
    const nlLst = (conds.find(c => c.k === 'lst') || {}).v;
    const nlAcc = cv('acc');      /* 自然语言：准入标准（命中其一） */
    const nlPlist = (conds.find(c => c.k === 'plist') || {}).v;  /* 自然语言：正面/负面清单 */
    /* 准入标准：多选 chips 命中其一即通过；负面清单命中任一即剔除；正面清单要求命中其一 */
    const accOk = c => (!st.accChips.length || st.accChips.some(k => ACC[k] && ACC[k].cond(c))) && (!nlAcc || nlAcc.some(k => ACC[k] && ACC[k].cond(c)));
    const lh = c => listHit(c);
    const plistOk = (v, c) => {
      if (!v || v === '正面') return !v || lh(c).pos.length > 0;
      if (v === '负面剔除') return lh(c).neg.length === 0;
      if (v === '正面·重大项目') return lh(c).pos.some(k => k.indexOf('重大项目') >= 0);
      if (v === '正面·专精特新') return lh(c).pos.some(k => k.indexOf('专精特新') >= 0);
      if (v === '正面·上市/拟上市') return lh(c).pos.some(k => k.indexOf('上市') >= 0);
      return true;
    };
    const listOk = c => plistOk(f.plist, c) && plistOk(nlPlist, c);
    return M().funnel.cos.filter(c =>
      (f.nets.length === 0 || f.nets.includes(c.net)) &&
      (f.track === '全部' || c.track === f.track) &&
      (f.prog === '全部' || c.prog === f.prog) &&
      (f.pos === '全部' || c.pos === f.pos) &&
      (f.wt === '全部' || c.wt === f.wt) &&
      (f.src === '全部' || f.src === c.src ||
        (f.src === 'CLAIM' && st.claims.includes(c.id))) &&
      (f.cat === '全部' || c.cat === f.cat) &&
      (f.sig === '全部' || c.sigLv === f.sig) &&
      (f.rel === '全部' || c.rel === f.rel) &&
      (f.lst === '全部' || (f.lst === '上市' ? c.listed.indexOf('是') === 0 : c.listed.indexOf('是') !== 0)) &&
      (c.score >= minScore) &&
      (!f.kw || (c.name + c.short + c.track).includes(f.kw)) &&
      accOk(c) && listOk(c) &&
      (!nlNet || nlNet.includes(c.net)) &&
      (!nlCity || nlCity.includes(c.city)) &&
      (!nlProg || nlProg.includes(c.prog)) &&
      (!nlPos || nlPos.includes(c.pos)) &&
      (!nlWt || nlWt.includes(c.wt)) &&
      (!nlCat || nlCat.includes(c.cat)) &&
      (!nlNat || nlNat.some(n => c.nat.includes(n))) &&
      (!nlTrack || nlTrack.some(t => c.track.includes(t) || t.includes(c.track.split('·')[0]))) &&
      (!nlSig || nlSig.includes(c.sigLv)) &&
      (!nlRel || nlRel.includes(c.rel)) &&
      (!nlScore || c.score >= nlScore) &&
      (!nlSrc || c.src === nlSrc) &&
      (!nlSub || subs.includes(c.id)) &&
      (!nlLst || (nlLst === '上市' ? c.listed.indexOf('是') === 0 : c.listed.indexOf('是') !== 0)));
  }

  /* ---------- 自然语言解析（关键词字典 + 剩余语义成标签） ---------- */
  const NET_KW = [
    ['新型电网', /电网|输配电|配电|变电站|变电|储能|虚拟电厂|风电|海缆|海上风电/],
    ['算力网', /算力|智算|数据中心|超算|IDC|液冷|边缘计算|算电/],
    ['城市地下管网', /管网|管廊|供排水|燃气|排水|地下空间|生命线/],
    ['水网', /水网|水利|水务|原水|调水|供水/],
    ['物流网', /物流|港口|仓储|货运|航空物流|铁路|多式联运|班列|冷链/],
    ['新一代通信网', /通信|光模块|射频|毫米波|卫星|5G|6G|量子|光通信|太赫兹|光纤/],
  ];
  function parseNL(qRaw) {
    let q = ' ' + (qRaw || '').trim() + ' ';
    const conds = [];
    const eat = re => { q = q.replace(re, ' '); };
    NET_KW.forEach(([n, re]) => { if (re.test(q)) { conds.push({ k: 'net', v: n }); eat(re); } });
    /* "六张网"泛指全部六张网企业（不限定单一网），仅从语句中移除 */
    eat(/六张网/g);
    CITIES.forEach(ct => { if (q.includes(ct)) { conds.push({ k: 'city', v: ct }); eat(new RegExp(ct, 'g')); } });
    PROGS.forEach(p => { if (q.includes(p) || (p === '培育' && /培养/.test(q))) { conds.push({ k: 'prog', v: p }); eat(p === '培育' ? /培育|培养/g : new RegExp(p, 'g')); } });
    POSS.forEach(p => { if (q.includes(p)) { conds.push({ k: 'pos', v: p }); eat(new RegExp(p, 'g')); } });
    WTS.forEach(w => { if (q.includes(w)) { conds.push({ k: 'wt', v: w }); eat(new RegExp(w, 'g')); } });
    CATS.forEach(c2 => { if (q.includes(c2)) { conds.push({ k: 'cat', v: c2 }); eat(new RegExp(c2, 'g')); } });
    [['央企', '央企'], [/国企|国资/, '国企'], ['民营', '民营'], ['外资', '外资']].forEach(([re, v]) => {
      if ((re instanceof RegExp ? re.test(q) : q.includes(re)) && !conds.some(c => c.k === 'nat' && c.v === v)) { conds.push({ k: 'nat', v }); eat(new RegExp(re instanceof RegExp ? re.source : re, 'g')); }
    });
    if (/上市/.test(q)) { conds.push({ k: 'lst', v: '上市' }); eat(/上市公司?/g); }
    if (/以上/.test(q)) { const m = q.match(/评分?\s*(\d{2,3})\s*分?\s*以上/); if (m) { conds.push({ k: 'score', v: +m[1] }); eat(new RegExp('评分?\\s*\\d{2,3}\\s*分?\\s*以上', 'g')); } }
    if (/导入|手工|手工添加/.test(q)) { conds.push({ k: 'src', v: 'IMP' }); eat(/导入|手工|手工添加/g); }
    if (/AI筛选|网上筛选|网络筛选|AI发现/.test(q)) { conds.push({ k: 'src', v: 'AI' }); eat(/AI筛选|网上筛选|网络筛选|AI发现/g); }
    if (/订阅/.test(q)) { conds.push({ k: 'sub', v: 1 }); eat(/订阅/g); }
    RELS.forEach(r2 => { if (q.includes(r2)) { conds.push({ k: 'rel', v: r2 }); eat(new RegExp(r2, 'g')); } });
    /* 准入标准与正负面清单（支持"总行正面清单/长三角准入/负面剔除"等口语） */
    Object.keys(ACC).forEach(a => {
      const kw = a.replace(/^总行|^长三角/, '');
      const lv = a.slice(0, 2);
      if (q.includes(a) || (q.includes(kw) && q.includes(lv))) { conds.push({ k: 'acc', v: a }); eat(new RegExp((lv + '|' + kw).replace(/[()]/g, '\\$&'), 'g')); }
    });
    if (/正面清单|正清单|正面/.test(q)) { conds.push({ k: 'plist', v: '正面' }); eat(/正面清单|正清单|正面/g); }
    if (/负面清单|负清单|负面剔除|剔除/.test(q)) { conds.push({ k: 'plist', v: '负面剔除' }); eat(/负面清单|负清单|负面剔除|剔除/g); }
    if (/重大项目|重大工程/.test(q) && !conds.some(c => c.k === 'plist' && c.v === '正面')) { conds.push({ k: 'plist', v: '正面·重大项目' }); eat(/重大项目|重大工程/g); }
    if (/专精特新/.test(q) && !conds.some(c => c.k === 'plist')) { conds.push({ k: 'plist', v: '正面·专精特新' }); }
    if (/项目/.test(q)) { conds.push({ k: 'proj', v: 1 }); eat(/项目清单|项目/g); }
    /* 剩余语义片段：命中细分赛道则作赛道条件，否则聚合成产品经理自定义标签 */
    const STOP = ['企业', '公司', '客户', '筛选', '适合', '需要', '要求', '优先', '重点', '推', '主推', '切入', '关注', '以上', '并且', '同时', '具有', '业务', '拓展', '营销', '评分'];
    const segs = q.split(/[，,。、；;：:\s的和或与及把里中在]/).map(x => x.trim()).filter(x => x.length >= 2 && !STOP.includes(x));
    const trackPool = [...new Set(M().funnel.cos.map(c => c.track))];
    const usedSegs = [];
    segs.forEach(sg => {
      const hit = trackPool.find(t => t.includes(sg) || sg.includes(t.split('·')[0]));
      if (hit && hit.length > sg.length - 6 && sg.length >= 2) {
        if (!conds.some(c => c.k === 'track' && c.v === hit)) conds.push({ k: 'track', v: hit });
        usedSegs.push(sg);
      }
    });
    const tagSegs = segs.filter(x => !usedSegs.includes(x));
    if (tagSegs.length) conds.push({ k: 'tag', v: tagSegs.slice(0, 2).join('·').slice(0, 16) });
    return conds;
  }
  const condLabel = c => ({ net: '六张网', city: '地区', prog: '营销进展', pos: '地位', wt: '权重', score: '评分', src: '来源', sub: '订阅', cat: '客户大类', nat: '性质', lst: '上市', track: '赛道', rel: '相关度', acc: '准入标准', plist: '清单', proj: '范围', tag: '生成标签' }[c.k] || c.k);

  /* ============================================================
     视图
     ============================================================ */
  window.VIEWS = window.VIEWS || {};
  VIEWS.funnel = {
    render(el) {
      F();
      const rk = ROLE_KEY();
      el.innerHTML = `
        <div class="page-head"><div class="page-title">机会漏斗</div>
          <div class="flex" style="gap:8px">
            ${rk === 'rm' ? `<button class="btn btn-ghost" id="fnManual">＋ 手工录入客户</button><button class="btn btn-ghost" id="fnClaimPool">🙋 客户池认领</button>` : ''}
            <button class="btn btn-primary" id="fnImport">导入企业</button></div></div>
        <div id="fnTabs"></div>`;
      const imp = el.querySelector('#fnImport'); if (imp) imp.onclick = () => this.importDlg();
      const man = el.querySelector('#fnManual'); if (man) man.onclick = () => this.manualDlg();
      const clm = el.querySelector('#fnClaimPool'); if (clm) clm.onclick = () => { S.params.tab = 'co'; this.render(el); toast('请在客户总览中点「主动认领」，认领即时生效并留痕'); };
      const tabs = [
        { id: 'co', name: '客户清单', count: M().funnel.cos.length },
        { id: 'proj', name: '项目清单', count: (M().manage || { projects: [] }).projects.length },
        { id: 'sub', name: '订阅的企业', count: F().subs.length },
        { id: 'task', name: '任务下发与跟踪', count: F().tasks.length }];
      let act = S.params.tab;
      if (!['co', 'sub', 'task', 'proj'].includes(act)) act = 'co';
      delete S.params.tab;   /* 一次性消费，避免角色切换后残留 */
      renderTabs($('#fnTabs'), tabs, act, t => { act = t; S.params.tab = t; paint(); });
      const paint = () => {
        const box = switchTab($('#fnTabs'), tabs, act, paint);
        if (act === 'co') this.paintCo(box);
        if (act === 'proj') this.paintProj(box);
        if (act === 'sub') this.paintSub(box);
        if (act === 'task') this.paintTask(box);
      }; paint();
    },

    /* ---------------- Tab 1：企业总览 ---------------- */
    paintCo(box) {
      const f = F().f, st = F();
      const all = M().funnel.cos;
      const list = filteredCos();
      const tracks = ['全部', ...new Set(all.filter(c => f.nets.length === 0 || f.nets.includes(c.net)).map(c => c.track))];
      const stat = {
        all: all.length, op: all.filter(c => c.cat === '建设运营商').length, up: all.filter(c => c.cat === '上游供应商').length,
        lst: all.filter(c => c.listed.indexOf('是') === 0).length, pos: all.filter(c => c.pos === '战略').length,
        brk: all.filter(c => c.prog === '突破').length, hit: list.length };
      const netChip = n => `<button class="chip ${f.nets.includes(n) ? 'on' : ''}" data-net="${n}" style="height:24px;font-size:11px;padding:0 10px">${n}</button>`;
      const dimChip = (k, arr) => arr.map(x => `<button class="chip ${f[k] === x ? 'on' : ''}" data-dim="${k}" data-v="${x}" style="height:24px;font-size:11px;padding:0 10px">${x}</button>`).join('');
      const kpi = (l, v, note) => `<div class="kpi"><div class="k-label">${l}</div><div class="k-value" style="font-size:24px;margin-top:4px">${v}<small style="font-size:12px;color:var(--t3)"> 家</small></div><div class="k-foot">${note}</div></div>`;
      const showIns = !!st.showIns;
      box.innerHTML = `
        <div class="kpi-grid mb3" style="grid-template-columns:repeat(6,1fr);gap:10px">
          ${kpi('企业客户', stat.all, '含建设运营商与上游供应商')}
          ${kpi('建设运营商', stat.op, '六张网投资建设主体')}
          ${kpi('上游供应商', stat.up, '链上设备/材料/服务')}
          ${kpi('上市公司', stat.lst, 'A股+港股+北交所')}
          ${kpi('战略客户（地位）', stat.pos, '原链主口径，地位=战略')}
          ${kpi('突破档（四线）', stat.brk, '突破/攻坚/培育 最高档')}
        </div>
        <div class="flex mb3" style="gap:10px;flex-wrap:wrap">
          <div class="fn-ai-engine" title="AI 数据引擎：每日 04:00 自动跑批，从工商公示、舆情监测、招投标、融资事件等公开渠道拉取并整理企业数据（24 小时更新）">
            <span class="ai-radar"></span>
            <div><b style="font-size:12.5px">AI 数据引擎</b><span class="breath"></span><span class="text-xs text-muted">24h 自动跑批 · 上次 11-04 04:00 · 工商/舆情/标讯 3 渠道 · 下次约 20h 后</span></div>
          </div>
          <span style="flex:1"></span>
          <button class="btn ${showIns ? 'btn-primary' : 'btn-ghost'}" id="fnInsBtn">${showIns ? '收起客户结构洞察 ▴' : '客户结构洞察 ▾'}</button>
          <span class="text-xs text-muted" style="align-self:center">当前筛选命中 ${stat.hit} 家 · 洞察随筛选联动</span>
        </div>
        ${showIns ? `
        <div class="card mb3">
          <div class="card-head" style="padding:13px 16px 0"><div class="card-title" style="font-size:15px">客户结构洞察</div></div>
          <div class="card-pad" style="padding-top:8px">${this.insightHtml(list)}</div>
        </div>` : ''}
        <div class="fn-filter-card">
          <div class="fn-frow" style="align-items:center">
            <span class="fn-flabel">智能筛选</span>
            <div class="fn-fgroup" style="flex:1;align-items:center">
              <span class="ai-badge" style="flex-shrink:0">AI</span>
              <input class="input" id="fnNlQ" placeholder="一句话筛选：如 六张网 总行正面清单 / 无锡 算力网 评分85以上 / 长三角 重大项目" value="${esc(st.nlQ || '')}" style="flex:1;min-width:240px;height:28px">
              <button class="btn btn-primary btn-sm" id="fnNlGo" style="height:28px">解析筛选</button>
              ${st.conds.length ? `<button class="btn btn-text btn-sm" id="fnNlClr" style="height:24px;font-size:11px">清空条件</button>` : ''}
            </div>
          </div>
          ${st.conds.length ? `<div class="fn-frow"><span class="fn-flabel">命中条件</span><div class="fn-fgroup" style="flex-wrap:wrap;gap:5px">
            ${st.conds.map((c, i) => `<span class="tag tag-violet" style="height:22px;cursor:pointer" data-nlcond="${i}" title="点击移除该条件">${condLabel(c)}：${esc(String(c.v))} ✕</span>`).join('')}
            <span class="text-xs text-muted">当前命中 ${filteredCos().length} 家企业${st.conds.some(c => c.k === 'proj') ? ' · 含"项目"关键词时项目清单同步按所属网/要点筛选' : ''}</span>
          </div></div>` : ''}
          <div class="fn-frow">
            <span class="fn-flabel">六张网</span>
            <div class="fn-fgroup">${netChip('全部')}${NETS().map(netChip).join('')}
              <span class="fn-sep"></span><span class="f-label">赛道</span>
              <select class="select" id="fnTrack" style="width:126px;height:26px">${tracks.map(t => `<option ${f.track === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
              <input class="input" id="fnKw" placeholder="搜索企业…" value="${esc(f.kw)}" style="width:150px;height:26px;margin-left:auto">
            </div>
          </div>
          <div class="fn-frow">
            <span class="fn-flabel">标签维度</span>
            <div class="fn-fgroup">
              <span class="f-label">营销进展</span>${dimChip('prog', PROGS)}
              <span class="fn-sep"></span><span class="f-label">地位</span>${dimChip('pos', POSS)}
              <span class="fn-sep"></span><span class="f-label">权重</span>${dimChip('wt', WTS)}
              <span class="fn-sep"></span><span class="f-label">评分</span>${['全部', '85+', '75+', '65+'].map(x => `<button class="chip ${f.score === x ? 'on' : ''}" data-dim="score" data-v="${x}" style="height:24px;font-size:11px;padding:0 10px">${x}</button>`).join('')}
            </div>
          </div>
          <div class="fn-frow">
            <span class="fn-flabel">客户属性</span>
            <div class="fn-fgroup">
              <span class="f-label">客户大类</span>${dimChip('cat', CATS)}
              <span class="fn-sep"></span><span class="f-label">上市</span>${['全部', '上市', '未上市'].map(x => `<button class="chip ${f.lst === x ? 'on' : ''}" data-dim="lst" data-v="${x}" style="height:24px;font-size:11px;padding:0 10px">${x}</button>`).join('')}
              <span class="fn-sep"></span><span class="f-label">相关度</span>${dimChip('rel', RELS)}
              <span class="fn-sep"></span><span class="f-label">来源</span>${['全部', 'AI', 'IMP', 'CLAIM'].map(x => `<button class="chip ${f.src === x ? 'on' : ''}" data-dim="src" data-v="${x}" style="height:24px;font-size:11px;padding:0 10px">${x === 'AI' ? 'AI筛选' : x === 'IMP' ? '导入' : x === 'CLAIM' ? '自认领' : '全部'}</button>`).join('')}
            </div>
          </div>
          <div class="fn-frow">
            <span class="fn-flabel">准入与清单</span>
            <div class="fn-fgroup">
              <span class="f-label">准入标准</span>${Object.keys(ACC).map(a => `<button class="chip ${st.accChips.includes(a) ? 'on' : ''}" data-acc="${esc(a)}" style="height:24px;font-size:11px;padding:0 10px" title="${esc(ACC[a].lv)} · ${esc(ACC[a].tip)}">${ACC[a].lv}·${a.replace(ACC[a].lv, '')}</button>`).join('')}
              <span class="fn-sep"></span><span class="f-label">清单</span>${['全部', '正面·重大项目', '正面·专精特新', '正面·上市/拟上市', '负面剔除'].map(x => `<button class="chip ${f.plist === x ? 'on' : ''}" data-dim="plist" data-v="${x}" style="height:24px;font-size:11px;padding:0 10px">${x}</button>`).join('')}
              ${st.accChips.length ? `<button class="btn btn-text btn-sm" id="accClr" style="height:22px;font-size:11px">清空准入</button>` : ''}
            </div>
          </div>
        </div>
        <div class="card"><div class="tbl-wrap"><table class="tbl fn-tbl" style="min-width:1080px"><thead><tr>
          <th style="width:220px">企业</th><th style="width:96px">六张网</th><th style="width:130px">细分赛道</th><th style="width:84px">地区</th>
          <th style="width:80px">营销进展</th><th style="width:70px">地位</th><th style="width:70px">权重</th>
          <th style="width:88px">综合评分</th><th style="min-width:190px">✦ 建议服务方案</th><th style="width:150px">操作</th></tr></thead><tbody>
        ${list.sort((a, b) => b.score - a.score).map(c => { const rk = ROLE_KEY();
          const isClaimed = st.claims.includes(c.id) || taskOf(c.id);
          const opHtml = rk === 'rm'
            ? `<button class="btn btn-text btn-sm" data-claim="${c.id}" ${isClaimed ? 'disabled style="color:var(--t3)"' : ''}>${st.claims.includes(c.id) ? '✓ 已认领' : taskOf(c.id) ? '已承接' : '认领'}</button><button class="btn btn-text btn-sm" data-det="${c.id}">详情</button>`
            : `<button class="btn btn-text btn-sm" data-one-disp="${c.id}" ${taskOf(c.id) ? 'disabled style="color:var(--t3)"' : ''}>${taskOf(c.id) ? '已下发' : '下发'}</button><button class="btn btn-text btn-sm" data-det="${c.id}">详情</button>`;
          return `<tr data-co="${c.id}">
          <td title="${esc(c.name)}">
            <b class="text-sm">${esc(c.short)}</b>${c.src && c.src !== 'AI' ? ' ' + srcTag(c) : ''}${c.listed.indexOf('是') === 0 ? ' <span class="tag tag-cyan" style="height:17px;font-size:10px;padding:0 5px" title="' + esc(c.listed.slice(2)) + '">' + esc(c.listed.slice(2).replace(/\(/, ' ').replace(/\)/, '')) + '</span>' : ''}
            <div class="text-xs text-muted" style="margin-top:2px">${esc(c.cat)} · ${esc(c.nat)}${pmTag(c.id) ? ' ' + pmTag(c.id) : ''}</div></td>
          <td title="${esc(c.net)}${c.opp ? ' ｜ 机会地：' + esc(c.opp) : ''}"><span class="text-sm">${esc(c.net)}</span></td>
          <td title="${esc(c.track)}${c.opp ? ' ｜ 机会地：' + esc(c.opp) : ''}"><span class="text-sm text-sub">${esc(c.track)}</span></td>
          <td title="${esc(c.city)}·${esc(c.zone)}${c.opp ? ' ｜ 机会地：' + esc(c.opp) : ''}">${esc(c.city)}<div class="text-xs text-muted" style="margin-top:2px">${esc(c.zone)}</div></td>
          <td><span class="tag ${progTag(c.prog)}" style="height:19px;font-size:10px;padding:0 6px">${c.prog}</span></td>
          <td><span class="tag ${posTag(c.pos)}" style="height:19px;font-size:10px;padding:0 6px">${c.pos}</span></td>
          <td><span class="tag ${wtTag(c.wt)}" style="height:19px;font-size:10px;padding:0 6px">${c.wt}</span></td>
          <td>${scoreBar(c.score)}</td>
          <td class="fn-prod-td"><span class="fn-prod-link" data-why="${c.id}" title="点击查看 AI 推荐理由">${esc((c.prods || []).join(' / '))}</span></td>
          <td onclick="event.stopPropagation()" style="text-align:center;white-space:nowrap">${opHtml}</td></tr>`; }).join('') ||
        `<tr><td colspan="9"><div class="empty"><div class="e-ico">🏢</div><div class="e-title">当前条件下暂无企业</div></div></td></tr>`}</tbody></table></div>
        <div class="pager flex-between" style="padding:12px 16px;gap:10px">
          <span>共 ${list.length} 家 · 其中已订阅 ${list.filter(c => F().subs.includes(c.id)).length} 家 · 按综合评分降序 ｜ 建议服务方案由 AI 按金融机构产品库匹配生成，点击查看推荐理由</span>
          <span class="fn-ai-check" title="渠道抓取时间：工商公示 11-04 04:02 · 舆情监测 11-04 04:05 · 招投标 11-04 04:07 · 融资事件 11-04 04:09">✦ AI 已核验 ${stat.all}/${stat.all}</span>
        </div></div>`;
      /* 交互绑定 */
      box.querySelector('#fnInsBtn').onclick = () => { st.showIns = !st.showIns; this.paintCo(box); };
      box.querySelectorAll('[data-net]').forEach(b => b.onclick = () => {
        const n = b.dataset.net;
        if (n === '全部') f.nets = [];
        else { const i = f.nets.indexOf(n); if (i >= 0) f.nets.splice(i, 1); else f.nets.push(n); }
        f.track = '全部'; this.paintCo(box);
      });
      box.querySelectorAll('[data-dim]').forEach(b => b.onclick = () => { const k = b.dataset.dim; f[k] = f[k] === b.dataset.v ? '全部' : b.dataset.v; this.paintCo(box); });
      box.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => {
        const a = b.dataset.acc, i = st.accChips.indexOf(a);
        if (i >= 0) st.accChips.splice(i, 1); else st.accChips.push(a);
        this.paintCo(box);
      });
      const accClr = box.querySelector('#accClr'); if (accClr) accClr.onclick = () => { st.accChips = []; this.paintCo(box); };
      box.querySelectorAll('[data-claim]').forEach(b => b.onclick = e => {
        e.stopPropagation();
        const id = b.dataset.claim, c = coById(id);
        if (st.claims.includes(id) || taskOf(id)) return;
        confirmDlg(`主动认领「${esc(c.short)}」？<br><span class="text-xs text-muted">认领即时生效：自动生成客户经理跟进任务（来源标记"自认领"），全程留痕，产品经理可在任务跟踪中查看。</span>`, () => {
          st.claims.push(id);
          const u = APP.curUser();
          st.tasks.unshift({
            id: 'FTC' + Date.now().toString(36), co: id, rm: 'rm-drz', type: '营销跟进', due: '11-18', status: '待接收', d: '2026-11-04',
            note: `${u.name} 主动认领（自认领）：结合AI作战包出方案后拜访；同步摸排非信贷综合服务机会`,
            prods: (c.prods || []).slice(0, 3),
            log: [{ d: '11-04', t: '自认领', by: `${u.name} · ${u.dept}`, x: `客户经理主动认领「${c.short}」（来源：客户池认领），进入跟进流程；产品经理可见` }],
          });
          toast(`已认领「${c.short}」，任务已生成（来源：自认领）`);
          this.paintCo(box);
        });
      });
      const trk = box.querySelector('#fnTrack'); trk.onchange = () => { f.track = trk.value; this.paintCo(box); };
      const kw = box.querySelector('#fnKw'); kw.oninput = () => { f.kw = kw.value.trim(); this.paintCo(box); const k2 = box.querySelector('#fnKw'); k2.focus(); k2.setSelectionRange(k2.value.length, k2.value.length); };
      box.querySelectorAll('[data-why]').forEach(el => el.onclick = e => { e.stopPropagation(); APP.go('plan', { co: el.dataset.why }); });
      box.querySelectorAll('[data-det]').forEach(b => b.onclick = e => { e.stopPropagation(); APP.go('company', { id: b.dataset.det }); });
      box.querySelectorAll('[data-sub]').forEach(b => b.onclick = e => {
        e.stopPropagation();
        const id = b.dataset.sub, c = coById(id), i = F().subs.indexOf(id);
        if (i >= 0 && taskOf(id)) { toast(`「${c.short}」已下发跟进任务，不可取消订阅`, 'warn'); return; }
        if (i >= 0) { F().subs.splice(i, 1); toast(`已取消订阅「${c.short}」`); }
        else { F().subs.push(id); toast(`已订阅「${c.short}」，请在"订阅的企业"中统一下发跟进`); }
        this.paintCo(box);
      });
      /* 产品经理：客户清单行内直接下发 */
      box.querySelectorAll('[data-one-disp]').forEach(b => b.onclick = e => {
        e.stopPropagation();
        if (b.disabled) return;
        const id = b.dataset.oneDisp;
        this.dispatchDlg([id]);
      });
      /* 智能筛选（自然语言） */
      const nlGo = box.querySelector('#fnNlGo');
      if (nlGo) nlGo.onclick = () => this.runNL();
      const nlClr = box.querySelector('#fnNlClr');
      if (nlClr) nlClr.onclick = () => this.clearCond();
      box.querySelectorAll('[data-nlcond]').forEach(t => t.onclick = () => this.rmCond(+t.dataset.nlcond));
      const nlQ = box.querySelector('#fnNlQ');
      if (nlQ) nlQ.addEventListener('keydown', e => { if (e.key === 'Enter') this.runNL(); });
      /* B3+B4：AI 匹配动效——仅本会话首次进入企业总览播放 */
      if (!st.prodLit) {
        st.prodLit = true;
        requestAnimationFrame(() => {
          const links = [...box.querySelectorAll('td.fn-prod-td .fn-prod-link')];
          const bars = [...box.querySelectorAll('.fn-score-bd i')];
          bars.forEach(b => { const w = b.style.width; b.style.transition = 'width .8s cubic-bezier(.22,.61,.36,1)'; b.style.width = '0%'; requestAnimationFrame(() => requestAnimationFrame(() => { b.style.width = w; })); });
          if (!links.length) return;
          links.forEach(el => { el.dataset.txt = el.innerHTML; el.textContent = ''; el.classList.add('fn-skel'); });
          const BATCH = Math.ceil(links.length / 26);
          let i = 0;
          const timer = setInterval(() => {
            links.slice(i, i + BATCH).forEach(el => { el.classList.remove('fn-skel'); el.innerHTML = el.dataset.txt; });
            i += BATCH;
            if (i >= links.length) clearInterval(timer);
          }, 55);
        });
      }
    },
    /* ---------- 自然语言筛选动作 ---------- */
    /* ---------- 客户结构洞察（随筛选联动） ---------- */
    insightHtml(list) {
      const netRows = NETS().map(n => {
        const rows = list.filter(c => c.net === n);
        const op = rows.filter(c => c.cat === '建设运营商').length;
        return { n, op, up: rows.length - op, total: rows.length };
      });
      const maxN = Math.max(1, ...netRows.map(r => r.total));
      const netBars = netRows.map(r => `<div class="fn-ibar"><span class="fn-ib-l">${r.n}</span>
        <div class="fn-ib-t"><i class="op" style="width:${(r.op / maxN * 100).toFixed(1)}%"></i><i class="up" style="width:${(r.up / maxN * 100).toFixed(1)}%"></i></div>
        <span class="fn-ib-n">${r.total}</span></div>`).join('');
      const mxMax = Math.max(1, ...CATS.flatMap(cat => PROGS.map(pg => list.filter(c => c.cat === cat && c.prog === pg).length)));
      const mxCell = n => { const cls = n >= mxMax * 0.6 ? 'hot' : n >= mxMax * 0.3 ? 'mid' : 'low'; return `<div class="mx-c ${cls}"><b>${n}</b><span>家</span></div>`; };
      const matrix = '<div class="mx-h"></div>' + PROGS.map(pg => `<div class="mx-h">${pg}</div>`).join('')
        + CATS.map(cat => `<div class="mx-l">${cat}</div>` + PROGS.map(pg => mxCell(list.filter(c => c.cat === cat && c.prog === pg).length)).join('')).join('');
      const heatBars = (entries, twoCol) => {
        const mx = Math.max(1, ...entries.map(e => e[1]));
        const heat = v => { const t = v / mx; return t >= .75 ? '#8E1019' : t >= .5 ? '#C0202C' : t >= .3 ? '#D96C76' : t >= .15 ? '#E9A7AD' : '#F3C6CA'; };
        return `<div class="${twoCol ? 'fn-ib-grid2' : ''}">` + entries.map(([l, v]) => `<div class="fn-ibar"><span class="fn-ib-l" title="${esc(l)}">${esc(l)}</span>
          <div class="fn-ib-t"><i style="width:${(v / mx * 100).toFixed(1)}%;background:${heat(v)}"></i></div>
          <span class="fn-ib-n">${v}</span></div>`).join('') + '</div>';
      };
      const nats = ['民营企业', '央企子公司', '地方国资', '省属国企', '政府及平台', '外资企业', '科研院所']
        .map(n => [n, list.filter(c => c.nat === n).length]).filter(e => e[1] > 0);
      const cityNames = [...new Set(list.map(c => c.city))];
      const cities = cityNames.map(ct => [ct, list.filter(c => c.city === ct).length]).sort((a, b) => b[1] - a[1]);
      return `
        <div class="fn-insight">
          <div class="fn-ibox">
            <div class="fn-ibox-t">六张网客户分布<em>建设运营商 / 上游供应商</em></div>
            ${netBars}
            <div class="fn-ilegend"><span><i style="background:var(--brand-500)"></i>建设运营商</span><span><i style="background:#3FB89B"></i>上游供应商</span></div>
          </div>
          <div class="fn-ibox">
            <div class="fn-ibox-t">客户大类 × 营销进展<em>家</em></div>
            <div class="fn-matrix">${matrix}</div>
          </div>
          <div class="fn-ibox">
            <div class="fn-ibox-t">企业性质分布<em>家 · 色深=家数</em></div>
            ${heatBars(nats)}
          </div>
          <div class="fn-ibox">
            <div class="fn-ibox-t">城市分布<em>家 · 色深=家数</em></div>
            ${heatBars(cities.slice(0, 14), true)}
          </div>
        </div>`;
    },
    setQ(q) { const st = F(); st.nlQ = q; this.runNL(); },
    runNL() {
      const q = ($('#fnNlQ') || {}).value;
      if (!q || !q.trim()) return toast('请输入一句话筛选要求', 'warn');
      const st = F();
      st.nlQ = q.trim();
      st.conds = parseNL(q);
      if (!st.conds.length) return toast('未能解析出有效条件，请换个说法（如：六张网 总行正面清单 / 无锡 算力网 评分85以上）', 'warn');
      /* "项目"关键词：项目清单按所属网/要点关键词同步筛选 */
      if (st.conds.some(c => c.k === 'proj')) {
        st.pjF = st.pjF || { net: '全部', stage: '全部', prog: '全部', kw: '' };
        const netCond = st.conds.find(c => c.k === 'net');
        st.pjF.net = netCond ? netCond.v : '全部';
        st.pjF.kw = st.nlQ.replace(/六张网|总行|长三角|正面清单|负面清单|正面|负面|准入|清单|项目/g, '').trim().slice(0, 12);
      }
      const tagCond = st.conds.find(c => c.k === 'tag');
      /* 自然语言筛选作用于客户清单；当前不在该 Tab 时自动切回 */
      const panel = document.querySelector('#fnTabs .tab-panel');
      if (S.params.tab && S.params.tab !== 'co') { S.params.tab = 'co'; this.render(document.querySelector('#viewRoot')); return; }
      this.paintCo(panel);
      if (tagCond) {
        const hits = filteredCos();
        hits.forEach(c => {
          st.tags[c.id] = st.tags[c.id] || [];
          if (!st.tags[c.id].some(t => t.t === tagCond.v)) st.tags[c.id].push({ t: tagCond.v, by: APP.curUser().role + ' · ' + APP.curUser().name, d: '11-04' });
        });
        toast(`AI 已解析 ${st.conds.length} 个条件，命中 ${hits.length} 家，并生成备注标签「${tagCond.v}」`);
        this.paintCo(document.querySelector('#fnTabs .tab-panel'));
      } else {
        toast(`AI 已解析 ${st.conds.length} 个筛选条件，命中 ${filteredCos().length} 家`);
      }
    },
    rmCond(i) {
      const st = F(), c = st.conds[i];
      st.conds.splice(i, 1);
      if (c && c.k === 'tag') Object.keys(st.tags).forEach(id => { st.tags[id] = st.tags[id].filter(t => t.t !== c.v); });
      this.paintCo(document.querySelector('#fnTabs .tab-panel'));
    },
    clearCond() {
      const st = F();
      st.conds.forEach(c => { if (c.k === 'tag') Object.keys(st.tags).forEach(id => { st.tags[id] = st.tags[id].filter(t => t.t !== c.v); }); });
      st.conds = []; st.nlQ = '';
      this.paintCo(document.querySelector('#fnTabs .tab-panel'));
    },

    /* ---------- 导入企业（Excel 模拟解析 + 手动录入） ---------- */
    importDlg() {
      const IMP_DEMO = [
        ['南京江北智慧城市科技有限公司', '新一代通信网', '城市物联', '南京', '江北新区', 71, '培养', '基础', '择优'],
        ['江苏国粮冷链物流有限公司', '物流网', '冷链物流', '南京', '建邺区', 69, '储备', '基础', '承接'],
        ['泰州恒润特种电缆有限公司', '新型电网', '特种电缆', '泰州', '海陵区', 64, '储备', '基础', '择优'],
        ['淮海算力（徐州）中心有限公司', '算力网', '智算中心运营', '徐州', '泉山区', 73, '培养', '腰部', '次攻'],
      ];
      openModal({ small: true, title: '导入企业 · 名单导入', body: `
        <div class="flex mb2" style="gap:8px"><b>Excel 名单导入</b><span class="text-xs text-muted">支持 xlsx / csv · 导入后来源标记为"导入"</span></div>
        <div class="drop" id="fnDrop"><b>拖拽文件到此处，或点击选择</b>示例：六张网补充名单.xlsx（4 行）<div class="mt2"><button class="btn btn-ghost btn-sm" id="fnParse">解析示例文件</button><button class="btn btn-text btn-sm" id="fnTpl">下载导入模板</button></div></div>
        <div id="fnParseOut" class="mt3"></div>`,        foot: `<button class="btn btn-ghost" onclick="APP.closeModal()">关闭</button>` });
      $('#fnTpl').onclick = () => toast('模板已开始下载：六张网企业导入模板.xlsx');
      const drop = $('#fnDrop');
      drop.onclick = () => $('#fnParse').click();
      $('#fnParse').onclick = e => {
        e.stopPropagation();
        const out = $('#fnParseOut');
        out.innerHTML = `<div class="ai-panel"><div class="ai-head"><span class="ai-badge">AI</span>正在解析…</div><div class="ai-body text-sm text-sub">读取文件 → 字段映射 → 工商信息补全 → 查重 → 四维标签预打分</div></div>`;
        setTimeout(() => {
          out.innerHTML = `
            <div class="card" style="box-shadow:none;border:1px solid var(--line)">
              <table class="tbl"><thead><tr><th>企业名称</th><th>方向</th><th>地区</th><th>预评分</th></tr></thead><tbody>
              ${IMP_DEMO.map(r => `<tr><td class="text-sm">${esc(r[0])}</td><td class="text-sm">${esc(r[1])}/${esc(r[2])}</td><td class="text-sm">${esc(r[3])}·${esc(r[4])}</td><td class="text-sm"><b>${r[5]}</b></td></tr>`).join('')}
              </tbody></table>
              <div class="text-xs text-muted" style="padding:8px 12px">解析 4 行 · 查重跳过 0 行 · AI 已按六张网口径完成标签预打分</div>
              <div style="padding:10px 12px;border-top:1px solid var(--line)"><button class="btn btn-primary" id="fnImpOk">确认导入 4 家</button></div>
            </div>`;
          $('#fnImpOk').onclick = () => {
            IMP_DEMO.forEach(r => {
              if (M().funnel.cos.some(c => c.name === r[0])) return;
              M().funnel.cos.push({
                id: 'FI' + Date.now().toString(36) + r[0].length, name: r[0], short: r[0].replace(/(股份有限公司|有限责任公司|有限公司|集团|（.*?）)/g, '').slice(0, 8) || r[0].slice(0, 8),
                net: r[1], track: r[2], city: r[3], zone: r[4], layer: '储备', status: '潜在', cap: '—', score: r[5], prog: r[6], pos: r[7], wt: r[8], src: 'IMP',
                cat: '上游供应商', nat: '民营企业', listed: '否', sigLv: r[5] >= 80 ? 'A' : r[5] >= 60 ? 'B' : '观察', rel: '一般相关',
                prods: NET_PROD[r[1]] || ['流动资金贷款'], opp: '',
                sig: ['产品经理导入名单（' + (r[2]) + '）', 'AI 已按六张网口径完成标签预打分'], recent: '产品经理导入，AI 已完成标签预打分，待补充公开信息', tags: ['导入名单'],
                imp: { by: '分行产品经理 · 陈立', d: '2026-11-04', note: '六张网补充名单.xlsx' },
                industry: r[1], seg: r[2], est: '—', emp: '—', legal: '—', uscc: '—', type: '—', park: '—', addr: '—', scope: '—', qual: [],
                grade: r[5] >= 85 ? 'A' : r[5] >= 70 ? 'B' : 'C', ipo: '',
                internal: { credit: 0, used: 0, deposit: 0, settle: 0, products: [] },
              });
            });
            APP.closeModal(); toast('已导入 4 家企业（来源标记为"导入"），可在"来源=导入"中查看');
            S.params.tab = 'co'; this.render(document.querySelector('#viewRoot'));
          };
        }, 900);
      };
    },

    /* ---------------- Tab 2：订阅的企业（下发） ---------------- */
    paintSub(box) {
      const st = F();
      const list = st.subs.map(coById).filter(Boolean);
      if (!st.subSel) st.subSel = [];
      const sel = st.subSel;
      const all = M().funnel.cos;
      const stage = (lab, n, tip, end) => `<div class="fn-stage ${end ? 'fn-stage-end' : ''}" title="${esc(tip)}"><div class="fn-s-n fs-num">${n}</div><div class="fn-s-l">${lab}</div></div>${end ? '' : '<span class="fn-arrow">›</span>'}`;
      const fedCnt = st.tasks.filter(t => t.status === '已反馈').length;
      box.innerHTML = `
        <div class="card card-pad mb3">
          <div class="flex mb2" style="gap:8px"><b>机会转化漏斗</b><span class="text-xs text-muted">企业库 → 已订阅 → 已下发 → 已反馈</span></div>
          <div class="fn-funnel">
            ${stage('全部企业', all.length, '六张网企业库总量（AI网络筛选 + 产品经理导入）')}
            ${stage('已订阅', st.subs.length, '产品经理订阅的企业（订阅不等于下发）')}
            ${stage('已下发', st.tasks.length, '已下发客户经理的任务')}
            ${stage('已反馈', fedCnt, '客户经理已反馈进展的任务', true)}
          </div>
        </div>
        <div class="filter-bar">
          <b style="margin-right:6px">订阅池（${list.length} 家）</b>
          <span class="text-xs text-muted">订阅不等于下发：筛选确认后，将企业下发客户经理跟进</span>
          <span style="flex:1"></span>
          <button class="btn btn-ghost btn-sm" id="subAll">${sel.length === list.length && list.length ? '取消全选' : '全选'}</button>
          <button class="btn btn-primary btn-sm" id="subDsp">下发选中（${sel.length}）</button>
        </div>
        <div class="card"><div class="tbl-wrap"><table class="tbl fn-tbl" style="min-width:1630px"><thead><tr>
          <th style="width:40px"></th><th style="width:134px">企业名称</th><th style="width:90px">客户大类</th><th style="width:174px">上市情况</th><th style="width:96px">六张网</th>
          <th style="width:125px">细分赛道</th><th style="width:84px">企业性质</th><th style="width:89px">地区</th>
          <th style="width:76px">营销进展</th><th style="width:74px">地位</th><th style="width:74px">权重</th>
          <th style="width:100px">综合评分</th><th style="width:76px">信号</th><th style="width:132px">✦ 建议服务方案</th>
          <th style="width:84px">下发 / 经理</th><th style="width:182px">操作</th></tr></thead><tbody>
        ${list.map(c => { const t = taskOf(c.id); return `<tr>
          <td><input type="checkbox" data-sel="${c.id}" ${sel.includes(c.id) ? 'checked' : ''} style="accent-color:var(--brand-500)"></td>
          <td title="${esc(c.name)}"><b class="text-sm">${esc(c.short)}</b>${pmTag(c.id) ? `<div style="margin-top:2px">${pmTag(c.id)}</div>` : ''}</td>
          <td>${catTag(c.cat)}</td>
          <td title="${esc(c.listed)}">${c.listed.indexOf('是') === 0 ? '是·' + esc(c.listed.slice(2)) : '<span class="text-muted">否</span>'}</td>
          <td>${esc(c.net)}</td>
          <td title="${esc(c.track)}${c.opp ? ' ｜ 机会地：' + esc(c.opp) : ''}">${esc(c.track)}</td>
          <td>${esc(c.nat)}</td>
          <td title="${esc(c.city)}·${esc(c.zone)}${c.opp ? ' ｜ 机会地：' + esc(c.opp) : ''}">${esc(c.city)}·${esc(c.zone)}</td>
          <td><span class="tag ${progTag(c.prog)}" style="height:19px;font-size:10px;padding:0 6px">${c.prog}</span></td>
          <td><span class="tag ${posTag(c.pos)}" style="height:19px;font-size:10px;padding:0 6px">${c.pos}</span></td>
          <td><span class="tag ${wtTag(c.wt)}" style="height:19px;font-size:10px;padding:0 6px">${c.wt}</span></td>
          <td>${scoreBar(c.score)}</td>
          <td>${sigTag(c.sigLv)}</td>
          <td class="fn-prod-td"><span class="fn-prod-link" data-why="${c.id}" title="点击查看 AI 推荐理由">${esc((c.prods || []).join(' / '))}</span></td>
          <td>${t ? `<span class="tag tag-green" style="height:19px;font-size:10px;padding:0 6px">${t.status}</span><div class="text-xs" style="margin-top:2px" title="${esc(rmById(t.rm).unit)}">${esc(rmById(t.rm).name)}</div>` : '<span class="tag tag-gray" style="height:19px;font-size:10px;padding:0 6px">未下发</span>'}</td>
          <td onclick="event.stopPropagation()">
            ${t ? `<button class="btn btn-text btn-sm" data-view="${c.id}">跟踪</button>` : `<button class="btn btn-text btn-sm" data-one="${c.id}">下发</button>`}
            <button class="btn btn-text btn-sm" data-det="${c.id}">详情</button>
            ${t ? '' : `<button class="btn btn-text btn-sm" data-unsub="${c.id}" title="取消订阅">退订</button>`}</td></tr>`; }).join('') ||
        `<tr><td colspan="16"><div class="empty"><div class="e-ico">📭</div><div class="e-title">暂无订阅企业</div><div class="e-sub text-sm text-muted">在"企业总览"中订阅感兴趣的企业</div></div></td></tr>`}</tbody></table></div></div>`;
      box.querySelectorAll('[data-sel]').forEach(ck => ck.onchange = () => {
        const id = ck.dataset.sel, i = sel.indexOf(id);
        if (ck.checked && i < 0) sel.push(id); if (!ck.checked && i >= 0) sel.splice(i, 1);
        this.paintSub(box);
      });
      box.querySelectorAll('[data-why]').forEach(el => el.onclick = e => { e.stopPropagation(); APP.go('plan', { co: el.dataset.why }); });
      box.querySelectorAll('[data-det]').forEach(b => b.onclick = e => { e.stopPropagation(); APP.go('company', { id: b.dataset.det }); });
      const allBtn = box.querySelector('#subAll');
      if (allBtn) allBtn.onclick = () => { st.subSel = (sel.length === list.length && list.length) ? [] : list.map(c => c.id); this.paintSub(box); };
      const dsp = box.querySelector('#subDsp');
      if (dsp) dsp.onclick = () => {
        const ids = (sel.length ? sel : []).filter(id => !taskOf(id));
        if (!ids.length) return toast('请先勾选未下发企业', 'warn');
        this.dispatchDlg(ids);
      };
      box.querySelectorAll('[data-one]').forEach(b => b.onclick = () => this.dispatchDlg([b.dataset.one]));
      box.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { S.params.tab = 'task'; S.fn.focusTask = taskOf(b.dataset.view).id; this.render(document.querySelector('#viewRoot')); });
      box.querySelectorAll('[data-unsub]').forEach(b => b.onclick = () => {
        const id = b.dataset.unsub, c = coById(id);
        confirmDlg(`取消订阅「${esc(c.short)}」？已下发的跟进任务不受影响。`, () => {
          F().subs = F().subs.filter(x => x !== id); F().subSel = [];
          toast(`已取消订阅「${c.short}」`); this.paintSub(box);
        });
      });
    },
    /* ---------- 下发弹窗 ---------- */
    dispatchDlg(ids) {
      const st = F();
      const cos = ids.map(coById);
      const first = cos[0];
      const preProds = (first.prods && first.prods.length >= 2 ? first.prods.slice(0, 3) : (NET_PROD[first.net] || []));
      openModal({ wide: true, title: `下发客户维护清单（${cos.length} 家）`, body: `
        <div class="mb3" style="padding:10px 14px;background:var(--blue-50);border-radius:10px">
          <div class="text-sm" style="font-weight:600;margin-bottom:4px">下发对象</div>
          <div class="flex wrap" style="gap:6px">${cos.map(c => `<span class="tag tag-line" style="height:22px">${esc(c.short)}（${c.net} · 评分${c.score}）</span>`).join('')}</div>
        </div>
        <div class="form">
          <div class="grid-2">
            <div class="form-item"><label class="form-label">承接客户经理</label>
              <select class="select" id="dfRm">${M().funnel.rms.map(r => `<option value="${r.id}">${esc(r.name)} · ${esc(r.unit)}</option>`).join('')}</select></div>
            <div class="form-item"><label class="form-label">任务类型</label>
              <select class="select" id="dfType"><option>营销跟进</option><option>调研摸排</option><option>产品推介</option><option>风险排查</option></select></div>
          </div>
          <div class="form-item"><label class="form-label">完成时限</label><select class="select" id="dfDue"><option>11-08</option><option selected>11-12</option><option>11-18</option><option>11-25</option></select></div>
          <div class="form-item"><label class="form-label">任务说明（AI 预填，可修改）</label><textarea class="input" id="dfNote" rows="3"></textarea>
            <div class="text-xs text-muted mt1">AI 根据企业信号与四维标签生成跟进要点，强调信贷与非信贷综合服务</div></div>
          <div class="form-item"><label class="form-label">重点产品与服务（含非信贷）</label>
            <div class="flex wrap" style="gap:6px" id="dfProds">${PROD_POOL.map(p => `<button type="button" class="chip ${preProds.includes(p) ? 'on' : ''}" data-p="${p}" style="height:24px;font-size:11px;padding:0 10px">${p}</button>`).join('')}</div></div>
        </div>`,
        foot: `<button class="btn btn-ghost" onclick="APP.closeModal()">取消</button><button class="btn btn-primary" id="dfGo">确认下发</button>`,
        onOpen: () => {
          const noteGen = c => { const pr = (c.prods && c.prods.length ? c.prods : (NET_PROD[c.net] || ['流动资金贷款'])).slice(0, 3); return `${c.short}（${c.cat}·${c.net}·${c.track}，${c.prog}/${c.pos}/${c.wt}，评分${c.score}）：AI 建议主推${pr.join('、')}，同步摸排非信贷综合服务（结算/代发/理财）与资金监管机会。`; };
          $('#dfNote').value = cos.map(noteGen).join('\n');
          $('#dfProds').querySelectorAll('.chip').forEach(ch => ch.onclick = () => ch.classList.toggle('on'));
        } });
      $('#dfGo').onclick = () => {
        const rmId = $('#dfRm').value, type = $('#dfType').value, due = $('#dfDue').value, note = $('#dfNote').value.trim();
        const prods = [...document.querySelectorAll('#dfProds .chip.on')].map(c => c.dataset.p);
        if (!prods.length) return toast('请至少选择一项重点产品与服务', 'warn');
        cos.forEach(c => {
          if (taskOf(c.id)) return;
          st.tasks.unshift({
            id: 'FT' + Date.now().toString(36) + c.id, co: c.id, rm: rmId, type, due, status: '待接收', d: '2026-11-04',
            note: note || `跟进「${c.short}」`, prods, log: [{ d: '11-04', t: '任务下发', by: '分行产品经理 · 陈立', x: `下发客户维护清单（${type}），重点：${prods.join('、')}` }],
          });
        });
        APP.closeModal();
        toast(`已下发 ${cos.length} 家企业至「${rmById(rmId).name} · ${rmById(rmId).unit}」，任务状态：待接收`);
        st.subSel = [];
        S.params.tab = 'task'; this.render(document.querySelector('#viewRoot'));
      };
    },

    /* ---------- 手工录入客户（客户经理：任意客户 → 入客户池 → AI分析/方案闭环） ---------- */
    manualDlg() {
      openModal({ small: true, title: '手工录入客户', body: `
        <div class="text-xs text-muted mb3" style="line-height:1.7">客户经理可录入任意客户（不限于AI筛选名单）。录入后自动入客户池，可配合生成客户画像 / 深度分析 / 拜访要点与综合服务方案。</div>
        <div class="form">
          <div class="form-item"><label class="form-label">企业名称 *</label><input class="input" id="mnName" placeholder="如：无锡某某精密制造有限公司"></div>
          <div class="grid-2">
            <div class="form-item"><label class="form-label">所在地区</label><input class="input" id="mnCity" placeholder="如：无锡·锡山区"></div>
            <div class="form-item"><label class="form-label">所属方向</label>
              <select class="select" id="mnNet">${NETS().map(n => `<option>${n}</option>`).join('')}</select></div>
          </div>
          <div class="form-item"><label class="form-label">主营 / 线索情况（AI 将据此出画像与方案）</label>
            <textarea class="input" id="mnNote" rows="3" placeholder="如：为本地头部车企供应精密结构件，年营收约1.2亿，账期90天，近期计划扩产"></textarea></div>
        </div>`,
        foot: `<button class="btn btn-ghost" onclick="APP.closeModal()">取消</button><button class="btn btn-primary" id="mnGo">录入并生成AI作战包</button>` });
      $('#mnGo').onclick = () => {
        const name = $('#mnName').value.trim();
        if (!name) return toast('请输入企业名称', 'warn');
        const net = $('#mnNet').value, note = $('#mnNote').value.trim();
        const loc = ($('#mnCity').value.trim() || '无锡').split(/[·\-]/);
        const id = 'FM' + Date.now().toString(36);
        const u = APP.curUser();
        M().funnel.cos.unshift({
          id, name, short: name.replace(/(股份有限公司|有限责任公司|有限公司|集团|（.*?）)/g, '').slice(0, 8) || name.slice(0, 8),
          net, track: note ? note.slice(0, 12) : net + '相关', city: loc[0], zone: loc[1] || '—', opp: '',
          listed: '否', nat: '民营企业', prog: '培育', pos: '基础', wt: '承接',
          layer: '储备', status: '潜在', cap: '—', score: 60, sigLv: 'B', rel: '一般相关',
          prods: NET_PROD[net] || ['流动资金贷款'], src: 'MANUAL',
          sig: ['客户经理手工录入（' + u.name + '）', note || '待补充企业情况'],
          recent: note || '客户经理录入，待补充公开信息', tags: ['手工录入'],
          industry: net, seg: note ? note.slice(0, 12) : '—', est: '—', emp: '—', legal: '—', uscc: '—', type: '民营企业', park: '—', addr: '—', scope: '—', qual: [],
          grade: 'C', ipo: '',
          internal: { credit: 0, used: 0, deposit: 0, settle: 0, products: [] },
          imp: { by: u.name + ' · ' + u.dept, d: '2026-11-04', note: '手工录入客户' },
        });
        /* 同步生成自认领任务，进工作台闭环 */
        F().claims.push(id);
        F().tasks.unshift({
          id: 'FTM' + Date.now().toString(36), co: id, rm: 'rm-drz', type: '营销跟进', due: '11-20', status: '待接收', d: '2026-11-04',
          note: note || `跟进手工录入客户「${name}」`,
          prods: NET_PROD[net] || ['流动资金贷款'],
          log: [{ d: '11-04', t: '手工录入', by: u.name + ' · ' + u.dept, x: `手工录入客户「${name}」并自认领跟进；${note || '待补充企业情况'}` }],
        });
        APP.closeModal();
        toast(`已录入「${name}」并生成跟进任务，可在「访前作战包」中选择该客户生成三目标内容`);
        S.packCo = id; S.packGoal = 'profile';
        APP.go('pack');
      };
    },

    /* ---------------- Tab 2.5：项目清单（与企业客户清单并行 · 产品经理下发） ---------------- */
    paintProj(box) {
      const st = F();
      if (!st.pjF) st.pjF = { net: '全部', stage: '全部', prog: '全部', kw: '' };
      const pf = st.pjF;
      const allProjs = (M().manage || { projects: [] }).projects;
      const projs = allProjs.filter(p =>
        (pf.net === '全部' || p.net === pf.net) &&
        (pf.stage === '全部' || p.stage === pf.stage) &&
        (pf.prog === '全部' || p.prog === pf.prog) &&
        (!pf.kw || (p.name + p.note).includes(pf.kw)));
      if (!st.projSel) st.projSel = [];
      const sel = st.projSel.filter(id => projs.some(p => p.id === id));
      const taskOfProj = p => st.tasks.find(t => t.proj === p.id);
      const cName = id => { if (!id) return '—'; const c = M().funnel.cos.find(x => x.id === id); return c ? c.short : '—'; };
      const stTag = s => ({ 储备: 'tag-gray', 前期对接: 'tag-blue', 方案阶段: 'tag-orange', 已批复: 'tag-green', 已投放: 'tag-solid-red' }[s] || 'tag-gray');
      const pjChip = (k, v) => `<button class="chip ${pf[k] === v ? 'on' : ''}" data-pjf="${k}" data-pjv="${esc(v)}" style="height:24px;font-size:11px;padding:0 10px">${v}</button>`;
      box.innerHTML = `
        <div class="card card-pad mb3">
          <div class="flex mb2" style="gap:8px"><b>项目储备漏斗</b><span class="text-xs text-muted">六张网重大项目 · 与客户清单并行，由产品经理下发跟进</span></div>
          <div class="fn-funnel">
            <div class="fn-stage"><div class="fn-s-n fs-num">${allProjs.length}</div><div class="fn-s-l">项目清单</div></div><span class="fn-arrow">›</span>
            <div class="fn-stage"><div class="fn-s-n fs-num">${allProjs.filter(p => taskOfProj(p)).length}</div><div class="fn-s-l">已下发</div></div><span class="fn-arrow">›</span>
            <div class="fn-stage fn-stage-end"><div class="fn-s-n fs-num">${allProjs.filter(p => p.stage === '已批复' || p.stage === '已投放').length}</div><div class="fn-s-l">已批复/投放</div></div>
          </div>
        </div>
        <div class="fn-filter-card mb3">
          <div class="fn-frow">
            <span class="fn-flabel">项目筛选</span>
            <div class="fn-fgroup">
              <span class="f-label">所属网</span>${['全部', ...NETS()].map(v => pjChip('net', v)).join('')}
              <span class="fn-sep"></span><span class="f-label">阶段</span>${['全部', '储备', '前期对接', '方案阶段', '已批复', '已投放'].map(v => pjChip('stage', v)).join('')}
              <span class="fn-sep"></span><span class="f-label">营销进展</span>${['全部', '突破', '攻坚', '培育', '储备'].map(v => pjChip('prog', v)).join('')}
              <input class="input" id="pjKw" placeholder="搜索项目…" value="${esc(pf.kw)}" style="width:150px;height:26px;margin-left:auto">
            </div>
          </div>
        </div>
        <div class="filter-bar">
          <b style="margin-right:6px">项目清单（${projs.length} 个）</b>
          <span class="text-xs text-muted">勾选后下发客户经理，项目关联企业同步生成跟进任务；随项目深入，纪要/协同/方案同闭环</span>
          <span style="flex:1"></span>
          <button class="btn btn-ghost btn-sm" id="pjAll">${sel.length === projs.length && projs.length ? '取消全选' : '全选'}</button>
          <button class="btn btn-primary btn-sm" id="pjDsp">下发选中（${sel.length}）</button>
        </div>
        <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>
          <th style="width:40px"></th><th style="min-width:200px">项目名称</th><th style="width:96px">所属网</th><th style="width:70px">权重</th>
          <th style="width:88px">投资额</th><th style="width:80px">阶段</th><th style="width:74px">营销进展</th><th style="width:120px">所在地</th><th style="min-width:190px">实施主体</th><th style="min-width:170px">可参与方式</th><th style="width:90px">操作</th></tr></thead><tbody>
        ${projs.map(p => { const t = taskOfProj(p), rm = t ? rmById(t.rm) : null; return `<tr>
          <td>${t ? '<span class="tag tag-green" style="height:19px;font-size:10px;padding:0 5px">已下发</span>' : `<input type="checkbox" data-pjsel="${p.id}" ${sel.includes(p.id) ? 'checked' : ''} style="accent-color:var(--brand-500)">`}</td>
          <td><b class="text-sm">${esc(p.name)}</b></td>
          <td class="text-sm">${esc(p.net)}</td>
          <td><span class="tag ${wtTag(p.wt || '承接')}" style="height:19px;font-size:10px;padding:0 6px">${esc(p.wt || '承接')}</span></td>
          <td class="text-sm fs-num">${esc(p.amt)}</td>
          <td><span class="tag ${stTag(p.stage)}" style="height:19px;font-size:10px;padding:0 6px">${p.stage}</span></td>
          <td><span class="tag ${progTag(p.prog)}" style="height:19px;font-size:10px;padding:0 6px">${p.prog}</span></td>
          <td class="text-sm text-sub">${esc(p.city || '—')}</td>
          <td class="text-sm text-sub" style="white-space:normal;line-height:1.5">${esc(p.owner || '—')}</td>
          <td class="text-sm text-sub" style="white-space:normal;line-height:1.5">${esc((p.prods || []).join(' / '))}</td>
          <td onclick="event.stopPropagation()" style="white-space:nowrap">${t ? `<span class="text-xs text-muted">${esc(rm ? rm.name : '')} 承接</span>` : `<button class="btn btn-text btn-sm" data-pjone="${p.id}">下发</button>`}</td></tr>`; }).join('') ||
        '<tr><td colspan="11"><div class="empty"><div class="e-ico">🏗</div><div class="e-title">当前条件下暂无项目</div></div></td></tr>'}</tbody></table></div></div>`;
      box.querySelectorAll('[data-pjf]').forEach(b => b.onclick = () => { pf[b.dataset.pjf] = b.dataset.pjv; this.paintProj(box); });
      const pjKw = box.querySelector('#pjKw');
      if (pjKw) pjKw.oninput = () => { pf.kw = pjKw.value.trim(); this.paintProj(box); const k2 = box.querySelector('#pjKw'); k2.focus(); k2.setSelectionRange(k2.value.length, k2.value.length); };
      box.querySelectorAll('[data-pjsel]').forEach(ck => ck.onchange = () => {
        const id = ck.dataset.pjsel, i = sel.indexOf(id);
        if (ck.checked && i < 0) sel.push(id); if (!ck.checked && i >= 0) sel.splice(i, 1);
        this.paintProj(box);
      });
      const all = box.querySelector('#pjAll');
      if (all) all.onclick = () => { st.projSel = (sel.length === projs.length && projs.length) ? [] : projs.filter(p => !taskOfProj(p)).map(p => p.id); this.paintProj(box); };
      const dsp = box.querySelector('#pjDsp');
      if (dsp) dsp.onclick = () => {
        const ids = sel.filter(id => projs.some(p => p.id === id) && !taskOfProj(projs.find(p => p.id === id)));
        if (!ids.length) return toast('请先勾选未下发项目', 'warn');
        this.projDispatchDlg(ids);
      };
      box.querySelectorAll('[data-pjone]').forEach(b => b.onclick = () => this.projDispatchDlg([b.dataset.pjone]));
    },
    /* 项目清单下发弹窗（项目任务与企业任务同闭环） */
    projDispatchDlg(ids) {
      const projs = (M().manage || { projects: [] }).projects.filter(p => ids.includes(p.id));
      openModal({ wide: true, title: `下发项目跟进清单（${projs.length} 个）`, body: `
        <div class="mb3" style="padding:10px 14px;background:var(--blue-50);border-radius:10px">
          <div class="text-sm" style="font-weight:600;margin-bottom:4px">下发项目</div>
          <div class="flex wrap" style="gap:6px">${projs.map(p => `<span class="tag tag-line" style="height:22px">${esc(p.name)}（${esc(p.net)} · ${esc(p.amt)}）</span>`).join('')}</div>
        </div>
        <div class="form">
          <div class="grid-2">
            <div class="form-item"><label class="form-label">承接客户经理</label>
              <select class="select" id="pjRm">${M().funnel.rms.map(r => `<option value="${r.id}">${esc(r.name)} · ${esc(r.unit)}</option>`).join('')}</select></div>
            <div class="form-item"><label class="form-label">完成时限</label><select class="select" id="pjDue"><option>11-12</option><option selected>11-18</option><option>11-25</option></select></div>
          </div>
          <div class="form-item"><label class="form-label">跟进要点（AI 预填，可修改）</label><textarea class="input" id="pjNote" rows="3"></textarea></div>
        </div>`,
        foot: `<button class="btn btn-ghost" onclick="APP.closeModal()">取消</button><button class="btn btn-primary" id="pjGo">确认下发</button>`,
        onOpen: () => {
          $('#pjNote').value = projs.map(p => `${p.name}（${p.net}·${p.amt}）：${p.note}`).join('\n');
        } });
      $('#pjGo').onclick = () => {
        const rmId = $('#pjRm').value, due = $('#pjDue').value, note = $('#pjNote').value.trim();
        const st = F();
        projs.forEach(p => {
          if (st.tasks.find(t => t.proj === p.id)) return;
          /* 关联客户：实施主体在客户池中命中则绑定；否则挂到该网第一个储备客户，任务卡片以项目名为主标识 */
          let coId = p.co;
          if (!coId && p.owner) { const hit = M().funnel.cos.find(c => p.owner.indexOf(c.short) >= 0 || c.name.indexOf(p.owner.slice(0, 6)) >= 0); coId = hit ? hit.id : null; }
          if (!coId) { const fb = M().funnel.cos.find(c => c.net === p.net) || M().funnel.cos[0]; coId = fb.id; }
          st.tasks.unshift({
            id: 'FTP' + Date.now().toString(36) + p.id, co: coId, proj: p.id, rm: rmId, type: '项目跟进', due, status: '待接收', d: '2026-11-04',
            note: `【项目】${p.name}（${p.net} · ${p.amt} · 实施主体：${p.owner || '—'}）：` + (note || (p.prods || []).join('/')),
            prods: p.prods || ['项目贷款'],
            log: [{ d: '11-04', t: '任务下发', by: APP.curUser().role + ' · ' + APP.curUser().name, x: `下发项目跟进清单：${p.name}（${p.net} · ${p.amt} · ${p.city || ''}）` }],
          });
        });
        APP.closeModal();
        toast(`已下发 ${projs.length} 个项目至「${rmById(rmId).name} · ${rmById(rmId).unit}」`);
        st.projSel = [];
        S.params.tab = 'task'; this.render(document.querySelector('#viewRoot'));
      };
    },

    /* ---------------- Tab 3：任务下发与跟踪（仅已下发） ---------------- */
    paintTask(box) {
      const st = F();
      const flt = st.taskF || '全部';
      const list = st.tasks.filter(t => flt === '全部' || t.status === flt);
      const stTag = s => ({ 待接收: 'tag-gray', 跟进中: 'tag-blue', 已反馈: 'tag-green', 已关闭: 'tag-line' }[s] || 'tag-gray');
      const cnt = s => st.tasks.filter(t => t.status === s).length;
      box.innerHTML = `
        <div class="kpi-grid mb3" style="grid-template-columns:repeat(5,1fr)">
          ${APP.kv('已下发任务', '<b style="font-size:22px">' + st.tasks.length + '</b> 项', '')}
          ${APP.kv('待接收', '<b style="font-size:22px">' + cnt('待接收') + '</b> 项', '')}
          ${APP.kv('跟进中', '<b style="font-size:22px">' + cnt('跟进中') + '</b> 项', '')}
          ${APP.kv('已反馈', '<b style="font-size:22px">' + cnt('已反馈') + '</b> 项', '')}
          ${APP.kv('覆盖企业', '<b style="font-size:22px">' + new Set(st.tasks.map(t => t.co)).size + '</b> 家', '')}
        </div>
        <div class="filter-bar">
          <span class="f-label">状态</span>${['全部', '待接收', '跟进中', '已反馈', '已关闭'].map(x => `<button class="chip ${flt === x ? 'on' : ''}" data-tf="${x}" style="height:24px;font-size:11px;padding:0 10px">${x}</button>`).join('')}
          <span class="text-xs text-muted" style="margin-left:auto">本页仅展示已下发任务及其跟进状态；订阅未下发企业见"订阅的企业"</span>
        </div>
        <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>
          <th style="min-width:150px">企业 / 任务</th><th style="width:72px">类型</th><th style="width:118px">客户经理</th>
          <th style="width:64px">下发日</th><th style="width:56px">截止</th><th style="width:70px">状态</th>
          <th style="min-width:200px">最新进展</th><th style="width:110px">操作</th></tr></thead><tbody>
        ${list.map(t => { const c = coById(t.co), rm = rmById(t.rm), last = t.log[0];
          return `<tr class="clickable ${st.focusTask === t.id ? 'fn-row-focus' : ''}" data-tk="${t.id}">
          <td><b class="text-sm">${esc(c ? c.short : t.co)}</b><div class="text-xs text-muted">${esc(t.prods.join(' / '))}</div></td>
          <td class="text-sm">${esc(t.type)}</td>
          <td class="text-sm">${esc(rm.name)}<div class="text-xs text-muted">${esc(rm.unit)}</div></td>
          <td class="text-sm">${t.d.slice(5)}</td><td class="text-sm">${t.due}</td>
          <td><span class="tag ${stTag(t.status)}" style="height:19px;font-size:10px;padding:0 6px">${t.status}</span></td>
          <td class="text-sm text-sub" style="white-space:normal;line-height:1.5">${last ? `<b class="text-xs" style="color:var(--t3)">${last.d} ${esc(last.t)}</b>　${esc(last.x).slice(0, 46)}…` : '—'}</td>
          <td onclick="event.stopPropagation()"><button class="btn btn-text btn-sm" data-det2="${t.co}">详情</button><button class="btn btn-text btn-sm" data-urge="${t.id}">催办</button></td></tr>`; }).join('') ||
        `<tr><td colspan="8"><div class="empty"><div class="e-ico">📭</div><div class="e-title">暂无${flt === '全部' ? '' : flt}任务</div></div></td></tr>`}</tbody></table></div>
        <div class="pager" style="padding:12px 16px">共 ${list.length} 项 · 点击行查看跟进全过程（访客纪要 / 协同留言 / 反馈）</div></div>`;
      box.querySelectorAll('[data-tf]').forEach(b => b.onclick = () => { st.taskF = b.dataset.tf; this.paintTask(box); });
      box.querySelectorAll('tr.clickable').forEach(tr => tr.onclick = () => this.taskDrawer(tr.dataset.tk));
      box.querySelectorAll('[data-det2]').forEach(b => b.onclick = e => { e.stopPropagation(); APP.go('company', { id: b.dataset.det2 }); });
      box.querySelectorAll('[data-urge]').forEach(b => b.onclick = e => {
        e.stopPropagation();
        const t = st.tasks.find(x => x.id === b.dataset.urge);
        t.log.unshift({ d: '11-04', t: '催办', by: '分行产品经理 · 陈立', x: `已发送催办提醒（第 1 次），请${rmById(t.rm).name}更新${coById(t.co).short}跟进进展` });
        toast(`已催办「${coById(t.co).short} · ${rmById(t.rm).name}」`);
        this.paintTask(box);
      });
      st.focusTask = null;
    },
    taskDrawer(taskId) {
      const st = F();
      const t = st.tasks.find(x => x.id === taskId);
      if (!t) return;
      const c = coById(t.co), rm = rmById(t.rm);
      const stTag = s => ({ 待接收: 'tag-gray', 跟进中: 'tag-blue', 已反馈: 'tag-green', 已关闭: 'tag-line' }[s] || 'tag-gray');
      openDrawer(`<b style="font-size:var(--fs-lg)">${esc(c.short)}</b> <span class="tag ${stTag(t.status)}" style="height:20px;font-size:11px">${t.status}</span>`, `
        <div class="kv-grid mb3">
          ${APP.kv('承接客户经理', esc(rm.name) + ' · ' + esc(rm.unit))}
          ${APP.kv('任务类型', esc(t.type))}
          ${APP.kv('下发', t.d + ' · 陈立')}
          ${APP.kv('截止', t.due)}
        </div>
        <div class="card card-pad mb3" style="box-shadow:none">
          <div class="flex-between mb2"><b class="text-sm">任务要求</b><span class="text-xs text-muted">下发人：分行产品经理 · 陈立</span></div>
          <div class="text-sm text-sub" style="line-height:1.8">${esc(t.note)}</div>
          <div class="mt2 text-sm">重点产品与服务：${t.prods.map(p => `<span class="tag tag-blue" style="height:20px;margin:2px 4px 2px 0">${p}</span>`).join('')}</div>
        </div>
        <div class="card card-pad" style="box-shadow:none">
          <div class="flex-between mb3"><b class="text-sm">跟进全过程（前中后台协同留痕）</b>
            <span class="text-xs" style="color:var(--brand-500);cursor:pointer" id="tkWb">去工作台记录访客纪要 ›</span></div>
          <div class="timeline">
            ${t.log.map(l => `<div class="tl-item ${l.t.indexOf("访客纪要") >= 0 ? '' : l.t === '协同留言' ? 'tl-warn' : l.t === '反馈' ? 'tl-ok' : ''}">
              <div class="tl-time">${l.d} · ${esc(l.by)}</div>
              <div class="tl-title">${esc(l.t)}</div>
              <div class="tl-desc" style="white-space:normal">${esc(l.x)}</div></div>`).join('') || '<div class="text-sm text-muted">暂无跟进记录</div>'}
          </div>
        </div>
        <div class="flex mt4" style="gap:8px;justify-content:flex-end">
          <button class="btn btn-ghost btn-sm" id="tkSub2">企业详情</button>
          <button class="btn btn-primary btn-sm" id="tkWb2">⚡ 进入工作台跟进</button>
        </div>`);
      setTimeout(() => {
        const goWb = () => { closeDrawer(); APP.go('workbench', { task: t.id }); };
        const wb1 = $('#tkWb'); if (wb1) wb1.onclick = goWb;
        $('#tkWb2').onclick = goWb;
        $('#tkSub2').onclick = () => { closeDrawer(); APP.go('company', { id: t.co }); };
      });
    },
  };
})();
