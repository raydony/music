import {
  Button,
  Col,
  Divider,
  Drawer,
  Flex,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Switch,
  Typography,
  Upload,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { uploadMedia, type MediaUploadResult, type UploadType } from '../../api/uploads';
import type { Album, Artist, Category, Track, TrackInput } from '../../types/catalog';
import { getErrorMessage } from '../../utils/api-error';
import { uploadAudioWithDuration } from '../../utils/audio-duration';
import { emptyToNull, formatDuration } from '../../utils/format';

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

const uploadSizeLimits: Record<UploadType, number> = {
  audio: 100 * 1024 * 1024,
  cover: 10 * 1024 * 1024,
  lyrics: 1024 * 1024,
};

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
  const [messageApi, messageContext] = message.useMessage();
  const [uploadingType, setUploadingType] = useState<UploadType>();
  const [uploadedFiles, setUploadedFiles] = useState<
    Partial<Record<UploadType, MediaUploadResult>>
  >({});
  const selectedArtistId = Form.useWatch('artistId', form);
  const coverUrl = Form.useWatch('coverUrl', form);
  const uploading = uploadingType !== undefined;
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

  const handleUpload = async (file: File, type: UploadType) => {
    if (file.size > uploadSizeLimits[type]) {
      void messageApi.error(`文件超过 ${uploadSizeLimits[type] / 1024 / 1024} MB 限制`);
      return;
    }
    setUploadingType(type);
    try {
      const result =
        type === 'audio'
          ? await uploadAudioWithDuration(file, {
              upload: (selectedFile) => uploadMedia(selectedFile, 'audio'),
              onUploaded: (uploaded, duration) => {
                form.setFieldValue('audioUrl', uploaded.url);
                if (duration !== undefined) form.setFieldValue('duration', duration);
              },
              onDurationUnavailable: () => {
                void messageApi.warning('未能自动读取音频时长，请手动填写');
              },
            })
          : await uploadMedia(file, type);
      if (!result) return;
      if (type === 'audio') {
        await form.validateFields(['audioUrl']);
      } else if (type === 'cover') {
        form.setFieldValue('coverUrl', result.url);
        await form.validateFields(['coverUrl']);
      } else if (result.content !== undefined) {
        form.setFieldValue('lyricsLrc', result.content);
      }
      setUploadedFiles((current) => ({ ...current, [type]: result }));
      void messageApi.success(`${result.originalName} 上传成功`);
    } catch (error) {
      void messageApi.error(getErrorMessage(error));
    } finally {
      setUploadingType(undefined);
    }
  };

  const uploadButton = (type: UploadType, label: string, accept: string) => (
    <Upload
      accept={accept}
      maxCount={1}
      showUploadList={false}
      disabled={submitting || uploading}
      beforeUpload={(file) => {
        void handleUpload(file, type);
        return Upload.LIST_IGNORE;
      }}
    >
      <Button
        loading={uploadingType === type}
        disabled={submitting || (uploading && uploadingType !== type)}
      >
        {label}
      </Button>
    </Upload>
  );

  const uploadedFileNote = (type: UploadType) => {
    const result = uploadedFiles[type];
    if (!result) return null;
    return (
      <Typography.Text type="secondary" className="upload-result">
        已上传：{result.originalName}
        {type === 'lyrics' ? '（LRC 文本已填入，原文件已备份至 COS）' : ''}
      </Typography.Text>
    );
  };

  const busy = submitting || uploading;
  const duration = Form.useWatch('duration', form);

  return (
    <>
      {messageContext}
      <Drawer
        title={track ? '编辑曲目' : '新增曲目'}
        open={open}
        size={760}
        onClose={() => {
          if (!busy) onCancel();
        }}
        closable={!busy}
        keyboard={!busy}
        destroyOnHidden
        mask={{ closable: !busy }}
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={onCancel} disabled={busy}>
              取消
            </Button>
            <Button
              type="primary"
              loading={submitting}
              disabled={uploading}
              onClick={() => form.submit()}
            >
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
                  options={availableAlbums.map((album) => ({
                    value: album.id,
                    label: album.title,
                  }))}
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
          <Form.Item label="音频地址" required>
            <Flex gap={10} align="flex-start">
              <Form.Item
                name="audioUrl"
                noStyle
                rules={[
                  { required: true, message: '请输入音频 URL' },
                  { type: 'url', message: '请输入有效的音频 URL' },
                ]}
              >
                <Input
                  className="media-url-input"
                  placeholder="https://example.com/audio/track.mp3"
                />
              </Form.Item>
              {uploadButton('audio', '上传音频', '.mp3,.m4a,.wav,.flac')}
            </Flex>
            {uploadedFileNote('audio')}
          </Form.Item>
          <Form.Item label="封面地址">
            <Flex gap={10} align="flex-start">
              <Form.Item
                name="coverUrl"
                noStyle
                rules={[{ type: 'url', message: '请输入有效的封面 URL' }]}
              >
                <Input
                  className="media-url-input"
                  placeholder="https://example.com/images/track.jpg"
                />
              </Form.Item>
              {uploadButton('cover', '上传封面', '.jpg,.jpeg,.png,.webp')}
            </Flex>
            {uploadedFileNote('cover')}
            {coverUrl ? (
              <Image
                className="track-cover-preview"
                src={coverUrl}
                width={112}
                height={112}
                alt="曲目封面预览"
                fallback="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
              />
            ) : null}
          </Form.Item>
          <Typography.Paragraph type="secondary" className="form-hint">
            可上传到腾讯云 COS 并自动填入 HTTPS 地址，也可以继续手动输入已有媒体
            URL。上传文件不会自动保存曲目。
          </Typography.Paragraph>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="时长（秒）"
                name="duration"
                extra={
                  typeof duration === 'number' && Number.isFinite(duration)
                    ? `${duration} 秒（${formatDuration(duration)}）`
                    : undefined
                }
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
          <Form.Item
            label={
              <Flex align="center" gap={10}>
                <span>LRC 歌词</span>
                {uploadButton('lyrics', '上传 .lrc', '.lrc,.txt')}
              </Flex>
            }
            name="lyricsLrc"
            extra={uploadedFileNote('lyrics')}
          >
            <Input.TextArea rows={8} placeholder={'[00:00.00]第一句\n[00:05.00]第二句'} />
          </Form.Item>

          <Divider titlePlacement="start">发布</Divider>
          <Form.Item label="发布状态" name="isPublished" valuePropName="checked">
            <Switch checkedChildren="已发布" unCheckedChildren="未发布" />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
