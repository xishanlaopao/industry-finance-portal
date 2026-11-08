/* ============================================================
   管理视图 V4：项目储备情况汇总 / 营销进度更新 / 支行综合看板 / 分行结果统计
               （原产业分析 / 业务分析保留为附加板块）
   数据：M().manage（项目储备汇总，mock.js 注入） + cockpitBank / funnel.tasks
   ============================================================ */
(function () {
  const { $, esc, kv, aiPanel, toast, renderTabs, switchTab } = APP;
  const M = () => window.MOCK, CH = window.CH;
  const S = APP.S;

  /* ================= 管理视图（一级导航） ================= */
  VIEWS.cockpit = {
    render(el) {
      el.innerHTML = `
        <div class="page-head"><div class="page-title">管理视图</div>
          <span class="tag tag-blue" style="height:28px;padding:0 12px">数据时点 2026-09-28</span></div>
        <div id="ckTabs"></div>`;
      const tabs = [
        { id: 'reserve', name: '项目储备情况' },
        { id: 'progress', name: '进度更新' },
        { id: 'branch', name: '支行综合看板' },
        { id: 'stats', name: '分行结果统计' },
        { id: 'ind', name: '产业分析' },
        { id: 'bank', name: '业务分析' }];
      let act = S.ckTab || 'reserve';
      renderTabs($('#ckTabs'), tabs, act, t => { act = t; S.ckTab = t; paint(); });
      const paint = () => {
        const box = switchTab($('#ckTabs'), tabs, act, paint);
        if (act === 'reserve') this.paintReserve(box);
        else if (act === 'progress') this.paintProgress(box);
        else if (act === 'branch') this.paintBranchView(box);
        else if (act === 'stats') this.paintStats(box);
        else if (act === 'ind') VIEWS.cockpitInd.paintTab(box);
        else VIEWS.cockpitBank.paintTab(box);
      }; paint();
    },
    /* ---------- Tab1：项目储备情况汇总（项目清单 + 客户清单 + 储备漏斗） ---------- */
    paintReserve(box) {
      const mg = M().manage || {};
      const projs = mg.projects || [];
      const st = APP.S.fn || { tasks: M().funnel.tasksSeed, subs: M().funnel.subsSeed };
      const cName = id => { const c = M().funnel.cos.find(x => x.id === id); return c ? c.short : ''; };
      const stage = (lab, n, end) => `<div class="fn-stage ${end ? 'fn-stage-end' : ''}"><div class="fn-s-n fs-num">${n}</div><div class="fn-s-l">${lab}</div></div>${end ? '' : '<span class="fn-arrow">›</span>'}`;
      const progTag = v => ({ 突破: 'tag-solid-red', 攻坚: 'tag-orange', 培育: 'tag-blue' }[v] || 'tag-gray');
      const stTag = s => ({ 储备: 'tag-gray', 前期对接: 'tag-blue', 方案阶段: 'tag-orange', 已批复: 'tag-green', 已投放: 'tag-solid-red' }[s] || 'tag-gray');
      box.innerHTML = `
        <div class="kpi-grid mb3" style="grid-template-columns:repeat(5,1fr)">
          ${kv('储备项目', '<b style="font-size:22px">' + projs.length + '</b> 个', '六张网重大项目')}
          ${kv('覆盖企业', '<b style="font-size:22px">' + new Set(projs.map(p => p.co)).size + '</b> 家', '项目关联客户')}
          ${kv('客户清单储备', '<b style="font-size:22px">' + M().funnel.cos.length + '</b> 家', '企业总览全库')}
          ${kv('已下发任务', '<b style="font-size:22px">' + st.tasks.length + '</b> 项', '产品经理下发中')}
          ${kv('已反馈', '<b style="font-size:22px">' + st.tasks.filter(t => t.status === '已反馈').length + '</b> 项', '客户经理已反馈')}
        </div>
        <div class="card card-pad mb3">
          <div class="flex mb2" style="gap:8px"><b>储备转化漏斗</b><span class="text-xs text-muted">项目清单 + 客户清单 → 已下发 → 已反馈 → 已批复/投放</span></div>
          <div class="fn-funnel">
            ${stage('储备项目', projs.length)}${stage('已下发任务', st.tasks.length)}${stage('已反馈', st.tasks.filter(t => t.status === '已反馈').length)}${stage('已批复/投放', projs.filter(p => p.stage === '已批复' || p.stage === '已投放').length, true)}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">项目储备清单<span class="card-sub">来源：机会漏斗 · 项目清单（产品经理下发）</span></div>
            <button class="btn btn-ghost btn-sm" onclick="APP.go('funnel',{tab:'proj'})">到机会漏斗管理 ›</button></div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr>
            <th style="width:170px">项目名称</th><th style="width:96px">关联客户</th><th style="width:88px">所属网</th><th style="width:88px">投资额</th>
            <th style="width:80px">阶段</th><th style="width:74px">营销进展</th><th style="width:78px">承接经理</th><th>储备要点</th></tr></thead><tbody>
          ${projs.map(p => { const rm = M().funnel.rms.find(r => r.id === p.rm) || {}; return `<tr>
            <td><b class="text-sm">${esc(p.name)}</b></td><td class="text-sm">${esc(cName(p.co))}</td><td class="text-sm">${esc(p.net)}</td>
            <td class="text-sm fs-num">${esc(p.amt)}</td>
            <td><span class="tag ${stTag(p.stage)}" style="height:19px;font-size:10px;padding:0 6px">${p.stage}</span></td>
            <td><span class="tag ${progTag(p.prog)}" style="height:19px;font-size:10px;padding:0 6px">${p.prog}</span></td>
            <td class="text-sm">${esc(rm.name || '—')}</td>
            <td class="text-sm text-sub" style="white-space:normal;line-height:1.6">${esc(p.note)}</td></tr>`; }).join('')}
          </tbody></table></div></div>`;
    },
    /* ---------- Tab2：进度更新（任务维度过程跟踪） ---------- */
    paintProgress(box) {
      const st = APP.S.fn || { tasks: M().funnel.tasksSeed };
      const tasks = st.tasks;
      const cName = id => { const c = M().funnel.cos.find(x => x.id === id); return c ? c.short : ''; };
      const rName = id => { const r = M().funnel.rms.find(x => x.id === id); return r ? r.name : ''; };
      const stTag = s => ({ 待接收: 'tag-gray', 跟进中: 'tag-blue', 已反馈: 'tag-green', 已关闭: 'tag-line' }[s] || 'tag-gray');
      const overdue = t => +t.due.replace('-', '') < 1105 && t.status !== '已反馈' && t.status !== '已关闭';
      const needReview = t => t.log.some(l => l.t === '访客纪要') && !t.log.some(l => l.t === '协同留言' && l.by.indexOf('产品经理') >= 0);
      box.innerHTML = `
        <div class="kpi-grid mb3" style="grid-template-columns:repeat(5,1fr)">
          ${kv('在途任务', '<b style="font-size:22px">' + tasks.length + '</b> 项', '')}
          ${kv('待接收', '<b style="font-size:22px">' + tasks.filter(t => t.status === '待接收').length + '</b> 项', '')}
          ${kv('跟进中', '<b style="font-size:22px">' + tasks.filter(t => t.status === '跟进中').length + '</b> 项', '')}
          ${kv('超期未反馈', '<b style="font-size:22px;color:var(--danger-500)">' + tasks.filter(overdue).length + '</b> 项', '截止日已过')}
          ${kv('待复核纪要', '<b style="font-size:22px;color:var(--warn-500)">' + tasks.filter(needReview).length + '</b> 项', '待产品经理协同')}
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">任务进度一览<span class="card-sub">全辖下发任务 · 访客纪要 / 协同留言 / 反馈 全留痕</span></div>
            <button class="btn btn-ghost btn-sm" onclick="APP.go('funnel',{tab:'task'})">任务下发与跟踪 ›</button></div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr>
            <th style="width:140px">企业 / 项目</th><th style="width:78px">类型</th><th style="width:96px">客户经理</th>
            <th style="width:56px">截止</th><th style="width:70px">状态</th><th style="width:64px">纪要数</th><th>最新进展</th></tr></thead><tbody>
          ${tasks.map(t => { const last = t.log[0], rm = M().funnel.rms.find(x => x.id === t.rm) || {};
            const revCnt = t.log.filter(l => l.t === '访客纪要' || l.t === '调研纪要').length;
            return `<tr class="clickable" data-pg="${t.id}">
            <td><b class="text-sm">${esc(cName(t.co))}</b></td>
            <td class="text-sm">${esc(t.type)}</td>
            <td class="text-sm">${esc(rm.name || '—')}</td>
            <td class="text-sm">${t.due}</td>
            <td><span class="tag ${stTag(t.status)}" style="height:19px;font-size:10px;padding:0 6px">${t.status}</span>${overdue(t) ? ' <span class="tag tag-red" style="height:19px;font-size:10px;padding:0 6px">超期</span>' : ''}</td>
            <td class="text-sm fs-num">${revCnt}</td>
            <td class="text-sm text-sub" style="white-space:normal;line-height:1.5">${last ? `<b class="text-xs" style="color:var(--t3)">${last.d} ${esc(last.t)}</b>　${esc(last.x).slice(0, 44)}…` : '—'}</td></tr>`; }).join('')}
          </tbody></table></div></div>`;
      box.querySelectorAll('[data-pg]').forEach(tr => tr.onclick = () => APP.go('funnel', { tab: 'task' }));
    },
    /* ---------- Tab3：支行综合看板（原驾驶舱支行钻取 + 支行排行） ---------- */
    paintBranchView(box) {
      const b = M().cockpitBank;
      const per = S.rankPeriod, data = b.branchRank[per];
      box.innerHTML = `
        <div class="kpi-grid mb3" style="grid-template-columns:repeat(4,1fr)">
          ${kv('参战支行', '<b style="font-size:22px">' + b.branchRank['月'].idx.length + '</b> 家', '')}
          ${kv('参战客户经理', '<b style="font-size:22px">' + b.drill.branches.reduce((s2, x) => s2 + x.ms.length, 0) + '</b> 人', '')}
          ${kv('平均任务完成率', '<b style="font-size:22px">' + Math.round(b.drill.branches.reduce((s2, x) => s2 + (x.rate || 0), 0) / b.drill.branches.length) + '%</b>', '')}
          ${kv('支行贷款余额合计', '<b style="font-size:22px">' + b.branchRank['年'].loan.reduce((s2, x) => s2 + x, 0).toFixed(1) + '</b> 亿', '年口径')}
        </div>
        <div class="card card-pad mb4">
          <div class="flex-between mb3" style="flex-wrap:wrap;gap:10px">
            <div class="card-title" style="font-size:var(--fs-md)">支行网点业务排行 <span class="card-sub">按贷款余额</span></div>
            <div class="flex" style="gap:6px">${['周', '月', '季', '年'].map(p => `<button class="chip ${per === p ? 'on' : ''}" data-p="${p}">${p}度</button>`).join('')}</div></div>
          ${CH.hbars(data.idx.map((n, i) => ({ name: n, v: data.loan[i], pre: `<span class="rank-pill ${i < 3 ? 'rank-' + (i + 1) : ''}" style="${i >= 3 ? 'background:#F0F2F7' : ''};margin-right:6px">${i + 1}</span>`, extra: `${data.cust[i]} 户` })), { unit: '亿' })}
        </div>
        <div id="cbOv"></div><div id="cbStruct"></div><div id="cbRank"></div>`;
      box.querySelectorAll('[data-p]').forEach(c => c.onclick = () => { S.rankPeriod = c.dataset.p; this.paintBranchView(box); });
      VIEWS.cockpitBank.paintOv(box.querySelector('#cbOv'));
      VIEWS.cockpitBank.paintStruct(box.querySelector('#cbStruct'));
      VIEWS.cockpitBank.paintRank(box.querySelector('#cbRank'));
    },
    /* ---------- Tab4：分行结果统计（KPI + 覆盖率 + 漏斗结果） ---------- */
    paintStats(box) {
      const b = M().cockpitBank;
      const mg = M().manage || {};
      box.innerHTML = `
        <div class="kpi-grid mb4" style="grid-template-columns:repeat(6,1fr)">
          ${b.kpis.map(x => `<div class="kpi" style="padding:14px"><div class="k-label">${x.k}</div>
            <div class="k-value" style="font-size:22px">${x.v}<small>${x.unit}</small></div>
            <div class="k-foot ${x.up ? 'k-up' : ''}" style="${x.up ? '' : 'color:var(--danger-500)'}">${x.foot}</div>
            <div class="k-ico" style="width:30px;height:30px;right:10px;top:10px;font-size:14px;background:${x.bg};color:${x.c}">${x.ico}</div></div>`).join('')}
        </div>
        ${mg.summary ? `<div class="card card-pad mb4"><div class="card-title mb3" style="font-size:var(--fs-md)">储备与投放结果统计</div>
          <div class="grid-4 mb3" style="grid-template-columns:repeat(4,1fr)">
            ${kv('项目批复数', mg.summary.approved + ' 个', '累计')}
            ${kv('已投放金额', mg.summary.invested + ' 亿元', '累计')}
            ${kv('储备覆盖率', mg.summary.cover + '%', '名单企业覆盖')}
            ${kv('综合收益（年化）', mg.summary.income + ' 万元', '利息+中收 测算')}
          </div>
          ${CH.hbars(mg.summary.byNet.map(x => ({ name: x.n, v: x.v, extra: x.c + ' 户' })), { unit: '亿' })}
          <div class="text-xs text-muted mt2">按六张网统计投放余额</div></div>` : ''}
        <div class="grid-2 mb4">
          <div class="card card-pad"><div class="card-title mb3" style="font-size:var(--fs-md)">贷款余额趋势（亿元）</div>${CH.line({ labels: b.loanTrend.labels, series: [{ name: '贷款余额', data: b.loanTrend.data, color: '#2458F5' }], h: 220 })}</div>
          <div class="card card-pad"><div class="card-title mb3" style="font-size:var(--fs-md)">月度新增投放（亿元）</div>${CH.bars({ labels: b.putTrend.labels, data: b.putTrend.data, unit: '' })}</div>
        </div>
        <div class="card card-pad mb4"><div class="flex-between mb3"><div class="card-title" style="font-size:var(--fs-md)">业务报表（支行 → 客户经理 → 客户 三级钻取）</div></div><div id="cbDrill"></div></div>
        <div class="grid-2">
          <div class="card card-pad"><div class="card-title mb3" style="font-size:var(--fs-md)">产品结构</div>${CH.donut({ data: b.productMix, center: '46%', sub: '信贷为主' })}</div>
          <div class="card card-pad"><div class="card-title mb3" style="font-size:var(--fs-md)">客户分层情况</div>
            ${CH.hbars(b.layerMix.map(x => ({ name: x.name, v: x.cov, extra: `贡献 ${x.contr}%` })), { unit: '%', max: 100 })}
            <div class="banner b-warn mt3" style="padding:9px 13px">拟上市与专精特新分层覆盖率仅 42% / 26%，但贡献了 33% 的业务量——投入产出比最高，建议作为下阶段主攻分层。</div></div>
        </div>`;
      const drillBox = box.querySelector('#cbDrill');
      VIEWS.cockpitBank.paintDrillEl(drillBox);
    },
  };

  /* ================= 产业视角 ================= */
  VIEWS.cockpitInd = {
    paintTab(el) {
      const ci = M().cockpitInd.ciInds;
      const indKey = S._ciInd || 'ic';
      const ind = ci[indKey];
      el.innerHTML = `
        <div class="filter-bar mb4">
          <span class="f-label">行业</span>
          <select class="select" id="ciIndSel" style="width:180px;height:28px">${Object.entries(ci).map(([k, v]) => `<option value="${k}" ${indKey === k ? 'selected' : ''}>${v.name}</option>`).join('')}</select>
        </div>
        <div class="kpi-grid mb4" id="ciKpi">
          ${ind.kpi.map(([k, v]) => kv(k, '<b style="font-size:22px">' + v + '</b>')).join('')}
        </div>
        <div id="ciTabs"></div>
        <div id="ciBody"></div>`;
      el.querySelector('#ciIndSel').onchange = e => { S._ciInd = e.target.value; this.paintTab(el); };
      const tabs = [{ id: 'boom', name: '行业景气看板' }, { id: 'inv', name: '金融看板' }];
      let act = 'boom';
      renderTabs($('#ciTabs'), tabs, act, t => { act = t; $('#ciTabs').querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x.dataset.tab === t)); paint(); });
      const paint = () => {
        const box = $('#ciBody');
        const m = M().cockpitInd;
        if (act === 'boom') box.innerHTML = `
          <div class="card card-pad mb4"><div class="card-title mb3" style="font-size:var(--fs-md)">${ind.name} · 细分环节景气度（指数 &gt;100 为景气扩张）</div>
            <div class="flex wrap" style="gap:18px;justify-content:space-around">${ind.boom.map(b => CH.gauge({ val: b.idx, label: `${b.name}（环比${b.mom}）` })).join('')}</div></div>
          <div class="grid-2 mb4">
            <div class="card card-pad"><div class="card-title mb3" style="font-size:var(--fs-md)">行业市场规模走势</div>${CH.line({ labels: ind.size.labels, series: ind.size.series, h: 220 })}</div>
            <div class="card card-pad"><div class="card-title mb3" style="font-size:var(--fs-md)">行业投融资热度（季度事件数）</div>${CH.line({ labels: ind.invest.labels, series: ind.invest.series, h: 220 })}</div>
          </div>
          <div class="grid-3 mb4">${ind.metrics.map(([k, v]) => `<div class="card card-pad" style="padding:14px 16px"><div class="text-xs text-muted">${k}</div><div class="text-md mt2" style="font-weight:700">${esc(v)}</div></div>`).join('')}</div>
          ${aiPanel(ind.name + ' · 行业AI解读', esc(ind.ai))}`;
        if (act === 'inv') {
          const fb = m.finBoard;
          box.innerHTML = `
          <div class="flex" style="gap:16px;align-items:stretch">
            <div class="card card-pad" style="flex:1.5;min-width:0">
              <div class="card-title mb3" style="font-size:var(--fs-md)">投资机构偏好</div>
              ${CH.hbars(fb.funds.map(f => ({ name: f.n, v: f.v, extra: f.track + ' · ' + f.stage })), { unit: '起' })}
            </div>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:16px">
              <div class="card card-pad">
                <div class="card-title mb3" style="font-size:var(--fs-md)">同行合作偏好</div>
                ${CH.hbars(fb.banks.map(b => ({ name: b.n, v: b.v, extra: b.note })), { unit: '笔', color: '#0D9488' })}
              </div>
              <div>${aiPanel('机构与同业合作解读', esc(fb.ai))}</div>
            </div>
          </div>`;
        }
      }; paint();
    }
  };

  /* ================= 行内视角 ================= */
  VIEWS.cockpitBank = {
    paintTab(el) {
      const b = M().cockpitBank;
      el.innerHTML = `
        <div class="kpi-grid mb4" style="grid-template-columns:repeat(6,1fr)">
          ${b.kpis.map(x => `<div class="kpi" style="padding:14px"><div class="k-label">${x.k}</div>
            <div class="k-value" style="font-size:22px">${x.v}<small>${x.unit}</small></div>
            <div class="k-foot ${x.up ? 'k-up' : ''}" style="${x.up ? '' : 'color:var(--danger-500)'}">${x.foot}</div>
            <div class="k-ico" style="width:30px;height:30px;right:10px;top:10px;font-size:14px;background:${x.bg};color:${x.c}">${x.ico}</div></div>`).join('')}
        </div>
        <div id="cbOv"></div>
        <div id="cbStruct"></div>
        <div id="cbRank"></div>`;
      this.paintOv(el.querySelector('#cbOv'));
      this.paintStruct(el.querySelector('#cbStruct'));
      this.paintRank(el.querySelector('#cbRank'));
    },
    paintOv(box) {
      const b = M().cockpitBank;
      box.innerHTML = `
        <div class="grid-2 mb4">
          <div class="card card-pad"><div class="card-title mb3" style="font-size:var(--fs-md)">贷款余额趋势（亿元）</div>${CH.line({ labels: b.loanTrend.labels, series: [{ name: '贷款余额', data: b.loanTrend.data, color: '#2458F5' }], h: 220 })}</div>
          <div class="card card-pad"><div class="card-title mb3" style="font-size:var(--fs-md)">月度新增投放（亿元）</div>${CH.bars({ labels: b.putTrend.labels, data: b.putTrend.data, unit: '' })}</div>
        </div>
        <div class="card card-pad mb4"><div class="flex-between mb3"><div class="card-title" style="font-size:var(--fs-md)">业务报表</div>
         </div><div id="cbDrill"></div></div>`;
      const drillBox = box.querySelector('#cbDrill');
      const paintDrill = () => this.paintDrillEl(drillBox);
      paintDrill();
    },
    paintDrillEl(drillBox) {
      const b = M().cockpitBank;
      {
        const d = S.drill;
        /* 支行层数据随排行周期联动（branches 存月度基准，按当前周期缩放，保证两表恒一致） */
        const rank = b.branchRank[S.rankPeriod] || b.branchRank['月'];
        const val = (br, base) => {
          const i = rank.idx.indexOf(br.n);
          if (i < 0) return { loan: base.loan, cust: base.cust };
          const fl = base.loan ? rank.loan[i] / base.loan : 0, fc = base.cust ? rank.cust[i] / base.cust : 0;
          return { loan: (base.loan * fl).toFixed(1).replace(/\.0$/, ''), cust: Math.round(base.cust * fc) };
        };
        if (d.lv === 0) drillBox.innerHTML = `<table class="tbl"><thead><tr><th>支行网点</th><th class="num">贷款余额（亿）</th><th class="num">覆盖产业</th><th class="num">客户总数</th><th class="num">任务完成率</th></tr></thead><tbody>
          ${rank.idx.map(n => { const i = b.drill.branches.findIndex(x => x.n === n), x = b.drill.branches[i], v = val(x, x); return `<tr class="clickable" data-b="${i}"><td><b>${n}</b></td><td class="num">${v.loan}</td><td class="num">${x.inds || '—'} 个</td><td class="num">${v.cust}</td><td class="num">${x.rate ? x.rate + '%' : '—'}</td></tr>`; }).join('')}</tbody></table>`;
        if (d.lv === 1) { const br = b.drill.branches[d.branch], bv = val(br, br); drillBox.innerHTML = `
          <button class="btn btn-sm btn-ghost mb3" id="bk0">← 返回分行视图</button>
          <div class="mb3 text-sm text-muted">${br.n} · 客户经理视图</div>
          <table class="tbl"><thead><tr><th>客户经理</th><th class="num">分管贷款（亿）</th><th class="num">客户总数</th></tr></thead><tbody>
          ${br.ms.map((x, i) => { const v = val(x, { loan: x.loan, cust: x.cust }); return `<tr class="clickable" data-m="${i}"><td><b>${x.n}</b></td><td class="num">${v.loan}</td><td class="num">${v.cust}</td></tr>`; }).join('')}</tbody></table>`; }
        if (d.lv === 2) { const br = b.drill.branches[d.branch], ms = br.ms[d.manager]; drillBox.innerHTML = `
          <button class="btn btn-sm btn-ghost mb3" id="bk1">← 返回客户经理视图</button>
          <div class="mb3 text-sm text-muted">${br.n} / ${ms.n} · 名下客户</div>
          <table class="tbl"><thead><tr><th>客户</th><th class="num">用信（亿）</th><th></th></tr></thead><tbody>
          ${ms.cos.map(x => `<tr class="clickable" onclick="APP.openCompanyDrawer('${M().companies.find(c => c.short === x.n)?.id || 'JH'}')"><td><b>${x.n}</b></td><td class="num">${x.a || 0}</td><td>${x.a ? '' : '<span class="tag tag-orange">未合作 · 营销中</span>'}</td></tr>`).join('')}</tbody></table>`; }
        drillBox.querySelectorAll('[data-b]').forEach(tr => tr.onclick = () => { S.drill = { lv: 1, branch: +tr.dataset.b, manager: null }; paintDrill(); });
        drillBox.querySelectorAll('[data-m]').forEach(tr => tr.onclick = () => { S.drill.lv = 2; S.drill.manager = +tr.dataset.m; paintDrill(); });
        const bk0 = drillBox.querySelector('#bk0'), bk1 = drillBox.querySelector('#bk1');
        if (bk0) bk0.onclick = () => { S.drill = { lv: 0 }; this.paintDrillEl(drillBox); };
        if (bk1) bk1.onclick = () => { S.drill.lv = 1; this.paintDrillEl(drillBox); };
      }
    },
    paintStruct(box) {
      const b = M().cockpitBank;
      box.innerHTML = `
        <div class="grid-2 mb4">
          <div class="card card-pad"><div class="card-title mb3" style="font-size:var(--fs-md)">产品结构</div>${CH.donut({ data: b.productMix, center: '46%', sub: '信贷为主' })}</div>
          <div class="card card-pad"><div class="card-title mb3" style="font-size:var(--fs-md)">客户分层情况</div>
            ${CH.hbars(b.layerMix.map(x => ({ name: x.name, v: x.cov, extra: `贡献 ${x.contr}%` })), { unit: '%', max: 100 })}
            <div class="banner b-warn mt3" style="padding:9px 13px">拟上市与专精特新分层覆盖率仅 42% / 26%，但贡献了 33% 的业务量——投入产出比最高，建议作为下阶段主攻分层。</div></div>
        </div>`;
    },
    paintRank(box) {
      const b = M().cockpitBank;
      const per = S.rankPeriod, data = b.branchRank[per];
      box.innerHTML = `
        <div class="card card-pad">
          <div class="flex-between mb3" style="flex-wrap:wrap;gap:10px">
            <div class="card-title" style="font-size:var(--fs-md)">支行网点业务排行 <span class="card-sub">按贷款余额</span></div>
            <div class="flex" style="gap:6px">${['周', '月', '季', '年'].map(p => `<button class="chip ${per === p ? 'on' : ''}" data-p="${p}">${p}度</button>`).join('')}</div></div>
          ${CH.hbars(data.idx.map((n, i) => ({ name: n, v: data.loan[i], pre: `<span class="rank-pill ${i < 3 ? 'rank-' + (i + 1) : ''}" style="${i >= 3 ? 'background:#F0F2F7' : ''};margin-right:6px">${i + 1}</span>`, extra: `${data.cust[i]} 户` })), { unit: '亿' })}
        </div>`;
      box.querySelectorAll('[data-p]').forEach(c => c.onclick = () => { S.rankPeriod = c.dataset.p; this.paintRank(box); const db = document.querySelector('#cbDrill'); if (db) this.paintDrillEl(db); });
    }
  };
  VIEWS.manage = VIEWS.cockpit;   /* 路由别名：#/manage → 管理视图 */
})();
