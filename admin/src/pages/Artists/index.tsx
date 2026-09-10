import { App, Avatar, Button, Pagination, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createArtist, deleteArtist, listArtists, updateArtist } from '../../api/artists';
import { PageHeader } from '../../components/PageHeader';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import type { Artist, ArtistInput } from '../../types/catalog';
import { artistTypeLabels } from '../../types/catalog';
import { getErrorMessage } from '../../utils/api-error';
import { formatDateTime } from '../../utils/format';
import { ArtistFormModal } from './ArtistFormModal';

export function ArtistsPage() {
  const { message } = App.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const list = usePaginatedList(listArtists);
  const [editing, setEditing] = useState<Artist>();
  const createRequested = (location.state as { create?: boolean } | null)?.create === true;
  const [formOpen, setFormOpen] = useState(createRequested);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string>();

  useEffect(() => {
    if ((location.state as { create?: boolean } | null)?.create) {
      void navigate('/artists', { replace: true, state: null });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (list.error) void message.error(getErrorMessage(list.error));
  }, [list.error, message]);

  const save = async (values: ArtistInput) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateArtist(editing.id, values);
        void message.success('艺术家已更新');
      } else {
        await createArtist(values);
        void message.success('艺术家已创建');
      }
      setFormOpen(false);
      list.reload();
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (artist: Artist) => {
    setDeletingId(artist.id);
    try {
      await deleteArtist(artist.id);
      void message.success('艺术家已删除');
      list.refreshAfterDelete();
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setDeletingId(undefined);
    }
  };

  const columns: TableColumnsType<Artist> = [
    {
      title: '头像',
      dataIndex: 'avatarUrl',
      width: 72,
      render: (value: string | null, artist) => (
        <Avatar src={value}>{artist.name.slice(0, 1)}</Avatar>
      ),
    },
    { title: '名称', dataIndex: 'name', width: 180 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 110,
      render: (value: Artist['type']) => <Tag>{artistTypeLabels[value]}</Tag>,
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
      render: (_, artist) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setEditing(artist);
              setFormOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该艺术家吗？"
            description="有关联专辑或曲目的艺术家无法删除。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: deletingId === artist.id }}
            onConfirm={() => remove(artist)}
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
        title="艺术家管理"
        description="维护法师、寺院、僧团与音乐团体资料"
        extra={
          <Button
            type="primary"
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            新增艺术家
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
          scroll={{ x: 980 }}
          locale={{ emptyText: '暂无艺术家' }}
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
      <ArtistFormModal
        open={formOpen}
        artist={editing}
        submitting={submitting}
        onCancel={() => !submitting && setFormOpen(false)}
        onSubmit={save}
      />
    </div>
  );
}
