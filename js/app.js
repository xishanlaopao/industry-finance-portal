/* ============================================================
   应用框架 V2（门户版）：顶部导航 / 弹窗 / 抽屉 / Toast
   全局搜索 / 角色切换 / AI智能问述
   ============================================================ */
window.APP = (function () {
  const S = {
    view: 'workbench', role: 'manager', params: {}, industry: 'ic',
    newsFilter: { seg: '全部', region: '全部', etype: '全部' },
    custLayer: '全部', custStatus: '全部', custKw: '',
    oppList: null, addedCust: [], removedCust: [], inputs: [],
    reportCo: null, drill: { lv: 0, branch: null, manager: null },
    rankPeriod: '月', compareSel: ['分行营业部', '江阴支行'], capType: '全部', riskLv: '全部',
  };
  const $ = s => document.querySelector(s);

  /* ---------- 通用工具 ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const layerTag = l => `<span class="tag ${({ 龙头: 'tag-violet', 上市: 'tag-blue', 拟上市: 'tag-cyan', 储备: 'tag-gray' })[l] || 'tag-gray'}">${l}</span>`;
  const statusTag = s => `<span class="tag ${({ 本行已合作: 'tag-green', 潜在: 'tag-blue', 攻坚: 'tag-orange', 流失预警: 'tag-red' })[s] || 'tag-gray'}">${s}</span>`;
  const riskTag = l => `<span class="tag ${l === '红' ? 'tag-red' : l === '橙' ? 'tag-orange' : 'tag-gray'}" style="${l === '黄' ? 'background:var(--warn-50);color:#C77700' : ''}">${l}级</span>`;
  const segTag = s => `<span class="tag tag-line">${s}</span>`;
  function scoreRing(score, sz = 36) {
    const cls = score >= 85 ? 'score-a' : score >= 70 ? 'score-b' : 'score-c';
    return `<span class="score-ring ${cls}" style="width:${sz}px;height:${sz}px;font-size:${sz * 0.34}px">${score}</span>`;
  }
  function aiPanel(title, html) {
    return `<div class="ai-panel"><div class="ai-head"><span class="ai-badge">AI</span>${esc(title)}</div><div class="ai-body">${html}</div></div>`;
  }
  function kv(k, v, note) { return `<div class="kv"><div class="kv-k">${k}</div><div class="kv-v">${v}${note ? `<br><small>${note}</small>` : ''}</div></div>`; }

  /* ---------- Toast ---------- */
  function toast(msg, type = 'ok') {
    let w = $('.toast-wrap'); if (!w) { w = document.createElement('div'); w.className = 'toast-wrap'; document.body.appendChild(w); }
    const t = document.createElement('div'); t.className = `toast t-${type}`; t.textContent = msg; w.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, 2600);
  }

  /* ---------- 弹窗 / 抽屉 / 确认 ---------- */
  function openModal(opt) {
    $('#modalBox').className = 'modal ' + (opt.wide ? 'w-lg' : opt.small ? 'w-sm' : '');
    $('#modalTitle').innerHTML = opt.title || '';
    $('#modalBody').innerHTML = opt.body || '';
    $('#modalFoot').innerHTML = opt.foot || '<button class="btn btn-ghost" onclick="APP.closeModal()">关闭</button>';
    $('#mask').classList.add('show');
    if (opt.onOpen) opt.onOpen();
  }
  function closeModal() { $('#mask').classList.remove('show'); }
  function openDrawer(title, body) {
    $('#drawerTitle').innerHTML = title; $('#drawerBody').innerHTML = body;
    $('#drawerMask').classList.add('show'); $('#drawer').classList.add('show');
  }
  function closeDrawer() { $('#drawerMask').classList.remove('show'); $('#drawer').classList.remove('show'); }
  function confirmDlg(msg, onOk) {
    openModal({ small: true, title: '操作确认', body: `<div style="line-height:1.7">${msg}</div>`,
      foot: `<button class="btn btn-ghost" onclick="APP.closeModal()">取消</button><button class="btn btn-danger" id="cfmOk">确定</button>` });
    $('#cfmOk').onclick = () => { closeModal(); onOk && onOk(); };
  }

  /* ---------- Tab 工具 ---------- */
  function renderTabs(el, tabs, active, onSwitch) {
    el.innerHTML = `<div class="tabs">${tabs.map(t => `
      <div class="tab ${t.id === active ? 'on' : ''}" data-tab="${t.id}">${esc(t.name)}${t.count != null ? ` <span class="t-count">${t.count}</span>` : ''}</div>`).join('')}</div><div class="tab-panel"></div>`;
    el.querySelectorAll('.tab').forEach(t => t.onclick = () => onSwitch(t.dataset.tab));
    return el.querySelector('.tab-panel');
  }
  function switchTab(el, tabs, active, onSwitch) {
    el.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === active));
    return el.querySelector('.tab-panel');
  }

  /* ---------- 路由 ---------- */
  function go(view, params) { Object.assign(S.params, params || {}); location.hash = '#/' + view; }
  function route() {
    let v = (location.hash || '#/workbench').replace('#/', '') || 'workbench';
    if (v === 'pack') { v = 'workbench'; S.wbTab = 'prepare'; }
    const conf = window.NAV_ITEMS[v];
    S.view = (conf ? v : 'workbench');
    if (S.view === 'cockpit' && !canCockpit()) S.view = 'workbench';
    const root = $('#viewRoot'); window.scrollTo(0, 0);
    renderNav();
    /* 非试点行业：展示专版开通进度页（平台定位：热门产业挖掘与管理） */
    if (S.industry !== 'ic') {
      const ind = window.MOCK.industryById(S.industry);
      $('#crumbBar').innerHTML = `当前位置：行业专版 <span style="margin:0 6px;color:var(--line-strong)">/</span> <b>${ind.name}</b>（${ind.status}）`;
      root.innerHTML = buildIndustryPage(ind);
      const bk = $('#indBack'); if (bk) bk.onclick = () => switchIndustry('ic');
      const iw = $('#indWant'); if (iw) iw.onclick = () => toast(`已登记「${ind.name}」行业专版开通意向，上线后将第一时间通知您`);
      return;
    }
    const view = window.VIEWS[S.view];
    /* 面包屑：一级导航页不显示层级（导航即层级）；跳转页/明细页显示「父级 › 当前」可点击返回 */
    const CRUMB_PARENT = {
      news: { v: 'insight', n: '市场洞察' },
      company: { v: 'funnel', n: '客户清单' },
      plan: { v: 'funnel', n: '客户清单' },
      visitReport: { v: 'workbench', n: '个人工作台' },
    };
    const cur = window.NAV_ITEMS[S.view];
    const lnk = (v, n) => `<a href="#/${v}" style="color:var(--t2);text-decoration:none;cursor:pointer" onmouseover="this.style.color='var(--brand-600)'" onmouseout="this.style.color='var(--t2)'">${n}</a>`;
    let crumbHtml = '';
    const sep = ` <span style="margin:0 6px;color:var(--line-strong)">›</span> `;
    if (cur && !window.NAV.find(n => n.id === S.view) && CRUMB_PARENT[S.view]) {
      const p2 = CRUMB_PARENT[S.view];
      crumbHtml = '当前位置：' + lnk(p2.v, p2.n) + sep + `<b>${cur.name}</b>`;
    }
    $('#crumbBar').innerHTML = crumbHtml ? `<span class="text-xs text-muted">${crumbHtml}</span>` : '';
    view.render(root);
  }
  function buildIndustryPage(ind) {
    const path = window.MOCK.industryPath;
    const curStep = ind.status === '专版建设中' ? 2 : 1;   /* 挖掘→评估→建设→运营 */
    return `<div class="card card-pad" style="max-width:860px;margin:48px auto 0;text-align:center">
      <div style="font-size:44px">🚧</div>
      <div style="font-size:var(--fs-2xl);font-weight:800;margin-top:8px">「${esc(ind.name)}」行业专版 · ${ind.status}</div>
      <div class="text-sm text-sub mt2">${esc(ind.note)}</div>
      <div class="tag tag-orange mt3" style="height:26px">${ind.eta}</div>
      <div class="steps mt5" style="text-align:left">
        ${path.map((p, i) => `<div class="step ${i < curStep ? 'done' : i === curStep ? 'on' : ''}">
          <div class="s-dot">${i < curStep ? '✓' : i + 1}</div><div class="s-name">${p.n}</div></div>`).join('')}
      </div>
      <div class="grid-4 mt2" style="text-align:left">
        ${path.map((p, i) => `<div class="kv" style="border-radius:8px"><div class="kv-k">${p.n}</div><div class="kv-v" style="font-size:var(--fs-xs);font-weight:400;line-height:1.7;color:var(--t2)">${p.d}</div></div>`).join('')}
      </div>
      <div class="flex mt4" style="justify-content:center;gap:10px">
        <button class="btn btn-ghost" id="indWant">📅 登记开通意向</button>
        <button class="btn btn-primary" id="indBack">← 返回「集成电路」专版</button>
      </div></div>`;
  }
  /* ---------- 行业专版切换 ---------- */
  function switchIndustry(id) {
    const ind = window.MOCK.industryById(id); if (!ind) return;
    S.industry = id;
    $('#indName').textContent = ind.name;
    $('#indMenu').classList.remove('show');
    toast(id === 'ic' ? `已进入「${ind.name}」行业专版` : `已切换至「${ind.name}」（${ind.status}）`);
    route();
  }
  function initIndustry() {
    const sw = $('#indSwitch'), menu = $('#indMenu');
    if (!sw || !menu) return;   /* 赛道专版切换入口已移除（默认集成电路专版） */
    sw.onclick = e => { e.stopPropagation(); menu.classList.toggle('show'); };
    document.addEventListener('click', e => { if (!e.target.closest('#indSwitch') && !e.target.closest('#indMenu')) menu.classList.remove('show'); });
    menu.innerHTML = window.MOCK.industries.map(i => `
      <div class="dd-item" data-ind="${i.id}" style="justify-content:space-between">
        <span>${i.id === S.industry ? '✓ ' : ''}${i.name}</span>
        <span class="tag ${i.pilot ? 'tag-green' : i.status === '专版建设中' ? 'tag-orange' : 'tag-gray'}" style="font-size:10px">${i.pilot ? '已上线' : i.status}</span>
      </div>`).join('') +
      `<div class="dd-item" id="indApply" style="color:var(--brand-600)">＋ 申请开通新行业</div>`;
    menu.querySelectorAll('[data-ind]').forEach(el => el.onclick = () => switchIndustry(el.dataset.ind));
    $('#indApply').onclick = () => { menu.classList.remove('show'); toast('已登记新行业开通意向：请提供行业名称，战略团队将在3个工作日内完成评估'); };
  }

  /* ---------- 顶部导航 / 用户（V4：五大一级导航） ---------- */
  function renderNav() {
    const nav = $('#pnav');
    /* 主导航：隐藏路由（dashboard/news/cockpit/company 等）按别名归入对应一级项高亮 */
    const ALIAS = { dashboard: 'insight', news: 'insight', cockpit: 'manage', pack: 'workbench' };
    const active = ALIAS[S.view] || S.view;
    nav.innerHTML = window.NAV.filter(it => it.id !== 'workbench' || true).map(it => `
      <div class="pnav-item ${active === it.id ? 'active' : ''}" data-view="${it.id}">${it.name}</div>`).join('');
    nav.querySelectorAll('.pnav-item').forEach(n => n.onclick = () => go(n.dataset.view));
  }
  /* ---------- 用户与角色（对齐过程管理演示：客户经理/支行长/分行产品经理/公司部负责人） ---------- */
  const USERS = [
    { id: 'drz', name: '邓瑞忠', av: '邓', role: '客户经理', roleShort: '客户经理', dept: '南京分行营业部', key: 'rm',
      tip: '客户经理（本人名下任务）', range: '我承接的下发任务' },
    { id: 'lq', name: '陆青', av: '陆', role: '支行长', roleShort: '支行长', dept: '南京分行营业部', key: 'head',
      tip: '支行长（本支行）', range: '本支行任务与人员' },
    { id: 'cl', name: '陈立', av: '陈', role: '分行产品经理', roleShort: '产品经理', dept: '公司银行部', key: 'pm',
      tip: '分行产品经理（全辖 · 可操作）', range: '机会漏斗 · 订阅 · 下发' },
    { id: 'wj', name: '王健', av: '王', role: '部门负责人', roleShort: '负责人', dept: '公司银行部', key: 'gm',
      tip: '公司部负责人（全辖 · 总览）', range: '全辖营销过程总览' },
  ];
  let curUser = USERS.find(u => u.id === 'drz');   /* 默认客户经理角色 */
  const curUserMeta = () => curUser;
  const roleMeta = () => {
    const MAP = {
      rm: { key: 'rm', id: 'drz', name: '客户经理', tip: '客户经理（本人名下任务）', range: '我承接的下发任务' },
      head: { key: 'head', id: 'lq', name: '支行长', tip: '支行长（本支行）', range: '本支行任务与人员' },
      pm: { key: 'pm', id: 'cl', name: '分行产品经理', tip: '分行产品经理（全辖 · 可操作）', range: '机会漏斗 · 订阅 · 下发' },
      gm: { key: 'gm', id: 'wj', name: '公司部负责人', tip: '公司部负责人（全辖 · 总览）', range: '全辖营销过程总览' },
    };
    return MAP[curUser.key] || MAP.rm;
  };
  const canCockpit = () => curUser.key === 'gm' || curUser.key === 'pm' || curUser.key === 'head';
  function setRole(r) { /* 兼容保留 */ }
  function renderUser() {
    $('#uName').textContent = curUser.name;
    $('#uRole').textContent = curUser.role + ' · ' + curUser.dept;
    $('#uAv').textContent = curUser.av;
  }
  /* ---------- 用户菜单（工作台现为一级导航，菜单仅保留切换/退出） ---------- */
  function renderUserMenu() {
    const um = $('#userMenu');
    um.innerHTML = `
      <div class="dd-item" id="uSwitch">👥 切换角色</div>
      <div class="dd-item" id="uLogout">↩️ 退出登录</div>`;
    um.querySelector('#uSwitch').onclick = () => {
      um.classList.remove('show');
      openModal({ small: true, title: '切换角色', body: `
        <div style="display:flex;flex-direction:column;gap:6px">
          ${USERS.map(u => `<div class="dd-item ${u.id === curUser.id ? 'on' : ''}" data-su="${u.id}" style="border:1px solid var(--line);border-radius:10px">
            <div class="avatar" style="width:28px;height:28px">${u.av}</div>
            <div><div class="text-sm" style="font-weight:600">${esc(u.name)}</div><div class="text-xs text-muted">${esc(u.role)} · ${esc(u.dept)}</div></div>
            ${u.id === curUser.id ? '<span class="tag tag-green" style="margin-left:auto;height:20px;font-size:10px">当前</span>' : ''}
          </div>`).join('')}
        </div>`,
        foot: `<button class="btn btn-ghost" onclick="APP.closeModal()">关闭</button>` });
      document.querySelectorAll('[data-su]').forEach(d => d.onclick = () => { closeModal(); switchUser(d.dataset.su); });
    };
    um.querySelector('#uLogout').onclick = () => { toast('已退出登录'); um.classList.remove('show'); };
  }
  function switchUser(id) {
    const u = USERS.find(x => x.id === id);
    if (!u || u === curUser) return;
    curUser = u;
    renderUser(); renderUserMenu();
    if (S.view === 'cockpit' && !canCockpit()) { go('workbench'); return; }
    route();
    toast(`已切换：${u.name}（${u.role} · ${u.dept}）`);
  }

  /* ---------- AI 智能问述 ---------- */
  function aiMatch(q) {
    const m = window.MOCK;
    for (const item of m.aiQA) {
      if (item.q === q) return item;
      const segs = q.split(/[？?，,。、\s]/).filter(x => x.length >= 2);
      if (segs.some(sg => item.q.includes(sg))) return item;
      const keys = item.q.split(/[？（）()：:，,、\s]/).filter(x => x.length >= 3);
      if (keys.some(k => q.includes(k))) return item;
      /* 口语化问法：4字滑窗重合即命中 */
      for (let i = 0; i + 4 <= q.length; i++) {
        if (item.q.includes(q.slice(i, i + 4))) return item;
      }
    }
    return null;
  }
  const isMktIntent = q => /营销|建议|方案|切入|痛点|需求|规划|怎么推|如何推|如何营销|怎么合作/.test(q) || q.length > 40;
  function aiChatInit(box) {
    const m = window.MOCK;
    box.innerHTML = `<div class="aip-start">✦ 智能问述：产业知识 · 政策资讯 · 营销建议</div>
      <div class="aip-sugs" id="aipSugBox">${m.aiQA.slice(0, 5).map((x, i) => `<span class="aip-sug" data-q="${esc(x.q)}">${esc(x.q)}</span>`).join('')}
        <span class="aip-sug" data-q="某封测企业年营收9亿，应收1.8亿账期127天，IPO问询中，如何营销并做资金规划？">某封测企业应收1.8亿、IPO问询中，如何营销？</span></div>`;
    box.querySelectorAll('.aip-sug').forEach(s => s.onclick = () => aiSubmit(box, s.dataset.q));
  }
  function aiSubmit(box, q) {
    const sb = box.querySelector('#aipSugBox');
    if (sb) box.appendChild(sb);
    isMktIntent(q) ? mktGen(box, q) : aiAsk(box, q);
  }
  function mktGen(box, txt) {
    if (!txt || !txt.trim()) return;
    const kw = txt.trim();
    const tpl = /芯片|封测|半导体|晶圆|集成电路|EDA|模组/.test(kw) ? 'ic' : /储能|光伏|电池|新能源|整车|充电/.test(kw) ? 'ev' : 'gen';
    const T = {
      ic: {
        cut: '以「核心客户订单与应收确权」为切入点：绑定头部客户付款信用切入票易贷与订单融资；扩产期设备融资窗口明确、决策链短，适合以设备按揭/租赁先建立合作。',
        prod: [['票易贷', '最高200万元 · 随借随还 · 按开票数据核定'], ['科技信用贷', '3000-5000万元 · 最长3年 · 研发强度与资质达标可提额'], ['设备按揭 / 融资租赁', '匹配扩产设备采购 · 分期摊还降低一次性资本支出压力']],
        plan: ['经营性资金：以订单融资+票易贷盘活应收，将应收周转天数压向行业均值，释放营运资金', '资本性支出：设备购置用分期/租赁，避免挤占流动资金与扩产节奏', '上市前安排：票易贷优化经营现金流，闲置资金按7天-3个月滚动理财配置'],
        risk: '关注应收集中度（CR5）与账期错配；IPO问询期资金安排需提前锁定，避免发行前大额变动。'
      },
      ev: {
        cut: '以「项目订单+回款周期」为切入点：项目类订单回款长且确定性强，适合订单融资与项目贷组合；出海业务配套跨境结算与汇率避险。',
        prod: [['订单融资', '按已签订单一定比例放款 · 支持旺季备货与项目垫资'], ['项目经营贷', '匹配项目建设与并网节奏 · 分期还本'], ['供应链票据 / 票易贷', '盘活对上游的应付与对下游的应收']],
        plan: ['项目资金：按项目回款节点分期匹配融资，避免期限错配', '备货资金：旺季前申请专项额度，平季归还降低成本', '汇率管理：出海回款搭配远期结汇，锁定利润'],
        risk: '关注补贴/电费回款周期、原材料价格波动对毛利的侵蚀与客户集中度。'
      },
      gen: {
        cut: '以「结算归集+经营性融资」为切入点：先将基本户与结算归集行内，再按经营周期配置流动资金支持，逐步叠加交叉销售。',
        prod: [['流动资金贷款', '按年营收与订单规模核定 · 随借随还'], ['银行承兑汇票 / 票据贴现', '优化采购付款与回款节奏'], ['对公理财（闲置资金）', '7天-3个月滚动配置']],
        plan: ['现金流分层：经营性（订单回款）、储备性（备用额度）、投资性（扩产）分开管理', '额度统筹：授信总额按"存量+增量"一次核定，分项提用', '成本优化：以票据替换部分流贷，降低综合融资成本'],
        risk: '关注行业景气波动与主要客户付款政策变化。'
      }
    }[tpl];
    const ipo = /上市|IPO|问询/.test(kw), exp = /出海|出口|海外/.test(kw);
    const bubble = document.createElement('div'); bubble.className = 'aip-q'; bubble.textContent = kw; box.appendChild(bubble);
    const typing = document.createElement('div'); typing.className = 'aip-a'; typing.innerHTML = '<span class="skl" style="display:inline-block;width:140px;height:12px"></span>'; box.appendChild(typing);
    box.scrollTop = box.scrollHeight;
    setTimeout(() => {
      typing.innerHTML = `<b>✦ AI 营销建议</b><span class="src">综合输入生成 · 2026-09-28</span>
        <div class="aip-sec"><b>① 切入点与时机</b>${T.cut}</div>
        <div class="aip-sec"><b>② 产品组合建议</b>${T.prod.map(([n, d]) => `<div class="aip-prod"><b>${n}</b><span>${d}</span></div>`).join('')}</div>
        <div class="aip-sec"><b>③ 资金规划建议</b>${T.plan.map(x => `<div>· ${x}</div>`).join('')}${ipo ? '<div>· IPO窗口：优先落地票易贷与募集资金监管预案，锁定"发行前报表优化"服务</div>' : ''}${exp ? '<div>· 跨境安排：配套跨境结算通道与远期结汇，锁定出海回款利润</div>' : ''}</div>
        <div class="aip-sec"><b>④ 风险与跟进</b>${T.risk}</div>`;
      box.scrollTop = box.scrollHeight;
    }, 900);
  }
  function aiAsk(box, q) {
    if (!q || !q.trim()) return;
    const m = window.MOCK;
    const bubble = document.createElement('div'); bubble.className = 'aip-q'; bubble.textContent = q; box.appendChild(bubble);
    box.scrollTop = box.scrollHeight;
    const typing = document.createElement('div'); typing.className = 'aip-a'; typing.innerHTML = '<span class="skl" style="display:inline-block;width:120px;height:12px"></span>'; box.appendChild(typing);
    box.scrollTop = box.scrollHeight;
    setTimeout(() => {
      const hit = aiMatch(q.trim());
      typing.innerHTML = hit ? `${hit.a}<span class="src">来源：${hit.src}</span>` : m.qaFallback;
      box.scrollTop = box.scrollHeight;
    }, 550);
  }
  function initAiPanel() {
    const panel = $('#aiPanel'), box = $('#aipBody'), input = $('#aipInput');
    if (!panel || !$('#aiFab')) return;   /* AI问述已整合进顶部搜索 */
    $('#aiFab').onclick = () => {
      const show = panel.classList.toggle('show');
      if (show && !box.dataset.inited) { aiChatInit(box); box.dataset.inited = '1'; }
    };
    $('#aipClose').onclick = () => panel.classList.remove('show');
    $('#aipSend').onclick = () => { aiSubmit(box, input.value); input.value = ''; };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { aiSubmit(box, input.value); input.value = ''; } });

  }

  /* ---------- 全局搜索 ---------- */
  let SEARCH = [];
  function buildSearch() {
    const M = window.MOCK;
    SEARCH = [
      ...M.companies.map(c => ({ g: '企业', t: c.name, sub: `${c.layer} · ${c.seg}`, act: () => openCompanyDrawer(c.id) })),
      ...M.policies.map(p => ({ g: '政策', t: p.title, sub: `${p.level} · ${p.type}`, act: () => openPolicy(p.id) })),
      ...M.news.map(n => ({ g: '资讯', t: n.title, sub: `${n.source} · ${n.date}`, act: () => openNews(n.id) })),
    ];
  }
  function initSearch() {
    const inp = $('#pSearch');
    if (!inp) return;
    const go = () => { const q = inp.value.trim(); if (!q) return toast('请输入企业 / 项目 / 政策关键词，或直接提问', 'warn'); APP.go('search', { q }); inp.value = ''; };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }

  /* ---------- 消息推送 ---------- */
  function initMsg() {
    const bell = $('#msgBell'), drop = $('#msgDrop');
    if (!bell || !drop) return;
    bell.onclick = e => { e.stopPropagation(); drop.classList.toggle('show'); };
    const M = window.MOCK;
    drop.innerHTML = `<div class="msg-head">消息中心（${M.messages.length}）<span class="text-xs text-muted">订阅推送 · 任务提醒</span></div>` +
      M.messages.map(m => `<div class="msg-item" data-go="${m.go}"><span class="m-dot" style="background:${m.type === 'danger' ? 'var(--danger-500)' : m.type === 'warn' ? 'var(--warn-500)' : 'var(--brand-500)'}"></span>
        <div><div class="m-title">${esc(m.t)}</div><div class="m-time">${m.d}</div></div></div>`).join('') +
      `<div style="padding:9px 16px"><button class="btn btn-ghost btn-sm" style="width:100%" onclick="document.querySelector('#msgDrop').classList.remove('show')">关闭</button></div>`;
    drop.querySelectorAll('.msg-item').forEach(el => el.onclick = () => { drop.classList.remove('show'); go(el.dataset.go); });
    document.addEventListener('click', e => { if (!e.target.closest('.msg-wrap')) drop.classList.remove('show'); });
  }

  /* ---------- 业务弹窗 ---------- */
  function openNews(id) {
    const n = window.MOCK.news.find(x => x.id === id);
    if (!S.subs) S.subs = { cos: [], segs: [] };
    const bodyHtml = (n.body && n.body.length ? n.body : [n.sum]).map(p => `<p>${esc(p)}</p>`).join('');
    const coTags = n.cos.length ? n.cos.map(cid => {
      const c = window.MOCK.coById(cid), on = S.subs.cos.includes(cid);
      return `<span class="tag ${on ? 'tag-solid-red' : 'tag-blue'}" data-subco="${cid}" style="cursor:pointer;height:24px;padding:0 10px;font-size:12px">${on ? '✓ 已订阅 · ' : '＋ 订阅 · '}${esc(c.short)}</span>`;
    }).join(' ') : '<span class="text-sm text-muted">宏观资讯 · 未直接关联名单企业</span>';
    const segTag = sg => { const on = S.subs.segs.includes(sg);
      return `<span class="tag ${on ? 'tag-solid-red' : 'tag-blue'}" data-subseg="${sg}" style="cursor:pointer;height:24px;padding:0 10px;font-size:12px">${on ? '✓ 已订阅 · ' : '＋ 订阅 · '}${sg}</span>`; };
    openModal({ wide: true, title: `资讯详情`, body: `
      <div class="flex mb2" style="gap:5px;flex-wrap:wrap">${n.hot ? '<span class="tag tag-solid-red" style="height:20px;font-size:10px">★ 本周重点关注</span>' : ''}${n.risk ? '<span class="tag tag-red" style="height:20px;font-size:10px">⚠ 风险事件</span>' : ''}${n.watch ? '<span class="tag tag-blue" style="height:20px;font-size:10px">关注企业</span>' : ''}${n.ptag ? `<span class="tag tag-violet" style="height:20px;font-size:10px">${n.ptag}</span>` : ''}${n.ind ? `<span class="tag tag-line" style="height:20px;font-size:10px">${n.ind}</span>` : ''}</div>
      <div class="nd-title">${esc(n.title)}</div>
      <div class="nd-meta">${esc(n.source)} · ${n.date} · ${n.seg} · ${n.region} · ${n.etype}${n.etype === '政策' ? ' · <span style="color:var(--brand-500);font-weight:600">政策资讯</span>' : ''}</div>
      <div class="nd-ai"><div class="nd-h"><span class="ai-badge">AI</span>AI 摘要</div><div class="nd-txt">${esc(n.ai)}</div></div>
      ${n.mkt ? `<div class="nd-mkt"><div class="nd-h">🎯 营销提示</div><div class="nd-txt">${esc(n.mkt)}</div></div>` : ''}
      <div class="nd-body">${bodyHtml}</div>
      <div class="nd-sub">
        <div class="text-sm" style="font-weight:600;margin-bottom:8px">订阅管理</div>
        <div class="flex wrap mb2" style="gap:6px"><span class="text-xs text-muted" style="align-self:center;width:32px">企业</span>${coTags}</div>
        <div class="flex wrap" style="gap:6px"><span class="text-xs text-muted" style="align-self:center;width:32px">赛道</span>${segTag(n.seg)}${n.ind && n.ind !== n.seg ? segTag(n.ind) : ''}</div>
      </div>`,
      foot: n.policyId ? `<button class="btn btn-primary" onclick="APP.closeModal();APP.openPolicy('${n.policyId}')">查看政策详情</button>` : '' });
    document.querySelectorAll('[data-subco]').forEach(el => el.onclick = () => {
      const cid = el.dataset.subco, i = S.subs.cos.indexOf(cid);
      if (i >= 0) { S.subs.cos.splice(i, 1); toast(`已取消订阅「${window.MOCK.coById(cid).short}」企业动态`); }
      else { S.subs.cos.push(cid); toast(`已订阅「${window.MOCK.coById(cid).short}」企业动态，命中新事件将推送提醒`); }
      openNews(id);
    });
    document.querySelectorAll('[data-subseg]').forEach(el => el.onclick = () => {
      const sg = el.dataset.subseg, i = S.subs.segs.indexOf(sg);
      if (i >= 0) { S.subs.segs.splice(i, 1); toast(`已取消订阅「${sg}」赛道`); }
      else { S.subs.segs.push(sg); toast(`已订阅「${sg}」赛道，命中新资讯将推送提醒`); }
      openNews(id);
    });
  }
  function openPolicy(id) {
    const p = window.MOCK.policies.find(x => x.id === id);
    openModal({ wide: true, title: `<span class="tag ${p.level === '国家' ? 'tag-red' : p.level === '江苏省' ? 'tag-blue' : 'tag-cyan'}">${p.level}</span> ${esc(p.title)}`, body: `
      <div class="flex mb3" style="gap:8px;flex-wrap:wrap"><span class="tag tag-line">${p.type}</span><span class="tag tag-line">${esc(p.dept)}</span><span class="tag tag-line">${p.date}发布</span>
        ${p.deadline ? `<span class="tag tag-orange">申报截止 ${p.deadline}（剩 ${Math.ceil((new Date(p.deadline) - new Date('2026-09-28')) / 86400000)} 天）</span>` : '<span class="tag tag-green">长期有效</span>'}</div>
      <div class="text-sm" style="font-weight:600;margin-bottom:6px">政策原文要点</div>
      <ul style="padding-left:18px;line-height:2;color:var(--t2);font-size:var(--fs-sm)">${p.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="text-sm" style="font-weight:600;margin:14px 0 6px">适用对象</div><div class="text-sm text-sub">${esc(p.objects)}</div>
      <div class="mt4">${aiPanel('AI 解读（含营销切入点）', esc(p.ai))}</div>
      <div class="mt4"><div class="text-sm" style="font-weight:600;margin-bottom:8px">智能匹配企业（${p.matched.length}）</div>
        <table class="tbl"><thead><tr><th>企业</th><th>匹配度</th><th>建议动作</th></tr></thead><tbody>
        ${p.matched.map(m => { const c = window.MOCK.coById(m.co); return `<tr class="clickable" onclick="APP.openCompanyDrawer('${m.co}')"><td>${esc(c.short)}</td><td><b style="color:var(--brand-600)">${m.pct}%</b></td><td class="text-sub">协助申报 · 切入营销</td></tr>`; }).join('')}
        </tbody></table></div>`,
      foot: `<button class="btn btn-ghost" onclick="APP.toast('已推送至对应客户经理待办')">推送给客户经理</button>
             <button class="btn btn-primary" onclick="APP.closeModal()">关闭</button>` });
  }
  function openCompanyDrawer(id) {
    const c = window.MOCK.coById(id); if (!c) return;
    const o = c.internal;
    openDrawer(`${layerTag(c.layer)} <b style="font-size:var(--fs-lg)">${esc(c.short)}</b> ${statusTag(c.status)}`, `
      <div class="text-sm text-muted mb3">${esc(c.name)} · ${c.seg} · ${c.zone}</div>
      <div class="flex mb4 wrap" style="gap:6px">${c.tags.map(t => `<span class="tag tag-line">${t}</span>`).join('')}</div>
      ${aiPanel('AI 速览', `<b>${esc(c.short)}</b>：${esc(c.recent)}。AI 综合评分 <b>${c.score}</b>（${c.grade}），${c.status === '本行已合作' ? '存量合作客户，关注交叉销售机会。' : c.status === '攻坚' ? '攻坚客户，当前处于关键营销窗口。' : '名单内潜力客户，建议尽快介入。'}`)}
      <div class="card card-pad mb3" style="box-shadow:none">
        <div class="flex-between mb2"><b class="text-sm">合作历史情况（数据时点 2026-09-28）</b><span class="text-xs text-muted">来源：行内业务系统</span></div>
        <div class="grid-4" style="grid-template-columns:repeat(4,1fr);gap:10px">
          ${kv('授信总额', o.credit + '<small> 亿元</small>')}${kv('贷款余额', o.used + '<small> 亿元</small>')}${kv('存款日均', o.deposit + '<small> 亿元</small>')}${kv('结算量', o.settle + '<small> 亿元</small>')}
        </div>
        <div class="mt2 text-sm">已合作产品：${o.products.length ? o.products.map(p => `<span class="tag tag-green" style="margin:2px 4px 2px 0">${p}</span>`).join('') : '<span class="text-muted">暂无（未合作）</span>'}</div>
      </div>
      <div class="card card-pad" style="box-shadow:none">
        <div class="flex-between mb2"><b class="text-sm">最新动态</b><span class="text-xs text-muted">资本进程</span></div>
        <div class="text-sm text-sub">${c.ipo ? `<span class="tag tag-cyan mb2" style="display:inline-flex">${c.ipo}</span><br>` : ''}${esc(c.recent)}</div>
      </div>
      <div class="flex mt4" style="gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" id="dwTask">下发任务</button>
        <button class="btn btn-ghost btn-sm" id="dwOpp">登记业务机会</button>
        <button class="btn btn-primary btn-sm" id="dwView">⚡ 生成AI报告</button>
      </div>`);
    setTimeout(() => {
      $('#dwView').onclick = () => { closeDrawer(); S.packCo = id; S.packGoal = 'detail'; S.reportCo = id; go('pack'); VIEWS.report.gen(id); };
      $('#dwOpp').onclick = () => { closeDrawer(); go('funnel', { tab: 'sub' }); };
      $('#dwTask').onclick = () => { closeDrawer(); go('funnel', { tab: 'task' }); };
    });
  }

  /* ---------- AI 特效工具（迭代16：AI 思考/拉取/反馈动效） ---------- */
  const AIFX = {
    played: {},
    /* 生成流程步骤条：①解析信号→②匹配产品库→③生成模块→④测算校验，期间内容变暗 */
    flow(box) {
      return new Promise(res => {
        if (!box || box.querySelector(':scope > .ai-flow')) { res(); return; }
        const wrap = document.createElement('div'); wrap.className = 'ai-flow';
        const steps = ['解析企业信号', '匹配本行产品库', '生成方案模块', '测算与校验'];
        wrap.innerHTML = steps.map((t, i) => `<div class="ai-fstep"><span class="ic">${i + 1}</span>${t}</div>${i < steps.length - 1 ? '<span class="ai-fline"></span>' : ''}`).join('');
        box.insertBefore(wrap, box.firstChild);
        const dims = [...box.children].filter(e => e !== wrap);
        dims.forEach(e => e.classList.add('ai-dim'));
        const stEls = [...wrap.querySelectorAll('.ai-fstep')], lnEls = [...wrap.querySelectorAll('.ai-fline')];
        let i = 0;
        const tick = () => {
          if (i > 0) {
            const prev = stEls[i - 1]; prev.classList.remove('on'); prev.classList.add('done');
            prev.querySelector('.ic').textContent = '✓';
            if (lnEls[i - 1]) lnEls[i - 1].classList.add('done');
          }
          if (i >= stEls.length) { setTimeout(() => { wrap.remove(); dims.forEach(e => e.classList.remove('ai-dim')); res(); }, 300); return; }
          stEls[i].classList.add('on'); i++; setTimeout(tick, 400);
        };
        tick();
      });
    },
    /* 子块依次淡入 */
    stagger(scope) {
      if (!scope) return;
      [...scope.children].forEach((e, i) => { e.style.setProperty('--d', Math.min(i * 85, 850) + 'ms'); e.classList.add('ai-stag'); });
    },
    /* KPI 数字滚动 */
    countUp(scope) {
      if (!scope) return;
      scope.querySelectorAll('.wp-kpi .v').forEach(v => {
        const m = (v.textContent || '').match(/^(\d+(?:\.\d+)?)(.*)$/); if (!m) return;
        const n = parseFloat(m[1]), suf = m[2], dec = (m[1].split('.')[1] || '').length;
        if (!n) return;
        const t0 = performance.now(), dur = 800;
        const f = t => { const pr = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - pr, 3); v.textContent = (n * e).toFixed(dec) + suf; if (pr < 1) requestAnimationFrame(f); };
        requestAnimationFrame(f);
      });
    },
    /* 话术示范打字机（.script 内 .sl 后的文本节点逐字输出） */
    typewrite(scope) {
      if (!scope) return;
      scope.querySelectorAll('.wp-topic .script').forEach((sc, idx) => {
        const tn = [...sc.childNodes].find(nd => nd.nodeType === 3 && nd.textContent.trim().length > 10);
        if (!tn) return;
        const full = tn.textContent; tn.textContent = ''; sc.classList.add('typing');
        setTimeout(() => {
          let j = 0;
          const iv = setInterval(() => {
            tn.textContent = full.slice(0, j += 2);
            if (j >= full.length) { clearInterval(iv); sc.classList.remove('typing'); }
          }, 26);
        }, 200 + idx * 150);
      });
    },
    /* 纪要转写流式写入输入框 */
    typewriteTo(t, txt, cb) {
      t.value = ''; let j = 0;
      const iv = setInterval(() => {
        t.value = txt.slice(0, j += 2);
        if (j >= txt.length) { clearInterval(iv); t.value = txt; cb && cb(); }
      }, 22);
    },
  };

  /* ---------- 启动 ---------- */
  function boot() {
    buildSearch(); initSearch(); initMsg(); initAiPanel(); initIndustry(); renderUser();
    window.addEventListener('hashchange', route);
    if (!location.hash) location.hash = '#/workbench'; else route();
    $('#modalX').onclick = closeModal;
    $('#mask').addEventListener('click', e => { if (e.target.id === 'mask') closeModal(); });
    $('#drawerX').onclick = closeDrawer;
    $('#drawerMask').onclick = closeDrawer;
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeDrawer(); if ($('#aiPanel')) $('#aiPanel').classList.remove('show'); } });
    const udd = $('#userDd'), um = $('#userMenu');
    udd.onclick = e => { e.stopPropagation(); um.classList.toggle('show'); };
    document.addEventListener('click', () => um.classList.remove('show'));
    renderUserMenu();
  }

  return { aiMatch, S, $, esc, layerTag, statusTag, riskTag, segTag, scoreRing, aiPanel, kv, toast,
    openModal, closeModal, openDrawer, closeDrawer, confirmDlg, renderTabs, switchTab,
    go, route, setRole, switchUser, canCockpit, switchIndustry, aiChatInit, aiAsk, openNews, openPolicy, openCompanyDrawer, boot,
    USERS, curUser: curUserMeta, role: roleMeta, AIFX };
})();
