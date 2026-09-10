import { Layout, Menu, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', label: '首页' },
  { key: '/tracks', label: '曲目管理' },
  { key: '/albums', label: '专辑管理' },
  { key: '/artists', label: '艺术家管理' },
  { key: '/categories', label: '分类管理' },
];

const pageTitles: Record<string, string> = Object.fromEntries(
  menuItems.map((item) => [item.key, item.label]),
);

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedPath = menuItems.some((item) => item.key === location.pathname)
    ? location.pathname
    : '/';

  return (
    <Layout className="app-shell">
      <Sider width={220} theme="light" className="sidebar">
        <div className="brand">
          <span className="brand-mark">梵</span>
          <span>佛教音乐</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedPath]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header className="header">
          <Typography.Text strong>
            {pageTitles[selectedPath] ?? '佛教音乐数字资源管理平台'}
          </Typography.Text>
          <Typography.Text type="secondary">佛教音乐数字资源管理平台</Typography.Text>
        </Header>
        <Content className="content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
