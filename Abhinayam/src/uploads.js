'use strict';
const crypto = require('node:crypto');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const multer = require('multer');
const { badRequest } = require('./lib/validate');

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const URL_PREFIX = '/uploads/';

// S3 client initialization
let s3Client = null;
function getS3Client(awsConfig) {
  if (!s3Client && awsConfig) {
    s3Client = new S3Client({
      region: awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      },
      endpoint: awsConfig.endpoint,
    });
  }
  return s3Client;
}

function createUploader(config) {
  const useS3 = config.aws && config.aws.bucket;
  const s3 = useS3 ? getS3Client(config.aws) : null;

  // Memory storage for uploads
  const storage = multer.memoryStorage();

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 8 },
    fileFilter: (_req, file, cb) =>
      ALLOWED[file.mimetype] ? cb(null, true) : cb(badRequest('Only JPG, PNG or WEBP images are allowed')),
  });

  // Wrap upload handlers to push to S3
  const wrappedUpload = {
    single: (fieldName) => (req, res, next) => {
      upload.single(fieldName)(req, res, async (err) => {
        if (err) return next(err);
        if (req.file && s3) {
          try {
            const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[req.file.mimetype]}`;
            const uploader = new Upload({
              client: s3,
              params: {
                Bucket: config.aws.bucket,
                Key: fileName,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
              },
            });
            await uploader.done();
            req.file.filename = fileName;
            req.file.s3Uploaded = true;
          } catch (uploadErr) {
            console.error('[uploads] S3 upload error:', uploadErr.message || uploadErr);
            return next(badRequest('Failed to upload image to storage: ' + (uploadErr.message || String(uploadErr))));
          }
        }
        next();
      });
    },
    array: (fieldName, maxFiles) => (req, res, next) => {
      upload.array(fieldName, maxFiles)(req, res, async (err) => {
        if (err) return next(err);
        if (req.files && req.files.length > 0 && s3) {
          try {
            const uploadedFiles = await Promise.all(
              req.files.map(async (file) => {
                const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype]}`;
                const uploader = new Upload({
                  client: s3,
                  params: {
                    Bucket: config.aws.bucket,
                    Key: fileName,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                  },
                });
                await uploader.done();
                return { ...file, filename: fileName, s3Uploaded: true };
              })
            );
            req.files = uploadedFiles;
          } catch (uploadErr) {
            console.error('[uploads] S3 batch upload error:', uploadErr.message || uploadErr);
            return next(badRequest('Failed to upload images to storage: ' + (uploadErr.message || String(uploadErr))));
          }
        }
        next();
      });
    },
  };

  return wrappedUpload;
}

const fileUrls = (req) => (req.files || (req.file ? [req.file] : [])).map((f) => URL_PREFIX + f.filename);

function removeUpload(config, url) {
  if (typeof url !== 'string' || !url.startsWith(URL_PREFIX)) return;
  
  if (config.aws && config.aws.bucket) {
    const s3 = getS3Client(config.aws);
    const fileName = url.substring(URL_PREFIX.length);
    
    const deleteCmd = new DeleteObjectCommand({
      Bucket: config.aws.bucket,
      Key: fileName,
    });
    
    s3.send(deleteCmd).then(() => {
      console.log(`[uploads] Deleted ${fileName} from S3`);
    }).catch((err) => {
      console.warn(`[uploads] Could not delete ${fileName} from S3: ${err.message}`);
    });
  }
}

module.exports = { createUploader, fileUrls, removeUpload };
