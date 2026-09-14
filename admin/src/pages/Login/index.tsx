import { App, Button, Card, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { LoginCredentials } from '../../api/auth';
import { useAuth } from '../../auth/auth-context';
import { getErrorMessage } from '../../utils/api-error';

interface LoginLocationState {
  from?: string;
}

export function LoginPage() {
  const { message } = App.useApp();
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: LoginCredentials): Promise<void> => {
    setLoading(true);
    try {
      await login(values);
      const state = location.state as LoginLocationState | null;
      const destination = state?.from?.startsWith('/') ? state.from : '/';
      navigate(destination, { replace: true });
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <Card className="login-card" variant="borderless">
        <div className="login-brand">
          <span className="brand-mark login-brand__mark">梵</span>
          <div>
            <Typography.Title level={2}>梵音集管理后台</Typography.Title>
            <Typography.Text type="secondary">请使用管理员账号登录</Typography.Text>
          </div>
        </div>

        <Form<LoginCredentials>
          layout="vertical"
          requiredMark={false}
          autoComplete="on"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input size="large" autoComplete="username" maxLength={64} autoFocus />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password size="large" autoComplete="current-password" maxLength={128} />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" loading={loading} block>
            登录
          </Button>
        </Form>
      </Card>
    </main>
  );
}
