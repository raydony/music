import { Alert, Form, Input, InputNumber, Modal, Select } from 'antd';
import { useEffect } from 'react';
import type { Album, AlbumInput, Artist } from '../../types/catalog';
import { emptyToNull } from '../../utils/format';

interface AlbumFormModalProps {
  open: boolean;
  album?: Album;
  artists: Artist[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: AlbumInput) => Promise<void>;
}

interface AlbumFormValues {
  title: string;
  artistId: string;
  publishYear?: number;
  coverUrl?: string;
  description?: string;
}

export function AlbumFormModal({
  open,
  album,
  artists,
  submitting,
  onCancel,
  onSubmit,
}: AlbumFormModalProps) {
  const [form] = Form.useForm<AlbumFormValues>();
  const maximumYear = new Date().getFullYear() + 1;

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      title: album?.title ?? '',
      artistId: album?.artistId,
      publishYear: album?.publishYear ?? undefined,
      coverUrl: album?.coverUrl ?? '',
      description: album?.description ?? '',
    });
  }, [album, form, open]);

  return (
    <Modal
      title={album ? '编辑专辑' : '新增专辑'}
      open={open}
      width={600}
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
            title: values.title.trim(),
            artistId: values.artistId,
            publishYear: values.publishYear ?? null,
            coverUrl: emptyToNull(values.coverUrl),
            description: emptyToNull(values.description),
          })
        }
      >
        <Form.Item
          label="专辑名称"
          name="title"
          rules={[
            { required: true, message: '请输入专辑名称' },
            { whitespace: true, message: '专辑名称不能为空' },
            { max: 300, message: '专辑名称不能超过 300 个字符' },
          ]}
        >
          <Input maxLength={300} />
        </Form.Item>
        <Form.Item
          label="艺术家"
          name="artistId"
          rules={[{ required: true, message: '请选择艺术家' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="选择艺术家"
            options={artists.map((artist) => ({ value: artist.id, label: artist.name }))}
          />
        </Form.Item>
        <Form.Item
          label="发行年份"
          name="publishYear"
          rules={[
            {
              type: 'number',
              min: 1000,
              max: maximumYear,
              message: `请输入 1000 至 ${maximumYear} 年`,
            },
          ]}
        >
          <InputNumber min={1000} max={maximumYear} precision={0} className="full-width" />
        </Form.Item>
        <Form.Item
          label="封面 URL"
          name="coverUrl"
          rules={[{ type: 'url', message: '请输入有效的封面 URL' }]}
        >
          <Input placeholder="https://example.com/cover.jpg" />
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
