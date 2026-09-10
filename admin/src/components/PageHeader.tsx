import { Flex, Typography } from 'antd';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  extra?: ReactNode;
}

export function PageHeader({ title, description, extra }: PageHeaderProps) {
  return (
    <Flex className="page-heading" align="flex-start" justify="space-between" gap={16} wrap>
      <div>
        <Typography.Title level={2}>{title}</Typography.Title>
        {description ? <Typography.Text type="secondary">{description}</Typography.Text> : null}
      </div>
      {extra}
    </Flex>
  );
}
