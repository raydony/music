import {
  App as AntdApp,
  Alert,
  Button,
  Card,
  Flex,
  Input,
  InputNumber,
  Progress,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAlbums } from '../../api/albums';
import { listArtists } from '../../api/artists';
import { listCategories } from '../../api/categories';
import type { PaginatedResponse, PaginationQuery } from '../../api/types';
import { createTrack } from '../../api/tracks';
import { uploadMedia } from '../../api/uploads';
import { PageHeader } from '../../components/PageHeader';
import type { Album, Artist, Category } from '../../types/catalog';
import { getErrorMessage } from '../../utils/api-error';
import { inspectMp3File } from '../../utils/audio-metadata';
import { runWithConcurrency } from '../../utils/concurrency';
import { formatDuration } from '../../utils/format';
import {
  findDuplicateValues,
  normalizeDuplicateValue,
  titleFromMp3FileName,
} from '../../utils/track-file-name';
import {
  applyAlbumToRows,
  applyArtistToRows,
  applyPatchToRows,
  BULK_IMPORT_CONCURRENCY,
  BULK_IMPORT_LIMIT,
  executeBulkImport,
  selectMp3Files,
  type BulkImportRow,
  type BulkImportRowPatch,
  validateBulkImportRow,
} from './bulk-import';

type PageLoader<T> = (query: PaginationQuery) => Promise<PaginatedResponse<T>>;

async function loadAllPages<T>(loader: PageLoader<T>): Promise<T[]> {
  const first = await loader({ page: 1, pageSize: 100 });
  if (first.meta.totalPages <= 1) return first.data;
  const rest = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) =>
      loader({ page: index + 2, pageSize: 100 }),
    ),
  );
  return [first, ...rest].flatMap((page) => page.data);
}

function createRowId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function matchMetadataRelations(
  metadataArtist: string | undefined,
  metadataAlbum: string | undefined,
  artists: readonly Artist[],
  albums: readonly Album[],
): Pick<BulkImportRow, 'artistId' | 'albumId'> {
  const artistName = metadataArtist ? normalizeDuplicateValue(metadataArtist) : undefined;
  const matchedArtist = artistName
    ? artists.find((artist) => normalizeDuplicateValue(artist.name) === artistName)
    : undefined;
  const albumTitle = metadataAlbum ? normalizeDuplicateValue(metadataAlbum) : undefined;
  const matchingAlbums = albumTitle
    ? albums.filter(
        (album) =>
          normalizeDuplicateValue(album.title) === albumTitle &&
          (!matchedArtist || album.artist.id === matchedArtist.id),
      )
    : [];
  const matchedAlbum = matchingAlbums.length === 1 ? matchingAlbums[0] : undefined;

  return {
    artistId: matchedArtist?.id ?? matchedAlbum?.artist.id,
    albumId: matchedAlbum?.id,
  };
}

const statusPresentation: Record<BulkImportRow['status'], { label: string; color?: string }> = {
  reading: { label: '读取信息', color: 'processing' },
  pending: { label: '等待上传' },
  uploading: { label: '上传中', color: 'processing' },
  creating: { label: '创建曲目中', color: 'processing' },
  success: { label: '成功', color: 'success' },
  failed: { label: '失败', color: 'error' },
};

function isEditable(row: BulkImportRow, importing: boolean): boolean {
  return !importing && (row.status === 'pending' || row.status === 'failed');
}

export function BulkImportPage() {
  const navigate = useNavigate();
  const { message, modal } = AntdApp.useApp();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string>();
  const [rows, setRows] = useState<BulkImportRow[]>([]);
  const rowsRef = useRef<BulkImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [bulkArtistId, setBulkArtistId] = useState<string>();
  const [bulkAlbumId, setBulkAlbumId] = useState<string>();
  const [bulkCategoryId, setBulkCategoryId] = useState<string>();
  const [bulkPublished, setBulkPublished] = useState<boolean>(false);

  const commitRows = useCallback((updater: (current: BulkImportRow[]) => BulkImportRow[]) => {
    const next = updater(rowsRef.current);
    rowsRef.current = next;
    setRows(next);
  }, []);

  const updateRow = useCallback(
    (id: string, patch: BulkImportRowPatch) => {
      commitRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    },
    [commitRows],
  );

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadAllPages(listArtists),
      loadAllPages(listAlbums),
      loadAllPages(listCategories),
    ])
      .then(([artistItems, albumItems, categoryItems]) => {
        if (!active) return;
        setArtists(artistItems);
        setAlbums(albumItems);
        setCategories(categoryItems);
      })
      .catch((error: unknown) => {
        if (active) setCatalogError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const addFiles = useCallback(
    async (selectedFiles: readonly File[]) => {
      const { accepted, invalidTypeCount, invalidSizeCount, overflowCount } = selectMp3Files(
        selectedFiles,
        rowsRef.current.length,
      );

      if (invalidTypeCount > 0) {
        void message.warning(`已忽略 ${invalidTypeCount} 个非 MP3 文件`);
      }
      if (invalidSizeCount > 0) {
        void message.warning(`已忽略 ${invalidSizeCount} 个空文件或超过 100 MB 的文件`);
      }
      if (overflowCount > 0) {
        void message.warning(`单批最多 ${BULK_IMPORT_LIMIT} 首，超出文件未加入`);
      }
      if (accepted.length === 0) return;

      const newRows: BulkImportRow[] = accepted.map((file) => ({
        id: createRowId(),
        file,
        fileName: file.name,
        title: titleFromMp3FileName(file.name),
        duration: 0,
        isPublished: false,
        status: 'reading',
      }));
      commitRows((current) => [...current, ...newRows]);

      await runWithConcurrency(newRows, BULK_IMPORT_CONCURRENCY, async (row) => {
        const metadata = await inspectMp3File(row.file);
        const relations = matchMetadataRelations(metadata.artist, metadata.album, artists, albums);
        updateRow(row.id, {
          title: metadata.title,
          metadataArtist: metadata.artist,
          metadataAlbum: metadata.album,
          duration: metadata.duration,
          durationUnavailable: metadata.durationUnavailable,
          tagsUnavailable: metadata.tagsUnavailable,
          ...relations,
          status: 'pending',
        });
      });

      const unavailableDurations = newRows.filter(
        (row) => rowsRef.current.find((current) => current.id === row.id)?.durationUnavailable,
      ).length;
      if (unavailableDurations > 0) {
        void message.warning(`${unavailableDurations} 首未能读取时长，请在导入前手动确认`);
      }
    },
    [albums, artists, commitRows, message, updateRow],
  );

  const duplicateFileNames = useMemo(
    () => findDuplicateValues(rows, (row) => row.fileName),
    [rows],
  );
  const duplicateTitles = useMemo(() => findDuplicateValues(rows, (row) => row.title), [rows]);
  const pendingCount = rows.filter((row) => row.status === 'pending').length;
  const successCount = rows.filter((row) => row.status === 'success').length;
  const failedCount = rows.filter((row) => row.status === 'failed').length;
  const completedCount = successCount + failedCount;
  const readingCount = rows.filter((row) => row.status === 'reading').length;
  const progressPercent = rows.length === 0 ? 0 : Math.round((completedCount / rows.length) * 100);

  const performImport = useCallback(
    async (candidates: BulkImportRow[]) => {
      setImporting(true);
      try {
        await executeBulkImport(candidates, {
          upload: (file) => uploadMedia(file, 'audio'),
          create: createTrack,
          errorMessage: getErrorMessage,
          onUpdate: updateRow,
        });
        const current = rowsRef.current;
        const successful = current.filter((row) => row.status === 'success').length;
        const failed = current.filter((row) => row.status === 'failed').length;
        if (failed === 0) {
          void message.success(`批量导入完成：成功 ${successful} 首`);
        } else {
          void message.warning(`批量导入完成：成功 ${successful} 首，失败 ${failed} 首`);
        }
      } finally {
        setImporting(false);
      }
    },
    [message, updateRow],
  );

  const requestImport = useCallback(
    (retryFailed: boolean) => {
      const candidates = rowsRef.current.filter((row) =>
        retryFailed ? row.status === 'failed' : row.status === 'pending',
      );
      if (candidates.length === 0) {
        void message.info(retryFailed ? '没有需要重试的项目' : '没有等待导入的项目');
        return;
      }

      const invalidRows = candidates
        .map((row) => ({ row, errors: validateBulkImportRow(row) }))
        .filter(({ errors }) => errors.length > 0);
      if (invalidRows.length > 0) {
        void message.error(`请先修正 ${invalidRows.length} 行缺失或无效的信息`);
        return;
      }

      const hasDuplicates = duplicateFileNames.size > 0 || duplicateTitles.size > 0;
      if (hasDuplicates && !retryFailed) {
        modal.confirm({
          title: '批次中存在重复项',
          content: `检测到 ${duplicateFileNames.size} 组重复文件名、${duplicateTitles.size} 组重复曲名。系统不会覆盖已有对象，是否仍要继续？`,
          okText: '继续导入',
          cancelText: '返回检查',
          onOk: () => {
            void performImport(candidates);
          },
        });
        return;
      }
      void performImport(candidates);
    },
    [duplicateFileNames.size, duplicateTitles.size, message, modal, performImport],
  );

  const columns: TableColumnsType<BulkImportRow> = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      width: 230,
      render: (fileName: string, row) => {
        const duplicate = duplicateFileNames.has(normalizeDuplicateValue(fileName));
        return (
          <Flex vertical gap={3}>
            <Typography.Text ellipsis={{ tooltip: fileName }}>{fileName}</Typography.Text>
            {duplicate ? <Tag color="warning">文件名重复</Tag> : null}
            {row.metadataArtist || row.metadataAlbum ? (
              <Typography.Text type="secondary" className="bulk-metadata-note">
                ID3：{[row.metadataArtist, row.metadataAlbum].filter(Boolean).join(' · ')}
              </Typography.Text>
            ) : null}
            {row.tagsUnavailable ? (
              <Typography.Text type="secondary" className="bulk-metadata-note">
                未读取到 ID3，已使用文件名
              </Typography.Text>
            ) : null}
          </Flex>
        );
      },
    },
    {
      title: '曲名',
      dataIndex: 'title',
      width: 220,
      render: (title: string, row) => (
        <Flex vertical gap={3}>
          <Input
            value={title}
            maxLength={300}
            status={duplicateTitles.has(normalizeDuplicateValue(title)) ? 'warning' : undefined}
            disabled={!isEditable(row, importing)}
            onChange={(event) => updateRow(row.id, { title: event.target.value })}
          />
          {duplicateTitles.has(normalizeDuplicateValue(title)) ? (
            <Typography.Text type="warning" className="bulk-field-note">
              曲名重复
            </Typography.Text>
          ) : null}
        </Flex>
      ),
    },
    {
      title: '艺术家',
      dataIndex: 'artistId',
      width: 190,
      render: (artistId: string | undefined, row) => (
        <Select
          className="full-width"
          showSearch
          optionFilterProp="label"
          placeholder="请选择"
          value={artistId}
          disabled={!isEditable(row, importing)}
          options={artists.map((artist) => ({ value: artist.id, label: artist.name }))}
          onChange={(value) => {
            const albumMatches =
              row.albumId &&
              albums.some((album) => album.id === row.albumId && album.artist.id === value);
            updateRow(row.id, {
              artistId: value,
              albumId: albumMatches ? row.albumId : undefined,
            });
          }}
        />
      ),
    },
    {
      title: '专辑',
      dataIndex: 'albumId',
      width: 210,
      render: (albumId: string | undefined, row) => (
        <Select
          className="full-width"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={row.artistId ? '可选' : '先选艺术家'}
          value={albumId}
          disabled={!isEditable(row, importing) || !row.artistId}
          options={albums
            .filter((album) => album.artist.id === row.artistId)
            .map((album) => ({ value: album.id, label: album.title }))}
          onChange={(value) => updateRow(row.id, { albumId: value })}
        />
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      width: 160,
      render: (categoryId: string | undefined, row) => (
        <Select
          className="full-width"
          showSearch
          optionFilterProp="label"
          placeholder="请选择"
          value={categoryId}
          disabled={!isEditable(row, importing)}
          options={categories.map((category) => ({ value: category.id, label: category.name }))}
          onChange={(value) => updateRow(row.id, { categoryId: value })}
        />
      ),
    },
    {
      title: '时长',
      dataIndex: 'duration',
      width: 140,
      render: (duration: number, row) => (
        <Flex vertical gap={3}>
          <InputNumber
            className="full-width"
            min={0}
            precision={0}
            value={duration}
            disabled={!isEditable(row, importing)}
            onChange={(value) => updateRow(row.id, { duration: value ?? 0 })}
          />
          <Typography.Text
            type={row.durationUnavailable ? 'warning' : 'secondary'}
            className="bulk-field-note"
          >
            {row.durationUnavailable ? '请手动填写' : formatDuration(duration)}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: '发布',
      dataIndex: 'isPublished',
      width: 90,
      align: 'center',
      render: (isPublished: boolean, row) => (
        <Switch
          checked={isPublished}
          disabled={!isEditable(row, importing)}
          onChange={(checked) => updateRow(row.id, { isPublished: checked })}
        />
      ),
    },
    {
      title: '上传状态',
      dataIndex: 'status',
      width: 190,
      render: (status: BulkImportRow['status'], row) => {
        const presentation = statusPresentation[status];
        const validationErrors = status === 'pending' ? validateBulkImportRow(row) : [];
        return (
          <Flex vertical align="flex-start" gap={4}>
            <Tag color={presentation.color}>{presentation.label}</Tag>
            {row.error ? (
              <Typography.Text type="danger" className="bulk-error-text">
                {row.error}
              </Typography.Text>
            ) : null}
            {validationErrors.length > 0 ? (
              <Typography.Text type="warning" className="bulk-error-text">
                {validationErrors.join('、')}
              </Typography.Text>
            ) : null}
          </Flex>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 80,
      render: (_, row) => (
        <Button
          type="link"
          danger
          size="small"
          disabled={importing}
          onClick={() => commitRows((current) => current.filter((item) => item.id !== row.id))}
        >
          删除
        </Button>
      ),
    },
  ];

  if (catalogLoading) {
    return (
      <div className="bulk-loading">
        <Spin tip="正在加载艺术家、专辑和分类" />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="批量导入音乐"
        description="单批最多 50 首 MP3；上传与创建曲目最多同时处理 3 首"
        extra={
          <Button disabled={importing} onClick={() => navigate('/tracks')}>
            返回曲目管理
          </Button>
        }
      />

      {catalogError ? (
        <Alert type="error" showIcon message="基础数据加载失败" description={catalogError} />
      ) : null}

      <Upload.Dragger
        className="bulk-upload-dragger"
        accept=".mp3,audio/mpeg,audio/mp3,audio/x-mpeg"
        multiple
        showUploadList={false}
        disabled={importing || Boolean(catalogError) || rows.length >= BULK_IMPORT_LIMIT}
        beforeUpload={(file, fileList) => {
          if (file.uid === fileList[0]?.uid) void addFiles(fileList);
          return Upload.LIST_IGNORE;
        }}
      >
        <Typography.Title level={4}>选择或拖拽多个 MP3 文件</Typography.Title>
        <Typography.Text type="secondary">
          自动读取时长和 ID3 信息；服务器仍会执行扩展名、MIME 和文件头安全校验
        </Typography.Text>
      </Upload.Dragger>

      {rows.length > 0 ? (
        <>
          <Card size="small" title="批量设置" className="bulk-settings-card">
            <Flex gap={12} wrap>
              <Space.Compact>
                <Select
                  className="bulk-setting-select"
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择艺术家"
                  value={bulkArtistId}
                  disabled={importing}
                  options={artists.map((artist) => ({ value: artist.id, label: artist.name }))}
                  onChange={setBulkArtistId}
                />
                <Button
                  disabled={importing || !bulkArtistId}
                  onClick={() =>
                    commitRows((current) => applyArtistToRows(current, bulkArtistId!, albums))
                  }
                >
                  全部设置艺术家
                </Button>
              </Space.Compact>

              <Space.Compact>
                <Select
                  className="bulk-setting-select"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择专辑"
                  value={bulkAlbumId}
                  disabled={importing}
                  options={albums.map((album) => ({
                    value: album.id,
                    label: `${album.title} · ${album.artist.name}`,
                  }))}
                  onChange={setBulkAlbumId}
                />
                <Button
                  disabled={importing || !bulkAlbumId}
                  onClick={() =>
                    commitRows((current) => applyAlbumToRows(current, bulkAlbumId, albums))
                  }
                >
                  全部设置专辑
                </Button>
              </Space.Compact>

              <Space.Compact>
                <Select
                  className="bulk-setting-select"
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择分类"
                  value={bulkCategoryId}
                  disabled={importing}
                  options={categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                  onChange={setBulkCategoryId}
                />
                <Button
                  disabled={importing || !bulkCategoryId}
                  onClick={() =>
                    commitRows((current) =>
                      applyPatchToRows(current, { categoryId: bulkCategoryId }),
                    )
                  }
                >
                  全部设置分类
                </Button>
              </Space.Compact>

              <Space.Compact>
                <Select
                  className="bulk-publish-select"
                  value={bulkPublished}
                  disabled={importing}
                  options={[
                    { value: false, label: '未发布' },
                    { value: true, label: '已发布' },
                  ]}
                  onChange={setBulkPublished}
                />
                <Button
                  disabled={importing}
                  onClick={() =>
                    commitRows((current) =>
                      applyPatchToRows(current, { isPublished: bulkPublished }),
                    )
                  }
                >
                  全部设置状态
                </Button>
              </Space.Compact>
            </Flex>
          </Card>

          {(duplicateFileNames.size > 0 || duplicateTitles.size > 0) && (
            <Alert
              type="warning"
              showIcon
              message="批次中存在重复项"
              description={`重复文件名 ${duplicateFileNames.size} 组，重复曲名 ${duplicateTitles.size} 组。请检查；继续导入前系统会再次确认。`}
            />
          )}

          <div className="table-card bulk-table-card">
            <Table
              rowKey="id"
              columns={columns}
              dataSource={rows}
              pagination={false}
              scroll={{ x: 1510 }}
              locale={{ emptyText: '请选择 MP3 文件' }}
            />
          </div>

          <Card size="small" className="bulk-summary-card">
            <Flex justify="space-between" align="center" gap={20} wrap>
              <Flex gap={28} wrap>
                <Statistic title="总计" value={rows.length} suffix="首" />
                <Statistic title="成功" value={successCount} suffix="首" />
                <Statistic title="失败" value={failedCount} suffix="首" />
              </Flex>
              <div className="bulk-progress">
                <Typography.Text>
                  {completedCount} / {rows.length} 已完成
                </Typography.Text>
                <Progress
                  percent={progressPercent}
                  status={failedCount > 0 ? 'exception' : 'normal'}
                />
              </div>
              <Space wrap>
                <Button disabled={importing} onClick={() => commitRows(() => [])}>
                  清空列表
                </Button>
                <Button
                  disabled={importing || failedCount === 0 || readingCount > 0}
                  onClick={() => requestImport(true)}
                >
                  仅重试失败项
                </Button>
                <Button
                  type="primary"
                  loading={importing}
                  disabled={pendingCount === 0 || readingCount > 0 || Boolean(catalogError)}
                  onClick={() => requestImport(false)}
                >
                  开始导入
                </Button>
              </Space>
            </Flex>
          </Card>
        </>
      ) : null}
    </div>
  );
}
