import { Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import type { Category, CategoryInput } from '../../types/catalog';
import { emptyToNull } from '../../utils/format';

interface CategoryFormModalProps {
  open: boolean;
  category?: Category;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: CategoryInput) => Promise<void>;
}

interface CategoryFormValues {
  name: string;
  description?: string;
}

export function CategoryFormModal({
  open,
  category,
  submitting,
  onCancel,
  onSubmit,
}: CategoryFormModalProps) {
  const [form] = Form.useForm<CategoryFormValues>();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: category?.name ?? '',
      description: category?.description ?? '',
    });
  }, [category, form, open]);

  return (
    <Modal
      title={category ? '编辑分类' : '新增分类'}
      open={open}
      confirmLoading={submitting}
      okText="保存"
      cancelText="取消"
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnHidden
      mask={{ closable: !submitting }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) =>
          void onSubmit({
            name: values.name.trim(),
            description: emptyToNull(values.description),
          })
        }
      >
        <Form.Item
          label="分类名称"
          name="name"
          rules={[
            { required: true, message: '请输入分类名称' },
            { whitespace: true, message: '分类名称不能为空' },
            { max: 100, message: '分类名称不能超过 100 个字符' },
          ]}
        >
          <Input placeholder="例如：梵呗" maxLength={100} showCount />
        </Form.Item>
        <Form.Item label="描述" name="description">
          <Input.TextArea rows={4} placeholder="可选，简要说明分类内容" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
