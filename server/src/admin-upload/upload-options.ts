import { mkdtemp, rm } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { MAX_UPLOAD_SIZE, UPLOAD_TEMP_PREFIX } from './admin-upload.constants.js';

const temporaryDiskStorage = diskStorage({
  destination: (_request, _file, callback) => {
    mkdtemp(join(tmpdir(), UPLOAD_TEMP_PREFIX), callback);
  },
  filename: (_request, _file, callback) => {
    callback(null, 'upload');
  },
});

const cleanupDiskStorage = {
  _handleFile: temporaryDiskStorage._handleFile.bind(temporaryDiskStorage),
  _removeFile: (
    request: Request,
    file: Express.Multer.File,
    callback: (error: Error | null) => void,
  ) => {
    const directory = dirname(file.path);
    temporaryDiskStorage._removeFile(request, file, (storageError) => {
      rm(directory, { recursive: true, force: true }, (cleanupError) => {
        callback(storageError ?? cleanupError);
      });
    });
  },
};

export const adminUploadMulterOptions = {
  storage: cleanupDiskStorage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
    files: 1,
    fields: 5,
    parts: 6,
  },
};
