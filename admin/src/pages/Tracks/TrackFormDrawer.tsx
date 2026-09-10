import {
  Alert,
  Button,
  Col,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Switch,
} from 'antd';
import { useEffect, useMemo } from 'react';
import type { Album, Artist, Category, Track, TrackInput } from '../../types/catalog';
import { emptyToNull } from '../../utils/format';

interface TrackFormDrawerProps {
  open: boolean;
  track?: Track;
  artists: Artist[];
  albums: Album[];
  categories: Category[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: TrackInput) => Promise<void>;
}

interface TrackFormValues {
  title: string;
  subtitle?: string;
  artistId: string;
  albumId?: string;
  categoryId: string;
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  trackNumber?: number;
  lyrics?: string;
  lyricsLrc?: string;
  isPublished: boolean;
}

export function TrackFormDrawer({
  open,
  track,
  artists,
  albums,
  categories,
  submitting,
  onCancel,
  onSubmit,
}: TrackFormDrawerProps) {
  const [form] = Form.useForm<TrackFormValues>();
  const selectedArtistId = Form.useWatch('artistId', form);
  const availableAlbums = useMemo(
    () => albums.filter((album) => album.artist.id === selectedArtistId),
    [albums, selectedArtistId],
  );

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      title: track?.title ?? '',
      subtitle: track?.subtitle ?? '',
      artistId: track?.artistId,
      albumId: track?.albumId ?? undefined,
      categoryId: track?.categoryId,
      audioUrl: track?.audioUrl ?? '',
      coverUrl: track?.coverUrl ?? '',
      duration: track?.duration ?? 0,
      trackNumber: track?.trackNumber ?? undefined,
      lyrics: track?.lyrics ?? '',
      lyricsLrc: track?.lyricsLrc ?? '',
      isPublished: track?.isPublished ?? false,
    });
  }, [form, open, track]);

  const handleArtistChange = (artistId: string) => {
    const albumId = form.getFieldValue('albumId');
    if (albumId && !albums.some((album) => album.id === albumId && album.artist.id === artistId)) {
      form.setFieldValue('albumId', undefined);
    }
  };

  return (
    <Drawer
      title={track ? '编辑曲目' : '新增曲目'}
      open={open}
      size={760}
      onClose={onCancel}
      destroyOnHidden
      mask={{ closable: !submitting }}
      footer={
        <Flex justify="flex-end" gap={8}>
          <Button onClick={onCancel} disabled={submitting}>
            取消
          </Button>
          <Button type="primary" loading={submitting} onClick={() => form.submit()}>
            保存
          </Button>
        </Flex>
      }
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        onFinish={(values) =>
          void onSubmit({
            title: values.title.trim(),
            subtitle: emptyToNull(values.subtitle),
            artistId: values.artistId,
            albumId: values.albumId ?? null,
            categoryId: values.categoryId,
            audioUrl: values.audioUrl.trim(),
            coverUrl: emptyToNull(values.coverUrl),
            duration: values.duration,
            trackNumber: values.trackNumber ?? null,
            lyrics: emptyToNull(values.lyrics),
            lyricsLrc: emptyToNull(values.lyricsLrc),
            isPublished: values.isPublished,
          })
        }
      >
        <Divider titlePlacement="start">基本信息</Divider>
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              label="曲目名称"
              name="title"
              rules={[
                { required: true, message: '请输入曲目名称' },
                { whitespace: true, message: '曲目名称不能为空' },
                { max: 300, message: '曲目名称不能超过 300 个字符' },
              ]}
            >
              <Input maxLength={300} />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item label="副标题" name="subtitle">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
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
                onChange={handleArtistChange}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="专辑" name="albumId">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={selectedArtistId ? '可选' : '请先选择艺术家'}
                disabled={!selectedArtistId}
                options={availableAlbums.map((album) => ({ value: album.id, label: album.title }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="分类"
              name="categoryId"
              rules={[{ required: true, message: '请选择分类' }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="选择分类"
                options={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider titlePlacement="start">媒体信息</Divider>
        <Form.Item
          label="音频 URL"
          name="audioUrl"
          extra="当前版本仅保存音频 URL，后续将接入音频文件上传。"
          rules={[
            { required: true, message: '请输入音频 URL' },
            { type: 'url', message: '请输入有效的音频 URL' },
          ]}
        >
          <Input placeholder="https://example.com/audio/track.mp3" />
        </Form.Item>
        <Form.Item
          label="封面 URL"
          name="coverUrl"
          rules={[{ type: 'url', message: '请输入有效的封面 URL' }]}
        >
          <Input placeholder="https://example.com/images/track.jpg" />
        </Form.Item>
        <Alert
          className="form-hint"
          type="info"
          showIcon
          title="当前不上传媒体文件，仅保存可访问的 URL。"
        />
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="时长（秒）"
              name="duration"
              rules={[
                { required: true, message: '请输入时长' },
                { type: 'number', min: 0, message: '时长不能小于 0 秒' },
              ]}
            >
              <InputNumber min={0} precision={0} className="full-width" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="曲目序号"
              name="trackNumber"
              rules={[{ type: 'number', min: 1, message: '曲目序号不能小于 1' }]}
            >
              <InputNumber min={1} precision={0} className="full-width" />
            </Form.Item>
          </Col>
        </Row>

        <Divider titlePlacement="start">内容</Divider>
        <Form.Item label="普通歌词" name="lyrics">
          <Input.TextArea rows={5} placeholder="输入普通歌词文本" />
        </Form.Item>
        <Form.Item label="LRC 歌词" name="lyricsLrc">
          <Input.TextArea rows={6} placeholder={'[00:00.00]第一句\n[00:05.00]第二句'} />
        </Form.Item>

        <Divider titlePlacement="start">发布</Divider>
        <Form.Item label="发布状态" name="isPublished" valuePropName="checked">
          <Switch checkedChildren="已发布" unCheckedChildren="未发布" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
