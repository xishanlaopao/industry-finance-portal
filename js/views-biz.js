/* ============================================================
   业务视图 V2：企业名录（产业总览/企业总览·订阅/资本/链式/任务） / AI智能分析 / 企业详情
   ============================================================ */
(function () {
  const { $, esc, layerTag, statusTag, riskTag, segTag, scoreRing, aiPanel, kv, toast, openModal, confirmDlg, renderTabs, switchTab, openCompanyDrawer } = APP;
  const M = () => window.MOCK, CH = window.CH;
  const S = APP.S;

  /* 报告模块来源（文章标题、发布时间/数据时间、发布方/平台） */
  const RPT_SRC = {
    overview: [['《2025年年度报告》', '2026-03-31', '巨潮资讯网'], ['《2026年半年度报告》', '2026-08-28', '全国股转系统 / 信息披露平台'], ['《企业登记基本信息》', '2026-09-30', '国家企业信用信息公示系统'], ['《舆情监测快报》', '2026-10-12', '财联社 · 证券时报'], ['《司法风险检索结果》', '2026-10-10', '中国裁判文书网']],
    s1: [['《企业登记基本信息》', '2026-09-30', '国家企业信用信息公示系统']],
    s2: [['《2025年年度报告：主营业务与核心产品》', '2026-03-31', '全国股转系统 / 信息披露平台'], ['《专利检索结果》', '检索于2026-09', '国家知识产权局专利检索系统']],
    s3: [['《2025年年度报告：研发投入与研发人员》', '2026-03-31', '全国股转系统 / 信息披露平台'], ['《专利检索结果》', '检索于2026-09', '国家知识产权局专利检索系统']],
    s4: [['《企业股东及投资关系信息》', '2026-09-30', '国家企业信用信息公示系统'], ['《企业融资事件查询》', '截至2026-09', 'IT桔子投融资数据库']],
    s5: [['《2026年中国集成电路产业发展白皮书》', '2026-06', '中国半导体行业协会'], ['《光通信行业可比公司数据》', '截至2026Q2', 'Wind资讯']],
    s6: [['《2025年年度报告：主要客户及供应商》', '2026-03-31', '全国股转系统 / 信息披露平台'], ['《企业登记信息》', '2026-09-30', '国家企业信用信息公示系统']],
    s7: [['《企业股东及股权变更信息》', '2026-09-30', '国家企业信用信息公示系统']],
    s8: [['《2025年年度报告：财务报表及附注》', '2026-03-31', '全国股转系统 / 信息披露平台'], ['《2026年半年度报告》', '2026-08-28', '全国股转系统 / 信息披露平台']],
    s9: [['《企业及行业舆情监测快报》', '2026-10-12', '财联社 · 证券时报'], ['《司法裁判文书检索结果》', '2026-10-10', '中国裁判文书网']],
    s10: [['《战略合作及业务公告》', '2026-05-18', '证券交易所 / 信息披露平台'], ['《2025年年度报告：银行及融资合作》', '2026-03-31', '全国股转系统 / 信息披露平台']],
    s14: [['《公司新闻与经营动态》', '截至2026-09', '企业官网 · 无锡日报']],
    ss1: [['《企业登记基本信息》', '2026-09-30', '国家企业信用信息公示系统']],
    c1: [['《2026年中国集成电路产业发展白皮书》', '2026-06', '中国半导体行业协会'], ['《统计公报》', '2026-02', '国家统计局']],
    c2: [['《招股说明书汇编》', '2026-09', '上交所官网'], ['《半导体行业研究报告》', '2026-08', '券商研究所']],
    c3: [['《上市公司公告》', '截至2026-10', '巨潮资讯网'], ['《企业官网资料》', '截至2026-09', '企业官网']],
    c4: [['《半导体行业研究报告》', '2026-08', '券商研究所'], ['《行业白皮书》', '2026-06', '中国半导体行业协会']],
    c5: [['《2026年中国集成电路产业发展白皮书》', '2026-06', '中国半导体行业协会'], ['行业数据', '截至2026Q2', 'Wind资讯']],
    c6: [['《产业政策文件》', '2026-07', '江苏省工信厅官网']],
    c7: [['《裁判文书》', '2026-10', '中国裁判文书网'], ['失信与处罚记录', '截至2026-09', '信用中国']],
    c8: [],
  };
  const srcTip = key => { const a = RPT_SRC[key]; if (!a || !a.length) return '';
    return `<span class="src-tip text-xs text-muted" style="margin-left:auto;font-weight:400">来源<span class="src-pop"><span class="sp-t text-sm">数据来源</span>${a.map(([title, time, publisher]) => `<span class="sp-l text-xs text-sub" style="display:block;line-height:1.7;padding:5px 0;border-bottom:1px solid var(--line)"><b>发布方/平台：</b>${esc(publisher)}<br><b>原文章标题：</b>${esc(title)}<br><b>时间：</b>${esc(time)}</span>`).join('')}</span></span>`; };

  /* 报告中心企业检索池：主库 + 机会漏斗客户池（去重），跟随漏斗准入口径（如朗新F159） */
  const rptCoPool = m => {
    const all = [...m.companies, ...(((m.funnel || {}).cos) || []).filter(c => !m.companies.some(y => y.id === c.id))];
    return (APP.S.fn && APP.S.fn.admitted) ? all.filter(c => APP.S.fn.admittedIds.includes(c.id)) : all;
  };

  /* ================= 访前作战包（一级导航） =================
     首屏：承接任务列表 + 企业模糊搜索；点击任务/搜索 → 进入该企业四Tab作战包
     Tab1 客户画像：企业全部信息（工商/标签/股权/上下游/合作历史）
     Tab2 行业分析：所属行业景气看板
     Tab3 访前话术：建议对接人 · 六大议题 · 话术示范 · 拜访注意事项
     Tab4 推荐服务方案：综合服务方案看板 */
  VIEWS.pack = {
    /* 企业字段兜底：mock.companies 企业补齐六张网字段 */
    normCo(c) {
      if (!c || c.id[0] === 'F') return c;
      c.listed = c.listed || (c.ipo ? '是·' + c.ipo : '否');
      c.prog = c.prog || c.status || '培育';
      c.pos = c.pos || (c.layer === '龙头' ? '战略' : c.layer === '拟上市' ? '腰部' : '基础');
      c.wt = c.wt || (c.status === '攻坚' ? '主攻' : '择优');
      c.rel = c.rel || '较高相关';
      c.cat = c.cat || '上游供应商';
      c.net = c.net || c.industry || '集成电路与电子材料';
      c.sigLv = c.sigLv || (c.score >= 80 ? 'A' : 'B');
      c.nat = c.nat || '民营企业';
      c.zone = c.zone || (c.city || '无锡');
      c.track = c.track || c.seg || c.net;
      c.sig = c.sig || ['客户资料完善中（' + (c.seg || '') + '）'];
      c.opp = c.opp || '';
      return c;
    },
    render(el) {
      const m = M();
      if (S.params.co && m.coById(S.params.co)) { S.packCo = S.params.co; delete S.params.co; }
      if (!S.packTab) S.packTab = 'profile';
      if (S.packKw == null) S.packKw = '';
      /* 未选企业：任务列表首屏 */
      if (!S.packCo || !m.coById(S.packCo)) { this.paintList(el); return; }
      const c = this.normCo(m.coById(S.packCo));
      const wb = window.VIEWS.workbench;
      el.innerHTML = `
        <div class="page-head"><div class="page-title">访前作战包 · ${esc(c.short)}</div>
          <div class="flex" style="gap:8px">
            <button class="btn btn-ghost" id="pkBack">← 返回任务列表</button>
            <button class="btn btn-primary btn-sm" id="pkDl">下载作战包</button></div></div>
        <div id="pkTabs"></div>`;
      el.querySelector('#pkBack').onclick = () => { S.packCo = null; this.render(el); };
      el.querySelector('#pkDl').onclick = () => toast('访前作战包已下载（PDF）');
      const tabs = [
        { id: 'profile', name: '客户画像' },
        { id: 'industry', name: '行业分析' },
        { id: 'script', name: '访前话术' },
        { id: 'plan', name: '推荐服务方案' }];
      let act = ['profile', 'industry', 'script', 'plan'].includes(S.packTab) ? S.packTab : 'profile';
      renderTabs(el.querySelector('#pkTabs'), tabs, act, t => { act = t; S.packTab = t; paint(); });
      const paint = () => {
        const box = switchTab(el.querySelector('#pkTabs'), tabs, act, paint);
        if (act === 'profile') box.innerHTML = this.profileTab(c);
        if (act === 'industry') box.innerHTML = this.industryTab(c);
        if (act === 'script') box.innerHTML = wb.briefHtml(c);
        if (act === 'plan') box.innerHTML = wb.planHtml(c);
        const FX = APP.AIFX;
        FX.stagger(box); FX.countUp(box);
        if (!FX.played.pkScript) { FX.played.pkScript = 1; FX.typewrite(box); }
      }; paint();
    },
    /* ---------- 首屏：承接的任务列表 + 企业搜索 ---------- */
    paintList(el) {
      const m = M();
      const wb = window.VIEWS.workbench;
      const tasks = wb ? wb.myTasks() : (S.fn ? S.fn.tasks : m.funnel.tasksSeed);
      const kw = S.packKw || '';
      const list = kw ? tasks.filter(t => { const c = m.coById(t.co); return c && (c.name + c.short).includes(kw); }) : tasks;
      const stTag = s => ({ 待接收: 'tag-gray', 跟进中: 'tag-blue', 已反馈: 'tag-green', 已关闭: 'tag-line' }[s] || 'tag-gray');
      const card = t => { const c = m.coById(t.co); if (!c) return ''; const rm = (m.funnel.rms.find(r => r.id === t.rm) || {}).name || '';
        return `<div class="wb-task" data-pk="${t.co}" style="cursor:pointer">
          <div class="flex-between" style="gap:8px"><b class="text-sm">${esc(c.short)}</b>
            <span class="flex" style="gap:6px"><span class="tag tag-line" style="height:19px;font-size:10px">${esc(t.type)}</span><span class="tag ${stTag(t.status)}" style="height:19px;font-size:10px">${t.status}</span></span></div>
          <div class="text-xs text-muted mt1" style="line-height:1.6">截止 ${t.due} · ${esc(rm)} · 重点：${esc((t.prods || []).slice(0, 3).join(' / '))}</div>
          <div class="wb-task-last">${t.log && t.log[0] ? '最新：' + esc(t.log[0].d) + ' ' + esc(t.log[0].t) : '尚未跟进'}</div>
        </div>`; };
      el.innerHTML = `
        <div class="page-head"><div class="page-title">访前作战包</div></div>
        <!-- 大搜索框：输入企业名 → AI 准备作战包 -->
        <div class="card card-pad mb4" style="background:linear-gradient(115deg,#7E0E19 0%,#A61521 55%,#C0202C 130%);border:none;color:#fff;text-align:center;padding:30px 24px">
          <div style="font-size:var(--fs-xl);font-weight:700">输入客户名称，AI 为您准备访前作战包</div>
          <div class="mt1" style="font-size:12px;opacity:.85">客户画像 · 行业分析 · 访前话术 · 推荐服务方案，一键备齐</div>
          <div style="position:relative;max-width:620px;margin:16px auto 0">
            <span style="position:absolute;left:16px;top:50%;transform:translateY(-50%);font-size:18px">🔍</span>
            <input id="pkQ" placeholder="输入企业名称，如：晶汇封测 / 中天科技…" autocomplete="off"
              style="width:100%;height:48px;border:none;border-radius:24px;padding:0 130px 0 44px;font-size:var(--fs-md);outline:none">
            <button id="pkGo" style="position:absolute;right:5px;top:5px;height:38px;padding:0 22px;border:none;border-radius:19px;background:#8E1019;color:#fff;font-weight:700;cursor:pointer">AI 准备</button>
            <div id="pkSug" style="display:none;position:absolute;top:52px;left:0;width:100%;background:#fff;border-radius:12px;box-shadow:0 14px 36px rgba(0,0,0,.22);padding:6px;z-index:40;text-align:left"></div>
          </div>
          <div class="flex mt3" style="gap:6px;justify-content:center;flex-wrap:wrap">
            <span class="text-xs" style="opacity:.8">试试：</span>
            ${(m.companies.slice(0, 4)).map(c => `<span class="tag" data-pksug="${c.id}" style="height:22px;background:rgba(255,255,255,.18);color:#fff;cursor:pointer;font-size:10px">${esc(c.short)}</span>`).join('')}
          </div>
        </div>
        <!-- 承接任务快选 -->
        <div class="card">
          <div class="card-head">
            <div class="card-title">${APP.role().key === 'rm' ? '我承接的任务' : APP.role().key === 'head' ? '本支行任务' : APP.role().key === 'pm' ? '我下发的任务' : '全辖任务'}（${list.length}）<span class="card-sub">点击任务直接进入该企业作战包</span></div>
            <input class="input" id="pkKw" placeholder="筛选任务…" value="${esc(kw)}" style="width:170px;height:28px">
          </div>
          <div style="padding:6px 0 10px;max-height:520px;overflow-y:auto">
            ${list.map(card).join('') || `<div class="empty" style="padding:44px 16px"><div class="e-ico">🔍</div><div class="e-title">${kw ? '未找到匹配企业' : '暂无承接任务'}</div><div class="e-sub text-sm text-muted">${kw ? '换个关键词试试' : '任务由产品经理在机会漏斗下发'}</div></div>`}
          </div>
        </div>`;
      /* 大搜索框：模糊联想 → 选中后 AI 五步准备特效 → 进四Tab */
      const q = el.querySelector('#pkQ'), sug = el.querySelector('#pkSug');
      const fuzzy = (c, k) => { const hay = c.name + c.short + (c.seg || '') + (c.track || ''); return hay.includes(k) || [...k].every(ch => hay.includes(ch)); };
      const showSug = () => {
        const k = q.value.trim();
        if (!k) { sug.style.display = 'none'; return; }
        const hits = m.companies.filter(c => fuzzy(c, k)).slice(0, 6);
        const hitsF = m.funnel.cos.filter(c => !m.companies.some(y => y.id === c.id) && fuzzy(c, k)).slice(0, 4);
        const all = hits.concat(hitsF);
        sug.innerHTML = all.length ? all.map(c => `<div data-pkco="${c.id}" style="padding:8px 10px;border-radius:8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px">
          <b class="text-sm">${esc(c.short)}</b><span class="text-xs text-muted">${esc(c.seg || c.net || '')}</span></div>`).join('')
          : '<div style="padding:10px;font-size:12px;color:var(--t3)">未找到匹配企业</div>';
        sug.style.display = 'block';
        sug.querySelectorAll('[data-pkco]').forEach(it => it.onmousedown = () => { sug.style.display = 'none'; q.value = m.coById(it.dataset.pkco).short; this.aiPrepare(el, it.dataset.pkco); });
      };
      q.oninput = showSug; q.onfocus = showSug;
      q.onblur = () => setTimeout(() => { sug.style.display = 'none'; }, 180);
      q.addEventListener('keydown', e => { if (e.key === 'Enter') { const k = q.value.trim(); if (!k) return; const hit = m.companies.find(c => fuzzy(c, k)) || m.funnel.cos.find(c => fuzzy(c, k)); hit ? this.aiPrepare(el, hit.id) : toast('未找到匹配企业', 'warn'); } });
      el.querySelector('#pkGo').onclick = () => { const k = q.value.trim(); if (!k) return toast('请输入企业名称', 'warn'); const hit = m.companies.find(c => fuzzy(c, k)) || m.funnel.cos.find(c => fuzzy(c, k)); hit ? this.aiPrepare(el, hit.id) : toast('未找到匹配企业', 'warn'); };
      el.querySelectorAll('[data-pksug]').forEach(sg => sg.onclick = () => this.aiPrepare(el, sg.dataset.pksug));
      /* 任务快选 */
      const inp = el.querySelector('#pkKw');
      inp.oninput = () => { S.packKw = inp.value.trim(); this.paintList(el); const k2 = el.querySelector('#pkKw'); k2.focus(); k2.setSelectionRange(k2.value.length, k2.value.length); };
      el.querySelectorAll('[data-pk]').forEach(d => d.onclick = () => { S.packCo = d.dataset.pk; S.packTab = 'profile'; this.render(el); });
    },
    /* AI 准备作战包：五步特效 → 四Tab */
    aiPrepare(el, coId) {
      const c = M().coById(coId);
      if (!c) return;
      const steps = ['检索企业公开信息（工商 / 股权 / 舆情）', '匹配行内数据与历史合作记录', '分析所属行业景气与产业链位置', '生成客户画像与行业分析', '匹配产品库，输出访前话术与服务方案'];
      openModal({ small: true, title: `AI 正在准备访前作战包 · ${esc(c.short)}`, body: `
        <div style="padding:10px 4px">
          ${steps.map((s, i) => `<div class="flex mb3" style="gap:10px"><span class="rank-pill" style="background:#F0F2F7;color:var(--t3)" id="pkstep${i}">${i + 1}</span>
          <span class="text-sm" style="line-height:24px">${s}</span></div>`).join('')}
          <div class="mt2" style="height:5px;background:#F0F2F7;border-radius:3px;overflow:hidden"><i id="pkbar" style="display:block;height:100%;width:0;background:linear-gradient(90deg,#8E1019,#C0202C);transition:width .5s"></i></div>
        </div>`, foot: '' });
      steps.forEach((_, i) => setTimeout(() => {
        const p = document.querySelector('#pkstep' + i);
        if (p) { p.textContent = '✓'; p.style.background = 'var(--ok-50)'; p.style.color = 'var(--ok-500)'; }
        const bar = document.querySelector('#pkbar');
        if (bar) bar.style.width = ((i + 1) / steps.length * 100) + '%';
      }, 500 + i * 520));
      setTimeout(() => {
        APP.closeModal();
        S.packCo = coId; S.packTab = 'profile'; S.packKw = '';
        this.render(el);
        toast(`「${c.short}」访前作战包已备齐`);
      }, 500 + steps.length * 520 + 300);
    },
    /* ---------- Tab1 客户画像：企业全部信息 ---------- */
    profileTab(c) {
      const m = M();
      const fn = fnDemoFill(c);
      if (fn) { c.legal = fn.legal; c.cap = fn.cap; c.est = fn.est; c.emp = fn.emp; c.uscc = fn.uscc; c.addr = fn.addr; c.scope = fn.scope; c.qual = fn.qual; c.holders = fn.holders; c.ctrl = fn.ctrl; c.ud = fn.ud; }
      const o = c.internal || { credit: 0, used: 0, deposit: 0, settle: 0, products: [] };
      const kpi = (k, v, d) => `<div class="wp-kpi"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d || ''}</div></div>`;
      const cl = (x, cls) => `<span class="wp-cl ${cls}">${esc(x)}</span>`;
      const chain = (c.ctrl || '').split('→').map(s => s.trim()).filter(Boolean);
      return `
        <div class="wp-hero">
          <div><div class="eyebrow">客户画像 · 企业全景信息</div><h2>${esc(c.name)}</h2>
            <div class="sub">${c.listed.indexOf('是') === 0 ? esc(c.listed.slice(2)) + ' ｜ ' : ''}${esc(c.city)}·${esc(c.zone)} ｜ ${esc(c.net)}·${esc(c.track)} ｜ 数据时点 2026-11-04</div></div>
          <div class="wp-verdict"><div class="lv">${c.prog === '突破' ? '重点介入' : c.prog === '攻坚' ? '适度介入' : '培育跟踪'}</div><div class="sm">${c.pos}客户 · ${c.prog}档</div></div>
        </div>
        <div class="wp-kpis">
          ${kpi('综合评分', c.score, c.sigLv + ' 级信号 · ' + c.rel)}
          ${kpi('客户大类', c.cat === '建设运营商' ? '运营商' : '供应商', esc(c.nat))}
          ${kpi('营销进展', c.prog, '地位 ' + c.pos + ' · 权重 ' + c.wt)}
          ${kpi('上市情况', c.listed.indexOf('是') === 0 ? '是' : '否', c.listed.indexOf('是') === 0 ? c.listed.slice(2, 16) : '非上市主体')}
          ${kpi('行内合作', o.credit ? o.credit + '亿' : '未合作', (o.products || []).slice(0, 2).join('/') || '新客户')}
          ${kpi('建议服务方案', (c.prods || []).length + ' 项', (c.prods || []).slice(0, 2).join(' / '))}
        </div>
        <div class="card card-pad mb3">
          <div class="wp-cloud mb2">
            ${cl(c.listed.indexOf('是') === 0 ? c.listed.slice(2) : '非上市主体', c.listed.indexOf('是') === 0 ? 'wp-cl-a' : 'wp-cl-e')}
            ${cl(c.net + ' · ' + c.track, 'wp-cl-b')}${cl(c.cat, 'wp-cl-a')}${cl(c.nat, 'wp-cl-c')}${cl(c.pos + '客户', 'wp-cl-a')}
            ${cl('营销进展：' + c.prog, 'wp-cl-b')}${cl('权重：' + c.wt, 'wp-cl-c')}${cl(c.rel, 'wp-cl-a')}
            ${cl('四线得分 ' + c.score, 'wp-cl-b')}${cl(c.city + '属地', 'wp-cl-c')}
          </div>
          <div class="wp-note"><b>AI 信号：</b>${esc((c.sig || []).join('；'))}</div>
        </div>
        <div class="card card-pad mb3"><div class="flex-between mb3"><b>基本信息</b><span class="text-xs text-muted">工商公示数据</span></div>
          <div class="kv-grid">${[['法定代表人', c.legal || '—'], ['注册资本', c.cap || '—'], ['成立时间', (c.est || '—') + (String(c.est || '').indexOf('年') < 0 && c.est !== '—' ? ' 年' : '')], ['统一社会信用代码', c.uscc || '—'], ['企业性质', c.nat], ['员工规模', c.emp || '—'], ['注册地址', c.addr || '—'], ['经营范围', (c.scope || '—').slice(0, 40) + ((c.scope || '').length > 40 ? '…' : '')], ['资质认证', (c.qual || []).join('、') || '—']].map(([k, v]) => kv(k, esc(String(v)))).join('')}</div></div>
        <div class="card card-pad mb3"><div class="flex-between mb3"><b>股权与控制链</b><span class="text-xs text-muted">穿透至实际控制人</span></div>
          ${(c.holders || []).length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>股东名称</th><th>类型</th><th style="width:200px">持股比例</th></tr></thead><tbody>
            ${(c.holders || []).map(h => `<tr><td><b class="text-sm">${esc(h.n)}</b></td><td><span class="tag tag-line">${esc(h.t)}</span></td>
              <td><div class="mini-bar-wrap"><div class="mb" style="flex:1"><i style="width:${h.pct}%;background:var(--brand-500)"></i></div><b class="fs-num text-sm">${h.pct}%</b></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="text-sm text-muted">暂无公示数据</div>'}
          ${chain.length ? `<div class="mt2 text-sm">实际控制人路径：${chain.map(x => `<span class="tag tag-line" style="height:20px">${esc(x)}</span>`).join('<span style="color:var(--t3)"> → </span>')}</div>` : ''}
        </div>
        <div class="card card-pad mb3"><div class="flex-between mb3"><b>上下游与机会</b><span class="text-xs text-muted">公开信息聚合</span></div>
          ${(c.ud && c.ud.up) ? `<div class="grid-2">
            <div><div class="text-sm" style="font-weight:600;margin-bottom:6px">上游供应商</div>${c.ud.up.map(u => `<div class="flex-between" style="padding:4px 0"><span class="text-sm"><b>${esc(u.n)}</b> <span class="text-xs text-muted">· ${esc(u.w)}</span></span>${u.ours ? '<span class="tag tag-green" style="height:18px;font-size:10px">本行客户</span>' : ''}</div>`).join('')}</div>
            <div><div class="text-sm" style="font-weight:600;margin-bottom:6px">下游客户</div>${c.ud.down.map(u => `<div class="flex-between" style="padding:4px 0"><span class="text-sm"><b>${esc(u.n)}</b> <span class="text-xs text-muted">· ${esc(u.w)}</span></span>${u.ours ? '<span class="tag tag-green" style="height:18px;font-size:10px">本行客户</span>' : ''}</div>`).join('')}</div></div>`
          : '<div class="text-sm text-muted mb2">暂无公开披露的上下游数据</div>'}
          ${c.opp ? `<div class="wp-note mt2"><b>机会地：</b>${esc(c.opp)}</div>` : ''}
        </div>
        <div class="card card-pad">
          <div class="flex-between mb2"><b class="text-sm">最新动态</b><span class="text-xs text-muted">${c.ipo ? '资本进程' : 'AI 数据引擎'}</span></div>
          <div class="text-sm text-sub">${c.ipo ? `<span class="tag tag-cyan mb2" style="display:inline-flex">${esc(c.ipo)}</span><br>` : ''}${esc(c.recent || '—')}</div>
        </div>`;
    },
    /* ---------- Tab2 行业分析：所属行业景气看板 ---------- */
    industryTab(c) {
      const m = M();
      if (c.name && c.name.indexOf('朗新') >= 0) {
        return `
        <div class="card card-pad mb4">
          <div class="flex-between wrap" style="gap:10px">
            <div><div class="card-title" style="font-size:var(--fs-lg)">能源数字化与电力产业链 · 行业分析</div>
              <div class="text-xs text-muted mt1">朗新科技集团 所属行业 ｜ 按《访前准备看板》口径 ｜ 赛道空间：虚拟电厂与充电基础设施（政策锚定）</div></div>
            <button class="btn btn-ghost btn-sm" onclick="APP.go('manage')">完整产业分析 ›</button>
          </div>
          <div class="kpi-grid mt3 mb0" style="grid-template-columns:repeat(4,1fr)">
            ${kv('市场化交易电量占比', '<b style="font-size:20px">约70%</b>')}${kv('虚拟电厂调节能力', '<b style="font-size:20px">2030年 5000万kW</b>')}${kv('充电设施（2027底）', '<b style="font-size:20px">2800万个</b>')}${kv('三年倍增拉动投资', '<b style="font-size:20px">2000亿+</b>')}
          </div>
          <ul class="text-sm text-sub mt3" style="padding-left:18px;line-height:2">
            <li><span class="tag tag-green" style="height:20px">政策强β</span>"十五五"新型电力系统规划：市场化交易电量占比约70%；能源局2026年部署充电设施"三年倍增"、新型储能2027年1.8亿kW；</li>
            <li><span class="tag tag-blue" style="height:20px">赛道景气</span>虚拟电厂2025年项目470个、调节能力1685万kW（+70%），市场约百亿、2030年有望破千亿；</li>
            <li><span class="tag tag-orange" style="height:20px">双刃剑</span>电价市场化既是电力交易盈利来源，也是2026年亏损主因——机会与风险同源；</li>
            <li><span class="tag tag-cyan" style="height:20px">朗新卡位</span>电力营销2.0核心系统（31省/2.7亿+终端）+ 缴费5亿户 + 新电途1800万用户 + 虚拟电厂25GW——C端能源流量入口业内罕见；竞争压力：电力IT看国网系/远光软件/东方电子，充电聚合看高德/快电。</li>
          </ul>
        </div>`;
      }
      const ci = m.cockpitInd.ciInds;
      const keyByNet = { '新一代通信网': 'ic', '算力网': 'ai', '新型电网': 'ev', '物流网': 'low', '水网': 'low', '城市地下管网': 'low' };
      const key = (c.industry && Object.keys(ci).find(k => ci[k].name.indexOf(String(c.industry).slice(0, 2)) >= 0)) || keyByNet[c.net] || 'ic';
      const ind = ci[key];
      const CH = window.CH;
      return `
        <div class="card card-pad mb4">
          <div class="flex-between wrap" style="gap:10px">
            <div><div class="card-title" style="font-size:var(--fs-lg)">${esc(ind.name)} · 行业分析</div>
              <div class="text-xs text-muted mt1">${esc(c.short)} 所属行业 ｜ 与「管理视图 · 产业分析」同口径</div></div>
            <button class="btn btn-ghost btn-sm" onclick="APP.go('manage')">完整产业分析 ›</button>
          </div>
          <div class="kpi-grid mt3 mb0" style="grid-template-columns:repeat(4,1fr)">
            ${ind.kpi.map(([k, v]) => kv(k, '<b style="font-size:20px">' + v + '</b>')).join('')}
          </div>
        </div>
        <div class="card card-pad mb4"><div class="card-title mb3" style="font-size:var(--fs-md)">细分环节景气度（指数 &gt;100 为景气扩张）</div>
          <div class="flex wrap" style="gap:18px;justify-content:space-around">${ind.boom.map(b => CH.gauge({ val: b.idx, label: `${b.name}（环比${b.mom}）` })).join('')}</div></div>
        <div class="grid-2 mb4">
          <div class="card card-pad"><div class="card-title mb3" style="font-size:var(--fs-md)">行业市场规模走势</div>${CH.line({ labels: ind.size.labels, series: ind.size.series, h: 220 })}</div>
          <div class="card card-pad"><div class="card-title mb3" style="font-size:var(--fs-md)">行业投融资热度（季度事件数）</div>${CH.line({ labels: ind.invest.labels, series: ind.invest.series, h: 220 })}</div>
        </div>
        <div class="grid-3 mb4">${ind.metrics.map(([k, v]) => `<div class="card card-pad" style="padding:14px 16px"><div class="text-xs text-muted">${k}</div><div class="text-md mt2" style="font-weight:700">${esc(v)}</div></div>`).join('')}</div>
        ${aiPanel(ind.name + ' · 行业AI解读', esc(ind.ai))}`;
    },
  };

  /* ================= AI智能分析（企业报告 + 产业链分析 + 我的报告） =================
     注：render 由文件末尾的别名实现（访前作战包·深度分析），此处保留对象与其它方法 */
  VIEWS.report = {
    render(el) { /* 由文件末尾 VIEWS.report.render 别名覆盖 */ },
    gen(coId, req, mat) {
      const c = M().coById(coId); if (!c) return;
      openModal({ small: true, title: `正在生成报告 · ${esc(c.short)}`, body: `
        <div id="genSteps" style="padding:10px 4px">
          ${['采集工商 / 财务 / 舆情 / 专利 / 融资数据', '多维交叉分析（竞争力·财务·上下游·舆情）', '融合行内数据、调研记录与补充资料，生成报告与营销指引'].map((st, i) => `
          <div class="flex mb3" style="gap:10px"><span class="rank-pill" style="background:#F0F2F7;color:var(--t3)" id="gsp${i}">${i + 1}</span>
          <span class="text-sm" style="line-height:24px">${st}</span></div>`).join('')}
          ${req ? `<div class="mt3" style="padding:9px 12px;background:#F7F8FA;border:1px dashed var(--line-strong);border-radius:8px;font-size:12px;color:var(--t2)"><b>补充要求：</b>${esc(req)}<br><span class="text-xs text-muted">AI 将在报告相关板块重点回应以上要求</span></div>` : ''}
          ${mat ? `<div class="mt3" style="padding:9px 12px;background:#F7F8FA;border:1px dashed var(--line-strong);border-radius:8px;font-size:12px;color:var(--t2)"><b>补充资料：</b>${esc(mat)}<br><span class="text-xs text-muted">将并入行内信息整合板块参与分析</span></div>` : ''}
        </div>`, foot: '' });
      const done = i => { const p = $('#gsp' + i); if (p) { p.textContent = '✓'; p.style.background = 'var(--ok-50)'; p.style.color = 'var(--ok-500)'; } };
      setTimeout(() => done(0), 700); setTimeout(() => done(1), 1500); setTimeout(() => done(2), 2200);
      setTimeout(() => {
        APP.closeModal(); S.reportCo = coId; S.params.tab = 'detail'; S.lastGenReq = req || ''; S.lastGenMat = mat || '';
        if (mat) S.inputs = [{ co: coId, date: '2026-09-28', type: '补充资料', content: mat }, ...(S.inputs || [])];
        S.rptHist = [coId, ...(S.rptHist || []).filter(x => x !== coId)].slice(0, 6);
        S.rptMy = [{ co: coId, kind: '企业报告', t: '2026-09-28 ' + new Date().toTimeString().slice(0, 5), by: '邓瑞忠', req: req || '' }, ...(S.rptMy || [])];
        toast(`「${c.short}」AI 分析报告已生成${req ? '（已按补充要求定制）' : ''}`);
        this.render(document.querySelector('#viewRoot'));
      }, 2600);
    },
    paintChain(box) {
      const m = M(), cd = m.chainData;
      const ctxCo = S.reportCo && m.coById(S.reportCo);
      if (ctxCo && ctxCo.name.indexOf('朗新') >= 0) {
        box.innerHTML = `
        <div class="card card-pad mb4">
          <div class="flex-between wrap" style="gap:12px">
            <div class="flex" style="gap:12px;align-items:center">
              <div><div style="font-size:var(--fs-xl);font-weight:700">能源数字化与电力产业链分析报告 · 朗新科技集团</div>
              <div class="text-xs text-muted mt2">数据时点 2026-10-29 ｜ 产业链定位：电网侧数字化（上游）→ 朗新（软件平台与负荷聚合）→ 电网/发电集团/充电生态（下游）</div></div>
            </div>
            <button class="btn btn-ghost" id="chainDl">⬇ 下载报告</button>
          </div>
        </div>
        <div class="grid-2 mb3">
          <div class="card card-pad"><h3 style="font-size:15px;font-weight:700;margin-bottom:10px">行业景气（政策锚定）</h3>
            <ul class="text-sm text-sub" style="padding-left:18px;line-height:2">
              <li>"十五五"新型电力系统：市场化交易电量占比约 <b>70%</b>；虚拟电厂调节能力超 5000万kW；充电设施超 4000万个</li>
              <li>能源局2026年部署：充电设施"三年倍增"——2027年底2800万个、拉动投资2000亿+；新型储能2027年1.8亿kW</li>
              <li>虚拟电厂：2025年项目470个、调节能力1685万kW（+70%）；市场约百亿，2030年有望破千亿</li>
            </ul></div>
          <div class="card card-pad"><h3 style="font-size:15px;font-weight:700;margin-bottom:10px">朗新卡位与银行机会</h3>
            <ul class="text-sm text-sub" style="padding-left:18px;line-height:2">
              <li>链条卡位：营销2.0核心系统（31省/2.7亿终端）+ 缴费5亿户 + 新电途1800万用户 + 虚拟电厂25GW</li>
              <li>金融切入点：新耀5亿保函（首单）→ 电网应收保理/票据池（257天应收）→ 电力交易专项流贷（扭亏挂钩）</li>
              <li>风险传导：电价现货波动→交易亏损；股价回撤→质押链压力——授信与现金流绑定、与股价脱敏</li>
            </ul></div>
        </div>`;
        const dlx = box.querySelector('#chainDl'); if (dlx) dlx.onclick = () => toast('行业报告已下载');
        return;
      }
      const sec = (no, t) => `<div class="rpt-sec" id="c${no}"><div class="rs-head"><span class="rs-no">${no}</span><span class="rs-title">${t}</span>${srcTip('c' + no)}</div>`;
      let body = '';
      const segOpts = ['全部环节', '芯片设计', '晶圆制造/IDM', '封装测试', '设备/材料', 'EDA/IP'];
      const segBar = (id, dis) => `<select class="select" id="${id}" style="width:150px;height:30px" ${dis ? 'disabled' : ''}>${!S._chainSeg ? '<option disabled selected hidden value="">请选择细分行业</option>' : ''}${segOpts.map(x => `<option ${S._chainSeg === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
      if (!S._chainView) {
        body = `
        <div class="filter-bar mb4">
          <span class="f-label">产业</span>
          <select class="select" id="chainInd" style="width:200px;height:30px">${!S._chainSel ? '<option disabled selected hidden value="">请选择产业</option>' : ''}<option ${S._chainSel ? 'selected' : ''}>集成电路与电子材料</option></select>
          <span class="f-label">细分行业</span>${segBar('chainSeg', !S._chainSel)}
          <button class="btn btn-primary" id="chainGen" style="margin-left:auto;height:30px" ${S._chainSel ? '' : 'disabled'}>⚡ 生成报告</button>
        </div>
        <div class="card"><div class="empty" style="padding:64px 20px"><div class="e-ico">🏭</div><div class="e-title">选择产业与细分行业，点击生成报告</div></div></div>`;
      }
      if (S._chainView === 'report') {
        const ic = cd.ic;
        try { body = `
        <div class="card card-pad mb4">
          <div class="flex-between wrap" style="gap:12px">
            <div class="flex" style="gap:12px;align-items:center">
              <div><div style="font-size:var(--fs-xl);font-weight:700">集成电路${S._chainSeg && S._chainSeg !== '全部环节' ? ' · ' + S._chainSeg : ''} 产业分析报告</div>
              <div class="text-xs text-muted mt2">数据时点 2026-09-28 <span class="src-tip" style="margin-left:6px">来源<span class="src-pop" style="left:0;right:auto"><span class="sp-t text-sm">数据来源</span><span class="sp-l text-xs text-sub">· 《2026年中国集成电路产业发展白皮书》　2026-06 · 中国半导体行业协会</span><span class="sp-l text-xs text-sub">· 《上市公司公告》　截至2026-10 · 巨潮资讯网</span><span class="sp-l text-xs text-sub">· 《半导体行业研究报告》　2026-08 · 券商研究所</span><span class="sp-l text-xs text-sub">· 行内产业研究库　截至2026-09</span></span></span></div></div>
            </div>
            <div class="flex" style="gap:8px">
              <button class="btn btn-primary" id="chainGen2">⚡ 生成报告</button>
              <button class="btn btn-ghost" id="chainDl">⬇ 下载报告</button></div>
          </div>
          <div class="filter-bar mt3 mb0" style="margin-bottom:0">
            <span class="f-label">产业</span>
            <select class="select" id="chainInd2" style="width:180px;height:28px"><option>集成电路与电子材料</option></select>
            <span class="f-label">细分行业</span>${segBar('chainSeg2', false).replace('height:30px', 'height:28px')}
          </div>
        </div>
        <div class="rpt-layout">
          <aside class="ns-side" style="position:sticky;top:80px">
            <div class="ns-g">报告模块</div>
            ${['核心结论', '产业概览与产业链', '商业模式', '代表企业', '关键壁垒', '产业特征', '重点关注事项', '主要风险点', '金融产品设计侧重点'].map((t, i) => `<div class="ns-i" data-cs="${i === 0 ? 'ccore' : 'c' + i}">${i === 0 ? '' : i + ' · '}${t}</div>`).join('')}
          </aside>
          <div>
        <div class="rpt-sec" id="ccore" style="border-left:4px solid var(--brand-500)"><div class="rs-head"><span class="rs-title" style="font-size:var(--fs-lg)">核心结论</span>${srcTip('ccore')}</div>
          ${ic.core.map(x => `<div class="flex mt2" style="gap:8px;align-items:flex-start"><span class="rank-pill" style="background:var(--brand-100);color:var(--brand-600);flex-shrink:0">•</span><span class="text-sm text-sub" style="line-height:1.8">${x}</span></div>`).join('')}</div>
        ${sec(1, '产业概览与产业链')}
          <div class="text-sm text-sub mb3" style="line-height:1.9">${ic.intro}</div>
          <div class="kv-grid" style="grid-template-columns:repeat(3,1fr);gap:10px">
            <div class="kv"><div class="kv-k">上游支撑</div><div class="kv-v" style="font-size:13px">EDA/IP · 半导体设备 · 半导体材料（硅片/光刻胶/特气/靶材）</div></div>
            <div class="kv"><div class="kv-k">中游核心</div><div class="kv-v" style="font-size:13px">芯片设计（Fabless）· 晶圆制造（Foundry/IDM）· 封装测试</div></div>
            <div class="kv"><div class="kv-k">下游应用</div><div class="kv-v" style="font-size:13px">消费电子 · 汽车电子 · 工业控制 · 通信 · 数据中心与AI · 存储</div></div>
          </div>
          <div class="banner b-note mt3">大基金已推进至三期，地方政府引导基金与科创板等资本市场渠道为企业提供丰富的融资通道。</div></div>
        ${sec(2, '商业模式')}
          <table class="tbl"><thead><tr><th>环节</th><th>商业模式</th><th>资产特征</th><th>盈利与现金流特点</th></tr></thead><tbody>
          ${ic.segTable.map(r => { const hit = S._chainSeg && S._chainSeg !== '全部环节' && r[0].replace(/（.*）/, '').includes(S._chainSeg.split('/')[0]); return `<tr ${hit ? 'style="background:var(--brand-50)"' : (S._chainSeg && S._chainSeg !== '全部环节' ? 'style="opacity:.45"' : '')}><td><b class="text-sm">${r[0]}</b></td>${r.slice(1).map(c => `<td class="text-xs text-sub" style="line-height:1.7">${c}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div>
        ${sec(3, '代表企业')}
          <table class="tbl"><thead><tr><th>环节</th><th>代表企业（示例）</th><th>无锡及周边（示例）</th></tr></thead><tbody>
          ${ic.reprTable.map(r => `<tr><td><b class="text-sm">${r[0]}</b></td><td class="text-xs text-sub" style="line-height:1.7">${r[1]}</td><td class="text-xs text-sub" style="line-height:1.7">${r[2]}</td></tr>`).join('')}</tbody></table></div>
        ${sec(4, '关键壁垒')}
          <div class="grid-2" style="gap:8px">${ic.barriers.map(([t, x]) => `<div style="padding:10px 12px;background:#F8FAFD;border-radius:8px"><b class="text-sm">${t}</b><div class="text-xs text-sub mt1" style="line-height:1.7">${x}</div></div>`).join('')}</div></div>
        ${sec(5, '产业特征')}
          ${ic.traitsFull.map(([t, x]) => `<div class="flex mb2" style="gap:10px;align-items:flex-start;padding:6px 0"><span class="tag tag-blue" style="flex-shrink:0;height:24px">${t}</span><span class="text-sm text-sub" style="line-height:1.8">${x}</span></div>`).join('')}</div>
        ${sec(6, '重点关注事项')}
          <div class="grid-2" style="gap:8px">${ic.focus.map(([t, x]) => `<div style="padding:9px 12px;background:#FDF6EC;border-left:3px solid var(--warn-500);border-radius:6px"><b class="text-sm">${t}</b><div class="text-xs text-sub mt1" style="line-height:1.7">${x}</div></div>`).join('')}</div></div>
        ${sec(7, '主要风险点')}
          <table class="tbl"><thead><tr><th>风险类型</th><th>主要表现</th><th>可识别信号</th></tr></thead><tbody>
          ${ic.risks.map(r => `<tr><td><b class="text-sm">${r[0]}</b></td><td class="text-xs text-sub" style="line-height:1.7">${r[1]}</td><td class="text-xs" style="line-height:1.7;color:var(--danger-500)">${r[2]}</td></tr>`).join('')}</tbody></table></div>
        ${sec(8, '金融产品设计侧重点')}
          <b class="text-sm mb2" style="display:block">总体原则</b>
          ${ic.finPrinciples.map(x => `<div class="flex mb2" style="gap:8px;align-items:flex-start"><span style="color:var(--brand-500)">·</span><span class="text-sm text-sub" style="line-height:1.7">${x}</span></div>`).join('')}
          <b class="text-sm mt3 mb2" style="display:block">分环节产品侧重</b>
          <table class="tbl"><thead><tr><th>环节</th><th>融资需求特点</th><th>产品设计侧重</th></tr></thead><tbody>
          ${ic.finBySeg.map(r => `<tr><td><b class="text-sm">${r[0]}</b></td><td class="text-xs text-sub" style="line-height:1.7">${r[1]}</td><td class="text-xs" style="line-height:1.7;color:var(--brand-600)">${r[2]}</td></tr>`).join('')}</tbody></table></div>
          </div>
        </div`; } catch (e) { body = '<div class="card card-pad"><b>渲染错误：</b>' + e.message + '</div>'; }
      }
      box.innerHTML = body;
      const genFlow = () => {
        openModal({ small: true, title: `正在生成报告 · 集成电路${S._chainSeg && S._chainSeg !== '全部环节' ? ' · ' + S._chainSeg : ''}`, body: `
          <div style="padding:10px 4px">${['采集产业数据 / 政策 / 资本动态', '细分环节商业模式与竞争格局分析', '融合行内数据，生成产业分析报告'].map((x, i) => `<div class="flex mb3" style="gap:10px"><span class="rank-pill" style="background:#F0F2F7;color:var(--t3)" id="cgs${i}">${i + 1}</span><span class="text-sm" style="line-height:24px">${x}</span></div>`).join('')}</div>`, foot: '' });
        const done = i => { const q = $('#cgs' + i); if (q) { q.textContent = '✓'; q.style.background = 'var(--ok-50)'; q.style.color = 'var(--ok-500)'; } };
        setTimeout(() => done(0), 700); setTimeout(() => done(1), 1500); setTimeout(() => done(2), 2200);
        setTimeout(() => {
          APP.closeModal(); S._chainView = 'report';
          const title = `集成电路${S._chainSeg && S._chainSeg !== '全部环节' ? ' · ' + S._chainSeg : ''}产业分析报告`;
          S.rptMy = [{ co: 'ic', kind: '产业链报告', title, t: '2026-09-28 ' + new Date().toTimeString().slice(0, 5), by: '邓瑞忠' }, ...(S.rptMy || [])];
          this.paintChain(box); toast('集成电路产业分析报告已生成');
        }, 2600);
      };
      const sel = box.querySelector('#chainInd');
      if (sel) sel.onchange = () => { S._chainSel = '集成电路与电子材料'; S._chainView = null; this.paintChain(box); };
      const segEl = box.querySelector('#chainSeg');
      if (segEl) segEl.onchange = () => { S._chainSeg = segEl.value; };
      const gen = box.querySelector('#chainGen');
      if (gen && !gen.disabled) gen.onclick = () => genFlow();
      const sel2 = box.querySelector('#chainInd2');
      if (sel2) sel2.onchange = () => { S._chainSel = null; S._chainView = null; S._chainSeg = null; this.paintChain(box); };
      const seg2 = box.querySelector('#chainSeg2');
      if (seg2) seg2.onchange = () => { S._chainSeg = seg2.value; this.paintChain(box); };
      const gen2 = box.querySelector('#chainGen2');
      if (gen2) gen2.onclick = () => genFlow();
      const dl = box.querySelector('#chainDl');
      if (dl) dl.onclick = () => toast('行业报告已下载');
      box.querySelectorAll('.ns-i[data-cs]').forEach(n => n.onclick = () => {
        const tg = box.querySelector('#' + n.dataset.cs);
        if (tg) tg.scrollIntoView({ behavior: 'smooth', block: 'start' });
        box.querySelectorAll('.ns-i[data-cs]').forEach(x => x.classList.remove('on'));
        n.classList.add('on');
      });
    },
    /* ---- 报告详情（搜索表单 + 12板块 + 左侧模块导航） ---- */
    paintDetail(box) {
      const m = M(), F = S._rptForm = S._rptForm || { kw: '', req: '', mat: '' };
      const selCo = m.coById(S.reportCo);
      /* 作战包/抽屉带入企业：搜索框预填当前企业，免二次选择 */
      if (selCo && S._rptCoId !== selCo.id && !F.kw) { F.kw = selCo.short; S._rptCoId = selCo.id; }
      const isLXco = selCo && selCo.name && selCo.name.indexOf('朗新') >= 0 && m.reportLX;
      const r = isLXco ? m.reportLX : (selCo && selCo.id === 'TH' && m.reportTH) ? m.reportTH : (selCo && selCo.id === 'XJH' && m.reportXJH) ? m.reportXJH : m.report;
      const fullRpt = selCo && r && selCo.id === r.coId;
      if (!S.rptHist) S.rptHist = ['XJH', 'JH', 'TH'];
      if (!Array.isArray(F.files)) F.files = [];
      if (F.mat) F.mat = '';
      const filePool = ['2025年度审计报告.pdf', '2026H1财务报表.xlsx', '前五大客户订单明细.csv', '发明专利清单.pdf', '他行授信批复截图.png'];
      const supOpen = S._rptSupOpen || !!F.req || F.files.length > 0;
      const formHtml = (fullRpt ? `<div class="flex mb4" style="gap:8px;align-items:center"><span class="tag tag-green" style="height:32px;display:inline-flex;align-items:center">✓ ${esc(selCo.short)} · AI 报告已生成</span><button class="btn btn-sm btn-ghost" id="rptReSearch">检索其他企业</button></div>` : ``) + `
        <div class="rpt-form mb4" style="flex-direction:column;align-items:stretch;gap:10px;${fullRpt ? 'display:none' : ''}">
          <div class="flex" style="gap:10px">
            <div style="position:relative;flex:1;min-width:260px">
              <input id="rptQ" class="rf-ctl" placeholder="企业名称 / 统一社会信用代码 · 支持模糊搜索，如：晶汇封测 / 晶封" autocomplete="off" value="${esc(F.kw)}" style="width:100%">
              <div id="rptSug" style="display:none;position:absolute;top:40px;left:0;width:100%;background:#fff;border-radius:10px;box-shadow:0 14px 36px rgba(0,0,0,.22);padding:6px;z-index:40"></div>
            </div>
            ${S._rptCoId && m.coById(S._rptCoId) ? `<span class="tag tag-green" style="height:38px;display:inline-flex;align-items:center;gap:6px;flex-shrink:0">✓ ${esc(m.coById(S._rptCoId).short)}</span>` : ''}
            <button class="btn" id="genRpt" style="background:#C0202C;color:#fff;font-weight:700;flex-shrink:0">⚡ 生成报告</button>
          </div>
          ${supOpen ? `
          <div class="card card-pad" style="padding:12px 14px;box-shadow:none">
            <div class="flex-between mb2">
              <div class="text-sm" style="font-weight:600">补充信息（选填）</div>
              <div class="flex" style="gap:8px">
                <button class="btn btn-sm btn-ghost" id="rptFileBtn" type="button">📎 上传资料</button>
                <button class="btn btn-sm btn-text" id="rptSupClose" type="button" style="color:var(--t3)">收起</button>
              </div></div>
            <textarea id="rptReq" class="rf-ctl" rows="3" placeholder="补充要求，或粘贴已掌握的客户资料、调研记录与相关资讯…" style="width:100%;height:auto;padding:8px 12px;line-height:1.7;resize:vertical">${esc(F.req)}</textarea>
            ${F.files.length ? `<div class="flex wrap mt2" id="rptFiles" style="gap:6px">${F.files.map((f, i) => `<span class="tag tag-line" style="height:26px;display:inline-flex;align-items:center;gap:6px">📄 ${esc(f)}<span data-fdel="${i}" style="cursor:pointer;color:var(--t3)">✕</span></span>`).join('')}</div>` : ''}
          </div>` : `<button class="btn btn-sm btn-ghost" id="rptSupOpenBtn" type="button" style="align-self:flex-start">＋ 补充信息（选填）</button>`}
        </div>`;
      const c = m.coById(S.reportCo);
      let content;
      if (!c) {
        content = `<div class="card"><div class="empty" style="padding:56px 20px">
          <div class="e-ico">🔍</div><div class="e-title">请先搜索企业生成报告</div></div></div>`;
      } else if (c.id !== r.coId) {
        content = this.simpleHtml(c);
      } else {
        const secs = [
          ['s1', '1 · 企业画像'], ['s2', '2 · 核心竞争力'], ['s3', '3 · 研发投入'], ['s4', '4 · 股权投资机构'],
          ['s5', '5 · 行业竞品分析'], ['s6', '6 · 上下游客户分析'], ['s7', '7 · 股东信息'], ['s8', '8 · 财务分析'],
          ['s9', '9 · 舆情信息'], ['s10', '10 · 同业合作对比'], ['s11', '11 · 行内产品推荐'], ['s12', '12 · 营销指引'], ['s13', '13 · 行内信息整合'], ['s14', '14 · 企业发展情况']];
        content = `
        <div class="card card-pad mb4">
          <div class="flex-between wrap" style="gap:14px">
            <div class="flex" style="gap:14px">
              ${scoreRing(r.score, 40)}
              <div><div style="font-size:var(--fs-xl);font-weight:700;line-height:1.2">${esc(r.name.slice(0, 3) + '***' + r.name.slice(-6))}</div>
              <div class="flex mt1" style="gap:8px;align-items:center"><span class="tag tag-solid-red">AI评级 ${r.grade}</span><span class="text-xs text-muted">数据时点 ${r.date}</span>${srcTip('overview')}</div></div>
            </div>
            <div class="flex" style="gap:8px">
              <button class="btn btn-ghost" onclick="APP.toast('报告已导出为 PDF')">导出PDF</button>
              <button class="btn btn-primary" onclick="VIEWS.report.briefDlg('${c.id}')">📄 访前一页纸</button></div>
          </div></div>
        <div class="rpt-layout">
          <aside class="ns-side" style="position:sticky;top:80px">
            <div class="ns-g">报告模块</div>
            ${secs.map(([id, n]) => `<div class="ns-i" data-s="${id}">${n}</div>`).join('')}
            <div class="ns-g" style="margin-top:10px">快捷操作</div>
            <div class="ns-i" onclick="VIEWS.report.briefDlg('${c.id}')">📄 访前一页纸</div>
            <div class="ns-i" onclick="APP.toast('报告已导出为 PDF')">⬇ 导出PDF</div>
          </aside>
          <div>${this.sec1(r)}${this.sec2(r)}${this.sec3(r)}${this.sec4(r)}${this.sec5(r)}${this.sec6(r)}${this.sec7(r)}${this.sec8(r)}${this.sec9(r)}${this.secPeer(r)}${this.sec10(r)}${this.sec11(r)}${this.sec12(r)}${this.sec13(r)}</div>
        </div>`;
      }
      box.innerHTML = formHtml + content;
      const rsBtn = box.querySelector('#rptReSearch');
      if (rsBtn) rsBtn.onclick = () => { const f = box.querySelector('.rpt-form'); if (f) f.style.display = 'flex'; rsBtn.style.display = 'none'; };
      /* 搜索表单绑定（行业 + 模糊搜索 + 补充要求 → 生成） */
      const q = box.querySelector('#rptQ'), sug = box.querySelector('#rptSug');
      const usccOfD = co => { if (!co.uscc || co.uscc === '—') { const df = fnDemoFill(co); if (df && df.uscc) co.uscc = df.uscc; } return co.uscc || ''; };
      const fuzzy = (co, kw) => {
        const hay = co.name + co.short + co.seg + co.industry + usccOfD(co);
        const words = kw.split(/\s+/).filter(Boolean);
        if (words.every(w => hay.includes(w))) return true;
        return [...kw].every(ch => hay.includes(ch));
      };
      const bindRows = () => sug.querySelectorAll('[data-co]').forEach(s => {
        s.onmouseenter = () => s.style.background = 'var(--brand-50)';
        s.onmouseleave = () => s.style.background = '';
        s.onmousedown = () => { S._rptCoId = s.dataset.co; q.value = M().coById(s.dataset.co).short; F.kw = q.value.trim(); sug.style.display = 'none'; this.paintDetail(box); };
      });
      const rowHtml = x => `<div data-co="${x.id}" style="padding:8px 10px;border-radius:8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span class="text-sm" style="font-weight:600;color:var(--t1)">${esc(x.short)}</span>
          <span class="text-xs text-muted">${x.seg} · ${x.city || '无锡'}${S._rptCoId === x.id ? ' ✓' : ''}</span></div>`;
      const showSug = () => {
        F.kw = q.value.trim();
        if (!F.kw) {
          /* 无关键词：展示最近搜索历史，可下拉直接选择 */
          const hist = (S.rptHist || []).map(id => M().coById(id)).filter(Boolean);
          if (!hist.length) { sug.style.display = 'none'; sug.innerHTML = ''; return; }
          sug.innerHTML = `<div style="padding:4px 10px 6px;font-size:10.5px;color:var(--t3);display:flex;justify-content:space-between;align-items:center">
              <span>🕒 最近搜索</span><span id="rptHistClr" style="cursor:pointer;color:var(--brand-500)">清空</span></div>` +
            hist.map(rowHtml).join('');
          sug.style.display = 'block';
          bindRows();
          sug.querySelector('#rptHistClr').onclick = () => { S.rptHist = []; showSug(); };
          return;
        }
        const hits = rptCoPool(m).filter(x => fuzzy(x, F.kw)).slice(0, 8);
        if (!hits.length) { sug.style.display = 'none'; sug.innerHTML = ''; S._rptCoId = null; return; }
        sug.innerHTML = hits.map(rowHtml).join('');
        sug.style.display = 'block';
        bindRows();
      };
      
      q.oninput = () => { S._rptCoId = null; showSug(); };
      q.onfocus = showSug;
      q.onblur = () => setTimeout(() => { sug.style.display = 'none'; }, 200);
      const reqEl = box.querySelector('#rptReq'); if (reqEl) reqEl.oninput = () => { F.req = reqEl.value.trim(); };
      const supOpenBtn = box.querySelector('#rptSupOpenBtn'); if (supOpenBtn) supOpenBtn.onclick = () => { S._rptSupOpen = true; this.paintDetail(box); };
      const supCloseBtn = box.querySelector('#rptSupClose'); if (supCloseBtn) supCloseBtn.onclick = () => { S._rptSupOpen = false; this.paintDetail(box); };
      const fileBtn = box.querySelector('#rptFileBtn'); if (fileBtn) fileBtn.onclick = () => {
        const next = filePool.find(f => !F.files.includes(f)) || (filePool[F.files.length % filePool.length] + '（新）');
        F.files.push(next); toast('文件已上传，AI 解析完成');
        this.paintDetail(box);
      };
      box.querySelectorAll('[data-fdel]').forEach(x => x.onclick = () => { F.files.splice(+x.dataset.fdel, 1); this.paintDetail(box); });
      box.querySelector('#genRpt').onclick = () => {
        if (!S._rptCoId || !m.coById(S._rptCoId)) return toast('请从搜索下拉中选择企业', 'warn');
        sug.style.display = 'none';
        const mat = F.files.length ? `已解析附件 ${F.files.length} 个（${F.files.join('、')}）` : '';
        this.gen(S._rptCoId, F.req || '', mat);
      };
      q.addEventListener('keydown', e => { if (e.key === 'Enter') {
        if (!S._rptCoId && q.value.trim()) {
          const hits = rptCoPool(m).filter(x => fuzzy(x, q.value.trim()));
          if (hits.length) { S._rptCoId = hits[0].id; F.kw = hits[0].short; this.paintDetail(box); const b = box.querySelector('#genRpt'); if (b) setTimeout(() => b.click(), 80); return; }
        }
        box.querySelector('#genRpt').click();
      } });
      /* 左侧模块导航定位 */
      box.querySelectorAll('.ns-i[data-s]').forEach(el => el.onclick = () => {
        const t = box.querySelector('#' + el.dataset.s);
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        box.querySelectorAll('.ns-i[data-s]').forEach(x => x.classList.remove('on'));
        el.classList.add('on');
      });
    },
    sec(head, body, id) { return `<div class="rpt-sec" id="${id}"><div class="rs-head"><span class="rs-no">${(id.match(/\d+/) || [''])[0]}</span><span class="rs-title">${head}</span>${srcTip(id)}</div>${body}</div>`; },
    sec1(r) {
      return this.sec('企业画像', `
        <div class="kv-grid mb3">${r.profile.items.map(([k, v]) => kv(k, v)).join('')}</div>
        <div class="banner b-warn">风险提示概览：${r.profile.riskHints.map(h => `<span class="tag tag-orange" style="margin:0 4px">${h.t}（${h.lv}）</span>`).join('')} <span class="text-xs" style="opacity:.8">详见舆情信息与上下游客户分析板块</span></div>`, 's1');
    },
    sec2(r) {
      return this.sec('核心竞争力', `
        <div class="grid-2">${r.core.map(x => `
          <div class="card card-pad" style="box-shadow:none"><div class="flex-between mb2"><b>${x.dim}</b><span class="tag tag-green">${x.lvl}</span></div>
          <div class="text-sm text-sub" style="line-height:1.8">${esc(x.text)}</div>
          <div class="flex wrap mt3" style="gap:6px">${x.ev.map(e => `<span class="tag tag-line">📌 ${e}</span>`).join('')}</div></div>`).join('')}</div>
        <div class="mt4"><div class="text-sm" style="font-weight:600;margin-bottom:8px">专利累计数量（件）</div>${CH.bars({ labels: r.patents.labels, data: r.patents.data, unit: '' })}</div>`, 's2');
    },
    sec3(r) {
      const d = r.rd;
      return this.sec('研发投入', `
        <div class="grid-2">
          <div class="card card-pad" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:6px">研发费用（亿元）</div>${CH.line({ labels: d.fee.labels, series: [{ name: '研发费用', data: d.fee.data, color: '#2458F5' }], dots: true, h: 190 })}</div>
          <div class="card card-pad" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:6px">研发费用占比（%） vs 行业均值 ${d.ratio.avg}%</div>${CH.line({ labels: d.ratio.labels, series: [{ name: '研发占比', data: d.ratio.data, color: '#7C3AED' }], dots: true, h: 190, yFmt: v => v.toFixed(1) + '%' })}</div>
        </div>
        <div class="grid-4 mt3" style="grid-template-columns:repeat(4,1fr)">${kv('研发人员', d.staff + ' 人', '占比 ' + d.staffRatio)}${kv('专利年增速', '+41 件/年', '近三年')}${kv('研发资本化率', '18%', '低于30%警戒线')}${kv('在研项目', d.projects.length + ' 项', '合计预算2.7亿')}</div>
        <div class="card card-pad mt3" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:8px">在研项目</div>
          <table class="tbl"><thead><tr><th>项目</th><th>预算</th><th style="width:220px">进度</th><th>说明</th></tr></thead><tbody>
          ${d.projects.map(p => `<tr><td>${p.name}</td><td>${p.budget}</td><td><div class="mini-bar-wrap"><div class="mb"><i style="width:${p.progress}%;background:var(--brand-500)"></i></div><span class="text-xs">${p.progress}%</span></div></td><td class="text-sub text-sm">${p.note}</td></tr>`).join('')}</tbody></table></div>
        <div class="card card-pad mt3" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:8px">研发强度同行对比（研发费用占比 %）</div>${CH.hbars(d.peers, { unit: '%' })}</div>`, 's3');
    },
    sec4(r) {
      return this.sec('股权投资机构', `
        <div class="card card-pad mb3" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:12px">融资历程</div>
          <div class="timeline">${r.investors.rounds.map(x => `<div class="tl-item"><div class="tl-time">${x.date} · ${x.round}</div>
          <div class="tl-title">${x.amt} <span class="text-sub" style="font-weight:400">· ${esc(x.who)}</span></div><div class="tl-desc">${esc(x.note)}</div></div>`).join('')}</div></div>
        <div class="card card-pad mb3" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:8px">机构背景与质量</div>
          <table class="tbl"><thead><tr><th>机构</th><th>类型</th><th>持股</th><th>投资视角</th></tr></thead><tbody>
          ${r.investors.quality.map(q => `<tr><td><b>${q.name}</b></td><td><span class="tag tag-violet">${q.type}</span></td><td>${q.hold}</td><td class="text-sub text-sm">${esc(q.view)}</td></tr>`).join('')}</tbody></table></div>
        ${aiPanel('行业地位判断（AI 结论）', esc(r.investors.conclusion))}`, 's4');
    },
    sec5(r) {
      return this.sec('行业竞品分析', `
        <div class="card card-pad mb3" style="box-shadow:none"><table class="tbl"><thead><tr><th>企业</th><th>营收规模</th><th>技术能力</th><th>盈利</th><th>资本情况</th><th>行业排位</th></tr></thead><tbody>
        ${r.competitors.list.map(x => `<tr ${x.name.includes('本企业') ? 'style="background:var(--brand-50)"' : ''}><td><b>${esc(x.name)}</b></td><td>${x.scale}</td><td class="text-sm">${x.tech}</td><td>${x.fin}</td><td>${x.fund}</td><td>${x.rank}</td></tr>`).join('')}</tbody></table></div>
        <div class="grid-2"><div class="card card-pad" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:6px">五维竞争力雷达（满分100）</div>${CH.radar(r.competitors.radar)}</div>
        <div>${aiPanel('竞争格局判断', esc(r.competitors.note))}</div></div>`, 's5');
    },
    sec6(r) {
      const d = r.updown;
      return this.sec('上下游客户分析', `
        <div class="grid-2 mb3">
          <div class="card card-pad" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:8px">上游供应商结构（采购占比）</div>${CH.hbars(d.upstream.map(u => ({ name: u.n, v: u.pct, extra: u.ours ? '本行客户' : '' })), { unit: '%', color: 'var(--chart-sec)' })}</div>
          <div class="card card-pad" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:8px">下游客户结构（营收占比）</div>${CH.hbars(d.downstream.map(u => ({ name: u.n, v: u.pct, extra: u.ours ? '本行客户' : '' })), { unit: '%' })}</div>
        </div>
        <div class="grid-4 mb3" style="grid-template-columns:repeat(4,1fr)">${kv('第一大客户占比', d.cr.cr1 + '%')}${kv('CR5 集中度', d.cr.cr5 + '%', '偏高')}${kv('应收账款周转', d.account.receivable + ' 天', '行业均值 98 天')}${kv('应付账款周转', d.account.payable + ' 天')}</div>
        <div class="banner b-warn mb3">${esc(d.cr.warn)}</div>
        <div class="banner b-warn mb3">${esc(d.spread)}</div>
        <div class="banner b-note">${esc(d.account.note)}</div>`, 's6');
    },
    sec7(r) {
      return this.sec('股东信息', `
        <div class="card card-pad mb3" style="box-shadow:none"><table class="tbl"><thead><tr><th>股东</th><th>持股方式</th><th style="width:260px">持股比例</th><th>质押情况</th></tr></thead><tbody>
        ${r.holders.structure.map(h => `<tr><td><b>${esc(h.n)}</b>${h.n.includes('实际控制人') ? ' <span class="tag tag-violet">实控人</span>' : ''}</td><td class="text-sm">${esc(h.via)}</td>
          <td><div class="mini-bar-wrap"><div class="mb" style="flex:1"><i style="width:${h.pct}%;background:var(--brand-500)"></i></div><b class="fs-num text-sm">${h.pct}%</b></div></td>
          <td class="text-sm">${h.pledge ? `<span style="color:var(--warn-500)">${esc(h.pledge)}</span>` : '<span class="text-muted">—</span>'}</td></tr>`).join('')}</tbody></table></div>
        <div class="card card-pad" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:10px">股权变动记录</div>
          <div class="timeline">${r.holders.changes.map(x => `<div class="tl-item tl-warn"><div class="tl-time">${x.date}</div><div class="tl-title">${esc(x.t)}</div><div class="tl-desc">${esc(x.d)}</div></div>`).join('')}</div></div>`, 's7');
    },
    sec8(r) {
      const d = r.finance;
      return this.sec('财务分析', `
        <div class="grid-2 mb3">
          <div class="card card-pad" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:6px">营业收入（亿元）</div>${CH.line({ labels: d.rev.labels, series: [{ name: '营收', data: d.rev.data, color: '#2458F5' }], dots: true, h: 185 })}</div>
          <div class="card card-pad" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:6px">归母净利润（亿元）</div>${CH.line({ labels: d.profit.labels, series: [{ name: '净利润', data: d.profit.data, color: '#16A34A' }], dots: true, h: 185 })}</div>
        </div>
        <div class="grid-4 mb3">${d.metrics.map(g => `<div class="card card-pad" style="box-shadow:none;padding:13px"><div class="text-xs text-muted mb2" style="font-weight:600">${g.g}</div>
          ${g.items.map(([k, v, t]) => `<div class="flex-between mb2" style="gap:8px"><span class="text-xs text-sub">${k}</span><b class="text-sm fs-num" style="${t === 'warn' ? 'color:var(--warn-500)' : t === 'up' ? 'color:var(--ok-500)' : ''}">${v}</b></div>`).join('')}</div>`).join('')}</div>
        <div class="grid-2"><div class="card card-pad" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:8px">净利率同行对比（%）</div>${CH.hbars(d.vs, { unit: '%' })}</div>
        <div>${aiPanel('AI 财务结论', `<b style="color:var(--danger-500)">重点关注：</b>${esc(d.warn)}`)}</div></div>
        ${d.chk ? `<div class="card card-pad mt3" style="box-shadow:none;border-left:3px solid var(--warn-500);background:#FDF6EC">
          <div class="flex-between" style="margin-bottom:8px"><div class="text-sm" style="font-weight:600;color:var(--warn-500)">行内校验数据异常提示</div><span class="tag tag-orange" style="height:18px;font-size:10px;padding:0 6px">T+1跑批</span></div>
          ${d.chk.map(([k, pub, inn]) => `<div class="mb2" style="padding:9px 12px;background:#fff;border-radius:8px">
            <div class="flex-between" style="margin-bottom:5px"><b class="text-sm">${esc(k)}</b><span class="tag tag-orange" style="height:17px;font-size:10px;padding:0 5px">差异</span></div>
            <div class="flex" style="gap:10px;align-items:flex-start">
              <span class="text-xs text-sub" style="flex:1;line-height:1.6"><span class="tag tag-line" style="height:16px;font-size:10px;padding:0 5px;margin-right:6px;vertical-align:1px">公开</span>${esc(pub)}</span>
              <span class="text-xs" style="flex:1;line-height:1.6;font-weight:600;color:var(--danger-500)"><span class="tag tag-red" style="height:16px;font-size:10px;padding:0 5px;margin-right:6px;vertical-align:1px">行内</span>${esc(inn)}</span>
            </div></div>`).join('')}
        </div>` : ''}`, 's8');
    },
    sec9(r) {
      const d = r.sentiment;
      return this.sec('舆情信息', `
        <div class="grid-2">
          <div class="card card-pad" style="box-shadow:none">${CH.donut({ data: [{ name: '正面', v: d.pos, color: '#16A34A' }, { name: '中性', v: d.neu, color: '#C3CDDE' }, { name: '负面', v: d.neg, color: '#E5484D' }], center: d.pos + '%', sub: '正面占比' })}</div>
          <div>${d.items.map(x => `<div class="mb2" style="padding:10px 14px;border:1px solid var(--line);border-radius:10px">
            <div class="flex-between"><span class="tag ${x.s === '正面' ? 'tag-green' : x.s === '负面' ? 'tag-red' : 'tag-gray'}">${x.s}</span><span class="text-xs text-muted">${x.src} · ${x.d}</span></div>
            <div class="text-sm mt2">${esc(x.t)}</div></div>`).join('')}</div>
        </div>
        <div class="mt4">${aiPanel('AI 舆情结论', esc(d.note))}</div>`, 's9');
    },
    secPeer(r) {
      const d = r.peers;
      return this.sec('同业合作对比', `
        <div class="card card-pad mb3" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:8px">他行合作产品</div>
          <table class="tbl"><thead><tr><th>合作银行</th><th>合作产品</th><th>规模 / 额度</th><th>状态</th></tr></thead><tbody>
          ${d.banks.map(x => `<tr><td><b>${esc(x.bank)}</b></td><td class="text-sm">${esc(x.prods)}</td><td class="fs-num">${esc(x.amt)}</td><td>${x.st === '接触中' ? '<span class="tag tag-orange">接触中</span>' : '<span class="tag tag-green">存续</span>'}</td></tr>`).join('')}</tbody></table></div>
        <div class="card card-pad" style="box-shadow:none"><div class="flex" style="margin-bottom:8px;align-items:center"><div class="text-sm" style="font-weight:600">战略合作与同业动态</div>${srcTip('s10')}</div>
          <div class="timeline">${d.coop.map(x => `<div class="tl-item"><div class="tl-time">${x.d}</div><div class="tl-title">${esc(x.t)}</div><div class="tl-desc">${esc(x.x)}</div></div>`).join('')}</div></div>
        <div class="mt3">${aiPanel('同业竞争与切入判断（AI 结论）', esc(d.note))}</div>`, 's10');
    },
    sec10(r) {
      return this.sec('行内产品推荐', `
        ${r.products.map(p => `
          <div class="card card-pad mb3" style="box-shadow:none;${p.top ? 'border:1.5px solid var(--brand-500);background:linear-gradient(180deg,var(--brand-50),#fff 40%)' : ''}">
            <div class="flex-between mb2 wrap" style="gap:8px">
              <div class="flex" style="gap:10px">${p.top ? '<span class="tag tag-solid-red">主推</span>' : ''}<b style="font-size:var(--fs-lg)">${esc(p.name)}</b></div>
              <div class="flex" style="gap:8px"><span class="tag tag-violet">匹配度 ${p.match}%</span>${p.dedup ? '<span class="tag tag-green">已合作 · 交叉销售</span>' : ''}</div></div>
            <div class="grid-3 mt3">
              <div><div class="text-xs text-muted mb2" style="font-weight:600">为什么推荐（依据信号）</div>
                ${p.triggers.map(t => `<div class="flex mb2" style="gap:8px;align-items:flex-start"><span style="color:var(--warn-500)">📌</span><span class="text-sm">${esc(t)}</span></div>`).join('')}
                <div class="flex wrap mt2" style="gap:8px"><span class="tag tag-line">${esc(p.quota)}</span><span class="tag tag-line">${esc(p.term)}</span></div></div>
              <div><div class="text-xs text-muted mb2" style="font-weight:600">推荐理由</div>
                <div class="text-sm text-sub" style="line-height:1.8">${esc(p.why)}</div></div>
              <div><div class="text-xs text-muted mb2" style="font-weight:600">如何营销</div>
                <div class="text-sm text-sub" style="line-height:1.8">${esc(p.mkt || '')}</div></div>
            </div></div>`).join('')}`, 's11');
    },
    sec11(r) {
      const d = r.marketing;
      return this.sec('营销指引', `
        ${aiPanel('最佳介入时点与切入点', esc(d.entry))}
        <div class="card card-pad mt3" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:8px">话术要点</div>
            ${d.scripts.map((x, i) => `<div class="flex mb2" style="gap:8px;align-items:flex-start"><span class="rank-pill" style="background:var(--brand-100);color:var(--brand-600)">${i + 1}</span><span class="text-sm">${esc(x)}</span></div>`).join('')}</div>
        <div class="card card-pad mt3" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:10px">行内相似成功案例（已脱敏）</div>
          ${d.cases.map(x => `<div class="mb3" style="padding:12px 16px;border:1px dashed var(--line-strong);border-radius:10px">
            <div class="flex-between mb2"><b class="text-sm">${esc(x.name)}</b><span class="tag tag-green">参考度：${esc(x.fit)}</span></div>
            <div class="text-sm text-sub">方案：${esc(x.plan)}</div><div class="text-sm mt2" style="color:var(--ok-500)">成效：${esc(x.result)}</div></div>`).join('')}</div>
        <div class="card card-pad mt3" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:10px">建议营销步骤</div>
            <div class="timeline">${d.steps.map((x, i) => `<div class="tl-item"><div class="tl-time">Step ${i + 1}</div><div class="tl-desc" style="font-weight:600;color:var(--t1)">${esc(x)}</div></div>`).join('')}</div></div>`, 's12');
    },
    sec12(r) {
      const d = r.internal, fb = M().feedback;
      const taskLogs = (S.tasks || M().tasks).filter(t => t.cos.includes(r.coId)).flatMap(t => t.log.map(l => ({ d: l.d, t: l.t + '（' + t.ms + '）', x: l.x })));
      const extra = S.inputs.filter(x => x.co === r.coId).map(x => ({ d: x.date, t: x.type, x: x.content }));
      return this.sec('行内信息整合', `
        <div class="grid-4 mb3" style="grid-template-columns:repeat(4,1fr)">
          ${kv('行内客户', d.isClient ? '是' : '否', d.stage)}${kv('授信总额 / 已用', d.credit.total + ' / ' + d.credit.used + ' 亿元')}${kv('存款日均', d.credit.deposit + ' 亿元')}${kv('结算量', d.credit.settle + ' 亿元')}</div>
        <div class="card card-pad mb3" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:8px">已合作产品</div>
          ${d.done.map(x => `<div class="flex mb2" style="gap:8px"><span style="color:var(--ok-500)">✓</span><span class="text-sm">${esc(x)}</span></div>`).join('')}</div>
        <div class="card card-pad" style="box-shadow:none"><div class="flex-between mb3"><div class="text-sm" style="font-weight:600">历史营销记录 · 任务反馈 · 调研纪要</div>
          <button class="btn btn-sm btn-ghost" onclick="APP.go('funnel',{tab:'task'})">任务中补充反馈 →</button></div>
          <div class="timeline">${[...d.history, ...taskLogs.filter(l => !d.history.some(h => h.x === l.x)), ...extra].map(h => `<div class="tl-item"><div class="tl-time">${h.d} · ${h.t}</div><div class="tl-desc">${esc(h.x)}</div></div>`).join('')}</div>
          <div class="banner b-note mt3" style="padding:10px 14px"><b>下一步：</b>${esc(d.next)}</div>
          <div class="text-xs text-muted mt2">反哺效果：全行累计跟进反馈 ${fb.total} 条 · AI 采纳 ${fb.adopted} 条 · 已增强 ${fb.reports} 份报告，跟进信息持续修正推荐策略</div></div>`, 's13');
    },
    sec13(r) {
      const d = r.dev, blk = (t, x) => `<div class="card card-pad" style="box-shadow:none"><div class="text-sm" style="font-weight:600;margin-bottom:8px">${t}</div><div class="text-sm text-sub" style="line-height:1.9">${esc(x)}</div></div>`;
      return this.sec('企业发展情况', `
        <div class="grid-2 mb3">
          ${blk('企业在行业内的情况', d.pos)}
          ${blk('行业发展情况', d.indDev)}
          ${blk('公司核心竞争力', d.tech)}
          ${blk('公司业绩情况', d.perf)}
        </div>
        <div class="card card-pad mb3" style="box-shadow:none;border-left:3px solid var(--warn-500)"><div class="text-sm" style="font-weight:600;margin-bottom:8px">需要注意的风险点</div><div class="text-sm text-sub" style="line-height:1.9">${esc(d.risk)}</div></div>
        ${aiPanel('行业发展 AI 总结', esc(d.indAI))}`, 's14');
    },
    simpleHtml(c) {
      const mname = c.name.slice(0, 3) + '***' + c.name.slice(-6);
      return `
        <div class="banner b-warn mb3">「${esc(c.short)}」报告数据生成完善中，当前展示企业核心画像；完整14维报告示例请在上方搜索「晶汇封测」生成查看。</div>
        <div class="card card-pad mb4"><div class="flex" style="gap:14px">${scoreRing(c.score, 52)}
          <div><div style="font-size:var(--fs-2xl);font-weight:700">${esc(mname)}</div>
          <div class="flex mt2" style="gap:8px">${layerTag(c.layer)}${statusTag(c.status)}<span class="text-xs text-muted">数据时点 2026-09-28</span></div></div></div></div>
        ${this.sec('企业画像', `<div class="kv-grid mb3">${[['成立时间', c.reg], ['注册资本', c.cap], ['员工人数', c.emp], ['所在区域', c.zone], ['产业链环节', c.seg], ['资质', (c.qual || []).join(' · ') || '—']].map(([k, v]) => kv(k, esc(v))).join('')}</div>
          <div class="flex wrap" style="gap:6px">${(c.tags || []).map(t => `<span class="tag tag-blue">${t}</span>`).join('')}</div>`, 'ss1')}
        ${aiPanel('AI 总体评价（简版）', `<b>${esc(c.short)}</b>：${esc(c.recent)}。${c.ipo ? '资本进程：' + esc(c.ipo) + '。' : ''}${c.status === '本行已合作' ? '本行存量客户，建议关注交叉销售与额度优化机会。' : '建议结合政策匹配与资本动态择机介入。'}`)}
        <div class="card card-pad mt3"><div class="flex-between"><span class="text-sm text-sub">完整版包含：核心竞争力 / 研发投入 / 股权投资机构 / 竞品 / 上下游 / 股东 / 财务 / 舆情 / 同业对比 / 产品推荐 / 营销指引 / 行内整合 / 企业发展 共14维分析</span>
          <button class="btn btn-primary btn-sm" onclick="VIEWS.report.gen('JH')">查看完整版示例（晶汇封测）</button></div></div>`;
    },
    /* ---- 我的报告 ---- */
    paintMine(box) {
      const kindTag = k => k === '访后报告' ? 'tag-orange' : k === '产业链报告' ? 'tag-violet' : k === '企业研报' ? 'tag-cyan' : 'tag-blue';
      const nameOf = r => {
        if (r.kind === '产业链报告') return r.title ? r.title.replace('产业分析报告', '') : '集成电路';
        const c = M().coById(r.co); return c ? c.short : '—';
      };
      if (!S._mineFilter) S._mineFilter = { kw: '', kind: '全部' };
      const F = S._mineFilter;
      const kinds = ['全部', '企业报告', '产业链报告', '访后报告', '企业研报'];
      let filtered = S.rptMy.filter(r => {
        if (F.kind !== '全部' && (r.kind || '企业报告') !== F.kind) return false;
        if (F.kw) {
          const name = nameOf(r).toLowerCase();
          return name.includes(F.kw.toLowerCase());
        }
        return true;
      });
      box.innerHTML = `
        <div class="flex-between mb3" style="flex-wrap:wrap;gap:8px">
          <div class="flex" style="gap:8px;flex-wrap:wrap">
            <input id="mineKw" class="rf-ctl" placeholder="搜索企业名称" value="${esc(F.kw)}" style="width:200px;height:32px;padding:0 10px;font-size:var(--fs-sm)">
            <div class="flex" style="gap:4px">${kinds.map(k => `<button class="chip ${F.kind === k ? 'on' : ''}" data-kind="${k}">${k}</button>`).join('')}</div>
          </div>
        </div>
        <div class="card"><table class="tbl"><thead><tr><th>企业名称</th><th>报告类型</th><th>生成时间</th><th>生成人</th><th style="width:260px">操作</th></tr></thead><tbody>
        ${filtered.map((r, i) => { const idx = S.rptMy.indexOf(r); const c = r.kind === '产业链报告' ? null : M().coById(r.co); return `<tr>
          <td><b>${esc(nameOf(r))}</b> ${c ? layerTag(c.layer) : ''}</td>
          <td><span class="tag ${kindTag(r.kind || '企业报告')}">${r.kind || '企业报告'}</span></td>
          <td>${r.t}</td><td>${r.by}</td>
          <td>
            <button class="btn btn-text btn-sm" data-v="${idx}">查看</button>
            ${r.kind === '访后报告' ? `<button class="btn btn-text btn-sm" data-wd="${idx}">下载Word</button>` : r.kind === '产业链报告' ? `<button class="btn btn-text btn-sm" data-e="${idx}">导出</button>` : r.kind === '企业研报' ? `<button class="btn btn-text btn-sm" data-e="${idx}">导出PDF</button>` : `<button class="btn btn-text btn-sm" data-bf="${idx}">访前一页纸</button><button class="btn btn-text btn-sm" data-e="${idx}">导出PDF</button>`}
            <button class="btn btn-text btn-sm" style="color:var(--danger-500)" data-d="${idx}">删除</button>
          </td></tr>`; }).join('') ||
        '<tr><td colspan="5"><div class="empty"><div class="e-ico">📄</div><div class="e-title">暂无报告</div></div></td></tr>'}</tbody></table></div>`;
      const kw = box.querySelector('#mineKw');
      kw.oninput = () => { F.kw = kw.value; this.paintMine(box); };
      box.querySelectorAll('[data-kind]').forEach(c => c.onclick = () => { F.kind = c.dataset.kind; this.paintMine(box); });
      box.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
        const r = S.rptMy[+b.dataset.v];
        if (r.kind === '访后报告') { S._visitId=r.id; S.params.tab='visit'; this.render(document.querySelector('#viewRoot')); return; }
        if (r.kind === '产业链报告') { S._chainView = 'report'; S._chainSel = '集成电路与电子材料'; S.params.tab = 'chain'; this.render(document.querySelector('#viewRoot')); return; }
        if (r.kind === '企业研报') { S._rschCo = r.co; S.params.tab = 'research'; this.render(document.querySelector('#viewRoot')); return; }
        S.reportCo = r.co; S.params.tab = 'detail'; this.render(document.querySelector('#viewRoot'));
      });
      box.querySelectorAll('[data-bf]').forEach(b => b.onclick = () => this.briefDlg(S.rptMy[+b.dataset.bf].co));
      box.querySelectorAll('[data-e]').forEach(b => b.onclick = () => toast('报告已导出为 PDF'));
      box.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => {
        const r = S.rptMy[+b.dataset.wd];
        const full = (S.visitReports || []).find(x => x.id === r.id);
        if (full && VIEWS.visitReport) VIEWS.visitReport.downloadWord(full);
        else toast('未找到访后报告正文，请重新打开后再下载', 'warn');
      });
      box.querySelectorAll('[data-d]').forEach(b => b.onclick = () => confirmDlg('确定删除该报告？删除后不可恢复。', () => {
        const r = S.rptMy.splice(+b.dataset.d, 1)[0];
        if (r.kind === '访后报告' && S.visitReports) S.visitReports = S.visitReports.filter(x => x.id !== r.id);
        toast(`已删除「${nameOf(r)}」的报告`); this.render(document.querySelector('#viewRoot'));
      }));
    },
    /* ---- 企业研报（投资机构视角） ---- */
    paintResearch(box) {
      const m = M();
      if (S._rschCo && !m.coById(S._rschCo)) S._rschCo = null;
      const c = S._rschCo ? m.coById(S._rschCo) : null;
      const F = S._rschForm = S._rschForm || { kw: '' };
      /* 统一社会信用代码检索：漏斗池(F开头)企业 uscc 由 fnDemoFill 确定性补齐 */
      const usccOf = co => { if (!co.uscc || co.uscc === '—') { const df = fnDemoFill(co); if (df && df.uscc) co.uscc = df.uscc; } return co.uscc || ''; };
      /* 研报数据：朗新/晶汇封测完整示例；其余企业按四维评分确定性生成演示数据（未选企业时跳过） */
      const d = !c ? null : (() => {
        if (c.id === 'F159' || (c.name || '').indexOf('朗新') >= 0) return {
          ts: '2026-10-29',
          rating: 'B+ · 关注2027扭亏兑现', tgt: '市值 85～105亿（PS 1.9～2.3x）', cagr: '8%～12%', gpm: '29%～32%', npm: '扭亏后 3%～5%',
          pts: [['赛道β', '"十五五"市场化交易电量占比约70%，交易放量+充电倍增+虚拟电厂三线叠加，能源数字化从项目型软件转向"交易+运营"'],
            ['公司α', '电力营销2.0覆盖31省/2.7亿+终端，缴费5亿+用户，新电途1800万+注册/充电量75亿度(+65%)，虚拟电厂接入25GW——"负荷聚合→充电→交易→优化"闭环稀缺'],
            ['拐点观察', '2026电力交易合约性亏损2.68亿（Q1-3归母-2.68亿），交易电量5倍增长至150亿度；2027年度合约重签是扭亏第一信号'],
            ['估值判断', 'PB 1.42、PE(TTM)为负，年初至今股价-43.9%已较充分定价亏损；2027扭亏确认+虚拟电厂商业化=估值修复双击窗口']],
          tam: [['电力市场化交易', '"十五五"市场化交易电量占比约70%，交易服务/结算系统与辅助决策需求放量', '+25% CAGR'], ['聚合充电生态', '充电设施"三年倍增"——2027年底2800万个、拉动投资2000亿+，聚合平台卡位流量入口', '+30% CAGR'], ['虚拟电厂', '2025年项目470个/调节能力1685万kW(+70%)，市场约百亿，2030年有望破千亿', '+40% CAGR']],
          drivers: '电力市场化把朗新从项目型软件商推向"交易+运营"角色（交易电量150亿度）；充电"三年倍增"放大新电途流量与运营价值；虚拟电厂政策常态化打开聚合运营收入空间——三线叠加决定收入弹性，波动也随交易敞口放大。',
          comps: [['远光软件', 'A股上市', '39.5亿', '+20.5%', 'PS 4.2x', '电力ERP龙头，国资云背景'], ['东方电子', 'A股上市', '52.3亿', '+7.8%', 'PS 2.1x', '电网自动化老牌，增长平稳'], ['国能日新', 'A股上市', '4.8亿', '+25%', 'PS 7.5x', '电力交易辅助决策稀缺标的'], ['朗新科技（本企业）', '创业板300682', '45.17亿', '-5.9%', 'PS 2.0x / PB 1.42', '亏损压制估值，扭亏即修复']],
          fin: [['2025A', '45.17亿', '+2.5%', '30.6%', '2.4%'], ['2026E', '46.0亿', '+1.8%', '29.4%', '-5.8%（亏2.68亿）'], ['2027E', '50.6亿', '+10%', '30.5%', '3.0%'], ['2028E', '56.7亿', '+12%', '31.2%', '4.5%']],
          rounds: [['IPO上市', '2017', '首发募资', '—', '深交所创业板(300682)'], ['重大资产重组', '2020', '发行股份收购核心资产', '—', '能源互联网业务整体注入'], ['战略入股', '2020', '云鑫创投（蚂蚁集团）', '—', '受让成为第二大股东（14.5%）'], ['当前市值', '2026-11', '收盘价 8.40 元', '90.6亿', 'PB 1.42 ｜ PE(TTM)为负']],
          holders: '创始团队及一致行动人为控股股东；第二大股东云鑫创投（蚂蚁集团）持股14.5%——背书强但质押/减持并存，是股价与信用观察点；合作银行15+家，授信格局分散；35维风险扫描28项为零（无失信/被执行/行政处罚）。',
          team: [['副董事长 · 总经理', '彭知平——战略层对话对象：华为合作、海外拓展、电力交易布局'], ['董事会秘书', '王慎勇（任职13年+）——对外信息与授信框架的统一接口人'], ['财务总监', '鲁清芳（任职10年+）——资金安排、保函/流贷需求与应收回款的实际决策参与者'], ['股权与治理', '蚂蚁集团（云鑫）14.5%为第二大股东；利润集中Q4确认，现金流季节性强']],
          hls: [['双入口卡位', 'G端：营销2.0核心系统31省/2.7亿+终端；C端：缴费5亿+用户、日活近2000万'], ['闭环壁垒', '"负荷聚合→充电服务→电力交易→能源优化"场景稀缺；虚拟电厂25GW接入'], ['AI+海外', '"朗新九功"AI能源大模型（昇腾底座/华为生态签约）；海外10余国交付（尼泊尔全国电力营销系统约1000万美元）'], ['交易放量', '电力交易电量5倍增长至150亿度；蚂蚁集团14.5%二股东生态背书']],
          risks: [['电力交易亏损', '2026合约性亏损2.68亿；现货价格波动直接冲击盈亏，2027合约重签是扭亏关键'], ['应收占款', '应收周转257天、占款约20亿+；债务人多为电网省级公司资质优，但占用营运资金'], ['股价与质押链', '年初至今-43.9%（52周8.16–20.36），PE(TTM)为负；股东质押/减持与股价回撤形成传导压力'], ['现金流波动', '2025经营现金流+4.78亿 → 2026Q1-3 -4.15亿；收入与回款集中Q4，季节性强']],
          path: [['2026-Q4', '利润与回款确认旺季，全年亏损收敛情况验证；新耀5亿分离式保函落地'], ['2027-H1', '电力交易年度合约重签落地——扭亏路径确认的第一信号'], ['2027', '虚拟电厂聚合商业化(25GW)与充电运营放量，第二曲线收入兑现'], ['2028E', '"交易+运营"模式定型，估值向电力信息化可比公司中枢修复']],
          bank: '新耀5亿分离式保函（需求已公告）是最佳首单——邦道担保+项目收费权质押缓释；应收257天对应电网应收保理/票据池（债务人可确权为国网/南网省级公司）；电力交易专项流贷（扭亏挂钩定价）+跨境结算主户（海外10余国）构成综合方案；Q4是授信落地黄金窗口，建议2026年内落地3年期授信框架。',
        };
        if (c.id === 'JH') return {
          ts: '2026-09-28',
          rating: 'A · 建议积极关注', tgt: '45～54亿元（PS 4.9～5.9x）', cagr: '25%～30%', gpm: '24%～26%', npm: '11%～13%',
          pts: [['赛道β', '先进封装2026-2028年CAGR约21%，Chiplet国产替代处于0→1窗口期'],
            ['公司α', '成长性（营收+28% vs 行业+9%）与盈利质量（净利率12.2% vs 行业8.5%）显著跑赢同业'],
            ['订单验证', '在手订单覆盖4个季度产能，两家头部设计客户3年框架协议锁定基本盘'],
            ['估值判断', '可比公司法给出45～54亿区间，IPO发行价预计锚定区间下沿，上市后6-12个月存在修复空间']],
          tam: [['中国先进封装市场', '2026年约1,310亿元，2028年预计突破1,900亿元', '+21% CAGR'], ['全球SiP/模组类封装', '约86亿美元，AI终端与射频驱动持续扩容', '+17% CAGR'], ['Chiplet生态（国产）', '2028年国内约300亿元，国产替代窗口期', '+35% CAGR']],
          drivers: 'AI算力芯片向2.5D/3D先进封装迁移、国产设计公司Fabless化带动封测外包比例提升、汽车电子（座舱/智驾）放量带来车规封测长单，三条主线共同支撑赛道景气。',
          comps: [['长电科技', 'A股上市', '312.0亿', '+11%', 'PS 1.6x', '全球封测头部，估值锚'], ['华宇封测', 'A股上市', '38.0亿', '+9%', 'PS 2.1x', '规模龙头，2.5D/3D量产成熟'], ['晶汇封测（本企业）', 'IPO已受理', '9.2亿', '+28%', 'PS 3.0～3.6x', '成长性与盈利质量溢价'], ['金桥封测', '新三板', '6.8亿', '+6%', 'PS 1.2x', '传统封装为主，流动性折价']],
          fin: [['2024A', '7.2亿', '+18.0%', '23.1%', '10.8%'], ['2025A', '9.2亿', '+28.4%', '24.6%', '12.2%'], ['2026E', '12.1亿', '+31.5%', '25.2%', '12.5%'], ['2027E', '15.6亿', '+28.9%', '25.8%', '13.0%'], ['2028E', '20.1亿', '+28.8%', '26.2%', '13.4%']],
          rounds: [['A轮', '2018-06', '8,000万元', '5.0亿', '国科投资（领投）'], ['B轮', '2020-09', '2.0亿元', '14亿', '中芯聚源（领投）'], ['B+轮', '2022-03', '3.5亿元', '28亿', '毅达资本（领投）'], ['C轮', '2024-11', '5.0亿元', '45亿', '大基金三期（领投）']],
          holders: '创始团队及一致行动人合计持股46.2%；机构股东：大基金三期18.5%、中芯聚源9.2%、毅达资本7.1%、国科投资5.5%；员工持股平台6.8%。IPO申报前无执行中的对赌回购条款，股权结构清晰。',
          team: [['实际控制人 / 创始人', '董事长兼总经理，20年封测行业经验，曾任华宇封测运营副总裁'], ['CTO', '前长电科技先进封装研发负责人，2.5D/3D工艺专家'], ['CFO', '注册会计师，主导两轮股权融资与IPO申报'], ['治理结构', '董事会7席（创始团队4席、机构3席），近三年无治理僵局与诉讼记录']],
          hls: [['卡位Chiplet国产化', '2.5D中试线已通线，国内少数具备Chiplet量产过渡能力的独立封测厂'], ['成长确定性强', '在手订单覆盖未来4个季度产能，两家头部设计客户签订3年框架协议'], ['盈利质量优', '净利率12.2%高于行业均值3.7pct，经营性现金流连续3年为正'], ['资本路径清晰', '科创板IPO已受理，预计募资22亿元扩产2.5D/3D产线']],
          risks: [['客户集中度', '前五大客户收入占比68%，头部客户砍单将直接冲击营收'], ['技术路线迭代', 'Chiplet若转向混合键合路线，现有中试线设备面临二次投入'], ['资本开支压力', 'IPO前扩产依赖债务融资，资产负债率已升至58%'], ['估值消化风险', '上市进度不及预期时，一级市场估值存在倒挂可能']],
          path: ['2026-09 科创板IPO受理', '2027-H1 过会并发行（预计募资22亿）', '2027-H2 2.5D/3D扩产线投产', '2028E 营收突破20亿，进入国内封测前六'],
          bank: 'IPO募资账户监管与资金托管是天然切入点；扩产期设备融资租赁、并购贷可与大基金形成投贷联动；上市后募集资金沉淀带来主结算行谈判窗口。',
        };
        const sc = c.score || 68, rev = 3 + sc % 7;
        const A = sc >= 85 ? 'A · 建议积极关注' : sc >= 72 ? 'B+ · 建议关注' : 'B · 持续观察';
        const g = 18 + sc % 12;
        const escD = s => esc(String(s == null ? '' : s));
        const f1 = (rev / 1.28).toFixed(1), f2 = rev.toFixed(1), f3 = (rev * 1.29).toFixed(1), f4 = (rev * 1.66).toFixed(1), f5 = (rev * 2.14).toFixed(1);
        return {
          ts: '2026-09-28',
          rating: A, tgt: `${(rev * 3).toFixed(0)}～${(rev * 3.7).toFixed(0)}亿元（PS 3.0～3.7x）`, cagr: `18%～${g + 6}%`, gpm: `21%～${21 + sc % 5}%`, npm: `${7 + sc % 3}%～${8 + sc % 5}%`,
          pts: [['赛道β', `${escD(c.industry || '所属产业')}景气度向上，细分环节国产替代加速`],
            ['公司α', `四维评分${sc}分，成长性与客户结构优于同业均值`],
            ['订单验证', c.opp ? `机会区域落地：${escD(c.opp)}，区域产能与订单可交叉验证` : '在手订单覆盖未来12个月产能需求'],
            ['估值判断', `可比公司法给出${(rev * 3).toFixed(0)}～${(rev * 3.7).toFixed(0)}亿区间，Pre-IPO轮估值处于区间中位`]],
          tam: [[escD(c.industry || '集成电路与电子材料') + '（国内）', '市场空间与国产替代双轮驱动，细分环节扩容快于整体', '+15% CAGR'], [escD(c.seg || '细分环节') + '细分市场', '头部客户渗透率提升，外包比例持续上行', '+18% CAGR'], ['下游新兴应用', '新能源车 / AI终端 / 算力基建带来增量需求', '+22% CAGR']],
          drivers: `${escD(c.short)}所处的${escD(c.seg || c.industry || '细分')}环节受益于国产替代与下游新兴应用放量，行业景气向上；企业自身凭借${sc >= 80 ? '技术卡位与头部客户绑定' : '性价比与快速响应'}获取超额增速。`,
          comps: [['行业龙头', 'A股上市', `${(rev * 4).toFixed(1)}亿`, '+10%', 'PS 1.8x', '规模龙头，估值锚'], ['同业可比公司A', 'IPO申报中', `${(rev * 1.5).toFixed(1)}亿`, '+16%', 'PS 2.6x', '同赛道直接可比'], [escD(c.short) + '（本企业）', 'Pre-IPO', `${f2}亿`, `+${g}%`, 'PS 3.0～3.7x', '成长性溢价'], ['区域同业B', '新三板', `${(rev * 0.8).toFixed(1)}亿`, '+6%', 'PS 1.2x', '流动性折价']],
          fin: [['2024A', `${f1}亿`, `+${g - 6}%`, `${20 + sc % 4}.0%`, `${8 + sc % 3}.0%`], ['2025A', `${f2}亿`, `+${g}%`, `${21 + sc % 4}.4%`, `${9 + sc % 3}.2%`], ['2026E', `${f3}亿`, '+29%', `${21 + sc % 4}.8%`, `${9 + sc % 3}.6%`], ['2027E', `${f4}亿`, '+28%', `${22 + sc % 4}.2%`, `${10 + sc % 3}.0%`], ['2028E', `${f5}亿`, '+29%', `${22 + sc % 4}.6%`, `${10 + sc % 3}.4%`]],
          rounds: [['天使轮', '2017-03', '2,000万元', '1.2亿', '天使投资基金'], ['A轮', '2019-08', '8,000万元', '5亿', '区域产业基金（领投）'], ['B轮', '2022-05', '2.5亿元', '18亿', '产业资本（领投）'], ['C轮', '2025-06', '4.0亿元', `${(rev * 3).toFixed(0)}亿`, '国家级产业基金（领投）']],
          holders: `创始团队及一致行动人合计持股50%以上；机构股东合计约${35 - sc % 10}%；员工持股平台约7%。股权结构清晰，无执行中的对赌回购条款。`,
          team: [['实际控制人 / 创始人', '董事长兼总经理，行业经验15年以上，技术出身'], ['核心技术团队', '来自行业头部厂商，覆盖研发 / 工艺 / 质量关键岗位'], ['CFO', '主导历轮股权融资与上市筹备'], ['治理结构', '董事会创始团队与机构股东席位数均衡，近三年无重大治理事件']],
          hls: [['细分环节卡位', `${escD(c.seg || c.industry || '细分')}环节区域内领先，客户结构优质`], ['成长确定性强', `四维评分${sc}分${c.opp ? '，机会区域：' + escD(c.opp) : ''}，在手订单支撑未来12个月增长`], ['盈利质量改善', '毛利率与净利率稳中有升，经营性现金流为正'], ['资本路径清晰', '已启动上市辅导，预计两年内申报']],
          risks: [['客户集中度', '前五大客户收入占比偏高，头部客户砍单直接冲击营收'], ['技术路线迭代', '下游技术路线切换时现有产能面临二次投入'], ['资本开支压力', '扩产期依赖债务融资，资产负债率上行'], ['估值消化风险', '上市进度不及预期时，一级市场估值存在倒挂可能']],
          path: ['当期：股份制改造与上市辅导', 'T+1年：申报材料受理', 'T+2年：过会并发行', 'T+3年：募投项目落地，进入下一成长曲线'],
          bank: '上市前以"股权融资对接 + 上市贷"切入，锁定成长期资金需求；扩产期设备融资租赁与项目贷可与产业基金投贷联动；上市后募资账户监管与现金管理带来主结算行机会。',
        };
      })();
      const secs = [['r1', '1 · 投资要点'], ['r2', '2 · 赛道与市场空间'], ['r3', '3 · 竞争格局与可比估值'], ['r4', '4 · 财务表现与预测'], ['r5', '5 · 融资历史与股权'], ['r6', '6 · 团队与治理'], ['r7', '7 · 投资亮点'], ['r8', '8 · 风险提示'], ['r9', '9 · 资本路径与银行协同']];
      const sec = (no, t) => `<div class="rpt-sec" id="r${no}"><div class="rs-head"><span class="rs-no">${no}</span><span class="rs-title">${t}</span></div>`;
      const formHtml = `
        <div class="rpt-form mb4" id="rschForm" style="flex-direction:column;align-items:stretch;gap:10px;display:${c ? 'none' : 'flex'}">
          <div class="flex" style="gap:10px">
            <div style="position:relative;flex:1;min-width:260px">
              <input id="rschQ" class="rf-ctl" placeholder="企业名称 / 统一社会信用代码 · 支持模糊搜索，如：晶汇封测 / 晶封" autocomplete="off" value="${esc(F.kw)}" style="width:100%">
              <div id="rschSug" style="display:none;position:absolute;top:40px;left:0;width:100%;background:#fff;border-radius:10px;box-shadow:0 14px 36px rgba(0,0,0,.22);padding:6px;z-index:40"></div>
            </div>
            <button class="btn" id="rschGen" style="background:#C0202C;color:#fff;font-weight:700;flex-shrink:0">生成研报</button>
          </div>
        </div>`;
      let body = '';
      if (!c) {
        body = `<div class="card"><div class="empty" style="padding:56px 20px"><div class="e-ico">🔍</div><div class="e-title">请先搜索企业生成研报</div></div></div>`;
      } else {
        body = `
        <div class="card card-pad mb4">
          <div class="flex-between wrap" style="gap:12px">
            <div class="flex" style="gap:14px;align-items:center">
              ${scoreRing(c.score || 75, 40)}
              <div><div style="font-size:var(--fs-xl);font-weight:700;line-height:1.2">${esc(c.short)} · 企业研报</div>
              <div class="flex mt1" style="gap:8px;align-items:center;flex-wrap:wrap"><span class="tag tag-solid-red">投资评级 ${esc(d.rating)}</span><span class="text-xs text-muted">数据时点 ${d.ts || '2026-09-28'}</span><span class="src-tip">来源<span class="src-pop" style="left:0;right:auto"><span class="sp-t text-sm">数据来源</span><span class="sp-l text-xs text-sub">· 企业公开披露信息与工商登记　截至2026-09</span><span class="sp-l text-xs text-sub">· 一级市场融资数据库（Wind / IT桔子）　截至2026-09</span><span class="sp-l text-xs text-sub">· 行业协会白皮书与券商可比公司研报　2026-08</span><span class="sp-l text-xs text-sub">· 在手订单与产能验证（企业调研）　2026-09</span></span></span></div></div>
            </div>
            <div class="flex" style="gap:8px">
              <button class="btn btn-ghost" id="rschRe">检索其他企业</button>
              <button class="btn btn-ghost" id="rschDl">导出PDF</button></div>
          </div>
          <div class="text-xs text-muted mt2" style="line-height:1.7">研究视角：投资机构（股权投资） ｜ 估值方法：可比公司法 + 在手订单交叉验证 ｜ ${esc(c.name)}</div>
        </div>
        <div class="rpt-layout">
          <aside class="ns-side" style="position:sticky;top:80px">
            <div class="ns-g">报告模块</div>
            ${secs.map(([id, n]) => `<div class="ns-i" data-rs="${id}">${n}</div>`).join('')}
            <div class="ns-g" style="margin-top:10px">快捷操作</div>
            <div class="ns-i" id="rschDl2">导出PDF</div>
          </aside>
          <div>
        ${sec(1, '投资要点')}
          <div class="kv-grid mb3" style="grid-template-columns:repeat(4,1fr);gap:10px">
            ${[['目标估值区间', d.tgt], ['预计营收CAGR（3年）', d.cagr], ['毛利率中枢', d.gpm], ['净利率中枢', d.npm]].map(([k, v]) => `<div class="kv"><div class="kv-k">${k}</div><div class="kv-v" style="font-size:13px;font-weight:700">${v}</div></div>`).join('')}
          </div>
          ${d.pts.map(([t, x]) => `<div class="flex mb2" style="gap:8px;align-items:flex-start"><span class="rank-pill" style="background:var(--brand-100);color:var(--brand-600);flex-shrink:0">•</span><span class="text-sm text-sub" style="line-height:1.8"><b>${t}</b> · ${x}</span></div>`).join('')}</div>
        ${sec(2, '赛道与市场空间')}
          <div class="grid-3 mb3" style="gap:10px">
            ${d.tam.map(([t, x, g2]) => `<div style="padding:12px 14px;background:#F8FAFD;border-radius:8px"><div class="flex-between"><b class="text-sm">${t}</b><span class="tag tag-green" style="height:20px;font-size:10px;flex-shrink:0">${g2}</span></div><div class="text-xs text-sub mt2" style="line-height:1.7">${x}</div></div>`).join('')}
          </div>
          <div class="banner b-note">核心增长驱动：${d.drivers}</div></div>
        ${sec(3, '竞争格局与可比估值')}
          <table class="tbl"><thead><tr><th>公司</th><th>资本阶段</th><th>营收（2025）</th><th>增速</th><th>估值水平</th><th>备注</th></tr></thead><tbody>
          ${d.comps.map(r => { const self = r[0].indexOf('本企业') >= 0; return `<tr ${self ? 'style="background:var(--brand-50)"' : ''}><td><b class="text-sm">${r[0]}</b></td><td class="text-xs text-sub">${r[1]}</td><td class="text-xs text-sub">${r[2]}</td><td class="text-xs" style="color:var(--ok-500)">${r[3]}</td><td class="text-xs" style="font-weight:700;color:${self ? 'var(--brand-600)' : 'var(--t1)'}">${r[4]}</td><td class="text-xs text-sub">${r[5]}</td></tr>`; }).join('')}</tbody></table>
          <div class="text-xs text-muted mt2">估值方法：可比公司法（PS倍数区间） + 最近一轮融资估值交叉验证</div></div>
        ${sec(4, '财务表现与预测')}
          <table class="tbl"><thead><tr><th>年度</th><th>营业收入</th><th>同比增速</th><th>毛利率</th><th>净利率</th></tr></thead><tbody>
          ${d.fin.map(r => `<tr><td><b class="text-sm">${r[0]}</b>${r[0].indexOf('E') > 0 ? ' <span class="tag tag-blue" style="height:17px;font-size:9px;padding:0 4px">预测</span>' : ''}</td><td class="text-xs text-sub">${r[1]}</td><td class="text-xs" style="color:var(--ok-500)">${r[2]}</td><td class="text-xs text-sub">${r[3]}</td><td class="text-xs text-sub">${r[4]}</td></tr>`).join('')}</tbody></table>
          <div class="text-xs text-muted mt2">口径说明：A为审计/披露口径，E为投资机构预测口径；预测基于在手订单、产能爬坡与客户框架协议。</div></div>
        ${sec(5, '融资历史与股权')}
          <table class="tbl"><thead><tr><th>轮次</th><th>时间</th><th>金额</th><th>投后估值</th><th>领投方</th></tr></thead><tbody>
          ${d.rounds.map(r => `<tr><td><b class="text-sm">${r[0]}</b></td><td class="text-xs text-sub">${r[1]}</td><td class="text-xs text-sub">${r[2]}</td><td class="text-xs" style="font-weight:700">${r[3]}</td><td class="text-xs text-sub">${r[4]}</td></tr>`).join('')}</tbody></table>
          <div class="text-sm text-sub mt3" style="line-height:1.8"><b>股权结构：</b>${d.holders}</div></div>
        ${sec(6, '团队与治理')}
          <div class="grid-2" style="gap:8px">${d.team.map(([t, x]) => `<div style="padding:10px 12px;background:#F8FAFD;border-radius:8px"><b class="text-sm">${t}</b><div class="text-xs text-sub mt1" style="line-height:1.7">${x}</div></div>`).join('')}</div></div>
        ${sec(7, '投资亮点')}
          <div class="grid-2" style="gap:8px">${d.hls.map(([t, x], i) => `<div style="padding:10px 12px;background:var(--brand-50);border-radius:8px"><b class="text-sm" style="color:var(--brand-600)">亮点${i + 1} · ${t}</b><div class="text-xs text-sub mt1" style="line-height:1.7">${x}</div></div>`).join('')}</div></div>
        ${sec(8, '风险提示')}
          <table class="tbl"><thead><tr><th style="width:160px">风险类型</th><th>主要表现</th></tr></thead><tbody>
          ${d.risks.map(r => `<tr><td><b class="text-sm">${r[0]}</b></td><td class="text-xs text-sub" style="line-height:1.7">${r[1]}</td></tr>`).join('')}</tbody></table></div>
        ${sec(9, '资本路径与银行协同')}
          <b class="text-sm mb2" style="display:block">资本路径推演</b>
          <div class="mb3">${d.path.map((x, i) => `<div class="flex mb2" style="gap:10px;align-items:flex-start"><span class="rank-pill" style="background:#F0F2F7;color:var(--t3);flex-shrink:0">${i + 1}</span><span class="text-sm text-sub" style="line-height:1.8">${x}</span></div>`).join('')}</div>
          <b class="text-sm mb2" style="display:block">银行协同视角（投贷联动）</b>
          <div class="banner b-note" style="line-height:1.9">${d.bank}</div></div>
          </div>
        </div`;
      }
      box.innerHTML = formHtml + body;
      const dlB = box.querySelector('#rschDl'), dlB2 = box.querySelector('#rschDl2');
      if (dlB) dlB.onclick = () => toast('研报已导出为 PDF');
      if (dlB2) dlB2.onclick = () => toast('研报已导出为 PDF');
      const re = box.querySelector('#rschRe');
      if (re) re.onclick = () => { const f = box.querySelector('#rschForm'); if (f) f.style.display = 'flex'; re.style.display = 'none'; const q0 = box.querySelector('#rschQ'); if (q0) q0.focus(); };
      const q = box.querySelector('#rschQ'), sug = box.querySelector('#rschSug');
      const fuzzy = (co, kw) => {
        const hay = co.name + co.short + co.seg + co.industry + usccOf(co);
        const words = kw.split(/\s+/).filter(Boolean);
        if (words.every(w => hay.includes(w))) return true;
        return [...kw].every(ch => hay.includes(ch));
      };
      if (q && sug) {
        const bindRows = () => sug.querySelectorAll('[data-co]').forEach(s => {
          s.onmouseenter = () => s.style.background = 'var(--brand-50)';
          s.onmouseleave = () => s.style.background = '';
          s.onmousedown = () => { S._rschCo = s.dataset.co; F.kw = m.coById(s.dataset.co).short; this.paintResearch(box); };
        });
        const rowHtml = x => `<div data-co="${x.id}" style="padding:8px 10px;border-radius:8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span class="text-sm" style="font-weight:600;color:var(--t1)">${esc(x.short)}</span>
          <span class="text-xs text-muted">${x.seg} · ${x.city || '无锡'}</span></div>`;
        q.oninput = () => {
          F.kw = q.value.trim();
          const hits = F.kw ? rptCoPool(m).filter(x => fuzzy(x, F.kw)).slice(0, 8) : [];
          if (!hits.length) { sug.style.display = 'none'; sug.innerHTML = ''; return; }
          sug.innerHTML = hits.map(rowHtml).join('');
          sug.style.display = 'block'; bindRows();
        };
        q.onblur = () => setTimeout(() => { sug.style.display = 'none'; }, 160);
      }
      const gb = box.querySelector('#rschGen');
      if (gb) gb.onclick = () => {
        const kw = (F.kw || '').trim();
        if (!kw) { toast('请输入企业名称', 'warn'); return; }
        const P = rptCoPool(m);
        const target = P.find(x => x.short === kw || x.name === kw) || P.find(x => fuzzy(x, kw));
        if (!target) { toast('未匹配到企业，请调整关键词后重试', 'warn'); return; }
        openModal({ small: true, title: `正在生成研报 · ${esc(target.short)}`, body: `
          <div style="padding:10px 4px">${['采集公开披露 / 一级市场融资 / 可比公司数据', '可比公司法估值与成长性交叉验证', '生成投资机构视角的企业研报'].map((x, i) => `
          <div class="flex mb3" style="gap:10px"><span class="rank-pill" style="background:#F0F2F7;color:var(--t3)" id="rgs${i}">${i + 1}</span>
          <span class="text-sm" style="line-height:24px">${x}</span></div>`).join('')}</div>`, foot: '' });
        const done = i => { const p = $('#rgs' + i); if (p) { p.textContent = '✓'; p.style.background = 'var(--ok-50)'; p.style.color = 'var(--ok-500)'; } };
        setTimeout(() => done(0), 700); setTimeout(() => done(1), 1400); setTimeout(() => done(2), 2000);
        setTimeout(() => {
          APP.closeModal(); S._rschCo = target.id; F.kw = target.short;
          S.rptMy = [{ co: target.id, kind: '企业研报', title: `${target.short}企业研报`, t: '2026-09-28 ' + new Date().toTimeString().slice(0, 5), by: '邓瑞忠' }, ...(S.rptMy || [])];
          toast(`「${target.short}」企业研报已生成`);
          this.render(document.querySelector('#viewRoot'));
        }, 2500);
      };
      box.querySelectorAll('.ns-i[data-rs]').forEach(n => n.onclick = () => {
        const tg = box.querySelector('#' + n.dataset.rs);
        if (tg) tg.scrollIntoView({ behavior: 'smooth', block: 'start' });
        box.querySelectorAll('.ns-i[data-rs]').forEach(x => x.classList.remove('on'));
        n.classList.add('on');
      });
    },
    /* ---- 拜访前一页纸 / 综合服务方案（新版看板结构 · 抽屉双 Tab） ---- */
    briefDlg(coId, side) {
      const c = M().coById(coId); if (!c) return;
      const wb = window.VIEWS.workbench;
      if (!wb || !wb.rptBriefHtml) return;
      const isPlan = side === 'plan';
      APP.openDrawer((isPlan ? '综合服务方案' : '访前准备') + ' · ' + esc(c.short),
        isPlan ? wb.rptPlanHtml(c) : wb.rptBriefHtml(c));
      setTimeout(() => wb.rptReveal && wb.rptReveal(), 60);
    },
  };

  /* ================= 报告中心 一级导航（原AI智能分析，置于市场洞察之后） =================
     页签：访前报告 / 访后尽调报告 / 产业链报告 / 企业研报；
     「我的报告」为页签行最右侧按钮（与页签区分开） */
  VIEWS.report.render = function (el) {
    const S = APP.S;
    el.innerHTML = `
        <div class="page-head"><div class="page-title">报告中心</div></div>
        <div id="rptTabs"></div>`;
    if (!S.rptMy || !S.rptMy.length) S.rptMy = [
      { co: 'JH', kind: '企业报告', t: '2026-09-28 10:32', by: '李晓' },
      { co: 'JH', kind: '企业研报', title: '晶汇封测企业研报', t: '2026-09-28 09:15', by: '邓瑞忠' },
      { co: 'TH', kind: '企业报告', t: '2026-09-26 16:05', by: '陈斌' },
      { co: 'SX', kind: '企业报告', t: '2026-09-25 09:40', by: '王倩' },
      { co: 'ic', kind: '产业链报告', title: '集成电路产业分析报告', t: '2026-09-22 14:10', by: '李晓' },
      { co: 'HN', kind: '企业报告', t: '2026-09-18 14:21', by: '李晓' }];
    if (S.visitReports && S.visitReports.length) {
      S.visitReports.forEach(v => { if (!S.rptMy.some(x => x.id === v.id)) S.rptMy.unshift({ id: v.id, co: v.co, kind: '访后报告', title: v.title, t: v.t, by: v.by }); });
    }
    const tabs = [
      { id: 'detail', name: '访前报告' },
      { id: 'visit', name: '访后尽调报告' },
      { id: 'chain', name: '产业链报告' },
      { id: 'research', name: '企业研报' }];
    let act = ['mine', 'chain', 'visit', 'research'].includes(S.params.tab) ? S.params.tab : 'detail';
    const noAct = act === 'mine' ? '__mine' : act;
    renderTabs($('#rptTabs'), tabs, noAct, t => { act = t; S.params.tab = t; paint(); });
    /* 我的报告：页签行最右侧按钮 */
    const tabsEl = document.querySelector('#rptTabs .tabs');
    const mineBtn = document.createElement('button');
    mineBtn.style.cssText = 'margin-left:auto';
    mineBtn.innerHTML = `我的报告<span class="t-count" style="font-size:11px;background:var(--bg);color:var(--t3);border-radius:8px;padding:0 6px;margin-left:4px">${S.rptMy.length}</span>`;
    mineBtn.onclick = () => { act = 'mine'; S.params.tab = 'mine'; paint(); };
    tabsEl.appendChild(mineBtn);
    const paint = () => {
      const box = switchTab($('#rptTabs'), tabs, act === 'mine' ? '__mine' : act, paint);
      tabsEl.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === act));
      mineBtn.className = act === 'mine' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
      if (act === 'detail') this.paintDetail(box);
      if (act === 'visit') VIEWS.visitReport.renderInline(box);
      if (act === 'chain') { this.paintChain(box); }
      if (act === 'research') this.paintResearch(box);
      if (act === 'mine') this.paintMine(box);
    }; paint();
  };

  /* ---------- V4 六张网企业演示数据填充（工商/股东/上下游，按四维标签确定性生成） ---------- */
  const FN_LEGAL = ['徐建国', '陈志强', '王明华', '李文斌', '赵国栋', '周建平', '吴志远', '郑海涛'];
  const FN_ROAD = ['金融大道 88 号', '科技产业园 6 号', '高新区研发一路', '经开区长山路 9 号', '新城工业区纬二路', '港城大道 168 号'];
  const FN_UPDOWN = {
    '新型电网': { up: [['华澄材料', '电子特气/基板'], ['中环晶圆', '大宗原材料'], ['京弘设备', '成套设备'], ['锡创软件', '设计与仿真软件']], down: [['国网省电力公司', '电网采购'], ['南网区域公司', '电网采购'], ['五大发电集团', '电源配套'], ['整机厂', '设备配套']] },
    '算力网': { up: [['澜芯半导体', '算力芯片'], ['中环晶圆', '服务器板卡用料'], ['恒能设备', '液冷与电源设备'], ['云谷数据', '带宽与机柜']], down: [['三大运营商', '集采'], ['智算中心业主', '项目交付'], ['互联网大厂', '算力服务采购'], ['政数局', '政务云']] },
    '城市地下管网': { up: [['京弘管业', '管材'], ['恒能机电', '泵阀设备'], ['中衡设计', '勘察设计'], ['宏图监理', '工程监理']], down: [['地方城投/水务集团', '业主'], ['市政施工单位', '分包'], ['燃气公司', '运营采购'], ['住建部门', '专项债项目']] },
    '水网': { up: [['京弘管业', '输水管材'], ['恒能机电', '泵组设备'], ['清源环保', '水处理药剂'], ['中衡设计', '水利设计']], down: [['原水公司', '业主'], ['城投水务平台', '建设运营'], ['自来水公司', '采购'], ['水利部门', '专项工程']] },
    '物流网': { up: [['恒能重工', '装卸设备'], ['华驰车桥', '车辆部件'], ['中讯系统', '信息系统'], ['恒安能源', '燃料供应']], down: [['制造类货主', '运输合同'], ['园区运营方', '仓储租赁'], ['电商平台', '配送单量'], ['口岸/海关', '通关']] },
    '新一代通信网': { up: [['中环晶圆', '晶圆代工'], ['华澄材料', '光芯片材料'], ['京弘设备', '贴装与测试设备'], ['恒能电子', '结构件']], down: [['设备商（华为/中兴等）', '器件采购'], ['三大运营商', '集采'], ['数据中心', '光模块采购'], ['车厂/Tier1', '车规模组']] },
  };
  const fnHash = str => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
  function fnDemoFill(c) {
    if (!c || c.id[0] !== 'F') return null;
    const h = fnHash(c.id + c.name);
    const soe = /国企|国资|央企|政府|科研/.test(c.nat || '');
    const legal = soe ? '—（国资监管主体委派）' : FN_LEGAL[h % FN_LEGAL.length];
    const cap = c.pos === '战略' ? (soe ? (10 + h % 30) + ' 亿元' : (5 + h % 15) + ' 亿元') : c.pos === '腰部' ? (1 + h % 8) + ' 亿元' : (2000 + h % 8000) + ' 万元';
    const est = 1993 + h % 25;
    const emp = c.cat === '建设运营商' ? (800 + h % 4000) + ' 人' : (150 + h % 1800) + ' 人';
    const uscc = '9132' + String(10000 + h % 90000).slice(0, 5) + 'MA1' + String(1000000 + h % 9000000).slice(0, 7) + 'X';
    const addr = (c.city || '南京') + '市' + (c.zone || '') + (c.zone.indexOf('区') < 0 && c.zone.indexOf('县') < 0 ? '区' : '') + FN_ROAD[h % FN_ROAD.length];
    const scope = c.net + '领域内的' + c.track.split('·')[0] + '相关业务：投资建设、装备制造、系统集成、技术服务与运营维护（以工商登记为准）';
    const qual = ['高新技术企业'];
    if (c.score >= 85) qual.push('国家级专精特新"小巨人"');
    else if (c.score >= 70) qual.push('省级专精特新中小企业');
    if (c.listed && c.listed.indexOf('是') === 0) qual.push('上市/挂牌公司');
    if (c.cat === '建设运营商') qual.push('特许经营/重大项目主体');
    let holders = [], ctrl = '';
    if (/央企/.test(c.nat)) { holders = [{ n: '央企集团公司（国务院国资委）', t: '央企', pct: 100 }]; ctrl = '国务院国资委 → 央企集团公司 → ' + c.short; }
    else if (/省属国企/.test(c.nat)) { holders = [{ n: '省属国资运营公司', t: '国资', pct: 100 }]; ctrl = '省国资委 → 省属国资运营公司 → ' + c.short; }
    else if (/地方国资|政府/.test(c.nat)) { holders = [{ n: (c.city || '南京') + '市城投集团', t: '国资', pct: 51 + h % 40 }, { n: '省产业基金', t: '机构', pct: 5 + h % 8 }]; ctrl = (c.city || '南京') + '市国资委 → 城投集团 → ' + c.short; }
    else { holders = [{ n: FN_LEGAL[h % FN_LEGAL.length] + '（实际控制人）', t: '自然人', pct: 25 + h % 20 }, { n: (c.short.slice(0, 2)) + '投资控股有限公司', t: '法人', pct: 15 + h % 15 }, { n: '员工持股平台', t: '法人', pct: 5 + h % 8 }]; ctrl = FN_LEGAL[h % FN_LEGAL.length] + ' → ' + c.short.slice(0, 2) + '投资控股 → ' + c.short; }
    const UD = FN_UPDOWN[c.net] || FN_UPDOWN['新型电网'];
    const ud = { up: UD.up.map((u, i) => ({ n: u[0], w: u[1], ours: (h + i) % 4 === 0 })), down: UD.down.map((u, i) => ({ n: u[0], w: u[1], ours: (h + i) % 5 === 0 })) };
    return { legal, cap, est: est + '', emp, uscc, addr, scope, qual, holders, ctrl, ud };
  }

  /* ================= 企业详情（公开信息 · 非AI报告） ================= */
  VIEWS.company = {
    render(el) {
      const c = M().coById(S.params.id);
      if (!c) { el.innerHTML = '<div class="card card-pad"><div class="empty"><div class="e-ico">🏢</div><div class="e-title">企业不存在或已下架</div></div></div>'; return; }
      if (!S.subs) S.subs = { cos: [], segs: [] };
      const subed = S.subs.cos.includes(c.id);
      const demo = fnDemoFill(c) || {};
      if (demo.legal) { c.legal = demo.legal; c.cap = demo.cap; c.est = demo.est; c.emp = demo.emp; c.uscc = demo.uscc; c.addr = demo.addr; c.scope = demo.scope; c.qual = demo.qual; c.holders = demo.holders; c.ctrl = demo.ctrl; c.ud = demo.ud; }
      const relNews = M().news.filter(n => (n.cos || []).includes(c.id) || (n.ind || '集成电路与电子材料') === c.industry).slice(0, 6);
      const chain = (c.ctrl || '').split('→').map(s => s.trim()).filter(Boolean);
      const short = s => s.replace('与电子材料', '').replace('与人工智能', '').replace('与大健康', '');
      el.innerHTML = `
        <div class="page-head"><div class="page-title">${esc(c.short)}<span class="text-xs text-muted" style="font-weight:400;margin-left:10px">${esc(c.name)}</span></div>
          <div class="flex" style="gap:8px">
            <button class="btn btn-ghost" onclick="APP.go('funnel',{tab:'co'})">← 返回企业总览</button>
            <button class="btn btn-ghost" id="cpSub">${subed ? '✓ 已订阅' : '＋ 订阅该企业'}</button>
            <button class="btn btn-primary" id="cpRpt">⚡ 生成AI报告</button></div></div>
        <div class="card card-pad mb4">
          <div class="flex-between wrap" style="gap:12px">
            <div class="flex" style="gap:14px;align-items:center">
              <div class="cp-logo">${esc(c.short.slice(0, 2))}</div>
              <div><div style="font-size:var(--fs-xl);font-weight:700">${esc(c.short)}</div>
              <div class="flex mt2" style="gap:6px;flex-wrap:wrap">${layerTag(c.layer)}${statusTag(c.status)}<span class="tag tag-cyan">${short(c.industry)}</span><span class="tag tag-line">${c.seg}</span>${c.city ? `<span class="tag tag-line">${c.city}·${c.zone}</span>` : ''}</div>
              ${demo.legal ? `<div class="flex mt2" style="gap:6px;flex-wrap:wrap">${c.cat ? `<span class="tag tag-gray" style="height:20px">${esc(c.cat)}</span>` : ''}${c.prog ? `<span class="tag tag-blue" style="height:20px">营销进展：${c.prog}</span>` : ''}${c.pos ? `<span class="tag tag-violet" style="height:20px">地位：${c.pos}</span>` : ''}${c.wt ? `<span class="tag tag-cyan" style="height:20px">权重：${c.wt}</span>` : ''}${c.score ? `<span class="tag tag-solid-red" style="height:20px">四线得分 ${c.score}</span>` : ''}</div>` : ''}</div>
            </div>
            <div class="text-xs text-muted">公开信息聚合 · 数据时点 2026-09-28</div>
          </div>
        </div>
        ${(window.VIEWS.workbench && window.VIEWS.workbench.profileHtml(c)) ? `<div class="card card-pad mb4">${window.VIEWS.workbench.profileHtml(c)}</div>` : ''}
        <div class="card card-pad mb4"><div class="flex-between mb3"><b style="font-size:var(--fs-md)">基本信息<span class="text-xs text-muted" style="font-weight:400;margin-left:8px">公开信息 · 工商数据</span></b></div>
          <div class="kv-grid">${[['法定代表人', c.legal], ['注册资本', c.cap], ['成立时间', c.est + ' 年'], ['统一社会信用代码', c.uscc], ['企业类型', c.type], ['员工规模', c.emp], ['所在地区', (c.city || '无锡') + ' · ' + c.zone], ['产业园区', c.park || '—'], ['注册地址', c.addr || '—'], ['经营范围', c.scope || '—'], ['资质认证', (c.qual || []).join('、') || '—']].map(([k, v]) => kv(k, esc(String(v)))).join('')}</div></div>
        <div class="card card-pad mb4"><div class="flex-between mb3"><b style="font-size:var(--fs-md)">股份穿透</b><span class="text-xs text-muted">工商公示 · 持股5%以上股东</span></div>
          <div class="grid-2">
            <div><table class="tbl"><thead><tr><th>股东名称</th><th>类型</th><th style="width:210px">持股比例</th></tr></thead><tbody>
              ${(c.holders || []).map(h => `<tr><td><b class="text-sm">${esc(h.n)}</b></td><td><span class="tag tag-line">${h.t}</span></td>
                <td><div class="mini-bar-wrap"><div class="mb" style="flex:1"><i style="width:${h.pct}%;background:var(--brand-500)"></i></div><b class="fs-num text-sm">${h.pct}%</b></div></td></tr>`).join('') || '<tr><td colspan="3" class="text-muted text-sm">暂无公示数据</td></tr>'}</tbody></table></div>
            <div><div class="text-sm" style="font-weight:600;margin-bottom:10px">实际控制人（穿透路径）</div>
              <div class="cp-chain">${chain.length ? chain.map((s, i) => `<span class="cp-chip">${esc(s)}</span>${i < chain.length - 1 ? '<span class="cp-arrow">→</span>' : ''}`).join('') : '<span class="text-muted text-sm">暂无公示数据</span>'}</div>
              ${(c.holders || []).length ? `<div class="text-xs text-muted mt3">共披露股东 ${c.holders.length} 名；穿透至自然人 / 国资监管主体为止</div>` : ''}</div>
          </div></div>
        <div class="card card-pad mb4"><b style="font-size:var(--fs-md)">上下游信息</b>
          <div class="grid-2 mt3">
            <div><div class="text-sm" style="font-weight:600;margin-bottom:8px">上游供应商</div>
              ${(c.ud && c.ud.up.length) ? c.ud.up.map(u => `<div class="flex-between cp-ud"><span class="text-sm"><b>${esc(u.n)}</b> <span class="text-xs text-muted">· ${u.w}</span></span>${u.ours ? '<span class="tag tag-green" style="height:18px;font-size:10px">本行客户</span>' : ''}</div>`).join('') : '<div class="text-sm text-muted">暂无公开披露数据</div>'}</div>
            <div><div class="text-sm" style="font-weight:600;margin-bottom:8px">下游客户</div>
              ${(c.ud && c.ud.down.length) ? c.ud.down.map(u => `<div class="flex-between cp-ud"><span class="text-sm"><b>${esc(u.n)}</b> <span class="text-xs text-muted">· ${u.w}</span></span>${u.ours ? '<span class="tag tag-green" style="height:18px;font-size:10px">本行客户</span>' : ''}</div>`).join('') : '<div class="text-sm text-muted">暂无公开披露数据</div>'}</div>
          </div></div>
        <div class="card card-pad"><div class="flex-between mb3"><b style="font-size:var(--fs-md)">${relNews.length ? '相关资讯' : 'AI 捕获信号'}</b><span class="text-xs text-muted">${relNews.length ? '企业关联 + 同产业动态' : 'AI 数据引擎 24h 跑批 · 来源：公开渠道'}</span></div>
          ${relNews.length ? relNews.map(n => `<div class="nl-row" onclick="APP.openNews('${n.id}')">
            <div class="nl-l1"><span class="tag ${(n.cos || []).includes(c.id) ? 'tag-solid-red' : 'tag-blue'}" style="height:19px;font-size:10px;padding:0 6px;flex-shrink:0">${(n.cos || []).includes(c.id) ? '企业动态' : '产业动态'}</span><span class="nl-t">${esc(n.title)}</span><span class="nl-d">${n.date.slice(5)}</span></div>
            <div class="nl-l2"><span>${n.date}</span>·<span>${esc(n.source)}</span><span class="nl-ai"><span class="ai-badge" style="font-size:9px;height:15px;padding:0 4px;flex-shrink:0">AI</span><span class="t">${esc(n.ai)}</span></span><span class="nl-more">详情 ›</span></div>
          </div>`).join('') : `<div class="timeline">
          ${(c.sig || []).map((sg, i) => `<div class="tl-item ${i === 0 ? '' : ''}"><div class="tl-time">11-04 04:0${i + 2} · AI 数据引擎</div><div class="tl-title">${esc(c.sigLv + ' 级信号' + (i === 0 ? '（最新）' : ' · 依据'))}</div><div class="tl-desc">${esc(sg)}</div></div>`).join('')}
          ${c.opp ? `<div class="tl-item tl-warn"><div class="tl-time">机会地</div><div class="tl-title">${esc(c.opp)}</div><div class="tl-desc">AI 从项目公开信息中识别的落地机会区域</div></div>` : ''}
        </div>`}
        </div>`;
      $('#cpSub').onclick = () => {
        const i = S.subs.cos.indexOf(c.id);
        if (i >= 0) { S.subs.cos.splice(i, 1); toast(`已取消订阅「${c.short}」`); } else { S.subs.cos.push(c.id); toast(`已订阅「${c.short}」，企业动态将推送提醒`); }
        this.render(el);
      };
      $('#cpRpt').onclick = () => { VIEWS.report.gen(c.id); };
    }
  };
})();
