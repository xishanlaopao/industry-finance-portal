/* ============================================================
   导航配置（V3 内直接迭代）
   机会漏斗（原企业名录）置于首页后第一位；
   二级菜单：企业总览 / 订阅的企业 / 任务下发与跟踪
   工作台经右上角个人信息菜单进入，不进顶部导航
   ============================================================ */
window.NAV = [
  { id: 'dashboard', name: '首页' },
  { id: 'funnel', name: '机会漏斗' },
  { id: 'report', name: 'AI智能分析' },
  { id: 'news', name: '产业动态' },
  { id: 'cockpit', name: '管理驾驶舱' },
];
window.NAV_ITEMS = {};
window.NAV.forEach(it => { NAV_ITEMS[it.id] = it; });
NAV_ITEMS.company = { id: 'company', name: '企业详情' };   /* 详情路由：不进导航栏 */
NAV_ITEMS.visitReport = { id: 'visitReport', name: '访后报告' };
NAV_ITEMS.workbench = { id: 'workbench', name: '工作台' }; /* 右上角个人信息菜单入口 */
NAV_ITEMS.plan = { id: 'plan', name: '综合服务方案' };   /* 机会漏斗·建议服务方案 查看页 */
