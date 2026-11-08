/* ============================================================
   核心视图 V2（门户版）：首页 / 产业动态（含政策+AI问述） / 同业对标
   ============================================================ */
(function () {
  const { $, esc, layerTag, statusTag, segTag, aiPanel, kv, toast, openModal, openPolicy, renderTabs, switchTab, go } = APP;
  const M = () => window.MOCK, CH = window.CH;
  window.VIEWS = window.VIEWS || {};

  /* ---------- 资讯分类与行渲染（首页资讯快讯 + 产业动态页共用） ---------- */
  const CATS = ['全部', '风险提示', '产业资讯', '政策资讯', '产业基金', '同行资讯'];
  const catOf = n => n.risk ? '风险提示' : (n.etype === '政策' || n.ptag === '产业政策') ? '政策资讯' : n.ptag === '产业基金' ? '产业基金' : '产业资讯';
  const indOf = n => n.ind || (n.seg !== '产业综合' ? '集成电路与电子材料' : '其他行业');
  const catTag = c => ({ '风险提示': 'tag-red', '政策资讯': 'tag-violet', '产业基金': 'tag-cyan', '同行资讯': 'tag-orange', '产业资讯': 'tag-blue' }[c] || 'tag-line');
  function newsRow2(f) {
    if (f.kind === 'peer') { const p = f.p;
      return `<div class="nl-row" style="cursor:default">
        <div class="nl-l1"><span class="tag tag-orange" style="height:19px;font-size:10px;padding:0 6px;flex-shrink:0">同行资讯</span><span class="tag tag-red" style="height:19px;font-size:10px;padding:0 6px;flex-shrink:0">${esc(p.bank)}</span><span class="nl-t">${esc(p.title)}</span><span class="nl-d">${p.date.slice(5)}</span></div>
        <div class="nl-l2"><span>${p.date}</span>·<span>${p.type}</span><span class="nl-ai"><span class="t">${esc(p.detail)}</span></span></div>
      </div>`; }
    if (f.kind === 'risk') { const e = f.e;
      return `<div class="nl-row" onclick="${e.news ? `APP.openNews('${e.news}')` : `APP.go('news',{cat:'风险提示'})`}">
        <div class="nl-l1"><span class="rb-lv ${e.lv === '高' ? 'hi' : 'md'}" style="flex-shrink:0">${e.lv}</span><span class="tag tag-red" style="height:19px;font-size:10px;padding:0 6px;flex-shrink:0">风险提示</span><span class="tag tag-line" style="height:19px;font-size:10px;padding:0 6px;flex-shrink:0">${e.ind}</span><span class="nl-t">${esc(e.title)}</span><span class="nl-d">${e.date}</span></div>
        <div class="nl-l2"><span>2026-${e.date}</span>·<span>${e.type}</span><span class="nl-ai"><span class="t">${e.news ? '关联资讯详情与 AI 风险解读，点击查看全文' : '点击进入风险提示分类查看全部风险事件'}</span></span><span class="nl-more">风险详情 ›</span></div>
      </div>`; }
    const n = f.n;
    return `<div class="nl-row" onclick="APP.openNews('${n.id}')">
      <div class="nl-l1"><span class="tag ${catTag(f.cat)}" style="height:19px;font-size:10px;padding:0 6px;flex-shrink:0">${f.cat}</span><span class="tag tag-line" style="height:19px;font-size:10px;padding:0 6px;flex-shrink:0">${indOf(n)}</span><span class="nl-t">${esc(n.title)}</span><span class="nl-d">${n.date.slice(5)}</span></div>
      <div class="nl-l2"><span>${n.date}</span>·<span>${esc(n.source)}</span><span class="nl-ai"><span class="ai-badge" style="font-size:9px;height:15px;padding:0 4px;flex-shrink:0">AI</span><span class="t">${esc(n.ai)}</span></span><span class="nl-more">详情 ›</span></div>
    </div>`;
  }

  /* ================= 首页（门户） ================= */
  VIEWS.dashboard = {
    render(el) {
      const m = M();
      el.innerHTML = `
        <!-- ===== 行情速查（点击右侧抽屉查看完整报价） ===== -->
        <div class="card card-pad mb4" id="rateEntry" style="cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--brand-500)'" onmouseout="this.style.borderColor='var(--line)'">
          <div class="flex-between wrap" style="gap:14px">
            <div class="flex" style="gap:16px;flex-wrap:wrap">
              <div><div class="text-xs text-muted">行情速查</div><div class="text-xs text-muted mt1" style="opacity:.75">${m.rateBoard.ts}</div></div>
              <div style="padding-left:16px;border-left:1px solid var(--line)"><div class="text-xs text-muted">1年期LPR</div><b class="fs-num" style="font-size:17px">3.00%</b></div>
              <div style="padding-left:16px;border-left:1px solid var(--line)"><div class="text-xs text-muted">票据贴现(6M)</div><b class="fs-num" style="font-size:17px">2.6-3.0%</b></div>
              <div style="padding-left:16px;border-left:1px solid var(--line)"><div class="text-xs text-muted">普惠小微贷</div><b class="fs-num" style="font-size:17px">3.65%起</b></div>
              <div style="padding-left:16px;border-left:1px solid var(--line)"><div class="text-xs text-muted">美元中间价</div><b class="fs-num" style="font-size:17px">667.91</b></div>
              <div style="padding-left:16px;border-left:1px solid var(--line)"><div class="text-xs text-muted">理财·1年</div><b class="fs-num" style="font-size:17px">/</b></div>
            </div>
            <span class="btn btn-primary btn-sm">📈 完整行情</span>
          </div>
        </div>

        <!-- ===== 第一行：近期政策 · 同业动态 · 订阅监控（原管理驾驶舱看板集合内容） ===== -->
        <div class="home-row" style="grid-template-columns:minmax(0,1.05fr) minmax(0,1.05fr) 336px">
          <div class="card" style="display:flex;flex-direction:column;min-width:0;overflow:hidden">
            <div class="sec-head" style="padding:14px 16px 4px"><div class="sec-title"><span class="tbar"></span>近期政策<span class="text-xs text-muted" style="font-weight:400;margin-left:8px">政策库 · 申报窗口提醒</span></div>
              <span class="sec-more" onclick="APP.go('news',{cat:'政策资讯'})">全部政策 ›</span></div>
            <div id="insPolicy" style="flex:1;min-height:0;overflow-y:auto"></div>
          </div>
          <div class="card" style="display:flex;flex-direction:column;min-width:0;overflow:hidden">
            <div class="sec-head" style="padding:14px 16px 4px"><div class="sec-title"><span class="tbar"></span>同业动态<span class="text-xs text-muted" style="font-weight:400;margin-left:8px">他行新产品 / 战略合作 / 授信动作</span></div>
              <span class="sec-more" onclick="APP.go('news',{cat:'同行资讯'})">全部同业 ›</span></div>
            <div id="insPeer" style="flex:1;min-height:0;overflow-y:auto"></div>
          </div>
          <div class="card rail-sub">
            <div class="rs-head"><b>异常数据监控<span class="text-xs text-muted" style="font-weight:400;margin-left:8px">T+1跑批 · 10-19 06:00</span></b><span class="rs-manage" id="rkMore">更多 ›</span></div>
            <div id="rkList" style="max-height:340px;overflow:hidden"></div>
            <div class="rs-head" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)"><b>订阅推送</b></div>
            <div class="home-news-tabs" style="padding:0 0 8px">
              <button class="hnt ${APP.S.subTab !== '行业' ? 'on' : ''}" data-st="企业">企业订阅</button>
              <button class="hnt ${APP.S.subTab === '行业' ? 'on' : ''}" data-st="行业">行业订阅</button>
            </div>
            <div class="sub-scroll" id="subBody"></div>
          </div>
        </div>

        <!-- ===== 第二行：重点机会挖掘 · 贷款产品 ===== -->
        <div class="home-grid">
          <div class="card">
            <div class="sec-head" style="padding:14px 16px 4px"><div class="sec-title">重点机会挖掘</div>
              <span class="sec-more" onclick="APP.go('funnel',{tab:'task'})">全部机会 ›</span></div>
            ${m.opportunities.slice(0, 5).map((o, i) => this.oppItem(o, i)).join('')}
          </div>
          <div class="card card-pad" style="display:flex;flex-direction:column;align-self:start;height:519px">
            <div class="flex-between mb2"><b>贷款产品</b></div>
            <input class="input" id="lpQ" placeholder="搜索产品…" style="height:30px;margin-bottom:8px">
            <div id="lpList" style="flex:1;min-height:0;display:flex;flex-direction:column"></div>
          </div>
        </div>`;
      this.renderInsPolicy(el, m);
      this.renderInsPeer(el, m);
      this.renderLp(el, m);
      this.renderRisk(el, m);
      this.renderSub(el, m);
      /* 机会条目展开/收起 */
      el.querySelectorAll('.opp-head').forEach(h => h.onclick = () => h.parentElement.classList.toggle('open'));
    },
    oppItem(o, i) {
      const cls = o.match >= 90 ? 'opp-m-hi' : o.match >= 82 ? 'opp-m-md' : 'opp-m-lo';
      const srcCls = { '标讯': 'tag-cyan', '产业动态': 'tag-blue', '舆情': 'tag-orange', '政策资讯': 'tag-violet', '同业对标': 'tag-red' };
      return `<div class="opp-item">
        <div class="opp-head">
          <div class="opp-match ${cls}"><b>${o.match}</b><i>匹配</i></div>
          <div style="flex:1;min-width:0">
            <div class="opp-trow">
              <div class="opp-title">${esc(o.title)}</div>
              <div class="opp-tags">${o.signals.slice(0, 3).map(s => `<span class="tag ${srcCls[s.s] || 'tag-line'}" style="height:18px;font-size:10px;padding:0 6px">${s.s}</span>`).join('')}<span class="tag ${o.potCls}" style="height:18px;font-size:10px;padding:0 6px">${o.pot}</span></div>
            </div>
            <div class="opp-sub">${esc(o.sub)}</div>
            ${o.signals[0] ? `<div class="opp-brief">💡 ${o.signals[0].s} · ${esc(o.signals[0].t)}（${o.signals[0].d}）</div>` : ''}
          </div>
          <span class="opp-arrow">▶</span>
        </div>
        <div class="opp-body">
          <div class="opp-sec">📊 公开信号依据</div>
          ${o.signals.map(s => `<div class="opp-sig"><span class="tag ${srcCls[s.s] || 'tag-line'}" style="flex-shrink:0">${s.s}</span><span style="flex:1">${esc(s.t)}</span><span class="text-xs text-muted" style="flex-shrink:0">${s.d}</span></div>`).join('')}
          <div class="opp-sec">🏦 同业类似合作</div><div class="text-sm text-sub" style="line-height:1.7">${esc(o.peers)}</div>
          <div class="opp-sec">✅ 行内类似案例</div><div class="text-sm text-sub" style="line-height:1.7">${esc(o.cases)}</div>
          <div class="opp-sec">🎯 与我行合作潜在性（${o.pot}）</div><div class="text-sm text-sub" style="line-height:1.7">${esc(o.potWhy)}</div>
          <div class="banner b-act mt3">🎯 <b>建议动作：</b>${esc(o.action)} <span style="float:right;color:var(--brand-500);font-weight:400">一键转任务 ›</span></div>
          <div class="flex mt3" style="gap:8px;justify-content:flex-end">
            ${o.co ? `<button class="btn btn-ghost btn-sm" onclick="APP.openCompanyDrawer('${o.co}')">企业详情</button>` : ''}
            <button class="btn btn-primary btn-sm" onclick="APP.go('funnel',{tab:'task'})">转为跟进任务</button>
          </div>
        </div>
      </div>`;
    },
    homeFeed(m, cat) {
      const c = cat || APP.S.fkCat || '全部';
      let feed = [
        ...m.news.filter(n => !n.hot).map(n => ({ kind: 'news', cat: catOf(n), date: n.date, n })),
        ...m.peerNews.map(p => ({ kind: 'peer', cat: '同行资讯', date: p.date, p })),
      ];
      if (c !== '全部') feed = feed.filter(f => f.cat === c);
      feed.sort((a, b) => b.date.localeCompare(a.date));
      return feed.slice(0, 6).map(f => newsRow2(f)).join('');
    },
    fkArea(m) {
      const cat = APP.S.fkCat || '全部';
      const pinned = m.news.filter(n => n.hot && (cat === '全部' || catOf(n) === cat));
      return `
        <div class="fk-chips">${CATS.map(c => `<button class="chip ${cat === c ? 'on' : ''}" data-fk="${c}">${c}</button>`).join('')}</div>
        <div style="padding:2px 4px 8px">
          ${this.pinGroup(pinned)}
          <div class="fk-feed">${this.homeFeed(m, cat)}</div>
        </div>`;
    },
    /* 近期政策（政策库前6条 · 点击进政策详情） */
    renderInsPolicy(el, m) {
      const box = el.querySelector('#insPolicy'); if (!box) return;
      const pols = m.policies.slice(0, 6);
      const lvTag = l => l === '国家' ? 'tag-red' : l === '江苏省' ? 'tag-blue' : 'tag-cyan';
      box.innerHTML = pols.map(p => `<div class="nl-row" onclick="APP.openPolicy('${p.id}')">
        <div class="nl-l1" style="min-width:0"><span class="tag ${lvTag(p.level)}" style="height:19px;font-size:10px;padding:0 6px;flex-shrink:0">${esc(p.level)}</span><span class="tag tag-violet" style="height:19px;font-size:10px;padding:0 6px;flex-shrink:0">${esc(p.type)}</span><span class="nl-t">${esc(p.title)}</span><span class="nl-d">${p.date.slice(5)}</span></div>
        <div class="nl-l2" style="min-width:0"><span style="flex-shrink:0">${p.date} · ${esc(p.dept)}</span><span class="nl-ai" style="min-width:0"><span class="ai-badge" style="font-size:9px;height:15px;padding:0 4px;flex-shrink:0">AI</span><span class="t" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.ai)}</span></span><span class="nl-more" style="flex-shrink:0">详情 ›</span></div>
      </div>`).join('') || '<div class="text-sm text-muted" style="padding:14px 2px">暂无政策</div>';
    },
    /* 同业动态（peerNews 前6条 · 单行省略不换行） */
    renderInsPeer(el, m) {
      const box = el.querySelector('#insPeer'); if (!box) return;
      const rows = m.peerNews.slice(0, 6);
      box.innerHTML = rows.map(p => `<div class="nl-row" style="cursor:default">
        <div class="nl-l1" style="min-width:0"><span class="tag tag-orange" style="height:19px;font-size:10px;padding:0 6px;flex-shrink:0">同行资讯</span><span class="tag tag-red" style="height:19px;font-size:10px;padding:0 6px;flex-shrink:0">${esc(p.bank)}</span><span class="nl-t">${esc(p.title)}</span><span class="nl-d">${p.date.slice(5)}</span></div>
        <div class="nl-l2" style="min-width:0"><span style="flex-shrink:0">${p.date} · ${esc(p.type)}</span><span class="nl-ai" style="min-width:0"><span class="t" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.detail)}</span></span></div>
      </div>`).join('') || '<div class="text-sm text-muted" style="padding:14px 2px">暂无同业动态</div>';
    },
    renderLp(el, m) {
      const box = el.querySelector('#lpList'), q = el.querySelector('#lpQ');
      const entry = el.querySelector('#rateEntry');
      if (entry) entry.onclick = () => {
        const rb = m.rateBoard;
        const H = (t) => `<div style="display:flex;align-items:center;gap:8px;margin:18px 0 8px"><span style="width:4px;height:16px;border-radius:2px;background:var(--brand-500)"></span><b style="font-size:var(--fs-md)">${t}</b></div>`;
        const row = (n, v, chg, unit) => `<div class="flex-between" style="padding:7px 0;border-bottom:1px dashed var(--line)"><span class="text-sm text-sub">${n}</span><span class="flex" style="gap:10px"><b class="text-sm fs-num">${v}</b>${chg !== undefined ? `<span class="text-xs" style="color:${chg < 0 ? 'var(--ok-500)' : chg > 0 ? 'var(--danger-500)' : 'var(--t3)'};min-width:46px;text-align:right">${chg === 0 ? '—' : (chg > 0 ? '+' : '') + chg + (unit || 'bp')}</span>` : ''}</span></div>`;
        APP.openDrawer('行情速查', `
          ${H('市场基准利率')}${rb.base.map(x => row(x.n, x.v)).join('')}
          ${H('FTP 内部资金转移报价')}${rb.ftp.map(x => row(x.n, `${Number.parseFloat(x.v).toFixed(2)}%`)).join('')}
          ${H('本区域自律定价（江苏省）')}${rb.self.map(x => row(x.n, x.v)).join('')}
          ${H('主要外币汇率（中间价）')}${rb.fx.map(x => row(x.n, x.v)).join('')}
          ${H('重点理财产品（业绩比较基准）')}${rb.wealth.map(x => row(x.n, x.v)).join('')}
          <div class="text-xs text-muted" style="margin-top:14px">报价时点 ${rb.ts} · 仅供参考，实际以审批与交易为准 · 理财产品非存款</div>`);
      };
      if (!box) return;
      const PAGE = 6;
      const openLp = idx => {
        const p = m.loanProducts[idx];
        APP.openModal({ wide: true, title: p.name, body: `
          <div class="ai-panel" style="margin-bottom:14px"><div class="ai-head"><span class="ai-badge">AI</span>适用客户特征提示</div><div class="ai-body">${p.aiTip}</div></div>
          <div class="text-xs text-muted" style="font-weight:600;margin-bottom:6px">产品简介</div>
          <div class="text-sm text-sub" style="line-height:1.8;margin-bottom:14px">${p.brief}</div>
          <div class="text-xs text-muted" style="font-weight:600;margin-bottom:8px">产品要素</div>
          <div class="grid-2" style="gap:10px;margin-bottom:14px">
            <div class="kv"><div class="kv-k">额度</div><div class="kv-v" style="font-size:13px;line-height:1.5">${p.quota}</div></div>
            <div class="kv"><div class="kv-k">利率</div><div class="kv-v" style="font-size:13px;color:var(--brand-600);line-height:1.5">${p.rate}</div></div>
            <div class="kv"><div class="kv-k">担保方式</div><div class="kv-v" style="font-size:13px;line-height:1.5">${p.assure}</div></div>
            <div class="kv"><div class="kv-k">适用对象</div><div class="kv-v" style="font-size:13px;line-height:1.5">${p.fit}</div></div>
          </div>
          <div class="grid-2" style="gap:14px">
            <div style="background:#F8FAFD;border-radius:8px;padding:12px 14px">
              <div class="text-xs text-muted" style="font-weight:600;margin-bottom:6px">申请条件</div>
              ${p.cond.map(r => `<div class="flex mb2" style="gap:8px;align-items:flex-start"><span style="color:var(--brand-500)">·</span><span class="text-sm text-sub" style="line-height:1.7">${r}</span></div>`).join('')}
            </div>
            <div style="background:#F8FAFD;border-radius:8px;padding:12px 14px">
              <div class="text-xs text-muted" style="font-weight:600;margin-bottom:6px">产品特色</div>
              <div class="text-sm text-sub" style="line-height:1.8">${p.feat}</div>
            </div>
          </div>
          <div class="text-xs text-muted" style="margin-top:12px">利率为营销参考，实际以审批为准</div>`,
        foot: `<button class="btn btn-primary" onclick="APP.closeModal()">关闭</button>` });
      };
      const paint = (kw, pg) => {
        const list = m.loanProducts.filter(p => !kw || p.name.includes(kw) || p.brief.includes(kw));
        const pages = Math.max(1, Math.ceil(list.length / PAGE));
        const cur = Math.min(pg || 0, pages - 1);
        box.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:10px;flex:1;min-height:0">` + list.slice(cur * PAGE, cur * PAGE + PAGE).map(p => `
          <div data-lp="${m.loanProducts.indexOf(p)}" class="card" style="padding:12px 13px;cursor:pointer;transition:.15s;display:flex;flex-direction:column;justify-content:center" onmouseover="this.style.borderColor='var(--brand-500)'" onmouseout="this.style.borderColor='var(--line)'">
            <div style="font-size:13px;font-weight:700;line-height:1.35">${p.name}</div>
            <div style="font-size:12px;color:var(--brand-600);font-weight:700;margin-top:5px">${p.rate.split(' ')[0]}</div>
            <div class="text-xs text-muted" style="margin-top:4px">期限 ${p.term}</div>
          </div>`).join('') + `</div>` || '<div class="text-sm text-muted" style="padding:12px 4px">未找到匹配产品</div>';
        if (pages > 1) box.innerHTML += `<div class="flex-between" style="padding:8px 4px 0"><span class="text-xs" style="color:var(--t3);cursor:pointer" data-lpp="prev">‹ 上一页</span><span class="text-xs text-muted">${cur + 1} / ${pages}</span><span class="text-xs" style="color:var(--t3);cursor:pointer" data-lpp="next">下一页 ›</span></div>`;
        box.querySelectorAll('[data-lp]').forEach(c => c.onclick = () => openLp(+c.dataset.lp));
        box.querySelectorAll('[data-lpp]').forEach(b => b.onclick = () => paint(kw, cur + (b.dataset.lpp === 'next' ? 1 : -1)));
      };
      paint('', 0);
      if (q) q.oninput = () => paint(q.value.trim(), 0);
    },
    renderRisk(el, m) {
      const list = el.querySelector('#rkList');
      if (!list) return;
      const done = APP.S._rkDone || (APP.S._rkDone = {});
      const keyOf = r => r.co + '|' + r.item;
      const label = r => (m.coById(r.co) ? m.coById(r.co).short + ' · ' : '') + r.per + (r.rep || '公开报表') + ' · ' + r.item + '差异';
      const stCls = s => s === '已解决' ? 'tag-green' : s === '已核实非异常' ? 'tag-blue' : 'tag-orange';
      const feed = m.riskFeed;
      list.innerHTML = feed.map(r => `<div class="msg-item" style="padding:8px 0;border-bottom:1px dashed var(--line);cursor:pointer" data-rk="${keyOf(r)}">
        <div style="flex:1;min-width:0">
          <div class="m-title" style="display:flex;align-items:center;gap:6px">
            <span class="tag ${stCls(done[keyOf(r)] || '未解决')}" style="height:17px;font-size:10px;padding:0 5px;flex-shrink:0">${done[keyOf(r)] || '未解决'}</span>
            <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:var(--fs-sm);font-weight:600">${esc(label(r))}</span>
          </div>
          <div class="m-time">${r.d}</div>
        </div></div>`).join('') || '<div class="text-sm text-muted" style="padding:14px 2px">T+1跑批暂未发现财务数据异常</div>';
      const resolve = (r, state, after) => {
        done[keyOf(r)] = state;
        APP.toast('已标记为' + state);
        this.renderRisk(el, m);
        if (after) after();
      };
      const more = el.querySelector('#rkMore');
      if (more) more.onclick = () => {
        const PER = 5;
        const pages = Math.max(1, Math.ceil(m.riskFeed.length / PER));
        let cur = 0;
        APP.openModal({ wide: true, title: '异常数据列表', body: `
          <table class="tbl"><thead><tr><th>企业</th><th>报表</th><th>指标</th><th style="width:64px">日期</th><th style="width:64px">状态</th></tr></thead><tbody id="rlBody"></tbody></table>`,
        foot: `<button class="btn btn-primary" onclick="APP.closeModal()">关闭</button>` });
        const paintRl = pg => {
          cur = Math.max(0, Math.min(pg, pages - 1));
          const tb = document.querySelector('#rlBody');
          tb.innerHTML = m.riskFeed.slice(cur * PER, cur * PER + PER).map((r, j) => `<tr class="clickable" data-rl="${cur * PER + j}"><td class="text-sm" style="font-weight:600">${m.coById(r.co) ? esc(m.coById(r.co).short) : ''}</td><td class="text-sm text-sub">${esc(r.per + (r.rep || '公开报表'))}</td><td class="text-sm text-sub">${esc(r.item)}差异</td><td class="text-xs text-muted">${r.d}</td><td>${done[keyOf(r)] ? `<span class="tag ${stCls(done[keyOf(r)])}" style="height:18px;font-size:10px;padding:0 6px">${done[keyOf(r)]}</span>` : '<span class="tag tag-orange" style="height:18px;font-size:10px;padding:0 6px">未解决</span>'}</td></tr>`).join('')
            + (pages > 1 ? `<tr><td colspan="5" style="padding:9px 4px 2px"><div class="flex-between"><span class="text-xs" style="color:var(--t3);cursor:pointer" data-rp="prev">‹ 上一页</span><span class="text-xs text-muted">${cur + 1} / ${pages}</span><span class="text-xs" style="color:var(--t3);cursor:pointer" data-rp="next">下一页 ›</span></div></td></tr>` : '');
          tb.querySelectorAll('[data-rl]').forEach(tr => tr.onclick = () => {
            const i = +tr.dataset.rl, r = m.riskFeed[i];
            const ex = document.querySelector('tr[data-rx]');
            if (ex) ex.remove();
            if (tr.dataset.open === '1') { tr.dataset.open = '0'; return; }
            tb.querySelectorAll('[data-rl]').forEach(x => x.dataset.open = '0');
            tr.dataset.open = '1';
            const det = document.createElement('tr');
            det.setAttribute('data-rx', '1');
            det.innerHTML = `<td colspan="5" style="background:#FAFBFD;padding:14px 16px">
              <div class="text-sm" style="font-weight:700;line-height:1.8">${m.coById(r.co) ? esc(m.coById(r.co).name) : ''}</div>
              <div class="text-sm text-sub mt2" style="line-height:1.8">${esc(r.sheet)}</div>
              <div class="text-sm text-sub mt2" style="line-height:1.8">差异项：<b>${esc(r.item)}差异</b></div>
              <div class="mt3" style="padding:10px 14px;background:#fff;border-radius:10px">
                <div class="text-sm text-sub" style="line-height:1.8"><span class="tag tag-line" style="height:17px;font-size:10px;padding:0 5px;margin-right:6px;vertical-align:1px">公开</span>${esc(r.pub || '')}<span class="text-xs text-muted" style="margin-left:6px">来源：${esc(r.src || '')}</span></div>
                <div class="text-sm text-sub mt2" style="line-height:1.8"><span class="tag tag-blue" style="height:17px;font-size:10px;padding:0 5px;margin-right:6px;vertical-align:1px">行内</span>${esc(r.inn || '')}</div>
              </div>
              ${done[keyOf(r)] ? '' : `<button class="btn btn-sm btn-ghost mt3" data-rsv="已解决">✓ 已解决</button><button class="btn btn-sm btn-ghost mt3" style="margin-left:8px" data-rsv="已核实非异常">✓ 已核实非异常</button>`}</td>`;
            tr.after(det);
            det.querySelectorAll('[data-rsv]').forEach(sv => sv.onclick = e => { e.stopPropagation(); resolve(r, sv.dataset.rsv, () => paintRl(cur)); });
          });
          tb.querySelectorAll('[data-rp]').forEach(b => b.onclick = () => paintRl(cur + (b.dataset.rp === 'next' ? 1 : -1)));
        };
        paintRl(0);
      };
      list.querySelectorAll('[data-rk]').forEach(it => it.onclick = () => {
        const r = m.riskFeed.find(x => keyOf(x) === it.dataset.rk);
        if (!r) return;
        const c = m.coById(r.co);
        APP.openModal({ small: true, title: '异常数据详情', body: `
          <div class="text-sm" style="font-weight:700;line-height:1.8">${c ? esc(c.name) : ''}<span class="text-xs text-muted" style="font-weight:400;margin-left:10px">${r.d}</span></div>
          <div class="text-sm text-sub mt2" style="line-height:1.8">${esc(r.sheet)}</div>
          <div class="text-sm text-sub mt2" style="line-height:1.8">差异项：<b>${esc(r.item)}差异</b></div>
          <div class="mt3" style="padding:12px 14px;background:#F8FAFD;border-radius:10px">
            <div class="text-sm text-sub" style="line-height:1.8"><span class="tag tag-line" style="height:17px;font-size:10px;padding:0 5px;margin-right:6px;vertical-align:1px">公开</span>${esc(r.pub || '—')}<span class="text-xs text-muted" style="margin-left:6px">来源：${esc(r.src || '')}</span></div>
            <div class="text-sm text-sub mt2" style="line-height:1.8"><span class="tag tag-blue" style="height:17px;font-size:10px;padding:0 5px;margin-right:6px;vertical-align:1px">行内</span>${esc(r.inn || '—')}</div>
          </div>`,
        foot: `${done[keyOf(r)] ? '' : '<button class="btn btn-ghost" id="rkDone">✓ 已解决</button><button class="btn btn-ghost" id="rkOk">✓ 已核实非异常</button>'}<button class="btn btn-primary" onclick="APP.closeModal()">知道了</button>` });
        const db = document.querySelector('#rkDone');
        if (db) db.onclick = () => { APP.closeModal(); resolve(r, '已解决'); };
        const ob = document.querySelector('#rkOk');
        if (ob) ob.onclick = () => { APP.closeModal(); resolve(r, '已核实非异常'); };
      });
    },
    renderSub(el, m) {
      const body = el.querySelector('#subBody');
      if (!body) return;
      const tab = APP.S.subTab || '企业';
      const rows = m.messages.filter(x => x.grp === tab);
      body.innerHTML = rows.map(x => `<div class="msg-item" style="padding:9px 0;border-bottom:1px dashed var(--line);cursor:pointer" onclick="APP.openNews('${x.news}')">
        <span class="m-dot" style="background:${tab === '行业' ? (x.type === 'warn' ? 'var(--warn-500)' : 'var(--brand-500)') : 'var(--ok-500)'};margin-top:6px"></span>
        <div style="flex:1;min-width:0"><div class="m-title" style="display:flex;align-items:center;gap:6px"><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.t)}</span><span class="tag ${tab === '行业' ? 'tag-line' : 'tag-blue'}" style="height:17px;font-size:10px;padding:0 5px;flex-shrink:0">${x.ind}</span></div>
        <div class="m-time">${x.d}</div></div></div>`).join('') || '<div class="text-sm text-muted" style="padding:12px 2px">暂无${tab}订阅推送</div>'.replace('${tab}', tab);
      el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { APP.S.subTab = b.dataset.st; this.renderSub(el, m); el.querySelectorAll('[data-st]').forEach(x => x.classList.toggle('on', x.dataset.st === APP.S.subTab)); });
    },
    /* ---------- 任务待办（承接任务 + 最新跟进，联动工作台） ---------- */
    todoArea(m) {
      const rk = APP.role().key;
      const F = APP.S.fn || { tasks: m.funnel.tasksSeed, subs: m.funnel.subsSeed };
      let tasks = F.tasks;
      if (rk === 'rm') tasks = tasks.filter(t => t.rm === 'rm-drz');
      else if (rk === 'head') tasks = tasks.filter(t => (m.funnel.rms.find(r => r.id === t.rm) || {}).unit === '南京分行营业部');
      const cName = id => { const c = m.funnel.cos.find(x => x.id === id); return c ? c.short : ''; };
      const rName = id => { const r = m.funnel.rms.find(x => x.id === id); return r ? r.name : ''; };
      const stTag = s2 => ({ 待接收: 'tag-gray', 跟进中: 'tag-blue', 已反馈: 'tag-green', 已关闭: 'tag-line' }[s2] || 'tag-gray');
      const overdue = t => +t.due.replace('-', '') < 1105 && t.status !== '已反馈' && t.status !== '已关闭';
      const rows = tasks.map(t => {
        const last = t.log[0];
        return `<div class="todo-row" data-td-go="${t.id}">
          <div class="tr1">
            <b>${esc(cName(t.co))}</b>
            <span class="tag tag-line" style="height:20px;font-size:11px">${esc(t.type)}</span>
            <span class="tag ${stTag(t.status)}" style="height:20px;font-size:11px">${t.status}</span>
            ${overdue(t) ? '<span class="tag tag-red" style="height:20px;font-size:11px">超期</span>' : ''}
            <span style="flex:1"></span>
            <span style="flex-shrink:0"><button class="btn btn-text btn-sm" data-td-note="${t.id}">纪要</button></span>
          </div>
          <div class="tr2">截止 <b>${t.due}</b> · ${esc(rName(t.rm))} · 重点：${esc(t.prods.slice(0, 2).join(' / '))}</div>
          ${last
            ? `<div class="tr3"><span class="tag tag-blue" style="height:18px;font-size:10px;flex-shrink:0">${esc(last.t)}</span><span>${last.d} · ${esc(last.by)} — ${esc(last.x.length > 52 ? last.x.slice(0, 52) + '…' : last.x)}</span></div>`
            : `<div class="tr3" style="color:var(--warn-500)">尚无跟进记录，请尽快接收并拜访</div>`}
        </div>`;
      }).join('');
      return `
        <div class="flex-between" style="padding:10px 16px 6px">
          <b style="font-size:16px">${rk === 'rm' ? '我承接的任务' : rk === 'head' ? '本支行任务' : rk === 'pm' ? '我下发的任务' : '全辖任务'}<span style="font-size:12px;color:var(--t3);font-weight:400;margin-left:8px">${tasks.length} 项${tasks.filter(overdue).length ? ' · <span style="color:var(--danger-500)">超期 ' + tasks.filter(overdue).length + '</span>' : ''}</span></b>
          <span style="flex:1"></span>
        </div>
        <div class="todo-list">${rows || '<div style="padding:20px 16px;font-size:13px;color:var(--t3)">暂无承接任务</div>'}</div>
        <style>
          .todo-list { display:flex; flex-direction:column; gap:9px; padding:2px 16px 14px; flex:1; min-height:0; }
          .todo-row { flex:1; min-height:0; display:flex; flex-direction:column; justify-content:space-evenly; gap:9px; padding:12px 16px; border:1px solid var(--line); border-radius:10px; background:#FAFBFC; cursor:pointer; transition:.15s; }
          .todo-row:hover { border-color:var(--brand-500); background:var(--brand-50); }
          .todo-row .tr1 { display:flex; align-items:center; gap:8px; line-height:1.6; }
          .todo-row .tr1 b { font-size:16px; }
          .todo-row .tr2 { font-size:13.5px; color:var(--t2); line-height:1.7; }
          .todo-row .tr2 b { color:var(--t1); }
          .todo-row .tr3 { display:flex; align-items:center; gap:8px; font-size:13.5px; color:var(--t2); background:#fff; border:1px dashed var(--line); border-radius:7px; padding:8px 12px; line-height:1.7; }
          .todo-row .tr3 .tag { flex-shrink:0; }
        </style>`;
    },
    bindTodo(el) {
      const area = el.querySelector('#todoArea'); if (!area) return;
      area.querySelectorAll('.todo-row[data-td-go]').forEach(r => r.onclick = e => {
        if (e.target.closest('[data-td-note]')) return;
        APP.go('workbench', { task: r.dataset.tdGo });
      });
      area.querySelectorAll('[data-td-note]').forEach(b => b.onclick = e => { e.stopPropagation(); APP.go('workbench', { task: b.dataset.tdNote, tab: 'visit' }); });
    },
    bindFk(el, m) {
      const area = el.querySelector('#fkArea');
      if (!area) return;
      area.querySelectorAll('[data-fk]').forEach(b => b.onclick = () => {
        const c = b.dataset.fk;
        APP.S.fkCat = c; APP.S.params.cat = c;
        area.innerHTML = this.fkArea(m);
        this.bindFk(el, m);
      });
    },
    pinGroup(list) {
      if (!list.length) return '';
      return `<div class="wk-pin-grp">
        <div class="wpg-head"><span class="tag tag-solid-red" style="height:20px;font-size:10px;padding:0 8px">📌 置顶 · 本周重点关注</span></div>
        ${list.map(n => `<div class="wpg-row" onclick="APP.openNews('${n.id}')">
          <div class="r1"><span class="wpg-t">${esc(n.title)}</span><span class="wpg-d">${n.date.slice(5)}</span></div>
          <div class="wpg-ai"><span class="ai-badge" style="font-size:9px;height:15px;padding:0 4px;flex-shrink:0">AI</span><span class="t">${esc(n.ai)}</span></div>
        </div>`).join('')}
      </div>`;
    }
  };

  /* ================= 产业动态（五类聚合 + 左侧筛选 + 翻页列表） ================= */
  VIEWS.news = {
    render(el) {
      el.innerHTML = `
        <div class="page-head"><div class="page-title">产业动态</div></div>
        <div id="newsMain"></div>`;
      this.paintMain($('#newsMain'));
    },
    buildFeed(m) {
      const P = APP.S.params;
      let feed;
      if (P.cat === '风险提示') {
        feed = m.riskEvents.map(e => ({ kind: 'risk', date: '2026-' + e.date, e }));
      } else {
        feed = [
          ...m.news.map(n => ({ kind: 'news', cat: catOf(n), date: n.date, n })),
          ...m.peerNews.map(p => ({ kind: 'peer', cat: '同行资讯', date: p.date, p })),
        ];
        if (P.cat === '产业资讯') {
          const ind = P.ind || '全部行业';
          feed = feed.filter(f => f.kind === 'news' && f.cat === '产业资讯' && (ind === '全部行业' || indOf(f.n) === ind));
        } else if (P.cat !== '全部') {
          feed = feed.filter(f => f.cat === P.cat);
        }
      }
      const days = +P.days || 0;
      if (days) feed = feed.filter(f => (new Date('2026-10-11') - new Date(f.date)) / 86400000 <= days);
      if (P.kw) feed = feed.filter(f => ((f.n && f.n.title + f.n.sum) || (f.p && f.p.title + f.p.detail) || (f.e && f.e.title)).includes(P.kw));
      feed.sort((a, b) => b.date.localeCompare(a.date));
      return feed;
    },
    paintMain(box) {
      const m = M(), P = APP.S.params;
      P.cat = P.cat || '全部';
      const PER = 10;
      const counts = {
        '全部': m.news.length + m.peerNews.length, '风险提示': m.riskEvents.length,
        '产业资讯': m.news.filter(n => catOf(n) === '产业资讯').length,
        '政策资讯': m.news.filter(n => catOf(n) === '政策资讯').length,
        '产业基金': m.news.filter(n => catOf(n) === '产业基金').length,
        '同行资讯': m.peerNews.length };
      const feed = this.buildFeed(m);
      const indOpen = P.indOpen !== undefined ? !!P.indOpen : P.cat === '产业资讯';
      const pages = Math.max(1, Math.ceil(feed.length / PER));
      P.pg = Math.min(Math.max(1, +P.pg || 1), pages);
      const pg = P.pg;
      const pageRows = feed.slice((pg - 1) * PER, pg * PER);
      const pgBtns = () => {
        if (pages <= 1) return '';
        const win = [];
        for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - pg) <= 1) win.push(i);
        let html = `<button class="pg" data-pg="prev" ${pg === 1 ? 'disabled' : ''}>‹</button>`;
        win.forEach((i, idx) => { if (idx > 0 && i - win[idx - 1] > 1) html += '<span style="padding:0 2px;color:var(--t3)">…</span>'; html += `<button class="pg ${i === pg ? 'on' : ''}" data-pg="${i}">${i}</button>`; });
        html += `<button class="pg" data-pg="next" ${pg === pages ? 'disabled' : ''}>›</button>`;
        return html;
      };
      box.innerHTML = `
        <div class="news-layout">
          <aside class="ns-side">
            <div class="ns-g">分类</div>
            ${CATS.map(c => `<div class="ns-i ${P.cat === c ? 'on' : ''}" data-cat="${c}">${c}<span style="display:flex;align-items:center">${counts[c] !== undefined ? `<span class="ns-c">${counts[c]}</span>` : ''}${c === '产业资讯' ? `<span class="ns-caret" data-caret="1">${indOpen ? '▾' : '▸'}</span>` : ''}</span></div>` +
              (c === '产业资讯' && indOpen ? ['全部行业', ...m.industries.map(x => x.name), '其他行业'].map(i => `<div class="ns-i sub ${(P.ind || '全部行业') === i ? 'on' : ''}" data-ind="${i}">${i}</div>`).join('') : '')).join('')}
            <div class="ns-g" style="margin-top:10px">时间</div>
            ${[['0', '全部时间'], ['7', '近一周'], ['30', '近一月']].map(([v, t]) => `<div class="ns-i ${String(P.days || 0) === v ? 'on' : ''}" data-days="${v}">${t}</div>`).join('')}
          </aside>
          <div>
            <div class="ns-toolbar">
              <input class="input" id="nsKw" placeholder="搜索标题 / 关键词…" value="${esc(P.kw || '')}" style="width:240px;height:32px">
              <span class="text-xs text-muted">共 ${feed.length} 条 · 每页 ${PER} 条 · 按时间倒序</span>
            </div>
            <div class="card">
              ${pageRows.map(f => newsRow2(f)).join('') || `<div class="empty" style="padding:48px 20px"><div class="e-ico">🔍</div><div class="e-title">当前筛选条件下暂无动态</div></div>`}
              <div class="pager" style="padding:12px 16px">共 ${feed.length} 条 · ${pg}/${pages} 页${pgBtns()}</div>
            </div>
          </div>
        </div>`;
      box.querySelectorAll('[data-cat]').forEach(el => el.onclick = () => { P.cat = el.dataset.cat; if (P.cat !== '产业资讯') P.ind = '全部行业'; else P.indOpen = true; P.pg = 1; this.paintMain(box); });
      /* 下拉按钮：仅展开/收起行业筛选，不改变当前分类 */
      box.querySelectorAll('[data-caret]').forEach(el => el.onclick = e => { e.stopPropagation(); P.indOpen = !indOpen; this.paintMain(box); });
      box.querySelectorAll('[data-ind]').forEach(el => el.onclick = () => { P.ind = el.dataset.ind; P.pg = 1; this.paintMain(box); });
      box.querySelectorAll('[data-days]').forEach(el => el.onclick = () => { P.days = el.dataset.days; P.pg = 1; this.paintMain(box); });
      box.querySelectorAll('[data-pg]').forEach(el => el.onclick = () => {
        const v = el.dataset.pg;
        if (v === 'prev' && pg > 1) P.pg = pg - 1;
        else if (v === 'next' && pg < pages) P.pg = pg + 1;
        else if (!isNaN(+v)) P.pg = +v;
        else return;
        this.paintMain(box);
        document.querySelector('#newsMain').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      const kw = box.querySelector('#nsKw');
      kw.oninput = () => { P.kw = kw.value.trim(); P.pg = 1; this.paintMain(box); const k2 = box.querySelector('#nsKw'); k2.focus(); k2.setSelectionRange(k2.value.length, k2.value.length); };
    },
  };

  /* 市场洞察 = 原门户首页（去掉任务待办，上浮近期政策/同业动态） */
  VIEWS.insight = VIEWS.dashboard;
})();
