import { App, Avatar, Button, Pagination, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listAlbums } from '../../api/albums';
import { listArtists } from '../../api/artists';
import { listCategories } from '../../api/categories';
import { createTrack, deleteTrack, listTracks, updateTrack } from '../../api/tracks';
import { PageHeader } from '../../components/PageHeader';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import type { Album, Artist, Category, Track, TrackInput } from '../../types/catalog';
import { getErrorMessage } from '../../utils/api-error';
import { formatDateTime, formatDuration } from '../../utils/format';
import { TrackFormDrawer } from './TrackFormDrawer';

export function TracksPage() {
  const { message } = App.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const list = usePaginatedList(listTracks);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Track>();
  const createRequested = (location.state as { create?: boolean } | null)?.create === true;
  const [formOpen, setFormOpen] = useState(createRequested);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string>();

  useEffect(() => {
    let active = true;
    void Promise.all([
      listArtists({ page: 1, pageSize: 100 }),
      listAlbums({ page: 1, pageSize: 100 }),
      listCategories({ page: 1, pageSize: 100 }),
    ])
      .then(([artistResponse, albumResponse, categoryResponse]) => {
        if (!active) return;
        setArtists(artistResponse.data);
        setAlbums(albumResponse.data);
        setCategories(categoryResponse.data);
      })
      .catch((error: unknown) => {
        if (active) void message.error(getErrorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [message]);

  useEffect(() => {
    if ((location.state as { create?: boolean } | null)?.create) {
      void navigate('/tracks', { replace: true, state: null });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (list.error) void message.error(getErrorMessage(list.error));
  }, [list.error, message]);

  const save = async (values: TrackInput) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateTrack(editing.id, values);
        void message.success('曲目已更新');
      } else {
        await createTrack(values);
        void message.success('曲目已创建');
      }
      setFormOpen(false);
      list.reload();
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (track: Track) => {
    setDeletingId(track.id);
    try {
      await deleteTrack(track.id);
      void message.success('曲目已永久删除');
      list.refreshAfterDelete();
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setDeletingId(undefined);
    }
  };

  const columns: TableColumnsType<Track> = [
    {
      title: '封面',
      dataIndex: 'coverUrl',
      width: 72,
      render: (value: string | null, track) => (
        <Avatar shape="square" size={44} src={value}>
          {track.title.slice(0, 1)}
        </Avatar>
      ),
    },
    { title: '曲目名称', dataIndex: 'title', width: 220, ellipsis: true },
    { title: '艺术家', dataIndex: ['artist', 'name'], width: 160, ellipsis: true },
    {
      title: '专辑',
      dataIndex: ['album', 'title'],
      width: 180,
      ellipsis: true,
      render: (value: string | undefined) =>
        value || <Typography.Text type="secondary">—</Typography.Text>,
    },
    { title: '分类', dataIndex: ['category', 'name'], width: 110 },
    { title: '时长', dataIndex: 'duration', width: 90, render: formatDuration },
    {
      title: '发布状态',
      dataIndex: 'isPublished',
      width: 100,
      render: (published: boolean) =>
        published ? <Tag color="success">已发布</Tag> : <Tag>未发布</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 170, render: formatDateTime },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, track) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setEditing(track);
              setFormOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该曲目吗？"
            description="此操作将永久删除记录。"
            okText="永久删除"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: deletingId === track.id }}
            onConfirm={() => remove(track)}
          >
            <Button type="link" danger size="small" disabled={Boolean(deletingId)}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title="曲目管理"
        description="维护音频地址、歌词、曲目关系与发布状态"
        extra={
          <Button
            type="primary"
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            新增曲目
          </Button>
        }
      />
      <div className="table-card">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={list.items}
          loading={list.loading}
          pagination={false}
          scroll={{ x: 1320 }}
          locale={{ emptyText: '暂无曲目' }}
        />
        <Pagination
          className="table-pagination"
          current={list.page}
          pageSize={list.pageSize}
          total={list.total}
          showSizeChanger={false}
          showTotal={(total) => `共 ${total} 条`}
          onChange={list.setPage}
        />
      </div>
      {formOpen ? (
        <TrackFormDrawer
          open
          track={editing}
          artists={artists}
          albums={albums}
          categories={categories}
          submitting={submitting}
          onCancel={() => !submitting && setFormOpen(false)}
          onSubmit={save}
        />
      ) : null}
    </div>
  );
}
