/* ============================================================
   管理驾驶舱 V3：产业视角 / 行内视角 合并为单菜单双视角
   ============================================================ */
(function () {
  const { $, esc, kv, aiPanel, toast, renderTabs, switchTab } = APP;
  const M = () => window.MOCK, CH = window.CH;
  const S = APP.S;

  /* ================= 管理驾驶舱（合并入口） ================= */
  VIEWS.cockpit = {
    render(el) {
      el.innerHTML = `
        <div class="page-head"><div class="page-title">管理驾驶舱</div>
          <span class="tag tag-blue" style="height:28px;padding:0 12px">数据时点 2026-09-28</span></div>
        <div id="ckTabs"></div>`;
      const tabs = [{ id: 'ind', name: '产业分析' }, { id: 'bank', name: '业务分析' }];
      let act = S.ckTab || 'ind';
      renderTabs($('#ckTabs'), tabs, act, t => { act = t; S.ckTab = t; paint(); });
      const paint = () => {
        const box = switchTab($('#ckTabs'), tabs, act, paint);
        if (act === 'ind') VIEWS.cockpitInd.paintTab(box);
        else VIEWS.cockpitBank.paintTab(box);
      }; paint();
    }
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
})();
