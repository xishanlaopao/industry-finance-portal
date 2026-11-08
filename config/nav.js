/* ============================================================
   导航配置（V4 迭代：五大一级导航）
   个人工作台 / 机会漏斗 / 访前作战包 / 市场洞察 / 管理视图
   隐藏路由（不进导航栏，经按钮/跳转进入）：
   dashboard(旧首页) / report(AI分析旧路由) / news(产业动态)
   cockpit(管理驾驶舱旧路由) / company / visitReport / plan
   ============================================================ */
window.NAV = [
  { id: 'workbench', name: '个人工作台' },
  { id: 'funnel', name: '机会漏斗' },
  { id: 'pack', name: '访前作战包' },
  { id: 'insight', name: '市场洞察' },
  { id: 'manage', name: '管理视图' },
];
window.NAV_ITEMS = {};
window.NAV.forEach(it => { NAV_ITEMS[it.id] = it; });
NAV_ITEMS.dashboard = { id: 'dashboard', name: '市场洞察' };   /* 旧首页路由别名，隐藏 */
NAV_ITEMS.report = { id: 'report', name: '访前作战包' };       /* 旧AI分析路由别名，隐藏 */
NAV_ITEMS.news = { id: 'news', name: '产业动态' };
NAV_ITEMS.cockpit = { id: 'cockpit', name: '管理视图' };       /* 旧驾驶舱路由别名，隐藏 */
NAV_ITEMS.company = { id: 'company', name: '企业详情' };   /* 详情路由：不进导航栏 */
NAV_ITEMS.visitReport = { id: 'visitReport', name: '访后报告' };
NAV_ITEMS.plan = { id: 'plan', name: '综合服务方案' };   /* 机会漏斗"建议服务方案" 查看页 */
