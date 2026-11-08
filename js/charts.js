/* ============================================================
   轻量 SVG 图表库（无外部依赖，离线可用）
   所有函数返回 HTML 字符串，插入容器即可
   ============================================================ */
window.CH = (function () {
  const GRID = 'var(--chart-grid)', LABEL = 'var(--chart-label)';

  function niceRange(min, max, zero) {
    if (zero || min <= 0 || (max - min) < max * 0.5) { min = Math.min(0, min); }
    else { min = min - (max - min) * 0.15; }
    max = max === min ? max + 1 : max + (max - min) * 0.1;
    return [min, max];
  }

  /* 折线图 series:[{name,data,color}] */
  function line(o) {
    const { labels, series, h = 230, zero = false, yFmt = v => +v.toFixed(Math.abs(v) >= 10 ? 0 : Math.abs(v) >= 1 ? 1 : 2), area = true, dots = false } = o;
    const W = 680, H = h, pl = 48, pr = 12, pt = 14, pb = 26;
    const iw = W - pl - pr, ih = H - pt - pb;
    const all = series.flatMap(s => s.data);
    let [min, max] = niceRange(Math.min(...all), Math.max(...all), zero);
    const X = i => pl + (labels.length === 1 ? iw / 2 : i * iw / (labels.length - 1));
    const Y = v => pt + ih - (v - min) / (max - min) * ih;
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const v = min + (max - min) * i / 4, y = Y(v);
      g += `<line x1="${pl}" y1="${y}" x2="${W - pr}" y2="${y}" stroke="${GRID}" stroke-width="1"/>
            <text x="${pl - 6}" y="${y + 3.5}" text-anchor="end" font-size="10" fill="${LABEL}">${yFmt(v)}</text>`;
    }
    let xl = '';
    labels.forEach((l, i) => {
      if (labels.length > 10 && i % 2) return;
      xl += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="${LABEL}">${l}</text>`;
    });
    let paths = '';
    series.forEach(s => {
      const pts = s.data.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
      if (area) {
        paths += `<polygon points="${pl},${Y(min)} ${pts} ${X(s.data.length - 1)},${Y(min)}" fill="${s.color}" opacity="0.08"/>`;
      }
      paths += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
      if (dots) s.data.forEach((v, i) => { paths += `<circle cx="${X(i)}" cy="${Y(v)}" r="3" fill="#fff" stroke="${s.color}" stroke-width="2"/>`; });
      const li = s.data.length - 1;
      paths += `<text x="${W - 4}" y="${Y(s.data[li]) + 3}" text-anchor="end" font-size="10" fill="${s.color}" font-weight="600">${yFmt(s.data[li])}</text>`;
    });
    return `<div class="chart-box"><svg viewBox="0 0 ${W} ${H}">${g}${xl}${paths}</svg></div>`;
  }

  /* 柱状图（纵向） */
  function bars(o) {
    const { labels, data, color = '#2458F5', h = 210, unit = '', max } = o;
    const W = 680, H = h, pl = 40, pr = 12, pt = 18, pb = 26;
    const iw = W - pl - pr, ih = H - pt - pb;
    const mx = max || Math.max(...data) * 1.15;
    const bw = Math.min(30, iw / data.length * 0.5);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const y = pt + ih - ih * i / 4;
      g += `<line x1="${pl}" y1="${y}" x2="${W - pr}" y2="${y}" stroke="${GRID}"/>
            <text x="${pl - 6}" y="${y + 3.5}" text-anchor="end" font-size="10" fill="${LABEL}">${(mx * i / 4).toFixed(mx >= 10 ? 0 : 1)}</text>`;
    }
    let barsHtml = '';
    data.forEach((v, i) => {
      const x = pl + iw / data.length * (i + 0.5) - bw / 2;
      const bh = v / mx * ih, y = pt + ih - bh;
      barsHtml += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="${color}"/>
        <text x="${x + bw / 2}" y="${y - 5}" text-anchor="middle" font-size="10" fill="var(--t2)" font-weight="600">${v}${unit}</text>
        <text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="10" fill="${LABEL}">${labels[i]}</text>`;
    });
    return `<div class="chart-box"><svg viewBox="0 0 ${W} ${H}">${g}${barsHtml}</svg></div>`;
  }

  /* 横向排名条 items:[{name,v,extra}] */
  function hbars(items, o = {}) {
    const { unit = '', color = 'var(--brand-500)', max } = o;
    const mx = max || Math.max(...items.map(i => i.v)) * 1.05;
    return items.map((it, i) => `
      <div class="rank-row">
        <span class="text-sm text-muted" style="width:118px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it.pre || ''}${it.name}</span>
        <div class="rank-bar-wrap"><div class="rank-bar" style="width:${(it.v / mx * 100).toFixed(1)}%;${it.color ? `background:${it.color}` : ''}"></div></div>
        <span class="text-sm fs-num" style="width:72px;text-align:right;font-weight:600">${it.v}${unit}</span>
        ${it.extra ? `<span class="text-xs text-muted">${it.extra}</span>` : ''}
      </div>`).join('');
  }

  /* 环形图 */
  function donut(o) {
    const { data, size = 170, thick = 26, center, sub } = o;
    const r = (size - thick) / 2, c = size / 2, circ = 2 * Math.PI * r;
    const total = data.reduce((s, d) => s + d.v, 0);
    let off = 0, segs = '';
    data.forEach(d => {
      const len = d.v / total * circ;
      segs += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${d.color}" stroke-width="${thick}"
        stroke-dasharray="${(len - 2).toFixed(1)} ${(circ - len + 2).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}"
        transform="rotate(-90 ${c} ${c})" stroke-linecap="butt"/>`;
      off += len;
    });
    const legend = data.map(d => `<span class="lg"><i style="background:${d.color}"></i>${d.name} <b class="fs-num">${d.v}%</b></span>`).join('');
    return `<div class="flex" style="gap:22px;align-items:center;flex-wrap:wrap">
      <div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0">
        <svg viewBox="0 0 ${size} ${size}" style="width:100%;height:100%">${segs}</svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-size:22px;font-weight:700">${center}</div><div class="text-xs text-muted">${sub || ''}</div>
        </div>
      </div><div class="chart-legend" style="flex-direction:column;align-items:flex-start;gap:8px">${legend}</div></div>`;
  }

  /* 雷达图 axes:[...], series:[{name,data,color}] */
  function radar(o) {
    const { axes, series, size = 240 } = o;
    const c = size / 2, R = c - 36, n = axes.length;
    const pt = (i, v) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n, r = R * v / 100;
      return [c + r * Math.cos(a), c + r * Math.sin(a)];
    };
    let rings = '';
    [25, 50, 75, 100].forEach(p => {
      const ps = axes.map((_, i) => pt(i, p).map(x => x.toFixed(1)).join(',')).join(' ');
      rings += `<polygon points="${ps}" fill="none" stroke="${GRID}"/>`;
    });
    let axis = '';
    axes.forEach((a, i) => {
      const [x, y] = pt(i, 100);
      const [lx, ly] = pt(i, 128);
      axis += `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="${GRID}"/>
               <text x="${lx}" y="${ly + 3}" text-anchor="middle" font-size="10.5" fill="var(--t2)" font-weight="600">${a}</text>`;
    });
    let polys = '';
    series.forEach(s => {
      const ps = s.data.map((v, i) => pt(i, v).map(x => x.toFixed(1)).join(',')).join(' ');
      polys += `<polygon points="${ps}" fill="${s.color}" fill-opacity="0.13" stroke="${s.color}" stroke-width="2"/>
        ${s.data.map((v, i) => { const [x, y] = pt(i, v); return `<circle cx="${x}" cy="${y}" r="2.8" fill="${s.color}"/>`; }).join('')}`;
    });
    const legend = series.map(s => `<span class="lg"><i style="background:${s.color}"></i>${s.name}</span>`).join('');
    return `<div class="flex" style="justify-content:center"><div class="chart-box" style="max-width:${size}px"><svg viewBox="0 0 ${size} ${size}">${rings}${axis}${polys}</svg></div></div>
      <div class="chart-legend" style="justify-content:center">${legend}</div>`;
  }

  /* 仪表盘（景气指数，0-150） */
  function gauge(o) {
    const { val, size = 120 } = o;
    const c = size / 2, R = c - 10, sw = 10;
    const a0 = Math.PI, a1 = 0;
    const ang = Math.PI * (1 - Math.min(val, 150) / 150);
    const x = c + R * Math.cos(ang), y = c - R * Math.sin(ang);
    const color = val >= 115 ? 'var(--ok-500)' : val >= 100 ? 'var(--brand-500)' : 'var(--warn-500)';
    return `<div style="display:flex;flex-direction:column;align-items:center">
      <div style="width:${size}px;height:${size / 2 + 14}px">
        <svg viewBox="0 0 ${size} ${size / 2 + 14}" style="width:100%">
          <path d="M ${c - R} ${c} A ${R} ${R} 0 0 1 ${c + R} ${c}" fill="none" stroke="#EDF1F7" stroke-width="${sw}" stroke-linecap="round"/>
          <path d="M ${c - R} ${c} A ${R} ${R} 0 0 1 ${x} ${y}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>
          <line x1="${c - R - 2}" y1="${c}" x2="${c - R + 4}" y2="${c}" stroke="var(--t3)" stroke-width="1.5"/>
          <text x="${c + R - 2}" y="${c + 2}" text-anchor="end" font-size="8.5" fill="var(--t3)">150</text>
          <text x="${c}" y="${c - 6}" text-anchor="middle" font-size="15" font-weight="700" fill="${color}">${val}</text>
        </svg>
      </div>
      <div class="text-xs text-muted" style="margin-top:-4px">${o.label || ''}</div></div>`;
  }

  /* 漏斗 */
  function funnel(steps, note) {
    const mx = steps[0].v;
    let html = steps.map((s, i) => {
      const w = Math.max(12, s.v / mx * 100);
      const rate = i === 0 ? '入口' : `转化率 ${(s.v / steps[i - 1].v * 100).toFixed(1)}%`;
      return `<div class="funnel-step">
        <div class="funnel-bar" style="width:${w}%;opacity:${1 - i * 0.13}">${s.n} <span style="font-weight:400;opacity:.85">${s.v}</span></div>
        <span class="funnel-rate">${rate}</span></div>`;
    }).join('');
    if (note) html += `<div class="banner b-warn mt2" style="padding:9px 12px">${note}</div>`;
    return html;
  }

  /* 迷你趋势 */
  function spark(data, o = {}) {
    const { color = 'var(--brand-500)', w = 110, h = 34 } = o;
    const mn = Math.min(...data), mx = Math.max(...data);
    const pts = data.map((v, i) => `${i / (data.length - 1) * (w - 4) + 2},${h - 3 - (v - mn) / (mx - mn || 1) * (h - 8)}`).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  }

  /* 产业链图谱（HTML 卡片链） */
  function chainMap(onSeg) {
    const chain = [
      { k: 'EDA/IP', n: 'EDA工具与IP', cnt: 26, ico: '🧩' },
      { k: '芯片设计', n: '芯片设计', cnt: 118, ico: '📐' },
      { k: '晶圆制造', n: '晶圆制造', cnt: 14, ico: '🏭' },
      { k: '封测', n: '封装测试', cnt: 36, ico: '📦' },
      { k: '应用', n: '终端应用', cnt: 210, ico: '🚗' },
    ];
    const main = chain.map((s, i) => `
      <div class="cm-node" data-seg="${s.k}" style="cursor:pointer">
        <div class="cm-ico">${s.ico}</div><div class="cm-name">${s.n}</div>
        <div class="cm-cnt">${s.cnt}家 · 本行覆盖${Math.round(s.cnt * 0.3)}家</div>
      </div>${i < chain.length - 1 ? '<div class="cm-arrow">▶</div>' : ''}`).join('');
    const support = [
      { k: '设备', n: '设备', cnt: 32, ico: '⚙️' }, { k: '材料', n: '材料', cnt: 48, ico: '🧪' },
    ].map(s => `<div class="cm-node cm-sup" data-seg="${s.k}" style="cursor:pointer">
        <div class="cm-ico">${s.ico}</div><div class="cm-name">${s.n}</div><div class="cm-cnt">${s.cnt}家</div></div>`).join('');
    return `<div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${main}</div>
      <div style="display:flex;gap:6px;margin-top:14px;align-items:center">
        <span class="text-xs text-muted" style="width:96px">支撑环节 ↓</span>${support}
        <span class="text-xs text-muted" style="margin-left:10px">设备与材料贯穿制造、封测环节（无锡区域企业数）</span>
      </div></div>`;
  }

  /* 中心辐射图谱（链式获客） */
  function networkGraph(cfg) {
    const W = 780, H = 560, cx = W / 2, cy = H / 2;
    const node = (n, x, y, main, ours) => `
      <g class="graph-node" data-net="${n.n}" transform="translate(${x},${y})">
        <circle r="${main ? 46 : 30}" fill="${ours ? '#2458F5' : main ? '#0A1B38' : '#fff'}" stroke="${ours ? '#2458F5' : main ? '#0A1B38' : '#C3CDDE'}" stroke-width="2"/>
        <text y="${main ? 5 : 4}" text-anchor="middle" font-size="${main ? 12 : 10.5}" font-weight="600" fill="${ours || main ? '#fff' : 'var(--t1)'}">${n.n.replace(/（.*）/, '')}</text>
        ${ours ? `<circle r="6" cx="26" cy="-22" fill="#16A34A" stroke="#fff" stroke-width="1.5"/>` : ''}
      </g>`;
    let links = '', nodes = '';
    cfg.up.forEach((n, i) => {
      const x = 80 + i * (W - 160) / (cfg.up.length - 1), y = 62;
      links += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#C9D4E8" stroke-width="1.4" stroke-dasharray="5 4"/>`;
      nodes += node(n, x, y, false, n.ours);
    });
    cfg.down.forEach((n, i) => {
      const x = 80 + i * (W - 160) / (cfg.down.length - 1), y = H - 62;
      links += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#C9D4E8" stroke-width="1.4"/>`;
      nodes += node(n, x, y, false, n.ours);
    });
    nodes += node(cfg.center, cx, cy, true, true);
    return `<div class="chart-box"><svg viewBox="0 0 ${W} ${H}">
      ${links}${nodes}
      <text x="16" y="24" font-size="11" fill="var(--t3)">上游供应商</text>
      <text x="16" y="${H - 20}" font-size="11" fill="var(--t3)">下游客户</text>
    </svg></div>
    <div class="chart-legend"><span class="lg"><i style="background:#2458F5"></i>本行客户</span><span class="lg"><i style="background:#fff;border:1.5px solid #C3CDDE"></i>非本行客户（获客机会）</span></div>`;
  }

  /* 投资机构图谱（左右二分图） */
  function invGraph(funds, cos) {
    const W = 820, H = 60 + funds.length * 78;
    const fx = 190, cx = W - 170;
    let links = '', nodes = '';
    const coY = {}; const coList = [...new Set(funds.flatMap(f => f.invests))];
    coList.forEach((id, i) => { coY[id] = 60 + i * (H - 100) / Math.max(1, coList.length - 1); });
    funds.forEach((f, i) => {
      const y = 56 + i * 78;
      f.invests.forEach(id => {
        const cy2 = coY[id];
        links += `<path d="M ${fx + 26} ${y} C ${fx + 120} ${y}, ${cx - 120} ${cy2}, ${cx - 26} ${cy2}" fill="none" stroke="${f.tag === '国家级' ? '#E5484D' : '#93A4C8'}" stroke-width="${f.tag === '国家级' ? 2 : 1.4}" opacity=".55"/>`;
      });
      nodes += `<g class="graph-node" data-inv="${f.n}" transform="translate(${fx},${y})">
        <circle r="${18 + f.power * 0.14}" fill="${f.tag === '国家级' ? '#FDECEC' : '#F2F6FF'}" stroke="${f.tag === '国家级' ? '#E5484D' : '#2458F5'}" stroke-width="2"/>
        <text y="4" text-anchor="middle" font-size="10" font-weight="700" fill="${f.tag === '国家级' ? '#E5484D' : '#2458F5'}">${f.power}</text>
        <text y="-34" text-anchor="middle" font-size="11.5" font-weight="600" fill="var(--t1)">${f.n}</text>
        <text y="-21" text-anchor="middle" font-size="9.5" fill="var(--t3)">${f.tag}</text>
      </g>`;
    });
    coList.forEach(id => {
      const co = cos.find(c => c.id === id), y = coY[id];
      nodes += `<g class="graph-node" data-co="${id}" transform="translate(${cx},${y})">
        <rect x="-64" y="-19" width="128" height="38" rx="10" fill="#fff" stroke="${co.status === '本行已合作' ? '#16A34A' : '#C3CDDE'}" stroke-width="1.6"/>
        <text y="-1" text-anchor="middle" font-size="11" font-weight="600" fill="var(--t1)">${co.short}</text>
        <text y="12" text-anchor="middle" font-size="9" fill="var(--t3)">${co.seg}</text>
      </g>`;
    });
    return `<div class="chart-box"><svg viewBox="0 0 ${W} ${H}">${links}${nodes}
      <text x="16" y="24" font-size="11" fill="var(--t3)">投资机构（活跃度）</text>
      <text x="${cx - 40}" y="24" font-size="11" fill="var(--t3)">被投企业（名单内）</text></svg></div>
      <div class="chart-legend"><span class="lg"><i style="background:#E5484D"></i>国家级基金</span><span class="lg"><i style="background:#2458F5"></i>市场化机构</span><span class="lg"><i style="background:#16A34A;border-radius:3px"></i>边框绿色=本行客户</span></div>`;
  }

  return { line, bars, hbars, donut, radar, gauge, funnel, spark, chainMap, networkGraph, invGraph };
})();
