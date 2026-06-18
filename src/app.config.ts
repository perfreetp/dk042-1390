export default defineAppConfig({
  pages: [
    'pages/transact/index',
    'pages/query/index',
    'pages/exception/index',
    'pages/inbound/index',
    'pages/outbound/index',
    'pages/return/index',
    'pages/detail/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1E64C8',
    navigationBarTitleText: '航材寿命件管理',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#1E64C8',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/transact/index',
        text: '收发',
      },
      {
        pagePath: 'pages/query/index',
        text: '查询',
      },
      {
        pagePath: 'pages/exception/index',
        text: '异常',
      },
    ],
  },
});
