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
      forcePathStyle: true, // Use path-style URLs instead of virtual-hosted-style
    });
  }
  return s3Client;
}

// Format error message based on error code
function formatS3Error(err) {
  if (!err) return 'Unknown error';
  
  const message = err.message || String(err);
  const code = err.Code || err.code || err.name || '';
  
  // Map common S3 errors to user-friendly messages
  const errorMap = {
    'NoCredentialsError': 'AWS credentials are missing or invalid',
    'InvalidBucketName': 'Bucket name is invalid',
    'NoSuchBucket': 'Storage bucket does not exist',
    'AccessDenied': 'Access denied - check AWS credentials and permissions',
    'Forbidden': 'Permission denied - insufficient bucket access',
    'NetworkingError': 'Network error - check internet connection',
    'ECONNREFUSED': 'Cannot connect to storage server - network issue',
    'ENOTFOUND': 'Storage server not found - check endpoint URL',
    'ETIMEDOUT': 'Connection timeout - check network or firewall',
  };
  
  const friendlyMessage = errorMap[code];
  if (friendlyMessage) {
    return friendlyMessage;
  }
  
  // If error code contains "Error", strip it for cleaner display
  if (code && code.includes('Error')) {
    return `${code.replace('Error', '')} - ${message}`;
  }
  
  return message;
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
            console.log(`[uploads] Uploading file: ${req.file.originalname} (${req.file.size} bytes)`);
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
            console.log(`[uploads] ✅ Successfully uploaded: ${fileName}`);
          } catch (uploadErr) {
            const friendlyError = formatS3Error(uploadErr);
            console.error(`[uploads] ❌ Upload failed for ${req.file.originalname}:`, uploadErr.message || uploadErr);
            console.error(`[uploads] Error details - Code: ${uploadErr.Code || uploadErr.code || 'N/A'}, Message: ${uploadErr.message || 'N/A'}`);
            return next(badRequest(`Image upload failed: ${friendlyError}`));
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
            console.log(`[uploads] Uploading ${req.files.length} files...`);
            const uploadedFiles = await Promise.all(
              req.files.map(async (file, index) => {
                const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype]}`;
                console.log(`[uploads] [${index + 1}/${req.files.length}] Uploading ${file.originalname}...`);
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
                console.log(`[uploads] [${index + 1}/${req.files.length}] ✅ ${file.originalname} uploaded`);
                return { ...file, filename: fileName, s3Uploaded: true };
              })
            );
            req.files = uploadedFiles;
            console.log(`[uploads] ✅ All ${req.files.length} files uploaded successfully`);
          } catch (uploadErr) {
            const friendlyError = formatS3Error(uploadErr);
            console.error(`[uploads] ❌ Batch upload failed:`, uploadErr.message || uploadErr);
            console.error(`[uploads] Error details - Code: ${uploadErr.Code || uploadErr.code || 'N/A'}, Message: ${uploadErr.message || 'N/A'}`);
            return next(badRequest(`Photo upload failed: ${friendlyError}`));
          }
        }
        next();
      });
    },
  };

  return wrappedUpload;
}

const fileUrls = (req, config) => {
  const files = req.files || (req.file ? [req.file] : []);
  
  if (config?.aws?.endpoint && config?.aws?.bucket) {
    // For S3 uploads, return full S3 URLs
    return files.map((f) => {
      const fileName = f.filename || f.originalname;
      // Direct URL: https://endpoint/bucket/filename
      // No path reorganization - keep it simple
      return `${config.aws.endpoint}/${config.aws.bucket}/${fileName}`;
    });
  }
  
  // For local uploads, return /uploads/ URLs
  return files.map((f) => URL_PREFIX + f.filename);
};

function removeUpload(config, url) {
  if (typeof url !== 'string') return;
  
  if (config.aws && config.aws.bucket) {
    const s3 = getS3Client(config.aws);
    
    // Extract filename from S3 URL
    let fileName;
    if (url.startsWith(config.aws.endpoint)) {
      // Full S3 URL: https://endpoint/bucket/filename
      const parts = url.substring(config.aws.endpoint.length).split('/');
      fileName = parts.slice(2).join('/'); // Remove endpoint and bucket
    } else if (url.startsWith(URL_PREFIX)) {
      // Local URL: /uploads/filename
      fileName = url.substring(URL_PREFIX.length);
    } else {
      return;
    }
    
    const deleteCmd = new DeleteObjectCommand({
      Bucket: config.aws.bucket,
      Key: fileName,
    });
    
    console.log(`[uploads] Deleting from S3: ${fileName}`);
    s3.send(deleteCmd).then(() => {
      console.log(`[uploads] ✅ Deleted: ${fileName}`);
    }).catch((err) => {
      const friendlyError = formatS3Error(err);
      console.warn(`[uploads] ⚠️ Could not delete ${fileName}: ${friendlyError}`);
      console.warn(`[uploads] Error details - Code: ${err.Code || err.code || 'N/A'}`);
    });
  }
}

module.exports = { createUploader, fileUrls, removeUpload };
