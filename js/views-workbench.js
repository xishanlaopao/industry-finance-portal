/* ============================================================
   工作台 V1（右上角个人信息菜单进入）
   四角色：客户经理（承接任务+访客纪要）/ 支行长（支行视角）
           分行产品经理（下发管理）/ 部门负责人（全辖概览）
   核心模块：任务列表 · 访前一页纸 · 访客纪要（语音+AI整理+协同留痕）
             · AI问答 · 跟进台账
   ============================================================ */
(function () {
  const { $, esc, toast, openModal, kv, renderTabs, switchTab } = APP;
  const AIFX = () => APP.AIFX;
  const M = () => window.MOCK;
  const S = APP.S;

  const PROG_CLS = { 突破: 'tag-solid-red', 攻坚: 'tag-orange', 培育: 'tag-blue', 储备: 'tag-gray' };
  const NET_PROD = {
    '新型电网': ['项目贷款', '绿色贷款', '供应链金融'], '新一代通信网': ['科创贷款', '并购贷款', '票据池'],
    '算力网': ['项目贷款', '科技贷', '设备更新贷'], '城市地下管网': ['项目贷', '资金监管', '债券承销'],
    '水网': ['项目贷款', '水利专项贷', '资金监管'], '物流网': ['项目贷', '供应链融资', '结算归集'],
  };
  const ROLE = () => { const r = APP.role(); return r; };
  /* 超期：截止早于 11-05 且未反馈/未关闭 */
  const isOverdue = t => +t.due.replace('-', '') < 1105 && t.status !== '已反馈' && t.status !== '已关闭';
  /* 待复核纪要：有访客纪要但尚无产品经理协同留言 */
  const needReview = t => t.log.some(l => l.t.indexOf("访客纪要") >= 0) && !t.log.some(l => l.t === '协同留言' && l.by.indexOf('产品经理') >= 0);
  const cName = id => { const c = M().funnel.cos.find(x => x.id === id); return c ? c.short : ''; };
  const rmName = id => { const r = M().funnel.rms.find(x => x.id === id); return r ? r.name : ''; };

  /* ---------- 演示转写文案库（按六张网） ---------- */
  const DEMO_SCRIPT = {
    '新型电网': '今天拜访了财务总监。海缆和风电塔筒订单排到明年，回款账期六个月，希望用供应链票据支付设备款。如东基地扩产预算三个亿，明年一季度启动，想了解项目贷和出口信贷。结算目前主要在四大行，愿意把部分结算迁过来。',
    '算力网': '和资金部聊了四十分钟。智算中心二期资本开支八个亿左右，打算项目贷加设备租赁组合。手上还有一点二亿闲置资金，有现金管理需求。代发目前不到三百人，扩张后会到八百人。',
    '城市地下管网': '管廊二期项目公司月底注册，资金监管招标还没启动。业主方关心监管银行的放款时效和系统对接，专项债配套还有两亿缺口，想比较成本。施工保函明年有密集需求。',
    '水网': '走访了原水公司和供水枢纽项目。调水工程二期投资六亿，资本金到位三成，剩下想用项目贷加水利专项贷。水费收缴账户在他行，业主愿意谈结算归集和资金监管专户。',
    '物流网': '机场改扩建和铁路专用线项目都有他行报价，客户更看重放款节奏。货运板块的车队更新一点五亿想讨论置换。对票据池加代发联动很感兴趣，约了下周运营团队对接。',
    '新一代通信网': '光模块和光纤光缆订单能见度到明年年底。科创板辅导中，券商建议提前做募集资金监管预案。研发投入今年超一个亿，希望有信用类科创贷。应收在头部客户，账期九十天，可以做保理。',
  };
  const AI_PROD = c => (c.prods && c.prods.length >= 2 ? c.prods : (NET_PROD[c.net] || ['流动资金贷款']));
  const DEMO_AI = c => {
    const pr = AI_PROD(c);
    return {
    needs: [`融资需求：${pr.slice(0, 2).join('、')}（意向明确，需测算额度）`, `非信贷需求：结算归集、代发工资（客户主动提及，优先落地）`, `潜在需求：${pr.slice(2).concat(['资金监管']).slice(0, 2).join('、')}（下次拜访跟进）`],
    plan: [`第一步：落地非信贷服务（结算/代发/票据池），先建立日常往来`, `第二步：按资本开支节奏出具${pr[0]}方案，同步对接政策贴息`, `第三步：协同产品经理出具综合服务方案（前中台联动）`],
    risk: c.pos === '战略' ? '战略客户同业竞争激烈，注意报价与服务时效；大额融资需提前与审批沟通窗口。' : '关注客户所处环节的回款账期与资本开支节奏，避免期限错配。',
  };
  };

  window.VIEWS = window.VIEWS || {};
  /* ================= 综合服务方案（独立页 · 漏斗"建议服务方案"/作战包/工作台进入） ================= */
  VIEWS.plan = {
    render(el) {
      const c = S.params.co && M().funnel.cos.find(x => x.id === S.params.co);
      if (!c) {
        el.innerHTML = '<div class="card card-pad"><div class="empty"><div class="e-ico">📄</div><div class="e-title">请从机会漏斗的"建议服务方案"、访前作战包或工作台进入</div></div></div>';
        return;
      }
      el.innerHTML = `
        <div class="page-head"><div class="page-title">综合服务方案 · ${esc(c.short)}</div>
          <div class="flex" style="gap:8px">
            <button class="btn btn-ghost" onclick="APP.go('funnel',{tab:'co'})">← 返回机会漏斗</button>
            <button class="btn btn-ghost" onclick="APP.go('pack')">← 返回访前作战包</button>
            <button class="btn btn-primary btn-sm" onclick="APP.toast('综合服务方案已下载（PDF）')">下载服务方案</button></div></div>
        <div id="planBoard">${VIEWS.workbench.planHtml(c)}</div>`;
      const board = el.querySelector('#planBoard');
      const FX = AIFX();
      const first = !FX.played.plan;
      if (first && board) { FX.played.plan = 1; FX.flow(board).then(() => { FX.stagger(board); FX.countUp(board); }); }
      else if (board) { FX.stagger(board); FX.countUp(board); }
    },
  };

  VIEWS.workbench = {
    /* ---------- 任务范围 ---------- */
    myTasks() {
      const r = ROLE(), tasks = S.fn ? S.fn.tasks : M().funnel.tasksSeed;
      const rmMap = M().funnel.rms;
      if (r.id === 'rm-drz' || r.key === 'rm') return tasks.filter(t => t.rm === 'rm-drz');
      if (r.key === 'head') return tasks.filter(t => { const rm = rmMap.find(x => x.id === t.rm); return rm && rm.unit === '南京分行营业部'; });
      return tasks;
    },
    /* ---------- 访前一页纸（六张网企业） ---------- */
    /* ---------- 企业画像卡（企业详情页调用，复用访前准备画像数据） ---------- */
    profileHtml(c) {
      if (!c || c.id[0] !== 'F') return '';
      const cl = (x, cls) => `<span class="wp-cl ${cls}">${esc(x)}</span>`;
      const BIZ = {
        '新型电网': [['核心业务（to G/B）', c.cat === '建设运营商' ? '电网/海风场投资建设运营，项目核准与并网节奏决定资本开支' : '电网装备与海缆/风电配套供货，客户以国网/南网、发电集团与整机厂为主', 1], ['场景延伸（to C/场景）', c.track.indexOf('海上风电') >= 0 ? '海上风电运维、绿电交易与碳资产场景延伸' : '分布式能源、虚拟电厂与充电场景', 2], ['业务壁垒', c.cat === '建设运营商' ? '特许经营与项目资源稀缺，省级平台卡位' : '电网认证周期1-2年构成置换壁垒', 3]],
        '算力网': [['智算建设与运营', c.cat === '建设运营商' ? '智算中心/超算平台建设运营' : '算力设备/液冷/网络配套供货', 1], ['算电协同场景', '绿电直供、算力交易与边缘计算延伸', 2], ['业务壁垒', '重资产+政府合作卡位；上架算力与运维能力构成壁垒', 3]],
        '城市地下管网': [['管网建设运营', c.cat === '建设运营商' ? '综合管廊/供排水/燃气投资运营，特许经营现金流稳定' : '管网施工与设备供货，业主为地方平台与水务公司', 1], ['智慧化延伸', '智慧水务/管网监测数字化改造', 2], ['业务壁垒', '特许经营授权与区域管网资源构成自然垄断属性', 3]],
        '水网': [['水利工程与供水', c.cat === '建设运营商' ? '原水/调水/供水枢纽建设运营，水费+政府购买双现金流' : '水务装备与工程配套', 1], ['节水与水环境', '节水改造、水环境治理，绑定国家水网重大工程', 2], ['业务壁垒', '水利特许经营与水源地资源稀缺', 3]],
        '物流网': [['物流枢纽运营', c.cat === '建设运营商' ? '机场/铁路/港口/园区枢纽建设运营' : '物流装备与多式联运服务', 1], ['供应链延伸', '冷链、跨境与供应链增值服务', 2], ['业务壁垒', '枢纽资源与航线/班列时刻稀缺，网络效应显著', 3]],
        '新一代通信网': [['通信设备与器件', c.cat === '建设运营商' ? '通信网络建设运营，运营商集采与政企专网为主' : '光模块/射频/卫星等器件供货', 1], ['AI 与算力带动', 'AI 算力建设带动高速光模块/连接需求', 2], ['业务壁垒', '技术认证与客户验证周期长，高速率环节格局集中', 3]],
      }[c.net] || [['主营业务', esc(c.track), 1], ['场景延伸', '产业链上下游协同', 2], ['业务壁垒', '细分领域认证与客户壁垒', 3]];
      const PCS = { 1: '#C0202C', 2: '#2458F5', 3: '#B08A00' };
      return `
        <div class="flex-between mb2"><b class="text-sm" style="font-size:var(--fs-md)">客户画像</b><span class="text-xs text-muted">来源：AI 访前准备看板</span></div>
        <div class="wp-cloud mb2">
          ${cl(c.listed.indexOf('是') === 0 ? c.listed.slice(2) : '非上市主体', c.listed.indexOf('是') === 0 ? 'wp-cl-a' : 'wp-cl-e')}
          ${cl(c.net + ' · ' + c.track, 'wp-cl-b')}${cl(c.cat, 'wp-cl-a')}${cl(c.nat, 'wp-cl-c')}
          ${cl(c.pos + '客户', 'wp-cl-a')}${cl('营销进展：' + c.prog, 'wp-cl-b')}${cl('权重：' + c.wt, 'wp-cl-c')}
          ${cl(c.rel, 'wp-cl-a')}${cl('四线得分 ' + c.score, 'wp-cl-b')}${cl(c.city + '属地', 'wp-cl-c')}
        </div>
        <div class="grid-3 mb2">${BIZ.map(b => `<div class="wp-pcard" style="border-top:3px solid ${PCS[b[2]]}"><div class="t">${esc(b[0])}</div><div class="s">${esc(b[1])}</div></div>`).join('')}</div>
        <div class="flex mb2" style="gap:6px;flex-wrap:wrap;align-items:center">
          <span class="text-xs text-muted">✦ 建议服务方案：</span>${(c.prods || []).slice(0, 4).map(pp => `<span class="tag tag-blue" style="height:22px">${esc(pp)}</span>`).join('')}
          <button class="btn btn-text btn-sm" onclick="APP.go('plan',{co:'${c.id}'})">查看综合服务方案 ›</button>
        </div>
        <div class="wp-note"><b>画像小结：</b>围绕「${esc((c.sig || [])[0] || '')}」切入——${esc(c.cat)}（${c.pos}客户 · ${c.prog}档 · ${c.rel}），先以结算归集/代发等非信贷服务建立日常往来，方案窗口建议 <b style="color:var(--danger-500)">11 月内</b> 锁定。</div>`;
    },
    /* ---------- 访前准备看板（结构对齐《访前准备看板》：首屏1-4，5-10折叠展开） ---------- */
    secHtml(no, t, hint) { return `<div class="wp-sec"><span class="no">${no}</span><b>${t}</b><span class="hint">${hint || ''}</span></div>`; },
    briefHtml(c) {
      const t = (S.fn && S.fn.tasks.find(x => x.co === c.id)) || null;
      const verdict = c.prog === '突破' ? '重点介入' : c.prog === '攻坚' ? '适度介入' : '培育跟踪';
      const vSub = `${c.pos}客户 · ${c.prog}档 · 授信评估`;
      const kpi = (k, v, d) => `<div class="wp-kpi"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
      const cl = (x, cls) => `<span class="wp-cl ${cls}">${esc(x)}</span>`;
      const BIZ = {
        '新型电网': [['核心业务（to G/B）', `${c.cat === '建设运营商' ? '电网/海风场投资建设运营，项目核准与并网节奏决定资本开支' : '电网装备与海缆/风电配套供货，客户以国网/南网、发电集团与整机厂为主'}`, 1], ['场景延伸（to C/场景）', c.track.indexOf('海上风电') >= 0 ? '海上风电运维、绿电交易与碳资产场景延伸，运营期现金流稳定' : '分布式能源、虚拟电厂与充电场景，负荷资源入口', 2], ['业务壁垒', c.cat === '建设运营商' ? '特许经营与项目资源稀缺，省级平台卡位构成先发壁垒' : '电网认证周期1-2年构成置换壁垒，批中标份额集中', 3]],
        '算力网': [['智算建设与运营', `${c.cat === '建设运营商' ? '智算中心/超算平台建设运营，算力调度与政府订单为主' : '算力设备/液冷/网络配套，客户为运营商与智算中心'}`, 1], ['算电协同场景', '绿电直供、算力交易与边缘计算场景延伸，绑定地方数据要素政策', 2], ['业务壁垒', '重资产+政府合作卡位；上架算力与运维能力构成运营壁垒', 3]],
        '城市地下管网': [['管网建设运营', `${c.cat === '建设运营商' ? '综合管廊/供排水/燃气投资运营，特许经营现金流稳定' : '管网施工与设备供货，业主为地方平台与水务公司'}`, 1], ['智慧化延伸', '智慧水务/管网监测数字化改造，带动长期运维协议', 2], ['业务壁垒', '特许经营授权与区域管网资源构成自然垄断属性', 3]],
        '水网': [['水利工程与供水', `${c.cat === '建设运营商' ? '原水/调水/供水枢纽建设运营，水费与政府购买服务双现金流' : '水务装备与工程配套，跟随水利专项投资周期'}`, 1], ['节水与水环境', '节水改造、水环境治理延伸场景，绑定国家水网重大工程', 2], ['业务壁垒', '水利特许经营与水源地资源稀缺，区域垄断明显', 3]],
        '物流网': [['物流枢纽运营', `${c.cat === '建设运营商' ? '机场/铁路/港口/园区枢纽建设运营，吞吐量决定收益' : '物流装备与多式联运服务，客户为枢纽与货主'}`, 1], ['供应链延伸', '冷链、跨境与供应链增值服务，绑定产业带货量', 2], ['业务壁垒', '枢纽资源与航线/班列时刻稀缺，网络效应显著', 3]],
        '新一代通信网': [['通信设备与器件', `${c.cat === '建设运营商' ? '通信网络建设运营，运营商集采与政企专网为主' : '光模块/射频/卫星等器件供货，客户为设备商与运营商'}`, 1], ['AI 与算力带动', 'AI算力建设带动高速光模块/连接需求，订单能见度高', 2], ['业务壁垒', '技术认证与客户验证周期长，车规/高速率环节格局集中', 3]],
      }[c.net] || [['主营业务', esc(c.track), 1], ['场景延伸', '产业链上下游协同场景', 2], ['业务壁垒', '细分领域认证与客户壁垒', 3]];
      const PCS = { 1: '#C0202C', 2: '#2458F5', 3: '#B08A00' };
      /* 六个核心交流议题（问/为什么谈/对应方案/话术示范） */
      const p0 = (c.prods || [])[0] || '项目贷款';
      const topics = [
        { q: '订单与项目节奏', ask: '问：未来 6—12 个月订单储备/项目进度如何？正式合同与框架协议各占多少？关键交付与验收节点？', why: `这是${c.cat === '建设运营商' ? '资本开支与融资排期' : '收入与垫资规模'}的直接变量，决定授信上量节奏与期限设计。`, plan: p0, script: `「想先了解贵司${c.cat === '建设运营商' ? '项目核准与资本金安排' : '订单能见度与交付节奏'}——如果四季度到明年有资金过渡需求，我们可以备一笔专项额度，先把通道铺好，节奏由您定。」` },
        { q: '回款与结算方式', ask: '问：主要客户/业主方的账期多长？电汇、票据、平台结算各占多少？可否确权？', why: c.cat === '上游供应商' ? '应收占款是最适合银行工具盘活的板块；链主确权后保理风险极低，是差异化抓手。' : '回款结构决定现金流测算与资金监管方案设计。', plan: (c.prods || []).find(x => /供应链|票据|应收/.test(x)) || '供应链金融', script: `「应收这块我们做了功课——${c.cat === '上游供应商' ? '债务人是链主客户，资质很好，能不能走保理或者应收质押？' : '业主回款的归集与监管方案我们可以出一版'}两周内给您一份具体的融资方案，价格放到桌面上谈。」` },
        { q: '产能与投资安排', ask: '问：现有产能利用率？在建/拟建产线与设备采购的付款计划怎样安排？', why: '资本开支节奏决定中长期融资窗口与产品组合（项目贷/设备更新贷/租赁）。', plan: (c.prods || []).find(x => /项目|设备|技改/.test(x)) || p0, script: `「扩产和设备投入的时间表，我们可以按付款节点测算资金方案，让融资进度跟着项目走，不占用日常周转。」` },
        { q: '存量融资与同业格局', ask: '问：现有授信额度、已用余额与到期安排？合作行里哪类业务体验最差？', why: '正面拼价格无胜算；摸清"体验洼地"（保函时效、异地审批、系统对接）才能找到差异化切入口。', plan: '结算归集 + 非信贷先行', script: `「贵司合作行不少，我们今天不是来拼价格的。想请教：这么多家里哪类业务体验最差？您指哪里，我们改哪里——我们的优势就是决策链短，当天能约到审批人。」` },
        { q: '政策申报窗口', ask: `问：${{ '新型电网': '绿色信贷贴息/碳减排工具', '算力网': '算力基础设施专项贴息', '城市地下管网': '专项债配套', '水网': '水利专项贷款', '物流网': '多式联运与枢纽补贴', '新一代通信网': '专精特新与科技补贴' }[c.net] || '产业专项政策'}是否有申报计划？需要哪些协助？`, why: '政策工具可直接降低客户融资成本，协助申报是建立信任、卡位主办行的低成本方式。', plan: (c.prods || []).find(x => /绿色|科技|科创/.test(x)) || '政策叠加方案', script: `「这个方向有专项政策窗口，符合条件可以叠加贴息。材料我们可以协助梳理，先把申报资格拿到，融资成本立降。」` },
        { q: '资本运作计划', ask: '问：是否有再融资、并购整合或资产证券化的中期安排？', why: `${c.listed.indexOf('是') === 0 ? '上市主体有再融资与资产运作传统，商投行联动是提升综合回报的杠杆。' : 'Pre-IPO/股权融资窗口值得提前卡位，投行+私行服务可超越信贷关系。'}`, plan: (c.prods || []).find(x => /投行|并购|债券|承销/.test(x)) || '投行服务', script: `「往后不管是再融资、并购还是资产证券化，我们投行条线都愿意提前介入、先把方案备着——哪怕暂时不动，顾问关系先建起来，节奏您定。」` },
      ];
      const topicHtml = topics.map((x, i) => `<div class="wp-topic">
        <div class="head"><span class="no2" style="background:${i < 2 ? '#FEF4E2;color:#A8701A' : i < 4 ? '#E7EEFF;color:#1A44D6' : '#FBE7E9;color:#A61521'}">${'①②③④⑤⑥'[i]}</span><span class="q">${esc(x.q)}</span></div>
        <div class="ask">${esc(x.ask)}</div>
        <div class="why"><b>为什么谈：</b>${esc(x.why)}→ 对应方案：<b>${esc(x.plan)}</b>。</div>
        <div class="script"><span class="sl">话术示范 · 可照读</span>${esc(x.script)}</div></div>`).join('');
      return `
        <div class="wp-hero">
          <div><div class="eyebrow">访前准备 · 客户经理速览</div><h2>${esc(c.name)}</h2>
            <div class="sub">${c.listed.indexOf('是') === 0 ? esc(c.listed.slice(2)) + ' ｜ ' : ''}${esc(c.city)}·${esc(c.zone)}${c.opp ? '（机会地：' + esc(c.opp) + '）' : ''} ｜ ${esc(c.net)}·${esc(c.track)} ｜ 数据基准日：2026-11-04 ｜ 配套：《综合服务方案》看板</div></div>
          <div class="wp-verdict"><div class="lv">${verdict}</div><div class="sm">${vSub}</div></div>
        </div>
        <div class="wp-kpis">
          ${kpi('综合评分', c.score, c.sigLv + ' 级信号 · ' + c.rel)}
          ${kpi('客户大类', c.cat === '建设运营商' ? '运营商' : '供应商', esc(c.nat))}
          ${kpi('上市情况', c.listed.indexOf('是') === 0 ? '是' : '否', c.listed.indexOf('是') === 0 ? c.listed.slice(2, 14) : '非上市主体')}
          ${kpi('营销进展', c.prog, '地位 ' + c.pos + ' · 权重 ' + c.wt)}
          ${kpi('AI 信号', c.sigLv + ' 级', esc(c.sig[0]).slice(0, 18) + '…')}
          ${kpi('建议服务方案', (c.prods || []).length + ' 项', (c.prods || []).slice(0, 2).join(' / '))}
        </div>
        ${this.secHtml(1, '客户画像', '先看清"他是谁"——标签、定位、业务底盘')}
        <div class="card card-pad mb3">
          <div class="wp-cloud mb2">
            ${cl(c.listed.indexOf('是') === 0 ? c.listed.slice(2) : '非上市主体', c.listed.indexOf('是') === 0 ? 'wp-cl-a' : 'wp-cl-e')}
            ${cl(c.net + ' · ' + c.track, 'wp-cl-b')}
            ${cl(c.cat, 'wp-cl-a')}${cl(c.nat, 'wp-cl-c')}${cl(c.pos + '客户', 'wp-cl-a')}
            ${cl('营销进展：' + c.prog, 'wp-cl-b')}${cl('权重：' + c.wt, 'wp-cl-c')}${cl(c.rel, 'wp-cl-a')}
            ${cl('经营四线得分 ' + c.score, 'wp-cl-b')}${cl(c.city + '属地', 'wp-cl-c')}
          </div>
          <div class="grid-3 mb2">${BIZ.map(b => `<div class="wp-pcard" style="border-top:3px solid ${PCS[b[2]]}"><div class="t">${esc(b[0])}</div><div class="s">${esc(b[1])}</div></div>`).join('')}</div>
          <div class="wp-note"><b>画像小结：</b>一家"${esc(c.net)}"方向的${esc(c.nat)}${esc(c.cat)}——经营基本面看${c.cat === '建设运营商' ? '项目核准与现金流' : '链主订单与回款'}（稳），成长弹性看${esc(c.track.split('·')[0])}（跟随${esc(c.net)}建设放量），信用观察点看${c.cat === '上游供应商' ? '客户集中度与账期变化' : '资本开支与资本金到位节奏'}。</div>
        </div>
        ${this.secHtml(2, '建议对接人', '首次拜访由下至上、二次拜访由内至外')}
        <div class="grid-3 mb3">
          <div class="wp-person"><div class="nm">周敏</div><div class="rl">财务总监</div><div class="pt">资金安排、融资需求、应收与回款、结算方案的实际决策者——<b>方案落地的关键人</b>。</div></div>
          <div class="wp-person"><div class="nm">王涛</div><div class="rl">董事会秘书 / 综合管理部负责人</div><div class="pt">对外信息与授信框架的统一接口人——<b>首次拜访第一对象</b>。</div></div>
          <div class="wp-person"><div class="nm">陈志强</div><div class="rl">总经理 / 董事长</div><div class="pt">战略层对话对象：${esc(c.net)}布局、资本运作。<b>二次拜访升级</b>谈综合合作框架。</div></div>
        </div>
        ${this.secHtml(3, '六个核心交流议题（附交流理由）', '每个议题对应《综合服务方案》中的一个模块')}
        <div class="grid-2 mb3">${topicHtml}</div>
        ${this.secHtml(4, '拜访注意事项', '时机 · 姿态 · 合规')}
        <div class="grid-3 mb3">
          <div class="card card-pad"><b class="text-sm mb2" style="display:block">时机选择</b><ul class="text-sm text-sub" style="padding-left:18px;line-height:1.9"><li>${c.prog === '突破' ? '<b>方案窗口在 11 月内</b>，错过需等下一周期；' : c.prog === '攻坚' ? '年底前是授信落地窗口；' : '以建立联系为主，不急于报价；'}</li><li>首访锁财务口 → 两周内提交定制方案 → 纳入年度授信盘子。</li></ul></div>
          <div class="card card-pad"><b class="text-sm mb2" style="display:block">姿态与话术</b><ul class="text-sm text-sub" style="padding-left:18px;line-height:1.9"><li>切忌泛泛推销与低价竞争；</li><li>带具体方案上门：${esc((c.prods || []).slice(0, 2).join('、'))}要点与测算；</li><li>他行合作、股价等话题<b>不主动评论</b>。</li></ul></div>
          <div class="card card-pad"><b class="text-sm mb2" style="display:block">合规红线</b><ul class="text-sm text-sub" style="padding-left:18px;line-height:1.9"><li>未公开数据按内幕信息管理，不用于营销对比；</li><li>调查数据以审计报告与公告为准，舆情仅作参考；</li><li>不承诺额度、利率、审批时限。</li></ul></div>
        </div>
        <details class="mb3" id="wpMoreWrap">
          <summary class="btn btn-ghost wp-more-btn" style="list-style:none;text-align:center;cursor:pointer">展开更多：股权治理 · 集团架构 · 财务速览 · 资本表现 · 行业地位 · 风险排查（5-10） ▾</summary>
          <div style="padding-top:6px">
            ${this.secHtml(5, '股权与治理要点', '控制链 · 股东行为')}
            <div class="card card-pad mb3">
              <ul class="text-sm text-sub" style="padding-left:18px;line-height:2">
                <li><span class="tag tag-blue" style="height:20px">控制链</span>${c.nat.indexOf('国企') >= 0 || c.nat.indexOf('国资') >= 0 || c.nat.indexOf('央企') >= 0 ? `${esc(c.nat)}背景，实际控制人为相应国资监管主体，治理规范` : '民营控股，实际控制人为自然人，关注股权质押与代持情况'}</li>
                <li><span class="tag tag-green" style="height:20px">股东结构</span>${c.listed.indexOf('是') === 0 ? '上市主体，前十大股东以机构与产业资本为主（详见公告）' : '非上市主体，股东以创始团队与产业投资人为主'}</li>
                <li><span class="tag tag-orange" style="height:20px">关注点</span>${c.nat.indexOf('民营') >= 0 ? '大股东质押比例与平仓线距离——首授必查' : '出资人资本金到位与政府购买服务协议期限'}</li>
              </ul>
              <div class="wp-note"><b>结论：</b>"控制链清晰${c.listed.indexOf('是') === 0 ? '+上市规范' : ''}"为正面——授信策略应${c.cat === '上游供应商' ? '与链主订单绑定' : '与项目现金流绑定'}，而非与单一股东信用绑定。</div>
            </div>
            ${this.secHtml(6, '集团架构与用信建议', '授信对象定位')}
            <div class="card card-pad mb3">
              <ul class="text-sm text-sub" style="padding-left:18px;line-height:2">
                <li>母公司统一授信、子公司按用信场景拆分（保函/供应链/项目贷分别落到业务主体）；</li>
                <li>${c.cat === '上游供应商' ? '关注其对链主的依赖度：前五大客户集中度需现场核实' : '关注项目公司资本金与并表范围，防止风险向母公司传导'}；</li>
                <li>对外担保与关联交易须穿透核查（正式环境接入工商穿透数据）。</li>
              </ul>
            </div>
            ${this.secHtml(7, '财务速览（示意）', '正式环境接入财报后自动生成')}
            <div class="card card-pad mb3"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>指标（示意口径）</th><th>评估</th><th>解读</th></tr></thead><tbody>
              <tr><td>营收规模</td><td>${c.pos === '战略' ? '体量大' : '成长期'}</td><td class="text-sub">跟随${esc(c.net)}投资周期放量</td></tr>
              <tr><td>盈利能力</td><td>${c.prog === '突破' ? '强' : '改善中'}</td><td class="text-sub">四线得分 ${c.score}（${c.sigLv} 级信号）</td></tr>
              <tr><td>杠杆水平</td><td>${c.cat === '建设运营商' ? '重资产高杠杆（项目期）' : '适中'}</td><td class="text-sub">${c.cat === '建设运营商' ? '关注资本金与期限匹配' : '授信空间充足'}</td></tr>
              <tr><td>现金流</td><td>${c.cat === '上游供应商' ? '回款账期是核心变量' : '政府/业主回款稳定'}</td><td class="text-sub">保理/资金监管切入点</td></tr>
            </tbody></table></div>
            <div class="wp-note">正式环境接入财报/税务/行内数据后，本节自动生成完整四维分析（盈利·杠杆·现金流·营运）。</div></div>
            ${this.secHtml(8, '资本市场表现', c.listed.indexOf('是') === 0 ? '不博弈股价，但须理解波动来源' : '非上市主体')}
            <div class="card card-pad mb3"><ul class="text-sm text-sub" style="padding-left:18px;line-height:2">
              ${c.listed.indexOf('是') === 0
                ? `<li>板块/代码：${esc(c.listed.slice(2))}；估值以 PB/PS 为参考（亏损期 PE 失效）；</li><li>股价波动传导路径：市值缩水 → 大股东质押压力上升 → 授信须与股价脱敏、与现金流绑定；</li><li>贷后按月监测质押率与减持公告。</li>`
                : `<li>非上市主体——关注 ${c.prog === '突破' ? 'Pre-IPO/上市辅导进展（募集资金监管预案提前卡位）' : '股权融资轮次与估值变化'}；</li><li>员工持股与股权激励带来配套金融服务机会。</li>`}
            </ul></div>
            ${this.secHtml(9, '行业景气与公司地位', esc(c.net) + '建设持续放量')}
            <div class="card card-pad mb3">
              <ul class="text-sm text-sub" style="padding-left:18px;line-height:2">
                <li><span class="tag tag-green" style="height:20px">政策强β</span>江苏省六张网专项持续投入，${esc(c.net)}环节订单能见度高；</li>
                <li><span class="tag tag-blue" style="height:20px">公司卡位</span>${esc(c.track)}细分环节${c.pos === '战略' ? '龙头' : c.pos === '腰部' ? '成长' : '参与者'}，${c.rel}；</li>
                <li><span class="tag tag-orange" style="height:20px">竞争压力</span>四大行与股份行均在跟进六张网名单，建议两周内递交方案抢占先手。</li>
              </ul>
            </div>
            ${this.secHtml(10, '风险排查与综合评分', '公开信号交叉验证')}
            <div class="card card-pad mb3">
              <div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:200px">风险维度</th><th style="width:70px">评估</th><th>说明</th></tr></thead><tbody>
                <tr><td>失信被执行 / 行政处罚</td><td><span class="tag tag-green" style="height:20px">正常</span></td><td class="text-sub">公开信息未见异常</td></tr>
                <tr><td>客户/业主集中度</td><td>${c.cat === '上游供应商' ? '<span class="tag tag-orange" style="height:20px">关注</span>' : '<span class="tag tag-green" style="height:20px">正常</span>'}</td><td class="text-sub">${c.cat === '上游供应商' ? '前五大客户集中度需现场核实' : '业主方以政府/国企为主，回款确定性强'}</td></tr>
                <tr><td>同业竞争</td><td><span class="tag tag-orange" style="height:20px">关注</span></td><td class="text-sub">六张网名单为同业共同关注焦点，比拼方案与服务时效</td></tr>
                <tr><td>政策依赖</td><td><span class="tag tag-gray" style="height:20px">了解</span></td><td class="text-sub">${esc(c.net)}投资节奏受政策与财政影响，跟踪专项规划落地</td></tr>
              </tbody></table></div>
              <div class="wp-hbar" style="margin-top:10px"><span class="bl">经营四线得分</span><div class="bt"><i style="width:${c.score}%;background:#D98A92"></i></div><span class="bn">${c.score} / 100（${c.sigLv} 级）</span></div>
            </div>
          </div>
        </details>
        <div class="flex mt3" style="justify-content:space-between;align-items:center;gap:10px">
          <span class="text-xs text-muted">内容依据公开信号、四维标签与本行产品库整理；具体方案以现场核实和审批结果为准。</span>
          <button class="btn btn-primary btn-sm" onclick="APP.toast('访前准备看板已下载（PDF）')">下载访前准备</button>
        </div>`;
    },
    /* ---------- 综合服务方案看板（逐项回应访前六大议题） ---------- */
    planHtml(c) {
      const p = (c.prods || []).length ? c.prods : ['流动资金贷款'];
      const total = c.pos === '战略' ? 2.0 : c.pos === '腰部' ? 1.2 : 0.8;
      const credit = [
        { n: (p.find(x => /项目|设备|技改/.test(x)) || p[0]), amt: Math.round(total * 0.4 * 10000) / 10000, tip: '项目/设备资本开支主力' },
        { n: (p.find(x => /流贷|流动|经营/.test(x)) || '流动资金贷款'), amt: Math.round(total * 0.3 * 10000) / 10000, tip: '经营周转过渡' },
        { n: (p.find(x => /供应链|票据|应收|订单/.test(x)) || '供应链融资'), amt: Math.round(total * 0.3 * 10000) / 10000, tip: '订单与应收盘活' },
      ];
      const amtMax = credit[0].amt;
      const kpi = (k, v, d) => `<div class="wp-kpi"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
      const MAP = [
        ['① 订单与项目节奏', '投资高峰期资本开支与经营周转的资金过渡需求', `信贷A：${esc(credit[0].n)}`, '专项贷款落地额；项目节点兑现率'],
        ['② 回款与结算方式', c.cat === '上游供应商' ? '应收占款大、账期长，链主确权条件待确认' : '业主回款归集与资金监管需求', `信贷B：${esc(credit[2].n)} + 结算归集`, '应收周转改善；我行融资余额'],
        ['③ 同业授信格局', '大行授信充足但存在体验洼地（时效/审批/对接）', '信贷C：专属服务团队 + 审批绿色通道', '用信份额；服务响应时效'],
        ['④ 产能与投资安排', '设备/项目付款节奏与融资期限错配', `信贷A 配套：${esc(credit[0].n)}分期结构`, '资本开支覆盖率；期限匹配度'],
        ['⑤ 政策申报窗口', '专项政策与贴息申报缺乏专业协助', '非信贷：政策申报协助 + 结算/代发先行', '政策落地笔数；结算归集率'],
        ['⑥ 资本运作诉求', c.listed.indexOf('是') === 0 ? '再融资/资产证券化的中长期安排' : '股权融资与上市辅导窗口', '非信贷：投行服务 + 培育陪伴', '顾问签约；投行储备项目数'],
      ];
      const sol = (badge, t, need, solu, path, kpis) => `<div class="wp-sol"><span class="badge">${badge}</span><div class="t">${t}</div>
        <div class="blk need"><span class="lab">需求依据：</span>${need}</div>
        <div class="blk solu"><span class="lab">解决方案：</span>${solu}</div>
        <div class="blk path"><span class="lab">落地路径：</span>${path}</div>
        <div class="blk kpi2"><span class="lab">评价指标：</span>${kpis}</div></div>`;
      const INCOME = [['贷款利息', Math.round(total * 0.9 * 340)], ['保函/手续费', Math.round(total * 10000 * 0.015 * 10) / 10], ['供应链/贴现', Math.round(total * 10000 * 0.015 * 10) / 10], ['存款贡献', Math.round(total * 300)], ['跨境/中收', 30]];
      const incMax = Math.max(...INCOME.map(x => x[1]));
      return `
        <div class="wp-hero">
          <div><div class="eyebrow">综合服务方案 · 信贷 + 非信贷</div><h2>${esc(c.name)}</h2>
            <div class="sub">${esc(c.net)}·${esc(c.track)} ｜ 逐项回应《访前准备》六大交流议题 ｜ 个性化需求 → 解决方案 → 评价指标 ｜ 理想态设计，能力约束后置</div></div>
          <div class="wp-verdict"><div class="lv">信贷 + 非信贷</div><div class="sm">综合服务方案 · 六大模块</div></div>
        </div>
        <div class="wp-kpis">
          ${kpi('首期授信总额', total.toFixed(1) + ' 亿元', credit.map(x => x.n.slice(0, 6)).join('+'))}
          ${kpi('服务模块', '6 大模块', '信贷 3 项 + 非信贷 6 项（含交叉）')}
          ${kpi('议题覆盖', '6 / 6', '访前六大交流议题全部有对应方案')}
          ${kpi('预计年综合收益', '约 ' + Math.round(INCOME.reduce((a, x) => a + x[1], 0)) + ' 万+', '利息 + 中间业务（测算口径见第四节）')}
          ${kpi('目标结算份额', '结算主户', '以结算与代发绑定资金流')}
          ${kpi('升级路径', '下一授信周期', '验证后升级投行/承销')}
        </div>
        ${this.secHtml(1, '方案总览：议题 → 个性化需求 → 方案 → 评价指标', '每条方案都锚定一个访前议题与一个可验证的指标')}
        <div class="card card-pad mb3"><div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:160px">交流议题（访前①–⑥）</th><th style="width:26%">挖掘到的个性化需求</th><th>对应方案模块</th><th style="width:24%">评价指标</th></tr></thead><tbody>
          ${MAP.map(r2 => `<tr><td><b class="text-sm">${esc(r2[0])}</b></td><td class="text-sm text-sub">${esc(r2[1])}</td><td class="text-sm"><b>${esc(r2[2])}</b></td><td class="text-sm text-sub">${esc(r2[3])}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="wp-note"><b>设计原则：</b>本方案为"理想态"——先按客户需求完整性设计解决方案，落地时超出权限的部分转化为"总行产品 + 联合承销 + 同业合作"三种实现路径。</div></div>
        ${this.secHtml(2, '信贷服务方案（首期 ' + total.toFixed(1) + ' 亿元）', '项目切入 · 流贷过渡 · 供应链绑定')}
        <div class="card card-pad mb3">
          <div class="mb2"><b class="text-sm">额度结构</b></div>
          ${credit.map((x, i) => `<div class="wp-hbar"><span class="bl">${esc(x.n)}</span><div class="bt"><i style="width:${x.amt / amtMax * 100}%;background:${['#D98A92', '#8FAAE8', '#D9BE7E'][i]}"></i></div><span class="bn">${(x.amt * 10000).toLocaleString()} 万 · ${x.tip}</span></div>`).join('')}
          <div class="mt3 mb2"><b class="text-sm">品种、担保与定价要点</b></div>
          <ul class="text-sm text-sub" style="padding-left:18px;line-height:1.9">
            <li><b>信用为主 + 应收质押/保理</b>${c.cat === '上游供应商' ? '（链主应收确定性强）' : '（项目现金流与政府购买服务协议支撑）'}；</li>
            <li>定价可设<b>"业绩挂钩"分档利率</b>——验证信号兑现后利率下调，正向激励锁定份额；</li>
            <li>以 1 年内短期为主，验证后升级中长期与投行产品。</li>
          </ul>
          <div class="wp-note"><b>贷后三红线：</b>① 核心信号（订单/项目/扭亏）未按期兑现；② 应收周转持续恶化或现金流连续两期为负；③ 股权质押/关联担保出现预警 → 额度压降重检。</div>
        </div>
        ${this.secHtml(3, '非信贷服务方案（六大模块 · 理想态设计）', '每张卡：需求依据 → 解决方案 → 落地路径 → 评价指标')}
        <div class="grid-2 mb3">
          ${sol('模块一 · 结算与司库', '集团资金管理一体化', '多主体多行开户、资金分散；缴费/项目资金流沉淀在他行。', '本外币现金池 + 票据池；代发工资 + 批量收付；资金监管专户共建。', '先推现金池与代发（审批快）→ 票据池随供应链上线 → 司库对接列为联合创新课题。', '日均存款沉淀、资金归集率、代发人数。')}
          ${sol('模块二 · 供应链金融', '链上应收 + 生态双线', `应收周转长、占款大（访前议题②）；${c.cat === '上游供应商' ? '其对上游设备/施工供应商亦存在账期传导' : '项目建设带动供应商融资需求'}。`, '应收保理/质押融资；反向保理服务其供应商；票据池 + 贴现绿色通道。', '先做单体应收保理 → 争取链主/业主确权流程 → 以交易数据反哺白名单批量获客。', '供应链融资余额、应收周转改善、生态供应商户数。')}
          ${sol('模块三 · 跨境金融', '海外结算与避险主户', /出口|跨境/.test((c.prods || []).join('')) || c.track.indexOf('出口') >= 0 ? '出口/海外项目回款币种杂、账期长，缺乏系统性避险。' : '产业链存在进出口环节，跨境结算与避险有迁移空间。', '跨境人民币结算主户；远期锁汇/期权组合；内保外贷；海外项目融资配套。', '首谈存量项目结算迁移 → 补齐避险额度 → 大额合同随单融资。', '跨境结算量、锁汇签约额、境外融资笔数。')}
          ${sol('模块四 · 资本市场', '股债承销 + 市值/股东服务', c.listed.indexOf('是') === 0 ? '上市主体有再融资与资产证券化基础（议题⑥）。' : 'Pre-IPO 窗口的募资监管与辅导配套需求。', '定增/科创债承销储备；收费权 ABS 预研；股东减持合规配套与股权激励融资。', '以"ABS 预研/募资监管预案"为敲门砖 → 锁定下一轮财务顾问席位。', '承销/ABS 规模、顾问签约、中收贡献。')}
          ${sol('模块五 · 并购撮合', '产业整合期的撮合方', `${esc(c.net)}进入并购整合期，公司有产业扩张或资产处置双向诉求。`, '并购贷款支持标的收购；撮合地方国资/产业基金对接；协助剥离资产的交易结构设计。', '先以"标的清单+买方画像"轻服务 → 成交预期明确后配置并购贷。', '撮合项目数、并购贷投放、成交金额。')}
          ${sol('模块六 · 绿色金融', '绿金产品矩阵 + ESG 绑定', c.net === '新型电网' || c.net === '水网' ? '项目属绿色/水利方向，可对接贴息与碳减排工具（议题⑤）。' : '设备与项目投资可包装绿色属性，享受定价优惠。', '绿色项目贷；合同能源管理融资；绿证/碳资产质押；ESG 挂钩贷款（KPI 设为减排量）。', '与信贷 A 方案同步提报绿金组合 → 单项目验证 → 资产证券化闭环。', '绿金余额占比、定价优惠幅度、ESG 挂钩落地。')}
        </div>
        ${this.secHtml(4, '综合收益测算（首年 · 静态口径）', '授信之外，结算与投行才是综合回报的主要来源')}
        <div class="card card-pad mb3">
          ${INCOME.map(x => `<div class="wp-hbar"><span class="bl">${x[0]}</span><div class="bt"><i style="width:${x[1] / incMax * 100}%;background:#D98A92"></i></div><span class="bn">约 ${x[1]} 万/年</span></div>`).join('')}
          <div class="wp-note"><b>结论：</b>经常性收益约 ${Math.round(INCOME.reduce((a, x) => a + x[1], 0))} 万/年，综合回报可覆盖定价让利；验证信号兑现后升级投行产品，单年回报可上台阶。建议以"综合收益"而非单一利差向行内说明客户价值。</div>
        </div>
        ${this.secHtml(5, '推进路线图（未来 12 个月）', '从首访到综合方案的五步节奏')}
        <div class="card card-pad mb3">
          ${[['T0 · 首次拜访（本月）', '对接财务总监与董秘；完成六大议题摸底；不当场报价，带回需求清单。'], ['T+2周 · 提交定制方案包', '信贷三件套 + 非信贷六大模块方案；同步报价框架。'], ['T+1月 · 授信尽调与申报', `${total.toFixed(1)} 亿首期授信尽调申报；专项产品并行审批。`], ['T+2月 · 首笔落地 + 结算切入', '首笔放款；启动现金池与代发谈判，把信贷流量转为结算存量。'], ['下一验证期 · 验证与升级', '以核心信号（订单/项目/业绩）验证；兑现挂钩利率优惠，升级投行与跨境主户。']].map((x, i) => `<div class="wp-step"><div class="sn">${i + 1}</div><div><div class="st">${esc(x[0])}</div><div class="sd">${esc(x[1])}</div></div></div>`).join('')}
          <div class="wp-note"><b>能力约束的实现路径：</b>超出分行权限的产品（承销、ABS、内保外贷、并购贷）→ ①总行投行部联合营销；②银团/联合承销分份额；③与券商、租赁同业合作。分行定位"客户主关系行 + 方案总集成"。</div>
        </div>
        <div class="flex mt3" style="justify-content:space-between;align-items:center;gap:10px">
          <span class="text-xs text-muted">配套文件：《访前准备》看板。理想态设计，实际以我行产品权限、授信审批及客户确认为准。</span>
          <button class="btn btn-primary btn-sm" onclick="APP.toast('综合服务方案已下载（PDF）')">下载服务方案</button>
        </div>`;
    },
    /* 抽屉看板 AI 生成动效（briefDlg 渲染后调用） */
    rptReveal() {
      const box = document.querySelector('#drawerBody'); if (!box) return;
      const FX = AIFX();
      const first = !FX.played.rpt;
      if (first) { FX.played.rpt = 1; FX.flow(box).then(() => { FX.stagger(box); FX.countUp(box); }); }
      else { FX.stagger(box); FX.countUp(box); }
    },
    /* ================= AI智能分析（#/report）专用：访前准备 + 综合服务方案（full 企业专属） ================= */
    rptSide(c, side) {
      return `<div class="flex mb3" style="gap:6px">
        <button class="chip ${side !== 'plan' ? 'on' : ''}" onclick="VIEWS.report.briefDlg('${c.id}','brief')">访前准备</button>
        <button class="chip ${side === 'plan' ? 'on' : ''}" onclick="VIEWS.report.briefDlg('${c.id}','plan')">综合服务方案</button></div>`;
    },
    rptBriefHtml(c) {
      const m = M();
      const isTH = c.id === 'TH' && m.reportTH, isXJH = c.id === 'XJH' && m.reportXJH;
      const full = c.id === 'JH' || isTH || isXJH;
      const row = (k, v, hot) => `<div style="display:flex;padding:6px 0;border-bottom:1px dashed var(--line);gap:10px"><span style="width:104px;flex-shrink:0;color:var(--t3);font-size:12px;line-height:22px">${k}</span><span class="text-sm" style="font-weight:600;line-height:22px;${hot ? 'color:var(--brand-600)' : ''}">${v}</span></div>`;
      const kpi = (k, v, d) => `<div class="wp-kpi"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
      const cl = (x, cls) => `<span class="wp-cl ${cls}">${esc(x)}</span>`;
      /* ---- 企业专属数据（沿用原访前一页纸 full 分支） ---- */
      const D = full ? (isXJH ? {
        verdict: '适度介入', vsub: '授信评估 · 支持类', score: 85,
        kpis: [kpi('综合评分', '85', 'AI评级 A'), kpi('核心份额', '约29%', '400G+芯片基座全球'), kpi('头部客户', '旭创/新易盛', '光模块前二'), kpi('资质', '小巨人', '国家级专精特新'), kpi('上市', '新三板', '挂牌公司'), kpi('延伸', '机器人部件', '车载/激光雷达')],
        tags: ['新三板上市公司', '国家级专精特新"小巨人"', '光通信精密零部件', '400G+全球市占29%', '客户：中际旭创/新易盛', '机器人精密零部件延伸'],
        biz: [['光模块芯片基座（基本盘）', '400G及以上芯片基座为优势环节，配套全球头部光模块厂商，收入与算力资本开支强相关。', 1], ['车载与机器人延伸', '激光雷达视窗、车载镜头视窗及机器人精密零部件，打开第二成长曲线。', 2], ['精密制造壁垒', '精密加工/检测工艺与客户认证周期构成切换壁垒。', 3]],
        persons: [['孙亮亮', '实际控制人 / 核心技术出身', '产品路线与客户结构的最终决策者——战略层对话对象。'], ['财务负责人', '资金与融资归口', '订单备货、设备投入与研发资金的安排者——方案落地关键人。'], ['销售/供应链负责人', '订单与交付归口', '头部客户订单节奏、账期与确权流程的第一知情人——首访必见。']],
        topics: [
          ['订单与交付', '未来 6—12 个月订单储备与滚动预测？正式订单与框架协议各占多少？交期/验收/取消条款？', '订单能见度决定融资测算基准；框架与正式订单的风险权重完全不同。', '订单融资'],
          ['客户与结算', '旭创/新易盛供货份额、账期与结算方式？电汇/票据/平台占比？', '头部客户应收是保理的核心资产——确权方式决定产品结构。', '应收账款融资'],
          ['产能与设备', '产能利用率？拟采购设备清单、金额与付款节点？', '设备融资期限与投产节奏匹配，避免短贷长用。', '设备购置贷款'],
          ['产品与技术', '800G 及更高速率、光纤透镜阵列进度？客户认证到哪一步？', '技术迭代决定订单持续性与额度策略（单笔 vs 循环）。', '科技信用融资'],
          ['资金与融资', '现有授信使用与到期？缺口来自备货/应收/设备？股权质押情况？', '综合评估信用与交易融资的配比，防止过度授信。', '综合授信方案'],
          ['会后确认', '指定订单/财务/设备资料联系人，确认材料范围与方案反馈时间。', '把一次拜访变成一条推进线——避免"聊完即止"。', '资料清单 + 试点订单'],
        ],
        attention: ['以"订单与设备投入"为切入的方案型拜访，不泛谈产品；', '客户为挂牌公司，信息披露规范，数据以公告与审计为准；', '未核验订单前不承诺额度、利率与放款时间。'],
      } : isTH ? {
        verdict: '重点介入', vsub: '授信评估 · 升级主办', score: 88,
        kpis: [kpi('综合评分', '88', 'AI评级 A'), kpi('营收增速', '+35%', '行业 +15%'), kpi('研发占比', '19.1%', '行业 15%'), kpi('资产负债率', '58%', '重资产扩产期'), kpi('自由现金流', '-38亿', '二期缺口约48亿'), kpi('本行合作', '参团 2 亿', '二期银团')],
        tags: ['晶圆制造 IDM · 12英寸', 'Pre-IPO · 科创板辅导中', '国资 38.5% + 大基金二期 11.2%', '车规功率平台一期投产', '国家级重大项目名单', '员工 8600 人'],
        biz: [['晶圆制造（IDM · 12英寸）', '车规功率与先进平台双轮驱动，一期投产月产能 3 万片，二期扩产资本开支高峰。', 1], ['车规与算力延伸', '进入头部主机厂 800V 平台定点名单；车规器件 CAGR 约 25%、本土供给率不足 30%。', 2], ['IDM 壁垒', '产线/工艺/客户认证三位一体，重资产与政府基金背书构成强进入壁垒。', 3]],
        persons: [['财务负责人', '资金安排与银团归口', '二期融资与 IPO 服务的实际决策参与者——方案落地关键人。'], ['董事长', '国资背景 · 战略层', '行长级拜访对象：重大项目追加额度与 IPO 全周期合作的总拍板人。'], ['董事会秘书', 'IPO 辅导接口人', '上市节奏、募资监管与信息披露的统一接口——首次拜访第一对象。']],
        topics: [
          ['二期资本开支节奏', '二期后续资本开支与融资时间表？48 亿缺口的资本金/债务安排？', '资本开支高峰决定中长期融资窗口，Q4 前是卡位期。', '先进制造中长期贷款'],
          ['募集资金监管行竞标', '监管行的选择标准与竞标进度？国开行/中行均在争取？', '募资监管是主办行竞标的核心战场——错失即失去 IPO 全周期入口。', 'IPO 全周期服务'],
          ['他行银团条款', '现有银团条款、报价与份额？未满足的需求点？', '差异化空间在"独立额度+错位期限"，而非拼价格。', '独立额度 + 银团'],
          ['付汇与避险', '进口设备付汇安排与汇率避险现状？', '进口依赖 CR3 约 70%，付汇体量大——跨境服务可同步切入。', '跨境结算与避险'],
          ['并购标的安排', 'SiC/设备类并购标的与支付安排？', '并购贷与撮合服务是升级主办行的投行抓手。', '并购贷款 + 撮合'],
          ['员工持股平台', '320 人持股平台的融资与行权安排？', '公私联动的低成本入口，绑定核心团队。', '员持融资 + 代发'],
        ],
        attention: ['二期方案窗口在 2026 年 Q4 前，需行长级拜访背书；', '国资背景勿主动谈股权激励定价与政府补助依赖度；', '不替企业预判 IPO 审核节奏，不承诺承销份额。'],
      } : {
        verdict: '重点介入', vsub: '攻坚 · Pre-IPO 窗口', score: 86,
        kpis: [kpi('综合评分', '86', 'AI评级 A'), kpi('营收增速', '+28%', '连续3年＞20%'), kpi('研发占比', '11.1%', '行业 7.8%'), kpi('资产负债率', '54%', '稳定'), kpi('应收周转', '127天 ▲', '行业 98 天'), kpi('本行合作', '流贷5000万', '攻坚阶段')],
        tags: ['封装测试 · 先进封装', 'Pre-IPO · 北交所已问询', '国家级专精特新小巨人', 'SiP 国内前四', 'Bumping 自主可控', '员工 1750 人'],
        biz: [['先进封装（基本盘）', 'SiP 系统级封装 + 2.5D/3D 中试能力，Bumping 凸块工序自主可控，先进封装收入占比 35%。', 1], ['车规与射频放量', '车规产线通过 AEC-Q 认证，进入 2 家 Tier1；射频模组 SiP 细分国内第四。', 2], ['客户认证壁垒', '量产平台客户认证周期 1-2 年、复购率 91%——构成置换壁垒。', 3]],
        persons: [['李敏', '财务总监', '应收压力与票易贷方向的实际决策人——本行已建立联系，方案落地关键人。'], ['王建国', '董事长 / CEO · 实控人 34.2%', '综合方案需董事长层面汇报拍板——行长拜访对象。'], ['董事会秘书', 'IPO 信息披露接口', '问询回复与募投资金安排的统一接口——首次拜访第一对象。']],
        topics: [
          ['应收账期与结算', '应收周转 127 天的账龄结构？电汇/票据/供应链平台结算各占多少？', '应收占款是最大财务痛点，也是票易贷/保理切入的天然入口。', '票易贷 + 应收保理'],
          ['下游确权类型', '下游企业类型（国企/上市/民企）？可否确权？', '债务人资质决定保理风险定价与额度测算。', '应收账款融资'],
          ['销售模式', '直销/代理/代工的结构与账期差异？', '销售模式决定回款路径与融资的确权环节设计。', '供应链金融'],
          ['票易贷他行报价', '是否做过票易贷？他行报价条款如何（传无锡农商行接触中）？', '两周内递交方案可抢占先手——差异化在放款时效与不占授信敞口。', '票易贷'],
          ['IPO 募资节奏', '问询回复时间表与募投资金到位节奏？', '问询回复前后是票易贷优化报表的落地窗口；募资监管预案提前卡位。', '募集资金监管预案'],
          ['员工持股平台', '员工持股平台的融资安排？', '公私联动入口，绑定核心团队低成本获客。', '员持融资 + 代发'],
        ],
        attention: ['方案窗口在 10—11 月（问询回复前后），需行长级拜访背书；', '带具体方案上门：票易贷方案书+贴息测算+同业案例一页；', '不主动谈 IPO 发行承诺与产能消化预测；设备商合同纠纷只作了解。'],
      }) : {
        verdict: c.score >= 85 ? '重点介入' : c.score >= 70 ? '适度介入' : '培育跟踪', vsub: `${c.layer || '客户'} · ${c.status || ''}`, score: c.score,
        kpis: [kpi('综合评分', c.score, 'AI评级 ' + (c.grade || '—')), kpi('产业', esc((c.industry || '').slice(0, 6)), esc(c.seg || '')), kpi('分层', c.layer || '—', ''), kpi('合作状态', c.status || '潜在', ''), kpi('地区', esc(c.city || '') + '·' + esc(c.zone || ''), ''), kpi('建议服务方案', '见报告§10', '行内产品推荐')],
        tags: [c.layer, c.seg, c.status, c.city + '·' + c.zone, '评分 ' + c.score].filter(Boolean),
        biz: [['主营业务', esc(c.seg || '') + ' · ' + esc(c.name.slice(0, 8)), 1], ['产业链位置', '详见企业AI报告（12板块）', 2], ['认证与壁垒', '详见企业AI报告 · 核心优势', 3]],
        persons: [['财务负责人', '资金与融资归口', '方案落地关键人。'], ['董秘/综合部', '信息接口人', '首次拜访第一对象。'], ['总经理/董事长', '战略层', '二次拜访升级，谈综合框架。']],
        topics: [
          ['应收与结算', '账期多久？如何结算？对方类型可否确权？', '应收是最适合银行工具盘活的板块。', '票易贷/保理'],
          ['销售模式', '直销/代理/代工结构与账期？', '决定回款路径与确权环节。', '供应链金融'],
          ['融资安排', '本轮融资/扩产计划与资金缺口？', '资本开支节奏决定产品期限。', '项目贷/设备贷'],
          ['政策申报', '最新匹配政策是否在申报窗口？', '政策工具直接降成本，协助申报建立信任。', '政策叠加方案'],
          ['合作银行', '现有授信与体验痛点？', '差异化切入口在时效与服务。', '绿色通道'],
          ['会后确认', '资料联系人 + 方案反馈时间。', '把拜访变成推进线。', '资料清单'],
        ],
        attention: ['以最新匹配政策与链上关系破冰切入；', '本次目标：建立联系、摸排融资安排；', '未核实前不承诺额度与利率。'],
      };
      const hero = (verdictLv, vsub2, titleTxt, subTxt) => `
        <div class="wp-hero"><div><div class="eyebrow">访前准备 · 客户经理速览</div><h2>${titleTxt}</h2><div class="sub">${subTxt}</div></div>
        <div class="wp-verdict"><div class="lv">${verdictLv}</div><div class="sm">${vsub2}</div></div></div>`;
      const sub = isXJH ? '新三板挂牌 ｜ 光通信精密零部件 ｜ 注册地：无锡新吴 ｜ 数据基准日：2026-10-30 ｜ 配套：《综合服务方案》看板'
        : isTH ? 'Pre-IPO · 科创板辅导中（预计2027发行）｜ 晶圆制造 IDM ｜ 无锡新吴 · 员工8600人 ｜ 数据基准日：2026-10-30'
        : full ? '北交所已问询 ｜ 封装测试（先进封装）｜ 无锡锡山 · 员工1750人 ｜ 数据基准日：2026-09-28'
        : `${esc(c.city || '')}·${esc(c.zone || '')} ｜ ${esc(c.seg || '')} ｜ 数据基准日：2026-09-28`;
      const PCS = { 1: '#C0202C', 2: '#2458F5', 3: '#B08A00' };
      return `
        ${this.rptSide(c, 'brief')}
        ${hero(D.verdict, D.vsub, esc(c.name), sub)}
        <div class="wp-kpis">${D.kpis.join('')}</div>
        ${this.secHtml(1, '客户画像', '先看清"他是谁"——标签、定位、业务底盘')}
        <div class="mb3">
          <div class="wp-cloud mb2">${D.tags.map((x, i) => cl(x, ['wp-cl-a', 'wp-cl-b', 'wp-cl-c'][i % 3])).join('')}</div>
          <div class="grid-3 mb2">${D.biz.map(b => `<div class="wp-pcard" style="border-top:3px solid ${PCS[b[2]]}"><div class="t">${esc(b[0])}</div><div class="s">${esc(b[1])}</div></div>`).join('')}</div>
          ${full ? (isXJH
            ? `<div class="wp-note"><b>画像小结：</b>围绕头部客户供应链与算力需求切入——400G+芯片基座全球市占约 29%，先核实新增订单、交付回款与扩产设备付款节奏，再组合评估订单融资与设备融资方案。</div>`
            : isTH
            ? `<div class="wp-note"><b>画像小结：</b>二期资本开支高峰 + IPO 辅导期双窗口叠加——以"中长期追加额度 + IPO 全周期服务"由参团行升级主办行，方案窗口在 <b style="color:var(--danger-500)">2026 年 Q4 前</b>，需行长级拜访背书。</div>`
            : `<div class="wp-note"><b>画像小结：</b>Pre-IPO 窗口期是切入综合金融服务的最佳时点——以"票易贷优化报表 + 领航贷"组合直击上市前两大痛点，方案窗口在 <b style="color:var(--danger-500)">10—11 月</b>，需行长级拜访背书。</div>`)
          : `<div class="wp-note"><b>画像小结：</b>成长型企业（${esc(c.layer || '培育')}），建议以最新匹配政策与链上关系破冰切入，本次目标为建立联系、摸排融资安排。</div>`}
        </div>
        ${this.secHtml(2, '建议对接人', '首次拜访由下至上、二次拜访由内至外')}
        <div class="grid-3 mb3">${D.persons.map(pp => `<div class="wp-person"><div class="nm">${esc(pp[0])}</div><div class="rl">${esc(pp[1])}</div><div class="pt">${esc(pp[2])}</div></div>`).join('')}</div>
        ${this.secHtml(3, '六个核心交流议题（附交流理由）', '每个议题对应《综合服务方案》中的一个模块')}
        <div class="grid-2 mb3">${D.topics.map((tp, i) => `<div class="wp-topic">
          <div class="head"><span class="no2" style="background:${i < 2 ? '#FEF4E2;color:#A8701A' : i < 4 ? '#E7EEFF;color:#1A44D6' : '#FBE7E9;color:#A61521'}">${'①②③④⑤⑥'[i]}</span><span class="q">${esc(tp[0])}</span></div>
          <div class="ask">问：${esc(tp[1])}</div>
          <div class="why"><b>为什么谈：</b>${esc(tp[2])}→ 对应方案：<b>${esc(tp[3])}</b>。</div></div>`).join('')}</div>
        ${this.secHtml(4, '拜访注意事项', '时机 · 姿态 · 合规')}
        <div class="card card-pad mb3"><ul class="text-sm text-sub" style="padding-left:18px;line-height:2">${D.attention.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <details class="mb3" id="wpMoreWrap">
          <summary class="btn btn-ghost wp-more-btn" style="list-style:none;text-align:center;cursor:pointer">展开更多：股权治理 · 集团架构 · 财务速览 · 资本表现 · 行业机会 · 风险排查（5-10） ▾</summary>
          <div style="padding-top:6px">
            ${this.secHtml(5, '股权与治理要点', '控制链 · 股东行为')}
            <div class="card card-pad mb3">
              ${(c.holders || []).map(h => row(h.n + '（' + h.t + '）', h.pct + '%')).join('') || '<div class="text-sm text-muted">暂无公示数据</div>'}
              ${c.ctrl ? `<div class="mt2 text-sm">实际控制人路径：${c.ctrl.split('→').map(x => `<span class="tag tag-line" style="height:20px">${esc(x.trim())}</span>`).join('<span style="color:var(--t3)"> → </span>')}</div>` : ''}
              <div class="wp-note"><b>结论：</b>授信策略应与现金流和订单绑定，而非与单一股东信用绑定${full ? '；股东质押/减持动向按月监测' : ''}。</div>
            </div>
            ${this.secHtml(6, '集团架构与上下游', '重要主体与用信建议')}
            <div class="card card-pad mb3">
              ${c.ud ? `<div class="grid-2 mb2">
                <div><div class="text-sm" style="font-weight:600;margin-bottom:6px">上游供应商</div>${c.ud.up.map(u => `<div class="flex-between" style="padding:4px 0"><span class="text-sm"><b>${esc(u.n)}</b> <span class="text-xs text-muted">· ${u.w}</span></span>${u.ours ? '<span class="tag tag-green" style="height:18px;font-size:10px">本行客户</span>' : ''}</div>`).join('')}</div>
                <div><div class="text-sm" style="font-weight:600;margin-bottom:6px">下游客户</div>${c.ud.down.map(u => `<div class="flex-between" style="padding:4px 0"><span class="text-sm"><b>${esc(u.n)}</b> <span class="text-xs text-muted">· ${u.w}</span></span>${u.ours ? '<span class="tag tag-green" style="height:18px;font-size:10px">本行客户</span>' : ''}</div>`).join('')}</div></div>`
              : '<div class="text-sm text-muted mb2">暂无公开披露的上下游数据</div>'}
              <div class="wp-note"><b>架构要点：</b>${full ? (c.id === 'JH' ? '下游瑞芯设计占营收 31%，其新品节奏直接影响订单回款；上游晶圆/设备供应集中 CR3≈62%——供应链融资可沿链拓展。' : isTH ? '下游车规 Tier1 集中（CR5=75%）；上游关键设备进口依赖——付款节奏与避险需求明确。' : '客户覆盖中际旭创、新易盛等头部厂商——应收确权条件好，保理切入顺理成章。') : '上下游详见企业 AI 报告 §6。'}</div>
            </div>
            ${this.secHtml(7, '财务速览', '关键指标（亿 / %）')}
            <div class="card card-pad mb3">
              ${full ? (isXJH
                ? row('全球市场份额', '400G+ 芯片基座约 29%', true) + row('头部客户', '中际旭创 / 新易盛', true) + row('延伸方向', '机器人精密零部件 · 车载镜头', false) + row('融资阶段', '新三板挂牌', true)
                : isTH
                ? row('营收增速', '+35%（行业 +15%）', true) + row('研发占比', '19.1%（行业 15%）', true) + row('资产负债率', '58% · 重资产扩产期', false) + row('自由现金流', '<span style="color:var(--danger-500)">-38 亿 · 二期缺口约 48 亿</span>', true)
                : row('营收增速', '+28%（连续3年＞20%）', true) + row('研发占比', '11.1%（行业 7.8%）', true) + row('资产负债率', '54% · 稳定', false) + row('应收周转', '<span style="color:var(--danger-500)">127 天（行业 98 天）</span>', true))
              : row('综合评分', c.score + '（' + (c.grade || '—') + '）', true) + row('注册资本', c.cap || '—', false) + row('合作状态', c.status || '潜在', true)}
              <div class="wp-note">完整财务四维分析（盈利·杠杆·现金流·营运）见企业 AI 报告 §8。</div>
            </div>
            ${this.secHtml(8, '资本市场表现', '不博弈股价，但须理解波动来源')}
            <div class="card card-pad mb3">
              ${full ? (isXJH ? '<ul class="text-sm text-sub" style="padding-left:18px;line-height:2"><li>新三板挂牌主体，规范治理；</li><li>关注北交所/创业板转板安排与做市流动性；</li><li>客户为头部光模块厂商，业绩随算力资本开支波动。</li></ul>'
                : isTH ? '<ul class="text-sm text-sub" style="padding-left:18px;line-height:2"><li>Pre-IPO · 科创板辅导中（预计 2027 年发行）；</li><li><b style="color:var(--danger-500)">国开行/中行均在争取募集资金监管行</b>——竞标窗口 2026Q4 前；</li><li>估值锚：一级市场 680 亿（Pre-IPO 轮），投行服务提前卡位。</li></ul>'
                : '<ul class="text-sm text-sub" style="padding-left:18px;line-height:2"><li>北交所 IPO 已问询（09-26 募投产能消化）；</li><li>问询回复前后是票易贷落地与募资监管预案窗口；</li><li>关注解禁节奏与股东减持公告。</li></ul>')
              : `<ul class="text-sm text-sub" style="padding-left:18px;line-height:2"><li>${esc(c.ipo || '非上市主体——关注 Pre-IPO/股权融资进展')}；</li><li>资本运作诉求详见企业 AI 报告 §10。</li></ul>`}
            </div>
            ${this.secHtml(9, '政策与产业机会', '政策强β + 产业节奏')}
            <div class="card card-pad mb3">
              ${full ? (isXJH
                ? '<ul class="text-sm text-sub" style="padding-left:18px;line-height:2"><li><b>政策机会：</b>"小巨人"资质是科技金融方案的沟通基础，申报窗口现场核实；</li><li><b>产业动态：</b>AI 算力推动 800G+ 光模块升级，器件升级需求外溢。</li></ul>'
                : isTH ? '<ul class="text-sm text-sub" style="padding-left:18px;line-height:2"><li><b>政策机会：</b>制造业中长期贷款 + <b style="color:var(--danger-500)">国家级重大项目名单</b>，二期扩产完全符合导向；</li><li><b>产业动态：</b>车规功率 CAGR 约 25%、本土供给率不足 30%——国产替代长周期确定。</li></ul>'
                : '<ul class="text-sm text-sub" style="padding-left:18px;line-height:2"><li><b>政策机会：</b>「芯火计划」领航贷<b style="color:var(--danger-500)">贴息 12-31 截止申报</b>，可协助梳理材料；</li><li><b>产业动态：</b>存储涨价带动封测扩产潮，先进封装产能吃紧，设备融资需求上行。</li></ul>')
              : '<ul class="text-sm text-sub" style="padding-left:18px;line-height:2"><li>查看最新产业政策与补贴申报窗口（产业动态 · 政策资讯）。</li></ul>'}
            </div>
            ${this.secHtml(10, '风险排查与综合评分', '多源交叉验证')}
            <div class="card card-pad">
              ${full ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:110px">风险类型</th><th style="width:60px">等级</th><th>风险内容</th></tr></thead><tbody>
                ${c.id === 'JH' ? `<tr><td>企业自身</td><td><span class="tag tag-orange" style="height:20px">中</span></td><td class="text-sub">应收周转 127 天（行业 98 天）、第一大客户占 31%；存货跌价与扩产资本开支压力并存</td></tr>
                <tr><td>关联企业</td><td><span class="tag tag-red" style="height:20px">高</span></td><td class="text-sub"><b style="color:var(--danger-500)">下游瑞芯设计占营收 31%</b>，新品节奏直接影响回款；上游供应集中 CR3≈62%</td></tr>
                <tr><td>同业动态</td><td><span class="tag tag-orange" style="height:20px">中</span></td><td class="text-sub"><b style="color:var(--danger-500)">无锡农商行票易贷报价中（8000万）</b>；中行银团存续——建议两周内递交方案</td></tr>
                <tr><td>避雷提示</td><td><span class="tag tag-gray" style="height:20px">—</span></td><td class="text-sub">不主动谈 IPO 发行承诺、产能消化预测；设备商合同纠纷只作了解</td></tr>`
                : isTH ? `<tr><td>企业自身</td><td><span class="tag tag-orange" style="height:20px">中</span></td><td class="text-sub">自由现金流 -38 亿、有息负债 148 亿、在建 96 亿；政府补助占利润 18%</td></tr>
                <tr><td>关联企业</td><td><span class="tag tag-red" style="height:20px">高</span></td><td class="text-sub"><b style="color:var(--danger-500)">车规 Tier1 集中 CR5=75%</b>；关键设备进口依赖 CR3≈70%，管制影响二期交付</td></tr>
                <tr><td>同业动态</td><td><span class="tag tag-orange" style="height:20px">中</span></td><td class="text-sub"><b style="color:var(--danger-500)">国开行/中行争夺募资监管行</b>——窗口 2026Q4 前</td></tr>
                <tr><td>避雷提示</td><td><span class="tag tag-gray" style="height:20px">—</span></td><td class="text-sub">国资背景勿谈股权激励定价；补助依赖度只作了解</td></tr>`
                : `<tr><td>客户集中</td><td><span class="tag tag-orange" style="height:20px">中</span></td><td class="text-sub">头部光模块厂商占比较高，核实前五大客户收入与回款集中度</td></tr>
                <tr><td>订单执行</td><td><span class="tag tag-orange" style="height:20px">中</span></td><td class="text-sub">框架与正式订单区别、交付验收付款及取消条款</td></tr>
                <tr><td>产能迭代</td><td><span class="tag tag-orange" style="height:20px">中</span></td><td class="text-sub">高速率产品迭代快，产能与认证/良率爬坡匹配度</td></tr>
                <tr><td>拜访提示</td><td><span class="tag tag-gray" style="height:20px">—</span></td><td class="text-sub">份额/资质按披露口径沟通，现场核实有效期</td></tr>`}
              </tbody></table></div>`
              : '<div class="text-sm text-muted">拜访前查看企业舆情与司法风险（企业 AI 报告 · 风险提示）。</div>'}
              <div class="wp-hbar" style="margin-top:10px"><span class="bl">综合评分</span><div class="bt"><i style="width:${D.score}%;background:#D98A92"></i></div><span class="bn">${D.score} / 100</span></div>
            </div>
          </div>
        </details>
        <div class="flex mt3" style="justify-content:space-between;align-items:center;gap:10px">
          <span class="text-xs text-muted">内容依据企业披露信息及公开行业资料整理；具体授信方案以现场核实和审批结果为准。</span>
          <button class="btn btn-primary btn-sm" onclick="APP.toast('访前准备看板已下载（PDF）');APP.closeDrawer()">下载访前准备</button></div>`;
    },
    /* ---------- AI智能分析 · 综合服务方案（full 企业专属） ---------- */
    rptPlanHtml(c) {
      const m = M();
      const isTH = c.id === 'TH' && m.reportTH, isXJH = c.id === 'XJH' && m.reportXJH;
      const kpi = (k, v, d) => `<div class="wp-kpi"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
      const sol = (badge, t, need, solu, path, kpis) => `<div class="wp-sol"><span class="badge">${badge}</span><div class="t">${t}</div>
        <div class="blk need"><span class="lab">需求依据：</span>${need}</div>
        <div class="blk solu"><span class="lab">解决方案：</span>${solu}</div>
        <div class="blk path"><span class="lab">落地路径：</span>${path}</div>
        <div class="blk kpi2"><span class="lab">评价指标：</span>${kpis}</div></div>`;
      const P = isXJH ? {
        total: '1.0', credit: [['订单 / 应收账款融资', 5000, '优先沟通 · 按订单核定'], ['设备购置贷款 / 融资租赁', 3000, '扩产配套'], ['科技信用类融资', 2000, '综合补充']],
        map: [
          ['① 订单与交付', '订单放量但垫资生产，回款账期长', '信贷A：订单/应收账款融资', '融资落地额；订单执行率'],
          ['② 客户与结算', '头部客户账期与确权条件待确认', '信贷B：应收保理 + 结算归集', '应收周转改善；融资余额'],
          ['③ 产能与设备', '精密加工/检测设备投入大', '信贷C：设备贷款/租赁分期', '设备投资覆盖率'],
          ['④ 产品与技术', '800G+ 迭代与认证需要研发投入', '非信贷：科技金融 + 政策申报', '政策落地；研发贷投放'],
          ['⑤ 资金与融资', '备货/应收/设备三线占用', '信贷组合 + 现金池', '综合融资成本'],
          ['⑥ 资本运作', '新三板挂牌，转板/做市安排', '非信贷：投行服务 + 做市配套', '顾问签约；中收'],
        ],
        red: '① 头部客户订单份额下滑；② 应收账龄持续拉长；③ 认证进度不及预期 → 额度压降重检',
        income: [['贷款利息', 350], ['保函/手续费', 40], ['贴现', 45], ['存款贡献', 30], ['投行/中收', 100]],
        steps: [['T0 · 首访', '对接实控人与销售/供应链负责人；核实订单台账与账期。'], ['T+2周 · 方案包', '订单融资材料清单 + 设备融资测算 + 科技金融方案。'], ['T+1月 · 尽调申报', '1 亿首期授信；首笔以单体订单融资切入。'], ['T+2月 · 首笔落地', '订单融资放款；启动现金池与代发。'], ['验证期 · 升级', '订单持续性验证后扩额度，叠加设备与信用组合。']],
      } : isTH ? {
        total: '8.0', credit: [['先进制造中长期贷款', 60000, '优先沟通 · 追加8-10亿'], ['进口设备购置贷款', 12000, '二期设备配套'], ['并购贷款（预批）', 8000, 'SiC/设备类标的']],
        map: [
          ['① 二期资本开支', '48 亿缺口，资本金/债务待排', '信贷A：中长期贷款（宽限3年）', '额度批复；提款节奏'],
          ['② 募资监管竞标', 'IPO 募资监管行未定', '非信贷：IPO 全周期服务', '监管行中标'],
          ['③ 他行银团', '参团已满，独立额度空缺', '信贷B：独立额度 + 错位期限', '我行份额'],
          ['④ 付汇与避险', '进口设备付汇体量大', '非信贷：跨境结算 + 避险', '结算量；锁汇额'],
          ['⑤ 并购安排', 'SiC/设备类标的在谈', '信贷C：并购贷（对价60%）', '并购落地'],
          ['⑥ 员持平台', '320 人持股平台融资', '非信贷：员持融资 + 代发', '代发户数'],
        ],
        red: '① 二期投产进度不及预期；② 质押率破 40% 或平仓预警；③ 政府补助依赖度上升 → 重检',
        income: [['贷款利息', 2700], ['银团/保函费', 180], ['存款贡献', 400], ['跨境中收', 60], ['投行承销（或有）', 800]],
        steps: [['T0 · 行长级拜访', '董事长层面确认追加额度框架与 IPO 合作意向。'], ['T+2周 · 方案包', '中长期额度预案 + IPO 全周期服务方案 + 避险测算。'], ['T+1月 · 并行审批', '8 亿独立额度尽调；募资监管方案报总行。'], ['T+2月 · 首笔落地', '中长期首笔放款；跨境结算同步启动。'], ['2026Q4 · 竞标', '募资监管行竞标；2027 承销储备。']],
      } : {
        total: '1.2', credit: [['票易贷（不占敞口）', 8000, '优先沟通 · 盘活应收'], ['科技信用贷', 3000, '研发与资质加持'], ['设备购置贷款', 1000, '二期设备配套']],
        map: [
          ['① 应收账期 127 天', '应收占款大、回款慢，报表压力明显', '信贷A：票易贷 + 应收保理', '应收周转（目标<110天）'],
          ['② 下游确权', '下游以头部设计公司为主，确权条件好', '信贷B：应收账款质押/保理', '保理落地额'],
          ['③ IPO 问询窗口', '问询回复前后需优化经营现金流', '信贷A：票易贷优化报表', '问询回复前落地'],
          ['④ 募资监管', '北交所募投资金监管行未定', '非信贷：募集资金监管预案', '监管行中标'],
          ['⑤ 员持平台', '员工持股平台融资安排', '非信贷：员持融资 + 代发', '代发户数'],
          ['⑥ 政策申报', '芯火计划贴息 12-31 截止', '非信贷：申报协助 + 领航贷', '贴息落地'],
        ],
        red: '① IPO 进度不及预期或问询二次反馈；② 应收周转持续>140 天；③ 大客户订单波动 → 额度压降',
        income: [['贷款利息', 380], ['票易贷费', 120], ['贴现', 60], ['存款贡献', 40], ['募资监管/中收', 150]],
        steps: [['T0 · 首访（10月内）', '对接董秘+财务总监李敏；完成六大议题摸底，不当场报价。'], ['T+2周 · 方案包', '票易贷方案书+贴息测算+领航贷组合；递交报价框架。'], ['T+1月 · 尽调申报', '1.2 亿首期授信申报；募资监管预案同步报批。'], ['T+2月 · 问询回复前落票易贷', '票易贷首笔落地；启动代发与结算归集。'], ['Q4 · 行长拜访+方案上会', '董事长层面综合方案汇报；争取募资监管行卡位。']],
      };
      const amtMax = P.credit[0][1];
      const incSum = P.income.reduce((a2, x) => a2 + x[1], 0);
      const incMax = Math.max(...P.income.map(x => x[1]));
      return `
        ${this.rptSide(c, 'plan')}
        <div class="wp-hero"><div><div class="eyebrow">综合服务方案 · 信贷 + 非信贷</div><h2>${esc(c.name)}</h2>
          <div class="sub">${isXJH ? '新三板挂牌 ｜ 光通信精密零部件' : isTH ? 'Pre-IPO · 科创板辅导中' : '北交所已问询'} ｜ 逐项回应《访前准备》六大交流议题 ｜ 个性化需求 → 解决方案 → 评价指标 ｜ 理想态设计，能力约束后置</div></div>
        <div class="wp-verdict"><div class="lv">信贷 + 非信贷</div><div class="sm">综合服务方案 · 六大模块</div></div></div>
        <div class="wp-kpis">
          ${kpi('首期授信总额', P.total + ' 亿元', P.credit.map(x => x[0].slice(0, 4)).join('+'))}
          ${kpi('服务模块', '6 大模块', '信贷 3 项 + 非信贷 6 项（含交叉）')}
          ${kpi('议题覆盖', '6 / 6', '访前六大交流议题全部有对应方案')}
          ${kpi('预计年综合收益', '约 ' + incSum + ' 万+', '利息 + 中间业务（测算口径见第四节）')}
          ${kpi('目标结算份额', '结算主户', '以结算与代发绑定资金流')}
          ${kpi('升级路径', isTH ? '2027 承销' : '验证后升级', isTH ? '募资监管 → 承销' : '信号验证后升级投行')}
        </div>
        ${this.secHtml(1, '方案总览：议题 → 个性化需求 → 方案 → 评价指标', '每条方案都锚定一个访前议题与一个可验证的指标')}
        <div class="card card-pad mb3"><div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:150px">交流议题（访前①–⑥）</th><th style="width:26%">挖掘到的个性化需求</th><th>对应方案模块</th><th style="width:24%">评价指标</th></tr></thead><tbody>
          ${P.map.map(r2 => `<tr><td><b class="text-sm">${esc(r2[0])}</b></td><td class="text-sm text-sub">${esc(r2[1])}</td><td class="text-sm"><b>${esc(r2[2])}</b></td><td class="text-sm text-sub">${esc(r2[3])}</td></tr>`).join('')}
        </tbody></table></div></div>
        ${this.secHtml(2, '信贷服务方案（首期 ' + P.total + ' 亿元）', '切入 · 过渡 · 绑定')}
        <div class="card card-pad mb3">
          <div class="mb2"><b class="text-sm">额度结构</b></div>
          ${P.credit.map((x, i) => `<div class="wp-hbar"><span class="bl">${esc(x[0])}</span><div class="bt"><i style="width:${x[1] / amtMax * 100}%;background:${['#D98A92', '#8FAAE8', '#D9BE7E'][i]}"></i></div><span class="bn">${x[1].toLocaleString()} 万 · ${esc(x[2])}</span></div>`).join('')}
          <div class="mt3 wp-note"><b>贷后三红线：</b>${esc(P.red)} → 额度压降重检。</div>
        </div>
        ${this.secHtml(3, '非信贷服务方案（六大模块 · 理想态设计）', '需求依据 → 解决方案 → 落地路径 → 评价指标')}
        <div class="grid-2 mb3">
          ${sol('模块一 · 结算与司库', '资金归集与日常绑定', '结算分散他行；资金集中管理有空间。', '现金池 + 代发工资 + 批量收付；结算主户迁移。', '信贷落地同步启动代发与归集谈判。', '日均存款、归集率、代发人数。')}
          ${sol('模块二 · 供应链金融', isXJH ? '应收确权 + 订单盘活' : isTH ? '设备与工程款链条' : '应收盘活 + 链上拓展', isXJH ? '头部客户应收账期长、确权条件好。' : isTH ? '二期建设带动设备/工程供应商融资需求。' : '应收 127 天是核心痛点；上游晶圆/设备环节可沿链拓展。', '应收保理/质押；票据池 + 贴现绿色通道；反向保理服务其供应商。', '先做单体应收融资 → 打通确权流程 → 链上批量获客。', '融资余额、应收周转改善、供应商户数。')}
          ${sol('模块三 · 跨境金融', '付汇与避险安排', isTH ? '进口设备付汇体量大（CR3≈70% 进口依赖）。' : '进出口环节存在结算与避险迁移空间。', '跨境人民币结算；远期锁汇/期权；进口信用证。', '随设备采购合同逐单落地。', '跨境结算量、锁汇签约额。')}
          ${sol('模块四 · 资本市场', isTH ? '募资监管 + 承销' : isXJH ? '做市与转板配套' : '募资监管 + 承销储备', isTH ? '国开行/中行均在争取监管行——窗口 2026Q4。' : isXJH ? '新三板做市与转板安排存在配套需求。' : '北交所募投资金监管行未定，问询回复后资金到位。', '募集资金监管预案；承销/做市储备；股东减持合规配套。', '以监管预案/顾问关系先卡位，随 IPO 进程兑现。', '监管行中标、承销规模、中收。')}
          ${sol('模块五 · 并购撮合', '产业整合撮合方', isTH ? 'SiC/设备类标的在谈，并购经验丰富。' : '行业整合期存在标的与买方双向撮合机会。', '并购贷款；标的清单 + 买方画像撮合；交易结构设计。', '先轻服务后配额度。', '撮合项目数、并购贷投放。')}
          ${sol('模块六 · 绿色金融 / 政策', '政策工具降成本', '芯火计划贴息/科技补贴/重大项目名单等政策窗口明确。', '政策申报协助；贴息叠加；ESG 挂钩贷款。', '与信贷 A 方案同步提报，材料协助梳理。', '政策落地笔数、综合成本降幅。')}
        </div>
        ${this.secHtml(4, '综合收益测算（首年 · 静态口径）', '授信之外，结算与投行是综合回报的主要来源')}
        <div class="card card-pad mb3">
          ${P.income.map(x => `<div class="wp-hbar"><span class="bl">${x[0]}</span><div class="bt"><i style="width:${x[1] / incMax * 100}%;background:#D98A92"></i></div><span class="bn">约 ${x[1]} 万/年</span></div>`).join('')}
          <div class="wp-note"><b>结论：</b>经常性收益约 ${incSum} 万/年，综合回报可覆盖定价让利；建议以"综合收益"而非单一利差说明客户价值。</div>
        </div>
        ${this.secHtml(5, '推进路线图', '从首访到综合方案的五步节奏')}
        <div class="card card-pad mb3">
          ${P.steps.map((x, i) => `<div class="wp-step"><div class="sn">${i + 1}</div><div><div class="st">${esc(x[0])}</div><div class="sd">${esc(x[1])}</div></div></div>`).join('')}
        </div>
        <div class="flex mt3" style="justify-content:space-between;align-items:center;gap:10px">
          <span class="text-xs text-muted">配套文件：《访前准备》看板。理想态设计，实际以我行产品权限、授信审批及客户确认为准。</span>
          <button class="btn btn-primary btn-sm" onclick="APP.toast('综合服务方案已下载（PDF）');APP.closeDrawer()">下载服务方案</button></div>`;
    },

    /* ================= 主渲染（二级三导航：访前准备｜访客纪要｜综合方案） ================= */
    render(el) {
      const r = ROLE(), u = APP.curUser();
      const tasks = this.myTasks();
      if (!S.wbTab) S.wbTab = 'prepare';
      if (S.params.side) { S.wbSide = S.params.side; S.wbTab = 'prepare'; delete S.params.side; }
      if (S.params.tab && ['prepare', 'visit', 'plan'].includes(S.params.tab)) { S.wbTab = S.params.tab; delete S.params.tab; }
      if (!['prepare', 'visit', 'plan'].includes(S.wbTab)) S.wbTab = 'prepare';
      const selId = S.params.task && tasks.some(t => t.id === S.params.task) ? S.params.task : (tasks[0] || {}).id;
      const sel = tasks.find(t => t.id === selId);
      const TITLES = { prepare: '访前准备', visit: '访客纪要', plan: '综合方案' };
      const boardTitle = S.wbTab === 'prepare' && S.pkView === 'boards' && S.pkCo && M().coById(S.pkCo) ? '访前准备 · ' + M().coById(S.pkCo).short : TITLES[S.wbTab];
      el.innerHTML = `
        <div class="page-head"><div class="page-title">${boardTitle}</div>
          <div class="flex" style="gap:8px">
            <div class="flex wrap" style="gap:8px" id="wbKpis"></div>
            <button class="btn btn-ghost btn-sm" id="wbLedgerBtn">📋 跟进台账</button></div></div>
        <div id="wbTabs"></div>`;
      const tabs = [
        { id: 'prepare', name: '访前准备' },
        { id: 'visit', name: '访客纪要' },
        { id: 'plan', name: '综合方案' }];
      renderTabs($('#wbTabs'), tabs, S.wbTab, t2 => { S.wbTab = t2; S.pkView = null; paint(); });
      const paint = () => {
        const box = switchTab($('#wbTabs'), tabs, S.wbTab, paint);
        this.paintKpis(el, r, tasks);
        const lb = el.querySelector('#wbLedgerBtn');
        if (lb) lb.onclick = () => {
          APP.openDrawer('跟进台账（全量过程留痕）', '<div class="card-pad" id="wbLedger"></div>');
          setTimeout(() => this.paintLedger(document.querySelector('#wbLedger').parentElement, tasks), 50);
        };
        if (S.wbTab === 'prepare') this.paintTaskTab(box, tasks, selId);
        if (S.wbTab === 'visit') this.paintVisitTab(box, sel);
        if (S.wbTab === 'plan') this.paintPlanTab(box, tasks, selId);
      }; paint();
    },
    /* ---------- 二级·访前准备（任务版面：任意客户输入框 + 承接任务列表；进入后独立四板块版面） ---------- */
    paintTaskTab(box, tasks, selId) {
      if (S.pkView === 'boards' && S.pkCo && M().coById(S.pkCo)) return this.paintBoards(box, M().coById(S.pkCo));
      box.innerHTML = `
        <div class="card card-pad mb3" style="background:linear-gradient(115deg,#7E0E19 0%,#A61521 55%,#C0202C 130%);border:none;color:#fff">
          <div class="flex-between wrap" style="gap:10px">
            <div><b style="font-size:var(--fs-md)">访前准备</b><span class="text-xs" style="opacity:.85;margin-left:8px">承接任务直接进入；池外客户填写名称与社会统一信用代码后由 AI 生成</span></div>
            <div class="flex" style="gap:8px;flex-wrap:wrap">
              <input id="pkQName" placeholder="客户名称（必填）" style="width:210px;height:32px;border:none;border-radius:8px;padding:0 12px;outline:none;font-family:inherit">
              <input id="pkQUsc" placeholder="社会统一信用代码（18位，必填）" style="width:230px;height:32px;border:none;border-radius:8px;padding:0 12px;outline:none;font-family:inherit">
              <button class="btn btn-sm" id="pkGo2" style="height:32px;background:#fff;color:#8E1019;font-weight:700">生成访前准备</button>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">${ROLE().key === 'pm' ? '我下发的任务' : ROLE().key === 'head' ? '本支行任务' : ROLE().key === 'gm' ? '全辖任务概览' : '我承接的任务'}<span class="card-sub">点击「进入访前准备」生成该客户四板块作战材料</span></div>
            <input class="input" id="wbTaskKw" placeholder="按企业名称筛选…" value="${esc(S.wbKw || '')}" style="width:170px;height:28px">
          </div>
          <div id="wbTaskList" style="max-height:720px;overflow-y:auto"></div>
        </div>`;
      const goPk = () => {
        const name = box.querySelector('#pkQName').value.trim();
        const uscc = box.querySelector('#pkQUsc').value.trim().toUpperCase();
        if (!name) return toast('请输入客户名称', 'warn');
        if (!/^[0-9A-HJ-NPQRTUWXY]{18}$/.test(uscc)) return toast('请输入 18 位统一社会信用代码（数字与大写字母）', 'warn');
        const id = 'FA' + Date.now().toString(36);
        M().funnel.cos.unshift({
          id, name: name.includes('公司') || name.includes('厂') ? name : name + '有限公司', short: name.replace(/(股份有限公司|有限责任公司|有限公司|集团|（.*?）)/g, '').slice(0, 8) || name.slice(0, 8),
          net: '算力网', track: '客户经理录入线索', city: '无锡', zone: '—', opp: '',
          listed: '否', nat: '民营企业', prog: '培育', pos: '基础', wt: '承接',
          layer: '储备', status: '潜在', cap: '—', score: 62, sigLv: 'B', rel: '一般相关',
          cat: '上游供应商', prods: ['流动资金贷款', '结算归集'], src: 'MANUAL',
          sig: ['客户经理录入线索：' + name, '统一社会信用代码 ' + uscc],
          recent: '客户经理录入（信用代码 ' + uscc + '），AI 已按行业通用口径生成访前材料，待现场核实', tags: ['AI生成·待核实'],
          industry: '算力网', seg: '待核实', est: '—', emp: '—', legal: '—', uscc, type: '民营企业', park: '—', addr: '—', scope: '—', qual: [],
          grade: 'C', ipo: '',
          internal: { credit: 0, used: 0, deposit: 0, settle: 0, products: [] },
        });
        S.pkCo = id; S.pkView = 'boards'; S.pkBoard = 'profile';
        toast('访前材料已按 AI 通用口径生成，请以现场核实为准');
        this.paintTaskTab(box, this.myTasks(), S.params.task);
      };
      box.querySelector('#pkGo2').onclick = goPk;
      ['pkQName', 'pkQUsc'].forEach(i2 => box.querySelector('#' + i2).addEventListener('keydown', e => { if (e.key === 'Enter') goPk(); }));
      this.paintTasks(box, tasks, selId);
      const kw = box.querySelector('#wbTaskKw');
      kw.oninput = () => { S.wbKw = kw.value.trim(); this.paintTasks(box, tasks, selId); const k2 = box.querySelector('#wbTaskKw'); k2.focus(); k2.setSelectionRange(k2.value.length, k2.value.length); };
    },
    /* 独立四板块版面（三级导航：客户画像｜经营情况｜财报与征信｜拜访要点） */
    paintBoards(box, c) {
      if (!S.pkBoard) S.pkBoard = 'profile';
      if (!['profile', 'industry', 'fin', 'advice'].includes(S.pkBoard)) S.pkBoard = 'profile';
      box.innerHTML = `
        <div class="page-head"><div class="page-title">访前准备 · ${esc(c.short)}</div>
          <div class="flex" style="gap:8px">
            <button class="btn btn-ghost" id="pkBack2">← 返回任务列表</button>
            <button class="btn btn-primary btn-sm" id="pkDl2">下载作战包</button></div></div>
        ${c.tags && c.tags.includes('AI生成·待核实') ? '<div class="banner b-warn mb3" style="padding:10px 16px"><b>本客户为录入线索：</b>以下内容由 AI 按行业通用口径生成，请以现场核实结果为准。</div>' : ''}
        <div id="pkBoardTabs"></div><div id="pkBoardBody"></div>`;
      box.querySelector('#pkBack2').onclick = () => { S.pkView = null; this.paintTaskTab(box, this.myTasks(), S.params.task); };
      box.querySelector('#pkDl2').onclick = () => toast('访前作战包已下载（PDF）');
      const boards = [
        { id: 'profile', name: '客户画像' },
        { id: 'industry', name: '经营情况' },
        { id: 'fin', name: '财报与征信' },
        { id: 'advice', name: '拜访要点' }];
      const bar = box.querySelector('#pkBoardTabs');
      bar.innerHTML = boards.map(b2 => `<button class="chip ${S.pkBoard === b2.id ? 'on' : ''}" data-bd="${b2.id}" style="height:30px;margin-right:6px">${b2.name}</button>`).join('');
      bar.querySelectorAll('[data-bd]').forEach(b2 => b2.onclick = () => { S.pkBoard = b2.dataset.bd; this.paintBoards(box, c); });
      const body = box.querySelector('#pkBoardBody');
      const pk = window.VIEWS.pack;
      if (S.pkBoard === 'profile') body.innerHTML = `<div class="card card-pad">${this.profileFullHtml(c)}</div>`;
      else if (S.pkBoard === 'industry') body.innerHTML = pk.industryTab(c) + `<div class="card card-pad mb4"><div class="flex-between mb3"><b>上下游与机会</b><span class="text-xs text-muted">公开信息聚合</span></div>${(c.ud && c.ud.up) ? `<div class="grid-2"><div><div class="text-sm" style="font-weight:600;margin-bottom:6px">上游供应商</div>${c.ud.up.map(u2 => `<div class="flex-between" style="padding:4px 0"><span class="text-sm"><b>${esc(u2.n)}</b> <span class="text-xs text-muted">· ${esc(u2.w)}</span></span>${u2.ours ? '<span class="tag tag-green" style="height:18px;font-size:10px">本行客户</span>' : ''}</div>`).join('')}</div><div><div class="text-sm" style="font-weight:600;margin-bottom:6px">下游客户</div>${c.ud.down.map(u2 => `<div class="flex-between" style="padding:4px 0"><span class="text-sm"><b>${esc(u2.n)}</b> <span class="text-xs text-muted">· ${esc(u2.w)}</span></span>${u2.ours ? '<span class="tag tag-green" style="height:18px;font-size:10px">本行客户</span>' : ''}</div>`).join('')}</div></div>` : '<div class="text-sm text-muted">暂无公开披露数据</div>'}</div>`;
      else if (S.pkBoard === 'fin') body.innerHTML = this.finCredHtml(c);
      else body.innerHTML = this.adviceHtml(c);
      const FX = AIFX();
      FX.stagger(body); FX.countUp(body);
    },
    profileFullHtml(c) {
      /* 复用访前一页纸看板（其结构即这七节），仅去掉头尾的下载条避免与右栏头部重复 */
      let html = this.briefHtml(c);
      html = html.replace(/<div class="flex mt3"[^>]*>\s*<span class="text-xs text-muted">[^<]*<\/span>\s*<button[^>]*>下载访前准备<\/button>\s*<\/div>\s*$/, '');
      return html;
    },
    /* ---------- AI作战包 · Tab2 财报与征信 ---------- */
    finCredHtml(c) {
      const o = c.internal || { credit: 0, used: 0, deposit: 0, settle: 0, products: [] };
      const fin = [
        ['营业收入', c.pos === '战略' ? '86.2 亿' : c.pos === '腰部' ? '23.5 亿' : '5.8 亿', '同比 +18%'],
        ['归母净利润', c.pos === '战略' ? '6.4 亿' : c.pos === '腰部' ? '1.6 亿' : '0.32 亿', '同比 +12%'],
        ['资产负债率', c.cat === '建设运营商' ? '68%' : '54%', c.cat === '建设运营商' ? '重资产项目期' : '行业均值 58%'],
        ['应收账款周转', c.cat === '上游供应商' ? '127 天' : '86 天', c.cat === '上游供应商' ? '行业均值 98 天 · 偏长' : '行业均值 92 天'],
        ['经营性现金流', c.cat === '建设运营商' ? '项目期波动' : '净流入', '近 3 年为正'],
        ['研发投入占比', c.net === '新一代通信网' || c.net === '算力网' ? '11.2%' : '3.8%', 'AI 按行业口径核算'],
      ];
      const cred = [
        ['征信查询授权', '已取得（营销用途授权）'],
        ['征信记录', '无不良 · 无关注类'],
        ['对外担保', c.cat === '建设运营商' ? '1 笔 · 项目公司互保' : '未披露'],
        ['涉诉/失信', '公开信息未见异常'],
        ['他行授信', o.credit ? `授信 ${o.credit} 亿 · 已用 ${o.used} 亿` : '无授信记录'],
        ['人行征信区间', c.score >= 80 ? 'AA 级区间' : c.score >= 60 ? 'A 级区间' : 'BBB 区间'],
      ];
      return `
        <div class="wp-kpis">
          <div class="wp-kpi"><div class="k">综合评分</div><div class="v">${c.score}</div><div class="d">${c.sigLv} 级信号 · ${c.rel}</div></div>
          <div class="wp-kpi"><div class="k">行内合作</div><div class="v">${o.credit ? o.credit + '亿' : '未合作'}</div><div class="d">${(o.products || []).length ? (o.products || []).slice(0, 2).join('/') : '新客户'}</div></div>
          <div class="wp-kpi"><div class="k">存款日均</div><div class="v">${o.deposit ? o.deposit + '亿' : '—'}</div><div class="d">${o.settle ? '结算量 ' + o.settle + '亿' : '尚未建立结算'}</div></div>
        </div>
        ${this.secHtml(1, '财报速览（AI 解析）', '正式环境接入财报/税务数据后自动生成')}
        <div class="card card-pad mb3">
          <div class="grid-3" style="grid-template-columns:repeat(3,1fr);gap:10px">
            ${fin.map(f2 => `<div class="wp-pcard" style="border-top:3px solid #2458F5"><div class="t">${f2[0]}</div><div class="s"><b style="font-size:15px">${f2[1]}</b><br><span class="text-xs text-muted">${f2[2]}</span></div></div>`).join('')}
          </div>
          <div class="wp-note mt2"><b>AI 财报结论：</b>${c.cat === '上游供应商' ? '盈利与成长正常，核心变量是应收账期与客户集中度——建议授信结构以应收盘活类产品为主。' : '项目期杠杆偏高属正常，关注资本金到位与回款现金流——建议期限匹配的项目类融资。'}</div>
        </div>
        ${this.secHtml(2, '征信速览', '正式环境接入人行征信后按授权生成')}
        <div class="card card-pad">
          <div class="grid-3" style="grid-template-columns:repeat(3,1fr);gap:10px">
            ${cred.map(x => `<div class="wp-pcard" style="border-top:3px solid #16A34A"><div class="t">${x[0]}</div><div class="s">${x[1]}</div></div>`).join('')}
          </div>
          <div class="wp-note mt2"><b>提示：</b>征信信息仅限授信用途，需客户书面授权后查询。</div>
        </div>`;
    },
    /* ---------- AI作战包 · Tab3 拜访建议（对接人+六议题话术+注意事项） ---------- */
    adviceHtml(c) {
      const doc = document.createElement('div'); doc.innerHTML = this.briefHtml(c);
      const pick = sel2 => [...doc.querySelectorAll(sel2)].map(e => e.outerHTML).join('');
      const persons = pick('.wp-person');
      const topics = pick('.wp-topic');
      const attention = (() => { const sec = [...doc.querySelectorAll('.card card-pad')]; return ''; })();
      /* 注意事项与对接人标题区从 briefHtml 中截取：用 section 标记定位 */
      const attentionHtml = (() => {
        const m = doc.innerHTML.match(/拜访注意事项[\s\S]*?<\/div>\s*<\/div>/);
        return m ? m[0] : '';
      })();
      return `
        <div class="wp-kpis">
          <div class="wp-kpi"><div class="k">拜访结论</div><div class="v">${c.prog === '突破' ? '重点介入' : c.prog === '攻坚' ? '适度介入' : '培育跟踪'}</div><div class="d">${c.pos}客户 · ${c.prog}档 · 授信评估</div></div>
          <div class="wp-kpi"><div class="k">方案窗口</div><div class="v" style="font-size:15px;line-height:1.4">${c.prog === '突破' ? '11 月内' : c.prog === '攻坚' ? '年底前' : '建立联系'}</div><div class="d">错过需等下一周期</div></div>
          <div class="wp-kpi"><div class="k">核心议题</div><div class="v">6</div><div class="d">每议题对应方案模块</div></div>
        </div>
        ${this.secHtml(1, '建议对接人', '首次拜访由下至上、二次拜访由内至外')}
        <div class="grid-3 mb3">${persons || '<div class="text-sm text-muted">对接人信息完善中</div>'}</div>
        ${this.secHtml(2, '六个核心交流议题（附交流理由 · 话术可照读）', '每个议题对应综合服务方案中的一个模块')}
        <div class="grid-2 mb3">${topics}</div>
        ${this.secHtml(3, '拜访注意事项', '时机 · 姿态 · 合规')}
        <div class="card card-pad">
          ${this.attentionHtml(c)}
        </div>`;
    },
    /* 拜访注意事项（时机/姿态/合规 三卡，与访前一页纸同源口径） */
    attentionHtml(c) {
      return `<div class="grid-3">
          <div class="card card-pad"><b class="text-sm mb2" style="display:block">时机选择</b><ul class="text-sm text-sub" style="padding-left:18px;line-height:1.9"><li>${c.prog === '突破' ? '<b>方案窗口在 11 月内</b>，错过需等下一周期；' : c.prog === '攻坚' ? '年底前是授信落地窗口；' : '以建立联系为主，不急于报价；'}</li><li>首访锁财务口 → 两周内提交定制方案 → 纳入年度授信盘子。</li></ul></div>
          <div class="card card-pad"><b class="text-sm mb2" style="display:block">姿态与话术</b><ul class="text-sm text-sub" style="padding-left:18px;line-height:1.9"><li>切忌泛泛推销与低价竞争；</li><li>带具体方案上门：${esc((c.prods || []).slice(0, 2).join('、'))}要点与测算；</li><li>他行合作、股价等话题<b>不主动评论</b>。</li></ul></div>
          <div class="card card-pad"><b class="text-sm mb2" style="display:block">合规红线</b><ul class="text-sm text-sub" style="padding-left:18px;line-height:1.9"><li>未公开数据按内幕信息管理，不用于营销对比；</li><li>调查数据以审计报告与公告为准，舆情仅作参考；</li><li>不承诺额度、利率、审批时限。</li></ul></div>
        </div>`;
    },
    /* ---------- 综合服务方案（右侧面板版：方案看板 + 迭代记录入口） ---------- */
    iterDlg(c, task) {
      const logs = task ? task.log : [];
      const synLogs = logs.filter(l => l.t === '协同留言');
      const versions = [{ v: 'V1.0', d: '初版', x: '任务下发随附：AI 按产品库匹配生成建议服务方案', by: '系统 · AI' }]
        .concat(synLogs.map((l, i) => ({ v: 'V' + (i + 2) + '.0', d: l.d + ' 迭代', x: l.x, by: l.by })));
      openModal({ wide: true, title: `方案迭代记录 · ${esc(c.short)}`, body: `
        <div class="timeline mb3">
          ${versions.map((x, i) => `<div class="tl-item ${i === versions.length - 1 ? 'tl-ok' : ''}">
            <div class="tl-time">${x.v} · ${esc(x.by)}</div>
            <div class="tl-title">${esc(x.d)}</div>
            <div class="tl-desc" style="white-space:normal">${esc(x.x)}</div></div>`).join('')}
        </div>
        <div style="border-top:1px dashed var(--line);padding-top:12px">
          <div class="text-sm" style="font-weight:600;margin-bottom:8px">新增迭代记录</div>
          <textarea class="input" id="itTxt" rows="3" placeholder="记录本次方案调整内容与依据（纪要结论 / 协同意见 / 客户反馈）"></textarea>
        </div>`,
        foot: `<button class="btn btn-ghost" onclick="APP.closeModal()">关闭</button><button class="btn btn-primary" id="itGo">保存记录</button>`,
        onOpen: () => { document.querySelector('#itGo').onclick = () => {
          const txt = document.querySelector('#itTxt').value.trim();
          if (!txt) return toast('请输入迭代记录内容', 'warn');
          if (task) task.log.unshift({ d: '11-04', t: '方案迭代', by: APP.curUser().name, x: txt });
          APP.closeModal(); toast('方案迭代记录已保存');
          this.render(document.querySelector('#viewRoot'));
        }; } });
    },
    /* ---------- Tab2：访客纪要 ---------- */
    /* ---------- 二级·综合方案（中台产品部门协同作战：AI初稿 → 逐条确认/修订 → 定稿） ---------- */
    planItems(c) {
      const p = (c.prods || []).length ? c.prods : ['流动资金贷款'];
      const total = c.pos === '战略' ? '2.0 亿' : c.pos === '腰部' ? '1.2 亿' : '0.8 亿';
      return [
        { k: 'total', label: `首期授信总额 ${total}（信贷A+B+C 结构）` },
        { k: 'creditA', label: `信贷A · ${(p.find(x => /项目|设备|科技|水利/.test(x)) || p[0])}（项目/资本开支主力）` },
        { k: 'creditB', label: `信贷B · ${(p.find(x => /供应链|票据|应收|流动/.test(x)) || p[1] || '流动资金贷款')}（经营周转与应收盘活）` },
        { k: 'creditC', label: '信贷C · 结算归集 + 代发 + 资金监管（非信贷先行绑定）' },
        { k: 'noncredit', label: '非信贷六大模块（供应链/跨境/资本市场/并购撮合/绿色金融/政策申报）' },
      ];
    },
    paintPlanTab(box, tasks, selId) {
      const sel = tasks.find(t => t.id === (S.params.task || (tasks[0] || {}).id)) || tasks[0];
      if (!sel) { box.innerHTML = '<div class="text-sm text-muted" style="padding:16px 4px">暂无承接任务</div>'; return; }
      const c = M().coById(sel.co) || {};
      const rk = ROLE().key;
      if (!sel.planConf) sel.planConf = { items: {}, submitted: false, final: false };
      const PC = sel.planConf;
      const items = this.planItems(c);
      const doneCnt = items.filter(it => PC.items[it.k] && PC.items[it.k].state !== 'ai').length;
      const stage = PC.final ? 3 : (PC.submitted || doneCnt > 0) ? 2 : 1;
      const picker = `<div class="flex" style="gap:8px;align-items:center;margin-bottom:10px"><span class="text-xs text-muted">当前客户</span><select class="select" id="planPick" style="width:auto;height:30px;font-size:12px">${tasks.map(x => `<option value="${x.id}" ${x.id === sel.id ? 'selected' : ''}>${esc(cName(x.co))}（${x.status}）</option>`).join('')}</select></div>`;
      const steps = `
        <div class="card card-pad mb3"><b class="text-sm">方案形成过程</b><span class="text-xs text-muted" style="margin-left:8px">中台产品部门协同作战 · ${esc(c.short || '')}</span>
          <div class="flex mt2" style="gap:0;flex-wrap:wrap">
            ${[['①', 'AI 初稿', '随任务下发自动生成（产品库匹配）'], ['②', '中台产品经理逐条协同' + (PC.final ? '' : '（' + doneCnt + '/' + items.length + '）'), '分行产品经理 · 陈立 逐条确认或修订'], ['③', PC.final ? '定稿 V2.0 · 确认人：陈立' : '定稿完整方案', PC.final ? '已生成完整方案，可递交客户' : '全部确认后生成']].map((s2, i) => `
              <div style="display:flex;align-items:center;gap:6px;padding:4px 10px">
                <span class="rank-pill" style="${stage > i + 1 ? 'background:var(--ok-50);color:var(--ok-500)' : stage === i + 1 ? 'background:var(--brand-500);color:#fff' : 'background:#F0F2F7;color:var(--t3)'}">${stage > i + 1 ? '✓' : s2[0]}</span>
                <span class="text-xs" style="line-height:1.5"><b style="color:${stage >= i + 1 ? 'var(--t1)' : 'var(--t3)'}">${s2[1]}</b><br><span style="color:var(--t3)">${s2[2]}</span></span>
              </div>${i < 2 ? '<span style="color:var(--t3);padding:0 2px">›</span>' : ''}`).join('')}
          </div></div>`;
      const itemRows = items.map(it => {
        const cf = PC.items[it.k] || { state: 'ai' };
        const tag = cf.state === 'confirmed' ? '<span class="tag tag-green" style="height:20px">✓ 产品经理 陈立 已确认</span>'
          : cf.state === 'revised' ? `<span class="tag tag-orange" style="height:20px">产品经理 陈立 修订：${esc(cf.note || '')}</span>`
          : '<span class="tag tag-violet" style="height:20px">AI 建议</span>';
        const ops = rk === 'pm' && !PC.final
          ? `<span class="flex" style="gap:6px;margin-left:auto"><button class="btn btn-text btn-sm" data-pok="${it.k}" ${cf.state !== 'ai' ? 'disabled style="color:var(--t3)"' : ''}>确认</button><button class="btn btn-text btn-sm" data-prev="${it.k}">修订建议</button></span>` : '';
        return `<div class="flex-between" style="gap:10px;padding:9px 0;border-bottom:1px dashed var(--line);flex-wrap:wrap">
          <span class="text-sm" style="flex:1;min-width:200px">${esc(it.label)}</span>${tag}${ops}</div>`;
      }).join('');
      const bar = `
        <div class="card card-pad mb3"><div class="flex-between mb2"><b class="text-sm">服务方案要点 · 协同确认</b><span class="text-xs text-muted">${PC.final ? '已定稿' : PC.submitted ? '已提交产品经理协同' : 'AI 初稿待协同'}</span></div>
          ${itemRows}
          <div class="flex mt3" style="gap:8px;justify-content:flex-end;flex-wrap:wrap">
            ${rk === 'rm' && !PC.submitted && !PC.final ? '<button class="btn btn-primary btn-sm" id="plSubmit">提交产品经理协同</button>' : ''}
            ${rk === 'pm' && !PC.final ? `<button class="btn btn-primary btn-sm" id="plFinal" ${doneCnt < items.length ? 'disabled style="color:var(--t3)"' : ''}>生成完整方案（${doneCnt}/${items.length} 已协同）</button>` : ''}
            ${PC.final ? '<span class="tag tag-solid-red" style="height:24px">V2.0 完整方案 · 中台产品经理 陈立 确认</span>' : ''}
            <button class="btn btn-ghost btn-sm" id="plDl2">下载服务方案</button></div></div>`;
      box.innerHTML = picker + steps + bar + `<div id="planBoardWrap">${this.planHtml(c)}</div>`;
      const planPick = box.querySelector('#planPick');
      if (planPick) planPick.onchange = () => { S.params.task = planPick.value; this.paintPlanTab(box, tasks, selId); };
      const sub = box.querySelector('#plSubmit');
      if (sub) sub.onclick = () => {
        PC.submitted = true;
        sel.log.unshift({ d: '11-04', t: '方案协同', by: APP.curUser().role + ' · ' + APP.curUser().name, x: `综合服务方案 AI 初稿已提交中台产品部门协同（${items.length} 项要点待确认）` });
        toast('已提交产品经理协同，将在其工作台「综合方案」中逐条确认'); this.paintPlanTab(box, tasks, selId);
      };
      box.querySelectorAll('[data-pok]').forEach(b => b.onclick = () => { PC.items[b.dataset.pok] = { state: 'confirmed' }; this.paintPlanTab(box, tasks, selId); });
      box.querySelectorAll('[data-prev]').forEach(b => b.onclick = () => {
        const k = b.dataset.prev;
        const note = prompt('修订建议（将以产品经理陈立署名记入方案）：', '');
        if (note == null) return;
        PC.items[k] = { state: 'revised', note: note || '按中台意见调整' };
        this.paintPlanTab(box, tasks, selId);
      });
      const fin = box.querySelector('#plFinal');
      if (fin) fin.onclick = () => {
        PC.final = true;
        sel.log.unshift({ d: '11-04', t: '方案定稿', by: '分行产品经理 · 陈立', x: `中台产品部门完成 ${items.length} 项要点逐条协同，综合服务方案定稿（V2.0 · 确认人：陈立）` });
        toast('完整方案已定稿（V2.0 · 确认人：产品经理 陈立）'); this.paintPlanTab(box, tasks, selId);
      };
      const dl = box.querySelector('#plDl2');
      if (dl) dl.onclick = () => toast(PC.final ? '完整方案已下载（PDF · V2.0）' : '服务方案（当前版本）已下载（PDF）');
    },
    paintVisitTab(box, sel) {
      box.innerHTML = `<div class="card"><div class="card-head"><div class="card-title">访客纪要<span class="card-sub">语音录入 · AI 自动整理 · 前中后台协同留痕</span></div></div>
        <div class="card-pad" style="padding-top:8px" id="wbVisit"></div></div>`;
      this.paintVisit(box, sel);
    },
    /* ---------- 角色工作台 KPI（浅色条，随二级导航显示） ---------- */
    paintKpis(el, r, tasks) {
      const box = el.querySelector('#wbKpis'); if (!box) return;
      const k = (lab, v, red) => `<div style="background:#fff;border:1px solid ${red ? 'rgba(229,72,77,.45)' : 'var(--line)'};border-radius:10px;padding:5px 13px;min-width:78px;text-align:center">
        <div style="font-size:11px;color:${red ? 'var(--danger-500)' : 'var(--t3)'}">${lab}</div><div style="font-size:17px;font-weight:700;color:var(--t1)" class="fs-num">${v}</div></div>`;
      const od = tasks.filter(isOverdue).length;
      const rv = tasks.filter(needReview).length;
      let html = '';
      if (r.key === 'rm') {
        html = k('承接任务', tasks.length) + k('待接收', tasks.filter(t => t.status === '待接收').length)
          + k('跟进中', tasks.filter(t => t.status === '跟进中').length)
          + (od ? k('超期任务', od, true) : k('已反馈', tasks.filter(t => t.status === '已反馈').length))
          + k('本周纪要', tasks.reduce((s2, t) => s2 + t.log.filter(l => l.t.indexOf('访客纪要') >= 0).length, 0));
      } else if (r.key === 'head') {
        html = k('支行任务', tasks.length) + k('跟进中', tasks.filter(t => t.status === '跟进中').length)
          + k('已反馈', tasks.filter(t => t.status === '已反馈').length)
          + (od ? k('超期任务', od, true) : '')
          + k('反馈率', tasks.length ? Math.round(tasks.filter(t => t.status === '已反馈').length / tasks.length * 100) + '%' : '0%');
      } else if (r.key === 'pm') {
        html = k('已下发', tasks.length) + k('待接收', tasks.filter(t => t.status === '待接收').length)
          + k('待陪访', tasks.filter(t => t.status === '跟进中' && +t.due.replace('-', '') <= 1112).length)
          + (rv ? k('待复核纪要', rv, true) : k('订阅企业', (S.fn ? S.fn.subs : M().funnel.subsSeed).length))
          + k('客户池', M().funnel.cos.length);
      } else {
        html = k('全辖任务', tasks.length) + k('覆盖企业', new Set(tasks.map(t => t.co)).size)
          + k('参战经理', new Set(tasks.map(t => t.rm)).size)
          + k('整体反馈率', tasks.length ? Math.round(tasks.filter(t => t.status === '已反馈').length / tasks.length * 100) + '%' : '0%')
          + (od ? k('超期任务', od, true) : k('本周纪要', tasks.reduce((s2, t) => s2 + t.log.filter(l => l.t.indexOf('访客纪要') >= 0).length, 0)));
      }
      box.innerHTML = html;
    },
    taskCard(t, selId) {
      const stTag = s2 => ({ 待接收: 'tag-gray', 跟进中: 'tag-blue', 已反馈: 'tag-green', 已关闭: 'tag-line' }[s2] || 'tag-gray');
      return `<div class="wb-task ${t.id === selId ? 'on' : ''}" data-wt="${t.id}">
        <div class="flex-between" style="gap:8px"><b class="text-sm">${esc(cName(t.co))}</b>
          <span class="flex" style="gap:6px"><span class="tag tag-line" style="height:19px;font-size:10px">${esc(t.type)}</span><span class="tag ${stTag(t.status)}" style="height:19px;font-size:10px">${t.status}</span>${isOverdue(t) ? '<span class="tag tag-red" style="height:19px;font-size:10px">超期</span>' : ''}</span></div>
        <div class="text-xs text-muted mt1" style="line-height:1.6">截止 ${t.due} · ${esc(rmName(t.rm))} · 重点：${esc(t.prods.slice(0, 3).join(' / '))}</div>
        ${t.log[0] ? `<div class="wb-task-last">最新：${esc(t.log[0].d)} ${esc(t.log[0].t)} — ${esc(t.log[0].x.slice(0, 40))}…</div>` : '<div class="wb-task-last" style="color:var(--warn-500)">尚无跟进记录，请尽快接收并拜访</div>'}
        <div style="display:flex;justify-content:flex-end;margin-top:6px"><button class="btn btn-primary btn-sm" data-gopk="${t.co}">进入访前准备 ›</button></div>
      </div>`;
    },
    paintTasks(el, tasks, selId) {
      const box = el.querySelector('#wbTaskList'); if (!box) return;
      const kw = S.wbKw || '';
      const list = kw ? tasks.filter(t => (cName(t.co) + '').includes(kw)) : tasks;
      const rk = ROLE().key;
      let listHtml = '';
      if (rk === 'pm') {
        /* 产品经理：待陪访 / 待复核纪要 / 我下发的任务 三组（tab 切换） */
        const accompany = tasks.filter(t => t.status === '跟进中' && +t.due.replace('-', '') <= 1112);
        const review = tasks.filter(needReview);
        if (!S.wbPmTab) S.wbPmTab = 'all';
        const pmTabs = [
          { id: 'all', name: '我下发的任务', n: list.length },
          { id: 'accompany', name: '待陪访', n: accompany.length, tip: '跟进中且7天内到期' },
          { id: 'review', name: '待复核纪要', n: review.length, tip: '待产品经理复核' }];
        const pmArr = S.wbPmTab === 'accompany' ? accompany : S.wbPmTab === 'review' ? review : list;
        listHtml = `<div style="display:flex;gap:0;border-bottom:1px solid var(--line);padding:0 10px">
            ${pmTabs.map(t => `<div data-pmtab="${t.id}" style="padding:10px 10px 8px;cursor:pointer;font-size:12px;font-weight:${S.wbPmTab === t.id ? 700 : 400};color:${S.wbPmTab === t.id ? 'var(--brand-600)' : 'var(--t2)'};border-bottom:2px solid ${S.wbPmTab === t.id ? 'var(--brand-500)' : 'transparent'}">${t.name}（${t.n}）</div>`).join('')}
          </div>` +
          (pmArr.map(t => this.taskCard(t, selId)).join('') || '<div class="text-xs text-muted" style="padding:14px">暂无任务</div>');
      } else if (rk === 'gm') {
        /* 总经理：客户经理排行 + 红黑榜 + 全辖任务 */
        const byRm = {};
        tasks.forEach(t => { const n = rmName(t.rm); byRm[n] = byRm[n] || { n: 0, fb: 0, od: 0 }; byRm[n].n++; if (t.status === '已反馈') byRm[n].fb++; if (isOverdue(t)) byRm[n].od++; });
        const rank = Object.entries(byRm).map(([n2, v]) => ({ n2, ...v, rate: Math.round(v.fb / v.n * 100) })).sort((a2, b2) => b2.n - a2.n);
        const mx = Math.max(1, ...rank.map(x => x.n));
        const worst = [...rank].sort((a2, b2) => b2.od - a2.od || a2.rate - b2.rate)[0];
        const best = [...rank].sort((a2, b2) => b2.rate - a2.rate)[0];
        listHtml = `<div style="padding:10px 14px 2px"><b class="text-sm">客户经理排行（任务量 / 反馈率）</b>
          ${rank.map(x => `<div class="flex" style="gap:8px;align-items:center;padding:4px 0;font-size:12px">
            <span style="width:52px;flex-shrink:0;color:var(--t2);font-weight:600">${esc(x.n2)}</span>
            <div style="flex:1;height:13px;background:#F6E9EA;border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${x.n / mx * 100}%;background:linear-gradient(90deg,#8E1019,#C0202C)"></i></div>
            <span style="width:56px;text-align:right;color:var(--brand-600);font-weight:700">${x.n} 项</span>
            <span style="width:44px;text-align:right;color:${x.rate >= 50 ? 'var(--ok-500)' : 'var(--t3)'}">${x.rate}%</span>
            ${x.od ? `<span class="tag tag-red" style="height:18px;font-size:10px">超期${x.od}</span>` : ''}</div>`).join('')}
          <div class="mt2" style="font-size:11.5px;line-height:1.8">
            <span class="tag tag-green" style="height:19px">红榜</span>${esc(best.n2)} 反馈率最高（${best.rate}%）
            <span class="tag tag-red" style="height:19px;margin-left:8px">黑榜</span>${esc(worst.n2)}${worst.od ? ` 超期 ${worst.od} 项` : ` 反馈率最低（${worst.rate}%）`}
          </div></div>
          <div class="text-xs" style="font-weight:700;color:var(--brand-600);padding:10px 14px 4px">全辖任务（${list.length}）</div>` +
          list.map(t => this.taskCard(t, selId)).join('');
      } else {
        listHtml = `<div class="text-xs text-muted" style="padding:8px 14px 0">${list.length === tasks.length ? '共 ' + list.length + ' 项' : '筛选命中 ' + list.length + ' / ' + tasks.length + ' 项'}</div>` +
          (list.map(t => this.taskCard(t, selId)).join('') || '<div class="empty" style="padding:36px 16px"><div class="e-ico">🔍</div><div class="e-title">无匹配任务</div></div>');
      }
      box.innerHTML = listHtml;
      /* 产品经理左侧三组 tab 切换 */
      box.querySelectorAll('[data-pmtab]').forEach(t => t.onclick = () => { S.wbPmTab = t.dataset.pmtab; this.paintTasks(box, tasks, selId); });
      box.querySelectorAll('[data-wt]').forEach(d => d.onclick = e => {
        if (e.target.closest('[data-gopk]')) return;
        S.params.task = d.dataset.wt; delete S.params.co; this.render(document.querySelector('#viewRoot'));
      });
      box.querySelectorAll('[data-gopk]').forEach(b => b.onclick = e => {
        e.stopPropagation();
        S.pkCo = b.dataset.gopk; S.pkView = 'boards'; S.pkBoard = 'profile';
        this.render(document.querySelector('#viewRoot'));
      });
      if (S.params.co && M().coById(S.params.co)) { S.pkCo = S.params.co; S.pkView = 'boards'; delete S.params.co; this.render(el); return; }
      if (S.pkView === 'boards' && S.pkCo && M().coById(S.pkCo)) { this.paintBoards(box, M().coById(S.pkCo)); return; }
      /* 任务版面无右栏：四板块在独立版面 paintBoards 中 */
    },

    /* ---------- 访客纪要与协同（客户经理录音纪要；中后台角色以本人身份协同留言；跟进记录全员可见） ---------- */
    paintVisit(el, sel) {
      const box = el.querySelector('#wbVisit');
      if (!sel) { box.innerHTML = '<div class="text-sm text-muted" style="padding:16px 4px">暂无承接任务</div>'; return; }
      const c = M().coById(sel.co) || {};
      const editable = ROLE().key === 'rm';
      const me = APP.curUser();
      const visitLogs = sel.log.filter(l => /纪要/.test(l.t));
      const synCnt = sel.log.filter(l => l.t === '协同留言').length;
      const packVer = 'V' + (1 + Math.min(synCnt, 3)) + '.0';
      /* 该任务的访后报告 */
      if (!S.visitReports) S.visitReports = [];
      const vr = S.visitReports.filter(r => r.co === sel.co);
      box.innerHTML = `
        <div class="flex-between mb3" style="gap:10px;flex-wrap:wrap">
          <div class="text-sm"><b>${esc(c.short || '')}</b><span class="text-xs text-muted" style="margin-left:8px">${esc(sel.note || '')}</span></div>
          <div class="flex" style="gap:8px;flex-wrap:wrap">
            <span class="tag tag-blue" style="height:24px">第 ${visitLogs.length + 1} 次拜访待录</span>
            <span class="tag tag-orange" style="height:24px">协同 ${synCnt} 次 · 方案 ${packVer}</span>
            <select class="select" id="wbVTsk" style="width:auto;height:28px;font-size:12px">${this.myTasks().map(t => `<option value="${t.id}" ${t.id === sel.id ? 'selected' : ''}>${esc((M().coById(t.co) || {}).short || '')}（${t.status}）</option>`).join('')}</select>
          </div>
        </div>
        ${editable ? `
        <div class="wb-mic-row">
          <button class="wb-mic" id="wbMic">●</button>
          <div class="wb-mic-tip" id="wbMicTip">点击录音，口述拜访过程（录音直接转文字，自动整理归档；支持多次拜访分别记录）</div>
          <span class="tag tag-line" style="height:22px" id="wbMicTime">00:00</span>
        </div>
        <div class="form mt2">
          <div class="grid-3" style="gap:10px">
            <div class="form-item"><label class="form-label">拜访日期</label><input class="input" type="date" id="wbVDate" value="2026-11-04"></div>
            <div class="form-item"><label class="form-label">拜访方式</label><select class="select" id="wbVWay"><option>上门走访</option><option>视频会议</option><option>电话沟通</option></select></div>
            <div class="form-item"><label class="form-label">关键人 / 职务</label><input class="input" id="wbVPeer" placeholder="如：张总 · 财务总监"></div>
          </div>
          <div class="form-item"><label class="form-label">交流要点（语音转写原文，可修改）</label>
            <textarea class="input" id="wbVNote" rows="4" placeholder="点击上方录音按钮，转写文字将自动填入；也可直接输入"></textarea></div>
          <div id="wbAiOut"></div>
          <div class="flex" style="gap:8px;justify-content:flex-end;margin-top:4px">
            <button class="btn btn-ghost" id="wbAiBtn">✦ AI 整理</button>
            <button class="btn btn-primary" id="wbVSave">保存归档（第 ${visitLogs.length + 1} 次拜访）</button>
          </div>
        </div>` : `
        <div class="card card-pad mb3" style="box-shadow:none;border-left:3px solid var(--blue-500)">
          <div class="text-sm" style="line-height:1.8">您当前以 <b>${esc(me.role)} · ${esc(me.name)}</b> 身份查看该客户跟进过程：纪要由客户经理现场录入，您可在下方以本人身份补充协同意见（产品方案 / 风险意见），留言后自动通知客户经理并计入方案迭代。</div>
        </div>`}
        <div class="mt4" style="border-top:1px dashed var(--line);padding-top:12px">
          <div class="flex mb2" style="gap:8px;align-items:center;flex-wrap:wrap">
            <b class="text-sm">协同留言</b><span class="text-xs text-muted">${editable ? '中后台（产品/风险/负责人）在各自工作台补充意见' : '以本人身份留言（' + esc(me.role) + ' · ' + esc(me.name) + '）'}</span>
          </div>
          ${editable
            ? (synCnt ? sel.log.filter(l => l.t === '协同留言').slice(0, 3).map(l => `<div class="flex mb2" style="gap:8px;align-items:flex-start"><span class="tag tag-orange" style="height:19px;font-size:10px;flex-shrink:0">${esc(l.d)}</span><span class="text-sm text-sub" style="line-height:1.7"><b>${esc(l.by)}</b> — ${esc(l.x)}</span></div>`).join('') : '<div class="text-sm text-muted mb2">暂无协同留言</div>')
            : `<div class="flex" style="gap:8px;flex-wrap:wrap">
              <input class="input" id="wbSyTxt" placeholder="以 ${esc(me.name)} 身份补充：产品方案 / 风险意见…" style="flex:1;min-width:220px;height:30px">
              <button class="btn btn-primary" id="wbSyGo" style="height:30px">留言</button>
            </div>`}
        </div>
        <div class="mt4" style="border-top:1px dashed var(--line);padding-top:12px">
          <div class="flex-between mb2" style="gap:8px;flex-wrap:wrap">
            <b class="text-sm">访后尽调报告</b>
            <span class="text-xs text-muted">拜访完成后上传客户资料，生成尽调报告</span>
          </div>
          ${vr.length
            ? vr.map(r => `<div class="flex-between" style="padding:8px 0;border-bottom:1px dashed var(--line)">
              <span class="text-sm"><b>${esc(r.title)}</b> <span class="text-xs text-muted">${esc(r.t)} · ${esc(r.by)}</span></span>
              <span class="flex" style="gap:6px"><button class="btn btn-text btn-sm" data-vr-view="${esc(r.id)}">查看</button><button class="btn btn-text btn-sm" data-vr-dl="${esc(r.id)}">下载尽调报告</button></span>
            </div>`).join('')
            : `<div class="flex" style="gap:8px;align-items:center;flex-wrap:wrap">
              <span class="text-sm text-muted">尚无访后报告</span>
              ${editable ? '<button class="btn btn-primary btn-sm" id="wbVrNew">＋ 上传资料生成访后报告</button>' : ''}
            </div>`}
        </div>
        <div class="mt4" style="border-top:1px dashed var(--line);padding-top:12px">
          <div class="flex mb2" style="gap:8px"><b class="text-sm">拜访与协同全流程记录（${sel.log.length} 条）</b><span class="text-xs text-muted">最新在上 · 全员可见</span></div>
          ${sel.log.map(l => `<div class="flex mb2" style="gap:8px;align-items:flex-start">
            <span class="tag ${l.t === '协同留言' ? 'tag-orange' : /纪要/.test(l.t) ? 'tag-blue' : l.t === '方案迭代' ? 'tag-violet' : 'tag-line'}" style="height:19px;font-size:10px;flex-shrink:0">${esc(l.d)} ${esc(l.t)}</span>
            <span class="text-sm text-sub" style="line-height:1.7"><b style="color:var(--t3);font-weight:400">${esc(l.by)}</b> — ${esc(l.x)}</span></div>`).join('') || '<div class="text-sm text-muted">暂无记录</div>'}
        </div>
      `;
      const tsk = el.querySelector('#wbVTsk');
      if (tsk) tsk.onchange = () => { S.params.task = tsk.value; this.render(document.querySelector('#viewRoot')); };
      /* 访后报告：查看 / 下载 / 生成 */
      box.querySelectorAll('[data-vr-view]').forEach(b => b.onclick = () => { if (window.VIEWS.visitReport) { S._visitId = b.dataset.vrView; VIEWS.visitReport.open(S._visitId); } });
      box.querySelectorAll('[data-vr-dl]').forEach(b => b.onclick = () => {
        const r = S.visitReports.find(x => x.id === b.dataset.vrDl);
        if (r && window.VIEWS.visitReport) VIEWS.visitReport.downloadWord(r);
        else toast('报告生成后可下载尽调报告', 'warn');
      });
      const vrNew = box.querySelector('#wbVrNew');
      if (vrNew) vrNew.onclick = () => this.vrUploadDlg(sel, c);
      if (!editable) { this.bindSyn(el, sel); return; }
      /* 录音（真实按钮 + 演示转写） */
      let rec = null, timer = null, sec = 0;
      const mic = el.querySelector('#wbMic'), tip = el.querySelector('#wbMicTip'), timeEl = el.querySelector('#wbMicTime');
      let recser = null;
      mic.onclick = () => {
        if (!rec) {
          rec = { start: Date.now() };
          mic.classList.add('rec'); tip.textContent = '正在录音，再次点击结束并转写';
          try { navigator.mediaDevices.getUserMedia({ audio: true }).then(st => { recser = st; }).catch(() => { }); } catch (e) { }
          timer = setInterval(() => { sec++; timeEl.textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); }, 1000);
        } else {
          clearInterval(timer);
          if (recser) { recser.getTracks().forEach(t => t.stop()); recser = null; }
          mic.classList.remove('rec'); mic.disabled = true;
          tip.textContent = 'AI 转写中…';
          setTimeout(() => {
            const txt = DEMO_SCRIPT[c.net] || DEMO_SCRIPT['新型电网'];
            const note = el.querySelector('#wbVNote');
            tip.textContent = 'AI 实时转写中…';
            AIFX().typewriteTo(note, txt, () => {
              tip.textContent = '转写完成（' + timeEl.textContent + '）· 已自动填入，AI 已同步整理';
              mic.disabled = false; rec = null; sec = 0;
              this.aiOrganize(el, c, txt);
            });
          }, 400);
        }
      };
      el.querySelector('#wbAiBtn').onclick = () => {
        const txt = el.querySelector('#wbVNote').value.trim();
        if (!txt) return toast('请先录音转写或输入交流要点', 'warn');
        this.aiOrganize(el, c, txt);
      };
      el.querySelector('#wbVSave').onclick = () => {
        const note = el.querySelector('#wbVNote').value.trim();
        if (!note) return toast('请先录入交流要点', 'warn');
        const ai = el.querySelector('#wbAiOut').dataset.done === '1';
        const peer = el.querySelector('#wbVPeer').value.trim() || '关键人';
        const visitCnt = sel.log.filter(l => /纪要/.test(l.t)).length + 1;
        sel.log.unshift({ d: '11-04', t: '访客纪要（第' + visitCnt + '次）', by: APP.curUser().name, x: `【${el.querySelector('#wbVWay').value} · ${peer}】${note}（AI 已整理${ai ? '：识别需求与产品服务建议，含非信贷服务' : ''}）` });
        S._logNew = true;
        if (sel.status === '待接收') sel.status = '跟进中';
        toast(`第 ${visitCnt} 次拜访纪要已归档，任务状态更新为"跟进中"；待中后台协同后方案包迭代`);
        this.render(document.querySelector('#viewRoot'));
      };
      this.bindSyn(el, sel);
    },
    /* 中后台协同留言（客户经理页与协同页共用）：多次协同推动方案包迭代 */
    bindSyn(el, sel) {
      const go = el.querySelector('#wbSyGo');
      if (!go) return;
      go.onclick = () => {
        const txt = el.querySelector('#wbSyTxt').value.trim();
        if (!txt) return toast('请输入留言内容', 'warn');
        const me = APP.curUser();
        sel.log.unshift({ d: '11-04', t: '协同留言', by: me.role + ' · ' + me.name, x: txt });
        const synCnt = sel.log.filter(l => l.t === '协同留言').length;
        toast(`协同留言已提交（${me.role} · ${me.name}），已通知客户经理，方案迭代至 V${1 + Math.min(synCnt, 3)}.0`);
        this.render(document.querySelector('#viewRoot'));
      };
    },
    /* 访后报告上传弹窗（客户经理：点击任务 → 上传资料 → 生成尽调报告） */
    vrUploadDlg(sel, c) {
      if (!S.visitReports) S.visitReports = [];
      openModal({ wide: true, title: `上传资料 · 生成访后尽调报告（${esc(c.short || '')}）`, body: `
        <div class="text-xs text-muted mb3" style="line-height:1.7">拜访完成后上传客户资料，AI 自动勾稽比对生成尽调报告，支持在线编辑与 Word 下载。</div>
        <div class="grid-3" style="gap:10px" id="vrCats">
          ${[['财务报表', '2025年度审计报告.pdf'], ['纳税申报表', '2025增值税申报表.pdf'], ['银行流水', '基本户流水_2025.xlsx'], ['上下游合同', '核心客户销售合同.pdf'], ['证照章程', '营业执照.jpg'], ['其他资料', '现场照片.jpg']].map(([n, f]) => `
          <div class="up-zone" data-vrcat="${n}" style="cursor:pointer"><div class="flex-between"><b class="text-sm">${n}</b><span class="tag tag-line">上传</span></div><div class="text-xs mt2 text-muted">点击上传</div></div>`).join('')}
        </div>
        <div id="vrPicked" class="mt2"></div>`,
        foot: `<button class="btn btn-ghost" onclick="APP.closeModal()">取消</button><button class="btn btn-primary" id="vrGen">⚡ 解析并生成尽调报告</button>` });
      const picked = [];
      const paintPicked = () => { document.querySelector('#vrPicked').innerHTML = picked.length ? `<div class="flex wrap" style="gap:6px">${picked.map(f => `<span class="tag tag-green" style="height:24px">📄 ${f}</span>`).join('')}</div>` : ''; };
      document.querySelectorAll('[data-vrcat]').forEach(z => z.onclick = () => {
        const n = z.dataset.vrcat;
        const f = z.querySelector('.text-xs').textContent === '点击上传' ? ({ '财务报表': '2025年度审计报告.pdf', '纳税申报表': '2025增值税申报表.pdf', '银行流水': '基本户流水_2025.xlsx', '上下游合同': '核心客户销售合同.pdf', '证照章程': '营业执照.jpg', '其他资料': '现场照片.jpg' })[n] : n;
        if (!picked.includes(f)) picked.push(f);
        z.classList.add('on'); z.querySelector('.tag').className = 'tag tag-green'; z.querySelector('.tag').textContent = '✓ 已上传';
        z.querySelector('.text-xs').textContent = '📄 ' + f;
        paintPicked();
      });
      document.querySelector('#vrGen').onclick = () => {
        if (!picked.length) return toast('请至少上传一类资料', 'warn');
        const CAT_KEY = { '财务报表': 'fin', '纳税申报表': 'tax', '银行流水': 'bank', '上下游合同': 'ct', '证照章程': 'cert', '其他资料': 'other' };
        openModal({ small: true, title: `正在生成尽调报告 · ${esc(c.short || '')}`, body: `<div style="padding:8px">${['识别上传资料', '执行财务勾稽', '提取合同条款', '生成对比分析'].map((x, i) => `<div class="flex mb3"><span class="rank-pill" id="vsp${i}">${i + 1}</span><span>${x}</span></div>`).join('')}</div>`, foot: '' });
        [500, 1000, 1500, 2000].forEach((ms, i) => setTimeout(() => { const p = document.querySelector('#vsp' + i); if (p) { p.textContent = '✓'; p.style.color = 'var(--ok-500)'; } }, ms));
        setTimeout(() => {
          APP.closeModal();
          const files = picked.map(n => ({ k: CAT_KEY[n.split('.')[0]] || 'other', n }));
          const rpt = window.buildVisitReport ? window.buildVisitReport(c, files) : null;
          if (rpt) {
            S.visitReports.unshift(rpt);
            sel.log.unshift({ d: '11-04', t: '访后报告', by: APP.curUser().name, x: `上传 ${picked.length} 项资料，生成访后尽调报告《${rpt.title}》` });
            toast('访后尽调报告已生成，可在「访后尽调报告」区查看与下载');
          } else { toast('报告模块加载中，请稍后再试', 'warn'); }
          this.render(document.querySelector('#viewRoot'));
        }, 2300);
      };
    },
    aiOrganize(el, c, txt) {
      const out = el.querySelector('#wbAiOut');
      const d = DEMO_AI(c);
      out.dataset.done = '1';
      out.innerHTML = `
        <div class="ai-panel"><div class="ai-head"><span class="ai-badge">AI</span>纪要整理（自动生成 · 请确认）</div>
        <div class="ai-body">
          <div class="text-xs" style="font-weight:700;color:var(--t2);margin-bottom:4px;animation:aiStagIn .45s both;animation-delay:.05s">识别需求</div>
          ${d.needs.map(n => `<div class="flex mb2" style="gap:6px;align-items:flex-start;animation:aiStagIn .45s both;animation-delay:.05s"><span style="color:var(--brand-500)">·</span><span class="text-sm text-sub" style="line-height:1.6">${esc(n)}</span></div>`).join('')}
          <div class="text-xs" style="font-weight:700;color:var(--t2);margin:8px 0 4px;animation:aiStagIn .45s both;animation-delay:.35s">建议综合方案（前中台 + AI 协同 · 强调非信贷服务）</div>
          ${d.plan.map(p => `<div class="flex mb2" style="gap:6px;align-items:flex-start;animation:aiStagIn .45s both;animation-delay:.35s"><span class="wb-qn">${d.plan.indexOf(p) + 1}</span><span class="text-sm text-sub" style="line-height:1.6">${esc(p)}</span></div>`).join('')}
          <div class="text-xs" style="font-weight:700;color:var(--t2);margin:8px 0 4px;animation:aiStagIn .45s both;animation-delay:.65s">风险提示</div>
          <div class="text-sm text-sub" style="line-height:1.6;animation:aiStagIn .45s both;animation-delay:.65s">${esc(d.risk)}</div>
        </div></div>`;
    },
    /* ---------- 跟进台账 ---------- */
    paintLedger(el, tasks) {
      const box = el.querySelector('#wbLedger');
      const cName = id => (M().funnel.cos.find(c => c.id === id) || {}).short || '';
      const rows = [];
      tasks.forEach(t => t.log.forEach(l => rows.push(Object.assign({ co: cName(t.co), tk: t.id }, l))));
      rows.sort((a, b) => b.d.localeCompare(a.d));
      const tTag = t => ({ 访客纪要: 'tag-blue', 协同留言: 'tag-orange', 反馈: 'tag-green', 催办: 'tag-red' }[t] || 'tag-line');
      box.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr>
        <th style="width:64px">日期</th><th style="width:110px">企业</th><th style="width:84px">类型</th><th style="width:110px">记录人</th><th>内容</th></tr></thead><tbody>
        ${rows.map(r2 => `<tr${S._logNew && r2 === rows[0] ? ' class="log-new"' : ''}><td class="text-sm">${r2.d}</td><td class="text-sm" style="font-weight:600">${esc(r2.co)}</td>
        <td><span class="tag ${tTag(r2.t)}" style="height:19px;font-size:10px">${esc(r2.t)}</span></td>
        <td class="text-sm">${esc(r2.by)}</td><td class="text-sm text-sub" style="white-space:normal;line-height:1.6">${esc(r2.x)}</td></tr>`).join('') ||
        '<tr><td colspan="5" class="text-sm text-muted" style="padding:20px">暂无跟进记录</td></tr>'}</tbody></table></div>`;
      S._logNew = false;
    },
  };
})();
