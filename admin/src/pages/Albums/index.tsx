import { App, Avatar, Button, Pagination, Popconfirm, Space, Table, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createAlbum, deleteAlbum, listAlbums, updateAlbum } from '../../api/albums';
import { listArtists } from '../../api/artists';
import { PageHeader } from '../../components/PageHeader';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import type { Album, AlbumInput, Artist } from '../../types/catalog';
import { getErrorMessage } from '../../utils/api-error';
import { formatDateTime } from '../../utils/format';
import { AlbumFormModal } from './AlbumFormModal';

export function AlbumsPage() {
  const { message } = App.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const list = usePaginatedList(listAlbums);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [editing, setEditing] = useState<Album>();
  const createRequested = (location.state as { create?: boolean } | null)?.create === true;
  const [formOpen, setFormOpen] = useState(createRequested);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string>();

  useEffect(() => {
    void listArtists({ page: 1, pageSize: 100 })
      .then((response) => setArtists(response.data))
      .catch((error: unknown) => void message.error(getErrorMessage(error)));
  }, [message]);

  useEffect(() => {
    if ((location.state as { create?: boolean } | null)?.create) {
      void navigate('/albums', { replace: true, state: null });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (list.error) void message.error(getErrorMessage(list.error));
  }, [list.error, message]);

  const save = async (values: AlbumInput) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateAlbum(editing.id, values);
        void message.success('专辑已更新');
      } else {
        await createAlbum(values);
        void message.success('专辑已创建');
      }
      setFormOpen(false);
      list.reload();
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (album: Album) => {
    setDeletingId(album.id);
    try {
      await deleteAlbum(album.id);
      void message.success('专辑已删除，关联曲目的专辑字段已清空');
      list.refreshAfterDelete();
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setDeletingId(undefined);
    }
  };

  const columns: TableColumnsType<Album> = [
    {
      title: '封面',
      dataIndex: 'coverUrl',
      width: 72,
      render: (value: string | null, album) => (
        <Avatar shape="square" size={44} src={value}>
          {album.title.slice(0, 1)}
        </Avatar>
      ),
    },
    { title: '专辑名', dataIndex: 'title', width: 220 },
    { title: '艺术家', dataIndex: ['artist', 'name'], width: 170 },
    {
      title: '发行年份',
      dataIndex: 'publishYear',
      width: 100,
      render: (value: number | null) =>
        value ?? <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      render: (value: string | null) =>
        value || <Typography.Text type="secondary">—</Typography.Text>,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 170, render: formatDateTime },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, album) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setEditing(album);
              setFormOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该专辑吗？"
            description="不会删除曲目，但关联曲目的专辑字段将被清空。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: deletingId === album.id }}
            onConfirm={() => remove(album)}
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
        title="专辑管理"
        description="维护专辑资料及其所属艺术家"
        extra={
          <Button
            type="primary"
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            新增专辑
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
          scroll={{ x: 1100 }}
          locale={{ emptyText: '暂无专辑' }}
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
      <AlbumFormModal
        open={formOpen}
        album={editing}
        artists={artists}
        submitting={submitting}
        onCancel={() => !submitting && setFormOpen(false)}
        onSubmit={save}
      />
    </div>
  );
}
