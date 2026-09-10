import { Alert, Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';
import type { Artist, ArtistInput, ArtistType } from '../../types/catalog';
import { artistTypeLabels, artistTypes } from '../../types/catalog';
import { emptyToNull } from '../../utils/format';

interface ArtistFormModalProps {
  open: boolean;
  artist?: Artist;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: ArtistInput) => Promise<void>;
}

interface ArtistFormValues {
  name: string;
  type: ArtistType;
  avatarUrl?: string;
  description?: string;
}

export function ArtistFormModal({
  open,
  artist,
  submitting,
  onCancel,
  onSubmit,
}: ArtistFormModalProps) {
  const [form] = Form.useForm<ArtistFormValues>();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: artist?.name ?? '',
      type: artist?.type ?? 'OTHER',
      avatarUrl: artist?.avatarUrl ?? '',
      description: artist?.description ?? '',
    });
  }, [artist, form, open]);

  return (
    <Modal
      title={artist ? '编辑艺术家' : '新增艺术家'}
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
            type: values.type,
            avatarUrl: emptyToNull(values.avatarUrl),
            description: emptyToNull(values.description),
          })
        }
      >
        <Form.Item
          label="名称"
          name="name"
          rules={[
            { required: true, message: '请输入艺术家名称' },
            { whitespace: true, message: '艺术家名称不能为空' },
            { max: 200, message: '名称不能超过 200 个字符' },
          ]}
        >
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item
          label="类型"
          name="type"
          rules={[{ required: true, message: '请选择艺术家类型' }]}
        >
          <Select
            options={artistTypes.map((value) => ({ value, label: artistTypeLabels[value] }))}
          />
        </Form.Item>
        <Form.Item
          label="头像 URL"
          name="avatarUrl"
          rules={[{ type: 'url', message: '请输入有效的头像 URL' }]}
        >
          <Input placeholder="https://example.com/avatar.jpg" />
        </Form.Item>
        <Alert
          className="form-hint"
          type="info"
          showIcon
          title="当前版本暂使用图片 URL，后续接入对象存储上传。"
        />
        <Form.Item label="描述" name="description">
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
