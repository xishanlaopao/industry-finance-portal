/* ============================================================
   访后尽职调查报告：任意格式资料上传、AI对比分析、在线编辑预览、Word下载
   ============================================================ */
(function () {
  const { esc, layerTag, statusTag, aiPanel, kv, toast, openModal } = APP;
  const M = () => window.MOCK;
  const S = APP.S;

  const FILE_CATS = [
    { k: 'fin', n: '财务报表', samples: ['2025年度审计报告.pdf', '2026H1财务报表.xlsx'] },
    { k: 'tax', n: '纳税申报表', samples: ['2025增值税申报表.pdf', '2025所得税申报表.xlsx'] },
    { k: 'bank', n: '银行流水', samples: ['基本户流水_2025.xlsx', '一般户流水截图.png'] },
    { k: 'ct', n: '上下游合同', samples: ['核心客户销售合同.pdf', '供应商采购协议.jpg'] },
    { k: 'cert', n: '证照章程', samples: ['营业执照.jpg', '公司章程.docx'] },
    { k: 'other', n: '其他资料', samples: ['现场照片.jpg', '产品图册.pdf'] },
  ];

  const nowStr = () => {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `2026-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  function ensureStore() {
    if (!S.visitReports) S.visitReports = [];
    if (!S.rptMy) S.rptMy = [];
  }
  const getPath = (o, path) => path.split('.').reduce((v, k) => v && v[k], o);
  const setPath = (o, path, value) => {
    const a = path.split('.'); let cur = o;
    a.slice(0, -1).forEach(k => { cur = cur[k]; });
    cur[a[a.length - 1]] = value;
  };

  function buildVisit(co, files) {
    const cats = [...new Set(files.map(f => f.k))], has = k => cats.includes(k);
    const isJH = co.id === 'JH', isTH = co.id === 'TH', isXJH = co.id === 'XJH';
    const score = has('fin') && has('tax') && has('bank') ? 92 : has('fin') && has('tax') ? 78 : has('fin') && has('bank') ? 74 : has('fin') ? 61 : 48;
    const industry = isTH ? {
      summary: '根据上传的经营资料，企业主营12英寸车规功率器件，处于国产替代加速环节。车规平台认证和规模化量产能力构成主要壁垒。',
      company: ['营收增速 35%', '研发投入占比 19.1%', '产能利用率 82%'],
      benchmark: ['行业营收增速 15%', '行业研发投入占比 15.0%', '行业产能利用率 76%'],
      analysis: '企业营收增速高于行业20个百分点，研发强度高于行业4.1个百分点，成长性与技术投入均优于行业中位水平；但仍处于资本开支高峰期。',
      source: '中国半导体行业协会《2025年中国集成电路产业发展白皮书》；Wind半导体行业数据库（2026Q2）',
    } : isJH ? {
      summary: '根据上传的财务报表、产品图册与销售合同，企业以SiP和先进封装为核心，收入增长主要来自汽车电子与存储客户。',
      company: ['营收增速 28%', '研发投入占比 11.1%', '应收周转 127天'],
      benchmark: ['行业营收增速 18%', '行业研发投入占比 7.8%', '行业应收周转 98天'],
      analysis: '企业增速及研发强度优于行业，但应收周转比行业慢29天，增长对营运资金的占用明显高于同行。',
      source: '中国半导体行业协会《集成电路封装测试产业报告（2025）》；Wind封测行业样本企业数据（2026Q2）',
    } : {
      summary: `根据上传资料，企业主营集中于${co.seg}，当前处于订单扩张与产品升级阶段。`,
      company: ['营收增速 21%', '研发投入占比 9.6%', '应收周转 116天'],
      benchmark: ['行业营收增速 16%', '行业研发投入占比 8.2%', '行业应收周转 101天'],
      analysis: '企业增速和研发投入略高于行业均值，应收周转慢于行业，需关注新增订单对流动资金的占用。',
      source: '国家统计局行业数据；Wind同业可比公司数据库（2026Q2）',
    };
    const product = isTH ? {
      summary: '上传产品资料显示，车规功率器件为核心产品，特色工艺代工为补充；已进入头部主机厂800V平台定点。',
      company: ['车规产品收入占比 63%', '产品毛利率 31.6%', '新品收入占比 22%'],
      benchmark: ['同行车规占比 48%', '同行毛利率 26.8%', '同行新品收入占比 15%'],
      analysis: '车规产品占比及毛利率均高于行业样本，产品结构较优；风险集中在进口设备交付和车规客户验证周期。',
      source: '企业上传产品图册及订单资料；Wind功率半导体可比公司2025年报',
    } : isJH ? {
      summary: '上传产品图册与合同显示，SiP、先进封装为主要收入来源，消费电子和汽车电子为主要应用场景。',
      company: ['先进封装收入占比 58%', '综合毛利率 24.6%', '前五大产品占比 72%'],
      benchmark: ['同行先进封装占比 42%', '同行毛利率 21.3%', '同行前五大产品占比 61%'],
      analysis: '先进封装收入占比和毛利率高于同行，但产品集中度高11个百分点，新品迭代或单一工艺波动对盈利影响更大。',
      source: '企业上传产品图册、销售合同；中国半导体行业协会封测分会样本数据（2025）',
    } : {
      summary: `上传资料显示，企业产品主要覆盖${co.seg}，核心收入来源相对集中。`,
      company: ['核心产品占比 56%', '综合毛利率 23.8%', '新品收入占比 18%'],
      benchmark: ['同行核心产品占比 49%', '同行毛利率 21.5%', '同行新品收入占比 14%'],
      analysis: '核心产品盈利能力略高于同行，需持续关注产品集中及迭代风险。',
      source: '企业上传产品资料；Wind可比公司2025年报',
    };
    const contracts = has('ct') ? (isJH ? {
      summary: '已解析核心销售合同及采购框架协议。企业对下游头部设计公司议价能力偏弱，对上游材料商存在预付款安排。',
      company: ['销售账期 90-150天', '采购预付比例 30%', '票据结算占比 38%', '下游CR5 68%'],
      benchmark: ['行业销售账期 75-105天', '行业预付比例 15%', '行业票据占比 25%', '行业下游CR5 52%'],
      analysis: '销售账期比行业上限长45天，预付比例和票据占比也明显偏高，企业处于“两头占款”的中游位置；CR5高出行业16个百分点。',
      settlement: '销售以电汇及6个月商票为主，采购多为预付后发货；部分销售合同以终验为付款起点。',
      risks: ['框架合同未约定最低采购量，订单释放存在不确定性。', '终验后付款条款可能造成收入确认与回款错配。', '质保期12-24个月，需核实质量扣款和预计负债计提。', '第一大客户合同未明确应收转让条款，融资确权需补充协议。'],
      source: '企业上传销售合同及采购协议；中国半导体行业协会封测企业供应链样本（2025）',
    } : {
      summary: '已解析主要销售与采购合同，企业对核心客户采用年度框架加订单释放模式，部分项目按验收节点结算。',
      company: ['销售账期 100天', '采购预付比例 22%', '下游CR5 61%'],
      benchmark: ['行业销售账期 85天', '行业预付比例 16%', '行业下游CR5 50%'],
      analysis: '企业销售账期、预付比例及客户集中度均高于行业，营运资金和单一客户波动风险需重点关注。',
      settlement: '销售以电汇为主，部分项目在终验后支付尾款；采购端存在预付款。',
      risks: ['订单执行依赖客户验收，终验延迟可能推迟回款。', '部分框架合同无最低采购量约束。', '质量保证期内存在扣款或返工风险。'],
      source: '企业上传上下游合同；Wind供应链样本企业数据（2025）',
    }) : {
      summary: '当前未上传上下游合同，以下分析基于企业公开披露及行业样本，建议补充合同后更新。',
      company: ['销售账期 待补充', '采购预付比例 待补充', '客户集中度 待补充'],
      benchmark: ['行业销售账期 85天', '行业预付比例 16%', '行业下游CR5 50%'],
      analysis: '企业合同数据不足，暂无法对结算条件及链上地位形成可靠判断。',
      settlement: '待补充', risks: ['需补充主要销售合同、采购合同和订单执行台账。'],
      source: 'Wind供应链样本企业数据（2025）；企业公开信息',
    };
    if (isXJH) {
      industry.summary = '公司深耕光通信精密零部件，处于AI算力基础设施快速扩容的核心供应环节。2025年400G及以上中高端光模块芯片基座全球市场份额约29%，处于细分赛道龙头位置。';
      industry.company = ['2025年收入增速 38%', '研发投入占比 8.6%', '400G及以上芯片基座全球市占率 约29%'];
      industry.benchmark = ['光通信器件行业收入增速 24%', '行业研发投入占比 6.2%', '行业头部企业同类产品份额 约15%'];
      industry.analysis = '公司收入增速高于行业样本，核心产品份额及头部客户覆盖度突出。算力资本开支周期提供需求支撑，同时需关注客户集中度、扩产兑现及新产品认证节奏。';
      industry.source = '中国光学光电子行业协会《光通信行业年度发展报告》· 2026-03-18；公司年度报告· 2026-04-22';
      product.summary = '主要产品包括光模块芯片基座、光纤透镜阵列、高密度光纤连接器、激光雷达视窗、车载镜头视窗，并逐步向机器人精密零部件领域延伸。公司已深度绑定中际旭创、新易盛等全球头部光模块厂商，产品终端覆盖英伟达、谷歌、Meta、微软、亚马逊、字节跳动、阿里巴巴等算力客户；获评国家级专精特新“小巨人”企业。';
      product.company = ['光模块精密部件收入占比 约68%', '400G及以上芯片基座全球市占率 约29%', '头部光模块客户覆盖 中际旭创、新易盛'];
      product.benchmark = ['光通信器件样本企业核心产品占比 约52%', '头部企业中高端产品份额 约15%', '主要应用领域 AI算力、数据中心、车载光学'];
      product.analysis = '芯片基座是当前优势产品，份额和客户验证构成竞争壁垒；光纤连接器及光学视窗拓宽产品组合。机器人零部件尚处于拓展阶段，建议核实量产订单、认证周期和产能投入。';
      product.source = '公司年度报告· 2026-04-22；中国光学光电子行业协会《光通信行业年度发展报告》· 2026-03-18';
      if (has('ct')) {
        contracts.summary = '公司位于光通信精密部件供应链中游，向头部光模块厂商供货，终端需求与云厂商、算力基础设施投资相关。大客户认证与产品迭代提高合作黏性，但采购和销售两端均需关注集中度。';
        contracts.company = ['销售结算：月结/验收后结算，账期约90天', '订单模式：年度框架协议+滚动订单', '前五大客户收入占比：约64%'];
        contracts.benchmark = ['行业销售账期参考：60—90天', '行业常见模式：框架协议+滚动预测', '光通信精密部件行业客户集中度偏高'];
        contracts.analysis = '公司具备稳定的头部客户供应关系，处于关键零部件配套位置；对下游头部客户议价能力及订单份额变化仍需结合合同、验收及回款核实。';
        contracts.settlement = '销售合同通常按订单交付、验收及对账节点结算；采购端关注陶瓷材料、光学材料等关键物料的交期、预付款和价格联动安排。';
        contracts.risks = ['框架协议及客户预测不必然构成刚性采购承诺，需逐笔核实已下达订单与取消条款。','验收、对账或质量异议可能延后回款，需核对交付记录、验收单与应收账龄。','头部客户集中度较高，需关注供应商份额调整和产品迭代带来的订单波动。','扩产项目应与客户定点、设备到位及爬坡进度匹配，避免产能先行形成资金占用。'];
        contracts.source = '企业上传销售及采购合同；公司年度报告· 2026-04-22';
      }
    }
    const stmtNote = '本报告仅汇总本次提交材料中可核验的信息；异常提示以已上传的对应材料为限。';
    const swot = isJH ? {
      s: '先进封装产能及头部客户认证形成一定壁垒，研发强度高于同行。', w: '应收周转慢于行业，客户及产品集中度偏高。',
      o: '先进封装国产替代、汽车电子放量及Pre-IPO综合金融需求。', t: '同业授信竞争、客户新品节奏变化及扩产后的产能消化。',
    } : {
      s: '核心产品和客户认证能力较强，经营增速高于行业。', w: '资本开支或营运资金占用较高。',
      o: '国产替代与政策性金融支持。', t: '下游集中、产品价格竞争及供应链交付波动。',
    };
    return {
      id: 'VR' + Date.now().toString(36), co: co.id, kind: '访后报告', title: `${isXJH ? '无锡鑫巨宏智能科技股份有限公司' : co.name}访后报告`,
      t: nowStr(), by: '邓瑞忠', files,
      profile: { name: isXJH ? '无锡鑫巨宏智能科技股份有限公司' : co.name, short: co.short, legal: isXJH ? '孙亮亮' : (co.legal || '—'), cap: isXJH ? '6,315万元' : (co.cap || '—'), est: isXJH ? '2013年1月7日' : ((co.est || '—') + ' 年'), uscc: isXJH ? '91320214060193094K' : (co.uscc || '—'), addr: isXJH ? '无锡市新吴区新锦路106号' : (co.addr || ((co.city || '无锡') + (co.zone || ''))), seg: co.seg, layer: co.layer, emp: co.emp || '—', scope: co.scope || '集成电路相关研发、生产与销售', listing: isXJH ? '新三板上市公司' : '—', controller: isXJH ? '孙亮亮' : '—', shareholders: isXJH ? '控股股东：无锡鑫巨宏创业投资有限公司（45.298%）；吴洁（13.5894%）；孙亮亮（11.5061%）；其他股东（29.6065%）' : '—', industryPosition: isXJH ? '国家级专精特新“小巨人”企业，400G及以上中高端光模块芯片基座全球市占率约29%' : '—' },
      visit: { date: '2026-10-18', site: (co.city || '无锡') + (co.zone || ''), people: '邓瑞忠 / 李晓', note: '', counterpart:'孙亮亮及财务负责人' },
      credit: { amount:'8,000', rate:'1年期央行LPR', branch:'北京银行无锡分行', rating:'A-', proposal:'申请综合授信额度8,000万元，品种包括流动资金贷款、银行承兑汇票及贸易融资，期限不超过一年。', levelChoice:'省级□　市本级☑　区县级□　国家级开发区□　省级园区□　其他□', featureChoice:'省市重大项目□　产业升级☑　技术改造□　行内联动□　绿色业务□　支农业务□　文化业务□', timeChoice:'1个月内□　3个月内☑　半年内□　半年以上□', renewalChoice:'是□　否□　不涉及☑', syndicateChoice:'是□　否☑　牵头行：无' },
      stmt: { score, note: stmtNote, hasFin: has('fin'), hasTax: has('tax'), hasBank: has('bank'), mismatch: has('fin')&&has('tax')&&has('bank') ? [{title:'财报收入与纳税申报收入存在差异',detail:'请核对收入确认期间、免税/不征税项目及申报口径。'},{title:'财报收入与银行流水回款存在差异',detail:'请结合应收账款、票据结算、跨期回款及非销售流水核对。'}] : [], match: has('fin')&&has('tax')&&!has('bank') ? ['营业收入与纳税申报收入一致'] : has('fin')&&has('bank')&&!has('tax') ? ['销售回款与银行流水核验一致'] : [] },
      finance: { years:['2025年','2024年','2023年','行业参考'], rows:[['销售毛利率','28.6%','26.4%','24.8%','22.1%'],['销售净利率','11.2%','9.6%','8.4%','7.5%'],['流动比率','1.48','1.36','1.22','1.40'],['速动比率','1.12','1.03','0.94','1.00'],['应收账款周转天数','86天','92天','101天','90天'],['应付账款周转天数','74天','78天','82天','80天'],['资产负债率','42.8%','45.1%','48.6%','52.0%'],['存货周转天数','68天','72天','79天','75天'],['短期借款利率大致框算','3.80%','4.05%','4.20%','3.50%—4.50%'],['成本费用率','83.6%','86.2%','88.1%','90.0%']] },
      funding: { credit:[['北京银行无锡分行','综合授信','5,000','2,600','2027-06-30','保证'],['工商银行无锡分行','流动资金贷款','3,000','1,200','2027-03-15','信用'],['招商银行无锡分行','银行承兑汇票','2,000','800','2026-12-20','保证金']], guarantees:[['鑫巨宏创业投资有限公司','关联方保证','2,000','1,000','2027-06-30'],['核心设备融资租赁公司','设备抵押','1,500','920','2027-03-31']] },
      industry, product, contracts, swot,
    };
  }

  function editable(path, value, multiline) {
    if (APP.S._vrReadonlyRender) return esc(value == null ? '' : value).replace(/\n/g, '<br>');
    const tag = multiline ? 'div' : 'span';
    return `<${tag} class="vr-inline-edit${multiline ? ' multiline' : ''}" contenteditable="true" data-edit="${path}">${esc(value == null ? '' : value)}</${tag}>`;
  }
  function comparison(data, pathPrefix, card, title) {
    const rows = `<thead><tr><th style="width:50%">企业数据（上传资料）</th><th>行业参考数据</th></tr></thead><tbody>
        ${data.company.map((x, i) => `<tr><td>${editable(pathPrefix + '.company.' + i, x)}</td><td>${editable(pathPrefix + '.benchmark.' + i, data.benchmark[i] || '')}</td></tr>`).join('')}
      </tbody>`;
    if (card) return `<div class="card card-pad mt3" style="box-shadow:none">
      ${title ? `<div class="text-sm" style="font-weight:700;margin-bottom:10px">${title}</div>` : ''}
      <table class="tbl">${rows}</table>
      <div class="text-sm text-sub mt3" style="line-height:1.8">${editable(pathPrefix + '.analysis', data.analysis, true)}</div>
    </div>`;
    return `<table>${rows}</table>
      <p>${editable(pathPrefix + '.analysis', data.analysis, true)}</p>`;
  }

  VIEWS.visitReport = {
    renderInline(el) {
      ensureStore();
      const cur = S._visitId ? S.visitReports.find(x => x.id === S._visitId) : null;
      cur ? this.paintReport(el, cur) : this.paintForm(el);
    },
    render(el) {
      ensureStore();
      const cur = S._visitId ? S.visitReports.find(x => x.id === S._visitId) : null;
      cur ? this.paintReport(el, cur) : this.paintForm(el);
    },
    paintForm(el) {
      const m = M(), F = S._visitForm = S._visitForm || { kw: '', coId: S.params.co || '', files: [], reportType:'省、市国企及城投政信业务-综合授信类（2023年版）' };
      if (S.params.co && !F.coId) F.coId = S.params.co;
      const co = F.coId ? m.coById(F.coId) : null;
      el.innerHTML = `
        <div class="page-head"><div class="page-title">${esc(co ? co.name : '访后报告')}</div></div>
        <div class="card card-pad mb4"><div class="text-sm" style="font-weight:600;margin-bottom:8px">1. 选择企业</div>
          <div class="flex" style="gap:10px"><div style="position:relative;flex:1;min-width:260px">
            <input id="vrQ" class="input" placeholder="输入企业名称搜索" value="${esc(F.kw || (co ? co.short : ''))}" autocomplete="off">
            <div id="vrSug" style="display:none;position:absolute;top:40px;left:0;width:100%;background:#fff;border-radius:10px;box-shadow:0 14px 36px rgba(0,0,0,.22);padding:6px;z-index:40"></div>
          </div>${co ? `<span class="tag tag-green" style="height:36px">✓ ${esc(co.short)} · ${esc(co.seg)}</span>` : ''}</div>
        </div>
        <div class="card card-pad mb4"><div class="text-sm" style="font-weight:600;margin-bottom:8px">2. 选择尽调报告类型</div><select id="vrType" class="input" style="max-width:560px"><option>省、市国企及城投政信业务-综合授信类（2023年版）</option></select></div>
        <div class="card card-pad mb4"><div class="text-sm" style="font-weight:600;margin-bottom:8px">3. 尽调说明（选填）</div><textarea id="vrNote" class="input" rows="3" placeholder="补充本次尽调关注事项或说明">${esc(F.note||'')}</textarea></div>
        <div class="card card-pad mb4"><div class="flex-between mb3"><div class="text-sm" style="font-weight:600">4. 上传客户资料（支持多个附件）</div><button class="btn btn-ghost btn-sm" id="vrAny">＋ 添加附件</button></div>
          <div class="grid-3" style="gap:10px">${FILE_CATS.map(cat => { const got = F.files.filter(f => f.k === cat.k); return `<div class="up-zone ${got.length ? 'on' : ''}" data-cat="${cat.k}">
            <div class="flex-between"><b class="text-sm">${cat.n}</b><span class="tag ${got.length ? 'tag-green' : 'tag-line'}">${got.length ? got.length + ' 个文件' : '上传'}</span></div>
            ${got.map(f => `<div class="text-xs mt2" style="color:var(--brand-600)">📄 ${esc(f.n)}</div>`).join('')}</div>`; }).join('')}</div>
          <div class="text-xs text-muted mt2">附件为原型演示材料，选择后用于模拟报告解析。</div>
        </div>
        <div class="card card-pad mb4"><div class="text-sm" style="font-weight:600;margin-bottom:8px">历史访后报告</div>${S.visitReports.length ? S.visitReports.map(x=>`<div class="flex-between" style="padding:9px 0;border-bottom:1px solid var(--line)"><span>${esc(x.title)} <small class="text-muted">${esc(x.t)}</small></span><button class="btn btn-ghost btn-sm" data-hist="${esc(x.id)}">预览</button></div>`).join('') : '<span class="text-sm text-muted">暂无历史报告</span>'}</div>
        <div class="flex" style="justify-content:flex-end;gap:8px"><button class="btn btn-ghost" id="vrReset">清空资料</button><button class="btn btn-primary" id="vrGen">⚡ 解析并生成访后报告</button></div>`;
      const q = el.querySelector('#vrQ'), sug = el.querySelector('#vrSug');
      el.querySelector('#vrType').onchange = e => F.reportType=e.target.value;
      el.querySelector('#vrNote').oninput = e => F.note=e.target.value;
      const fuzzy = (c, kw) => { const hay = c.name + c.short + c.seg + c.industry; return hay.includes(kw) || [...kw].every(ch => hay.includes(ch)); };
      const showSug = () => {
        const kw = q.value.trim(); F.kw = kw;
        if (!kw) { sug.style.display = 'none'; return; }
        const hits = m.companies.filter(c => fuzzy(c, kw)).slice(0, 8);
        sug.innerHTML = hits.map(c => `<div data-co="${c.id}" style="padding:8px 10px;border-radius:8px;cursor:pointer;display:flex;justify-content:space-between"><b>${esc(c.short)}</b><span class="text-xs text-muted">${esc(c.seg)}</span></div>`).join('');
        sug.style.display = hits.length ? 'block' : 'none';
        sug.querySelectorAll('[data-co]').forEach(it => it.onmousedown = () => { F.coId = it.dataset.co; F.kw = m.coById(F.coId).short; this.paintForm(el); });
      };
      q.oninput = showSug; q.onfocus = showSug; q.onblur = () => setTimeout(() => sug.style.display = 'none', 160);
      let simIdx = 0;
      const pick = cat => {
        const fc = FILE_CATS.find(x => x.k === cat);
        const n = fc.samples[(simIdx++) % fc.samples.length];
        F.files.push({ k: cat, n });
        toast(`已上传「${n}」`);
        this.paintForm(el);
      };
      el.querySelectorAll('[data-cat]').forEach(card => card.onclick = () => pick(card.dataset.cat));
      el.querySelector('#vrAny').onclick = () => pick('other');
      el.querySelectorAll('[data-hist]').forEach(b=>b.onclick=()=>{S._visitId=b.dataset.hist;this.paintReport(el,S.visitReports.find(x=>x.id===b.dataset.hist));});
      el.querySelector('#vrReset').onclick = () => { F.files = []; this.paintForm(el); };
      el.querySelector('#vrGen').onclick = () => {
        if (!F.coId || !m.coById(F.coId)) return toast('请先搜索并选择企业', 'warn');
        if (!F.files.length) return toast('请至少上传一个文件', 'warn');
        const c = m.coById(F.coId);
        openModal({ small: true, title: `正在生成访后报告 · ${esc(c.short)}`, body: `<div style="padding:8px">${['识别上传资料','执行财务勾稽','提取合同条款','生成对比分析'].map((x,i)=>`<div class="flex mb3"><span class="rank-pill" id="vsp${i}">${i+1}</span><span>${x}</span></div>`).join('')}</div>`, foot: '' });
        [500,1000,1500,2000].forEach((ms,i)=>setTimeout(()=>{ const p=document.querySelector('#vsp'+i); if(p){p.textContent='✓';p.style.color='var(--ok-500)';}},ms));
        setTimeout(() => { APP.closeModal(); const rpt = buildVisit(c, F.files.slice()); rpt.reportType=F.reportType; rpt.visit.note=F.note||''; S.visitReports.unshift(rpt); S.rptMy.unshift({ id:rpt.id,co:c.id,kind:'访后报告',title:rpt.title,t:rpt.t,by:rpt.by }); S._visitId=rpt.id; this.paintReport(el,rpt); }, 2300);
      };
    },
    paintReport(el, r) {
      const c = M().coById(r.co), sc = r.stmt.score;
      const done = APP.S._rkDone || {};
      const risks = (M().riskFeed || []).filter(x => x.co === r.co);
      const stTag = s => s === '已解决' ? 'tag-green' : s === '已核实非异常' ? 'tag-blue' : 'tag-orange';
      const tab = S._vrTab || 'doc';
      const docHtml = `
          <div class="vr-doc" id="vdoc">
            <h1>北京银行无锡分行公司类客户授信尽职调查及分析报告</h1>
            <div class="doc-sub">调查人：${editable('by', r.by)}　　调查日期：${editable('visit.date', r.visit.date)}　　调查地点：${editable('visit.site', r.visit.site)}</div>
            <h2>一、报审方案</h2><h3>（一）项目报审要素</h3><table><tbody>
              <tr><th>授信申请人</th><td>${editable('profile.name',r.profile.name)}</td><th>客户层级</th><td>${editable('credit.levelChoice',r.credit.levelChoice)}</td></tr>
              <tr><th>业务特色</th><td colspan="3">${editable('credit.featureChoice',r.credit.featureChoice)}</td></tr>
              <tr><th>投放时间</th><td>${editable('credit.timeChoice',r.credit.timeChoice)}</td><th>申请额度（万元）</th><td>${editable('credit.amount',r.credit.amount)}</td></tr>
              <tr><th>贷款利率</th><td>${editable('credit.rate','1年期央行LPR')}</td><th>报审单位</th><td>${editable('credit.branch','北京银行无锡分行')}</td></tr>
              <tr><th>调查人（双人）</th><td>${editable('by',r.by)}、${editable('visit.people','李晓')}</td><th>内部评级</th><td>${editable('credit.rating','A-')}</td></tr>
              <tr><th>续授信建议书</th><td>是否取得：${editable('credit.renewalChoice',r.credit.renewalChoice)}</td><th>是否银团</th><td>${editable('credit.syndicateChoice',r.credit.syndicateChoice)}</td></tr>
              <tr><th>所属集团及限额情况</th><td colspan="3">是否集团户：是□　否☑　所属集团：无　剩余可用额度：不适用　限额到期日：不适用</td></tr>
              <tr><th>报审方案</th><td colspan="3">${editable('credit.proposal','申请综合授信额度8,000万元，品种包括流动资金贷款、银行承兑汇票及贸易融资，期限不超过一年。',true)}</td></tr>
              <tr><th>授信用途</th><td colspan="3">用途是否合规：是☑　否□　具体用途：补充日常经营周转及采购付款。</td></tr>
              <tr><th>还款来源</th><td colspan="3">还款来源是否可靠：是☑　否□　具体还款来源：主营业务回款及经营性现金流。</td></tr>
            </tbody></table>
            <h3>（二）尽职过程描述</h3><p>是否现场尽调：是☑　否□　　尽调时间：${editable('visit.date',r.visit.date)}　　尽调地点：${editable('visit.site',r.visit.site)}</p><p>尽调人员：${editable('visit.people',r.visit.people)}　　对方对接人员：${editable('visit.counterpart','孙亮亮及财务负责人')}</p><p>现场尽调内容描述：${editable('visit.note','围绕企业经营情况、主要产品、客户订单、财务表现及融资需求开展访谈，并核对本次提交资料。',true)}</p>
            <h2>二、申请人基本情况</h2><h3>（一）基础信息</h3><p>客户名称：${editable('profile.name', r.profile.name)}　　客户层级：${editable('profile.layer', r.profile.layer || '潜在')}</p>
            <p>法定代表人：${editable('profile.legal', r.profile.legal)}　　注册资本：${editable('profile.cap', r.profile.cap)}　　成立日期：${editable('profile.est', r.profile.est)}</p>
            <p>统一社会信用代码：${editable('profile.uscc', r.profile.uscc)}　　注册地址：${editable('profile.addr', r.profile.addr)}</p>
            <p>挂牌情况：${editable('profile.listing', r.profile.listing)}　　实际控制人：${editable('profile.controller', r.profile.controller)}</p>
            <p><b>股权结构：</b>${editable('profile.shareholders', r.profile.shareholders, true)}</p>
            <h3>（二）经营情况</h3><p>${editable('industry.summary',r.industry.summary,true)}</p><p>主营业务及主要产品：${editable('product.summary',r.product.summary,true)}</p><h3>（三）财务分析</h3><p>财务指标分析</p>
            <h3>（四）申请人融资情况</h3><p>授信及担保明细</p><table><thead><tr><th>授信机构</th><th>授信品种</th><th>授信额度（万元）</th><th>已用余额（万元）</th><th>到期日</th><th>担保方式</th></tr></thead><tbody>${r.funding.credit.map(x=>`<tr>${x.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
            <p>对外担保明细</p><table><thead><tr><th>被担保方/担保对象</th><th>担保方式</th><th>担保额度（万元）</th><th>担保余额（万元）</th><th>到期日</th></tr></thead><tbody>${r.funding.guarantees.map(x=>`<tr>${x.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
            <h2>三、财务分析</h2><table><thead><tr><th>项目</th>${r.finance.years.map(y=>`<th>${esc(y)}</th>`).join('')}</tr></thead><tbody>${r.finance.rows.map(row=>`<tr>${row.map((v,i)=>i===0?`<td>${esc(v)}</td>`:`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
            <h2>四、行业分析</h2>
            <p>${editable('industry.summary', r.industry.summary, true)}</p>
            ${comparison(r.industry, 'industry')}
            <h2>五、产品分析</h2>
            <p>${editable('product.summary', r.product.summary, true)}</p>
            ${comparison(r.product, 'product')}
            <h2>六、上下游分析</h2>
            <p>${editable('contracts.summary', r.contracts.summary, true)}</p>
            ${comparison(r.contracts, 'contracts')}
            <p><b>结算条件：</b>${editable('contracts.settlement', r.contracts.settlement, true)}</p>
            <p><b>订单执行风险：</b></p>
            ${r.contracts.risks.map((x, i) => `<p>${i + 1}. ${editable('contracts.risks.' + i, x, true)}</p>`).join('')}
            <h2>七、优劣势分析</h2>
            <p><b>优势：</b>${editable('swot.s', r.swot.s, true)}</p>
            <p><b>劣势：</b>${editable('swot.w', r.swot.w, true)}</p>
            <p><b>机会：</b>${editable('swot.o', r.swot.o, true)}</p>
            <p><b>威胁：</b>${editable('swot.t', r.swot.t, true)}</p>
          </div>`;
      const H = (no, t) => `<div class="rs-head"><span class="rs-no">${no}</span><span class="rs-title">${t}</span></div>`;
      S._vrReadonlyRender = true;
      const anaHtml = `<div class="vr-analysis">
          <div class="rpt-sec" id="a2">${H(1, '企业基本情况')}<div class="flex mb3">${c ? layerTag(c.layer) + statusTag(c.status) : ''}<span class="tag tag-line">${esc(r.profile.seg)}</span><span class="tag tag-blue">${esc(r.profile.listing)}</span></div>
            <div class="kv-grid">${kv('企业名称',r.profile.name)}${kv('统一社会信用代码',r.profile.uscc)}${kv('法定代表人',r.profile.legal)}${kv('实际控制人',r.profile.controller)}${kv('注册资本',r.profile.cap)}${kv('成立日期',r.profile.est)}${kv('员工规模',r.profile.emp)}${kv('注册地址',r.profile.addr)}${kv('挂牌情况',r.profile.listing)}${kv('产业链环节',r.profile.seg)}<div class="kv vr-share"><div class="kv-k">股权结构</div><div class="kv-v">${esc(r.profile.shareholders)}</div></div></div>
            <h4 class="mt3">客户授信明细</h4><table class="tbl"><thead><tr><th>授信机构</th><th>授信品种</th><th>授信额度（万元）</th><th>已用余额（万元）</th><th>到期日</th><th>担保方式</th></tr></thead><tbody>${r.funding.credit.map(x=>`<tr>${x.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
            <h4 class="mt3">对外担保明细</h4><table class="tbl"><thead><tr><th>被担保方/担保对象</th><th>担保方式</th><th>担保额度（万元）</th><th>担保余额（万元）</th><th>到期日</th></tr></thead><tbody>${r.funding.guarantees.map(x=>`<tr>${x.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
          <div class="rpt-sec" id="a3">${H(2, '财务分析')}</div><div class="rpt-sec"><table class="tbl"><thead><tr><th>项目</th>${r.finance.years.map(y=>`<th>${esc(y)}</th>`).join('')}</tr></thead><tbody>${r.finance.rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="text-xs text-muted">财务指标根据本次尽调材料整理，并列示行业参考值。</p></div>
          <div class="rpt-sec" id="a4">${H(3, '行业分析')}<div class="text-sm text-sub" style="line-height:1.8">${editable('industry.summary', r.industry.summary, true)}</div>${comparison(r.industry, 'industry', true, '企业与行业对比')}<div class="vr-source"><b>数据来源</b><div>发布方/平台：中国光学光电子行业协会</div><div>原文章标题：《光通信行业年度发展报告》</div><div>时间：2026-03-18</div></div></div>
          <div class="rpt-sec" id="a5">${H(4, '产品分析')}<div class="text-sm text-sub" style="line-height:1.8">${editable('product.summary', r.product.summary, true)}</div>${comparison(r.product, 'product', true, '产品指标对比')}<div class="vr-source"><b>数据来源</b><div>发布方/平台：企业公开披露、中国光学光电子行业协会</div><div>原文章标题：《公司年度报告》《光通信行业年度发展报告》</div><div>时间：2026-04-22、2026-03-18</div></div></div>
          <div class="rpt-sec" id="a6">${H(5, '上下游分析')}<div class="text-sm text-sub" style="line-height:1.8">${editable('contracts.summary', r.contracts.summary, true)}</div>${comparison(r.contracts, 'contracts', true, '结算条件与行业对比')}<div class="vr-source"><b>数据来源</b><div>发布方/平台：企业上传合同、企业公开披露</div><div>原文章标题：销售合同及采购协议；《公司年度报告》</div><div>时间：本次尽调材料、2026-04-22</div></div>
            <div class="card card-pad mt3" style="box-shadow:none"><b class="text-sm">结算条件</b>${editable('contracts.settlement', r.contracts.settlement, true)}<b class="text-sm">订单执行风险</b>${r.contracts.risks.map((x, i) => editable('contracts.risks.' + i, x, true)).join('')}</div></div>
          <div class="rpt-sec" id="a7">${H(6, '优劣势分析')}<div class="grid-2">
            ${[['优势', 's', 'var(--ok-500)'], ['劣势', 'w', 'var(--danger-500)'], ['机会', 'o', 'var(--blue-500)'], ['威胁', 't', 'var(--warn-500)']].map(([n, k, color]) => `<div class="card card-pad" style="box-shadow:none;border-left:3px solid ${color}"><b>${n}</b>${editable('swot.' + k, r.swot[k], true)}</div>`).join('')}</div></div></div>`;
      S._vrReadonlyRender = false;
      const alertHtml = (r.stmt.mismatch||[]).length ? `<aside class="vr-alert-side"><h3>财务数据异常提示</h3>${r.stmt.mismatch.map(x=>`<div class="vr-alert"><b>${esc(x.title)}</b><p>${esc(x.detail)}</p></div>`).join('')}</aside>` : (r.stmt.match||[]).length ? `<aside class="vr-alert-side"><h3>财务数据核验</h3>${r.stmt.match.map(x=>`<div class="vr-match">✓ ${esc(x)}</div>`).join('')}</aside>` : `<aside class="vr-alert-side"><h3>财务数据异常提示</h3><p class="text-muted">本次材料未形成可确认的异常项。</p></aside>`;
      el.innerHTML = `
        <div class="page-head"><div class="page-title">${esc(r.title)}</div><div class="flex"><button class="btn btn-ghost" id="vrAgain">＋ 再生成一份</button><button class="btn btn-primary" id="vrWord">⬇ 下载 Word</button></div></div>
        <div class="rpt-layout"><aside class="ns-side" style="position:sticky;top:80px"><div class="ns-g">报告模块</div>
          <div class="ns-i ${tab === 'doc' ? 'on' : ''}" data-vt="doc">尽调报告</div>
          <div class="ns-i ${tab === 'ana' ? 'on' : ''}" data-vt="ana">访后分析</div></aside><div>
          ${tab === 'doc' ? `<div class="vr-doc-layout">${docHtml}${alertHtml}</div>` : anaHtml}
        </div></div>`;
      el.querySelectorAll('[data-vt]').forEach(n => n.onclick = () => { S._vrTab = n.dataset.vt; this.paintReport(el, r); });
      el.querySelectorAll('[data-edit]').forEach(x => x.addEventListener('input', () => setPath(r, x.dataset.edit, x.innerText.trim())));
      el.querySelector('#vrWord').onclick = () => this.downloadWord(r);
      el.querySelector('#vrAgain').onclick = () => { S._visitId=null; this.paintForm(el); };
    },
    open(id) { S._visitId=id||null; S.params.tab='visit'; S.view==='report' ? VIEWS.report.render(document.querySelector('#viewRoot')) : APP.go('report',{tab:'visit'}); },
    downloadWord(r) {
      const p=r.profile;
      const tbl=(heads,rows)=>`<table><thead><tr>${heads.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      const ratio=tbl(['项目',...r.finance.years],r.finance.rows);
      const credits=tbl(['授信机构','授信品种','授信额度（万元）','已用余额（万元）','到期日','担保方式'],r.funding.credit);
      const guarantees=tbl(['被担保方/担保对象','担保方式','担保额度（万元）','担保余额（万元）','到期日'],r.funding.guarantees);
      const comp=(d)=>`<table><tr><th>企业数据</th><th>行业参考数据</th></tr>${d.company.map((x,i)=>`<tr><td>${esc(x)}</td><td>${esc(d.benchmark[i]||'')}</td></tr>`).join('')}</table><p>${esc(d.analysis)}</p>`;
      const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:SimSun,'Songti SC',serif;line-height:1.8;color:#222}h1{text-align:center;font-size:18pt}h2{font-size:14pt;margin:16pt 0 6pt}h3{font-size:12pt;margin:10pt 0 4pt}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #333;padding:6px;font-size:10.5pt;text-align:left}th{background:#f2f2f2}p{margin:4pt 0;font-size:11pt}.muted{color:#666;font-size:10pt}</style></head><body>
        <h1>北京银行无锡分行公司类客户授信尽职调查及分析报告</h1><p style="text-align:center" class="muted">${esc(r.reportType||'省、市国企及城投政信业务-综合授信类（2023年版）')}　调查人：${esc(r.by)}　调查日期：${esc(r.visit.date)}</p>
        <h2>一、报审方案</h2><h3>（一）项目报审要素</h3><p>授信申请人：${esc(p.name)}　客户层级：${esc(r.credit.levelChoice)}</p><p>业务特色：${esc(r.credit.featureChoice)}</p><p>投放时间：${esc(r.credit.timeChoice)}　申请额度（万元）：${esc(r.credit.amount)}</p><p>贷款利率：${esc(r.credit.rate)}　报审单位：${esc(r.credit.branch)}　调查人（双人）：${esc(r.by)}、李晓　内部评级：${esc(r.credit.rating)}</p><p>续授信建议书：${esc(r.credit.renewalChoice)}　是否银团：${esc(r.credit.syndicateChoice)}</p><p>所属集团及限额情况：是否集团户：是□　否☑　所属集团：无　剩余可用额度：不适用　限额到期日：不适用</p><p>报审方案：${esc(r.credit.proposal)}</p><p>授信用途：用途是否合规：是☑　否□　具体用途：补充日常经营周转及采购付款。</p><p>还款来源：还款来源是否可靠：是☑　否□　具体还款来源：主营业务回款及经营性现金流。</p>
        <h3>（二）尽职过程描述</h3><p>现场尽调：是☑　否□　时间：${esc(r.visit.date)}　地点：${esc(r.visit.site)}　尽调人员：${esc(r.visit.people)}　对方对接人员：${esc(r.visit.counterpart)}</p>
        <h2>二、申请人基本情况</h2><h3>（一）基础信息</h3><p>申请人全称：${esc(p.name)}　成立日期：${esc(p.est)}　实收资本：${esc(p.cap)}</p><p>统一社会信用代码：${esc(p.uscc)}　注册地址：${esc(p.addr)}</p><p>法定代表人：${esc(p.legal)}　实际控制人：${esc(p.controller)}　挂牌情况：${esc(p.listing)}</p><p>股权结构：${esc(p.shareholders)}</p><h3>（二）经营情况</h3><p>${esc(r.industry.summary)}</p><p>主要产品：${esc(r.product.summary)}</p><h3>（三）财务分析</h3>${ratio}<h3>（四）申请人融资情况</h3>${credits}<p>对外担保情况</p>${guarantees}
        <h2>三、行业、产品及上下游分析</h2><h3>行业分析</h3><p>${esc(r.industry.summary)}</p>${comp(r.industry)}<h3>产品分析</h3><p>${esc(r.product.summary)}</p>${comp(r.product)}<h3>上下游分析</h3><p>${esc(r.contracts.summary)}</p>${comp(r.contracts)}<p>结算条件：${esc(r.contracts.settlement)}</p><p>订单执行风险：${r.contracts.risks.map((x,i)=>(i+1)+'. '+esc(x)).join('；')}</p>
        <h2>四、综合评价及结论性意见</h2><p>优势：${esc(r.swot.s)}</p><p>劣势：${esc(r.swot.w)}</p><p>机会：${esc(r.swot.o)}</p><p>威胁：${esc(r.swot.t)}</p></body></html>`;
      const blob=new Blob(['\ufeff'+html],{type:'application/msword'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${p.short||'访后报告'}-尽职调查报告.doc`;document.body.appendChild(a);a.click();a.remove();toast('Word 版本已开始下载');
    }
  };

  ensureStore();
  if (!(S.visitReports||[]).some(x=>x.co==='XJH')) { const co=M().coById&&M().coById('XJH'); if(co){const r=buildVisit(co,[{k:'fin',n:'2025年度审计报告.pdf'},{k:'tax',n:'2025纳税申报表.pdf'},{k:'bank',n:'基本户流水.xlsx'},{k:'ct',n:'光模块销售框架合同.pdf'},{k:'ct',n:'关键材料采购协议.pdf'}]);r.id='VRXJH2026';r.t='2026-10-21 15:20';S.visitReports.unshift(r);} }
  if (!(S.visitReports||[]).length) { const co=M().coById&&M().coById('JH'); if(co){const r=buildVisit(co,[{k:'fin',n:'2025年度审计报告.pdf'},{k:'tax',n:'2025增值税申报表.pdf'},{k:'bank',n:'基本户流水.xlsx'},{k:'ct',n:'核心客户销售合同.pdf'}]);r.id='VRDEMO1';r.t='2026-10-16 15:20';S.visitReports.unshift(r);} }
})();
