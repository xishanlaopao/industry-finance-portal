/* ============================================================
   导航配置（V5.1：五大一级导航，报告中心[原AI智能分析]）
   个人工作台 / 机会漏斗 / 市场洞察 / 报告中心 / 管理视图
   报告中心页签：访前报告 / 访后尽调报告 / 产业链报告 / 企业研报；
   「我的报告」为页签行最右侧按钮（与页签区分）
   隐藏路由（不进导航栏，经按钮/跳转进入）：
   dashboard(旧首页) / news(产业动态)
   cockpit(管理驾驶舱旧路由) / company / visitReport / plan
   ============================================================ */
window.NAV = [
  { id: 'workbench', name: '个人工作台' },
  { id: 'funnel', name: '机会漏斗' },
  { id: 'insight', name: '市场洞察' },
  { id: 'report', name: '报告中心' },
  { id: 'manage', name: '管理视图' },
];
window.NAV_ITEMS = {};
window.NAV.forEach(it => { NAV_ITEMS[it.id] = it; });
NAV_ITEMS.dashboard = { id: 'dashboard', name: '市场洞察' };   /* 旧首页路由别名，隐藏 */
NAV_ITEMS.search = { id: 'search', name: '搜索' };             /* 搜索结果页，隐藏 */
NAV_ITEMS.pack = { id: 'pack', name: '访前准备' };             /* 旧作战包路由别名 → 工作台·访前准备 */
NAV_ITEMS.news = { id: 'news', name: '产业动态' };
NAV_ITEMS.cockpit = { id: 'cockpit', name: '管理视图' };       /* 旧驾驶舱路由别名，隐藏 */
NAV_ITEMS.company = { id: 'company', name: '企业详情' };   /* 详情路由：不进导航栏 */
NAV_ITEMS.visitReport = { id: 'visitReport', name: '访后报告' };
NAV_ITEMS.plan = { id: 'plan', name: '综合服务方案' };   /* 机会漏斗"建议服务方案" 查看页 */
