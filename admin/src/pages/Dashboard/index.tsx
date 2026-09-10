import { App, Button, Card, Col, Flex, Row, Skeleton, Statistic, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAlbums } from '../../api/albums';
import { listArtists } from '../../api/artists';
import { listCategories } from '../../api/categories';
import { listTracks } from '../../api/tracks';
import { PageHeader } from '../../components/PageHeader';
import { getErrorMessage } from '../../utils/api-error';

interface DashboardCounts {
  tracks: number;
  albums: number;
  artists: number;
  categories: number;
}

const cards: Array<{ key: keyof DashboardCounts; label: string }> = [
  { key: 'tracks', label: '曲目' },
  { key: 'albums', label: '专辑' },
  { key: 'artists', label: '艺术家' },
  { key: 'categories', label: '分类' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [counts, setCounts] = useState<DashboardCounts>();

  useEffect(() => {
    let active = true;
    void Promise.all([
      listTracks({ page: 1, pageSize: 1 }),
      listAlbums({ page: 1, pageSize: 1 }),
      listArtists({ page: 1, pageSize: 1 }),
      listCategories({ page: 1, pageSize: 1 }),
    ])
      .then(([tracks, albums, artists, categories]) => {
        if (!active) return;
        setCounts({
          tracks: tracks.meta.total,
          albums: albums.meta.total,
          artists: artists.meta.total,
          categories: categories.meta.total,
        });
      })
      .catch((error: unknown) => {
        if (active) void message.error(getErrorMessage(error));
      });

    return () => {
      active = false;
    };
  }, [message]);

  return (
    <div className="page-stack">
      <PageHeader
        title="佛教音乐数字资源管理平台"
        description="集中维护曲目、专辑、艺术家与分类内容"
      />
      <Row gutter={[16, 16]}>
        {cards.map((card) => (
          <Col xs={24} sm={12} xl={6} key={card.key}>
            <Card className="stat-card">
              {counts ? (
                <Statistic title={card.label} value={counts[card.key]} />
              ) : (
                <Skeleton active paragraph={false} />
              )}
            </Card>
          </Col>
        ))}
      </Row>
      <Card title="快速入口">
        <Flex gap={12} wrap>
          <Button type="primary" onClick={() => navigate('/tracks', { state: { create: true } })}>
            新增曲目
          </Button>
          <Button onClick={() => navigate('/albums', { state: { create: true } })}>新增专辑</Button>
          <Button onClick={() => navigate('/artists', { state: { create: true } })}>
            新增艺术家
          </Button>
          <Button onClick={() => navigate('/categories', { state: { create: true } })}>
            新增分类
          </Button>
        </Flex>
        <Typography.Paragraph type="secondary" className="quick-note">
          当前 Admin API 尚未配置身份认证，仅限本地开发和受控环境使用。
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
