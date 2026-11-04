# S3 Upload Integration - Error Handling Improvements

## What Was Fixed

The S3 upload integration had async/await timing issues causing "Failed to upload images to storage" errors. The following improvements were made:

### 1. **Better Error Handling**
- Added detailed error messages that include the actual S3 error (e.g., "Connection refused", "AccessDenied")
- Errors now propagate from S3 SDK to the admin UI for better debugging
- Console logs now show error details for server-side troubleshooting

### 2. **Improved Logging**
- S3 upload operations now log success/failure to server console
- File deletion operations log both success and warnings
- Added prefixes `[uploads]` to all log messages for easy filtering

### 3. **Config Parameter Fixes**
- Fixed `getS3Client()` to receive `config.aws` directly (not full config)
- `removeUpload()` now correctly passes `config.aws` to `getS3Client()`
- Proper null checks for aws config before attempting S3 operations

### 4. **Better Error Information**
Old error message:
```
Failed to upload images to storage
```

New error message:
```
Failed to upload images to storage: The requested bucket does not exist
```

This helps identify the root cause immediately.

## Files Modified

- `src/uploads.js` - All S3 upload and delete methods now have improved error handling
- `S3_UPLOAD_TROUBLESHOOTING.md` - New diagnostic guide for S3 issues

## How to Debug S3 Upload Failures

### Step 1: Check Server Console
When an upload fails, look for messages like:
```
[uploads] S3 upload error: NoCredentialsError: Missing credentials in config
[uploads] S3 upload error: AccessDenied: User is not authorized to perform: s3:PutObject
[uploads] S3 upload error: Network timeout after 30000ms
```

### Step 2: Verify Environment Variables
Ensure your `.env` has all 5 S3 variables:
```
AWS_BUCKET_NAME=abhinayam
AWS_REGION=us-east-2
AWS_ENDPOINT_URL_S3=https://br-sweet-recipe-bel6wz8n.storage.c-9.us-east-2.aws.neon.tech
AWS_ACCESS_KEY_ID=nak_live_...
AWS_SECRET_ACCESS_KEY=nsk_live_...
```

### Step 3: Check Neon Console
1. Go to Neon project → Storage
2. Verify credentials are valid and not expired
3. Check that bucket `abhinayam` exists
4. Verify access permissions allow PutObject

### Step 4: Test Network Connectivity
If you see network errors:
- Try uploading from a different network (e.g., mobile hotspot)
- Check if corporate firewall blocks S3 endpoint
- Verify HTTPS port 443 is open

## Current Implementation Details

### Upload Flow
1. File received by multer in memory (no disk storage)
2. AWS SDK uploads to S3 endpoint
3. S3 returns success/error
4. Filename stored in database with `/uploads/` prefix
5. URL constructed: `/uploads/{filename}`

### Configuration
- Endpoint: `https://br-sweet-recipe-bel6wz8n.storage.c-9.us-east-2.aws.neon.tech`
- Region: `us-east-2`
- Bucket: `abhinayam`
- Max file size: 5MB per image
- Max files per upload: 8 images

### Error Recovery
- Single file upload failure: User sees error message and can retry
- Batch upload failure: Entire batch fails; user can retry
- Partial failures: Logged with specific filename

## Next Steps for Testing

When Docker container runs:
1. Try uploading a single small image (< 1MB)
2. Check server logs for success: `[uploads] Deleted {filename} from S3` or error details
3. Verify in Neon console that file appears in bucket
4. Try editing a saree to delete an image, verify S3 cleanup works
5. Try batch upload with 3-4 images

## Fallback to Local Storage

If S3 continues to fail, set in `.env`:
```
AWS_BUCKET_NAME=
```

This disables S3 and files will be stored locally in the `uploads/` folder instead. The code gracefully handles this scenario.
