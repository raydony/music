import { App, Button, Pagination, Popconfirm, Space, Table, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../../api/categories';
import { PageHeader } from '../../components/PageHeader';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import type { Category, CategoryInput } from '../../types/catalog';
import { getErrorMessage } from '../../utils/api-error';
import { formatDateTime } from '../../utils/format';
import { CategoryFormModal } from './CategoryFormModal';

export function CategoriesPage() {
  const { message } = App.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const list = usePaginatedList(listCategories);
  const [editing, setEditing] = useState<Category>();
  const createRequested = (location.state as { create?: boolean } | null)?.create === true;
  const [formOpen, setFormOpen] = useState(createRequested);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string>();

  useEffect(() => {
    if ((location.state as { create?: boolean } | null)?.create) {
      void navigate('/categories', { replace: true, state: null });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (list.error) void message.error(getErrorMessage(list.error));
  }, [list.error, message]);

  const save = async (values: CategoryInput) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateCategory(editing.id, values);
        void message.success('分类已更新');
      } else {
        await createCategory(values);
        void message.success('分类已创建');
      }
      setFormOpen(false);
      list.reload();
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (category: Category) => {
    setDeletingId(category.id);
    try {
      await deleteCategory(category.id);
      void message.success('分类已删除');
      list.refreshAfterDelete();
    } catch (error) {
      void message.error(getErrorMessage(error));
    } finally {
      setDeletingId(undefined);
    }
  };

  const columns: TableColumnsType<Category> = [
    { title: '分类名称', dataIndex: 'name', width: 180 },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      render: (value: string | null) =>
        value || <Typography.Text type="secondary">—</Typography.Text>,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 170, render: formatDateTime },
    { title: '更新时间', dataIndex: 'updatedAt', width: 170, render: formatDateTime },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, category) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setEditing(category);
              setFormOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该分类吗？"
            description="有关联曲目的分类无法删除。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: deletingId === category.id }}
            onConfirm={() => remove(category)}
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
        title="分类管理"
        description="维护梵呗、赞偈、诵经等内容分类"
        extra={
          <Button
            type="primary"
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            新增分类
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
          scroll={{ x: 900 }}
          locale={{ emptyText: '暂无分类' }}
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
      <CategoryFormModal
        open={formOpen}
        category={editing}
        submitting={submitting}
        onCancel={() => !submitting && setFormOpen(false)}
        onSubmit={save}
      />
    </div>
  );
}
