import { Button, Layout, Menu, Space, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';

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
pageTitles['/tracks/import'] = '批量导入音乐';

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAuth();
  const selectedPath =
    menuItems.find(
      (item) =>
        item.key === location.pathname ||
        (item.key !== '/' && location.pathname.startsWith(`${item.key}/`)),
    )?.key ?? '/';

  const handleLogout = (): void => {
    logout();
    navigate('/login', { replace: true });
  };

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
            {pageTitles[location.pathname] ??
              pageTitles[selectedPath] ??
              '佛教音乐数字资源管理平台'}
          </Typography.Text>
          <Space size="middle">
            <Typography.Text type="secondary">{admin?.username}</Typography.Text>
            <Button type="text" onClick={handleLogout}>
              退出登录
            </Button>
          </Space>
        </Header>
        <Content className="content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
