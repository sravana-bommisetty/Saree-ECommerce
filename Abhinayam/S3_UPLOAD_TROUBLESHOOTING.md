# S3 Upload Troubleshooting Guide

## Error: "Failed to upload images to storage"

This guide helps diagnose S3 upload issues with Neon Object Storage.

### 1. **Check Environment Variables**

Verify all S3 credentials are set in `.env`:

```bash
AWS_ENDPOINT_URL_S3=https://br-sweet-recipe-bel6wz8n.storage.c-9.us-east-2.aws.neon.tech
AWS_ACCESS_KEY_ID=nak_live_bbe27b8ba02e4805843ada0d8599f445
AWS_SECRET_ACCESS_KEY=nsk_live_aaec7cc6777ce5e2bec9aae2c09039a5bd2af4cbc79250b9e1ea27861db55185
AWS_REGION=us-east-2
AWS_BUCKET_NAME=abhinayam
```

**Required:** All 5 variables must be set for S3 to work.

### 2. **Check Server Logs**

When upload fails, check the server console for detailed error messages:

```
[uploads] S3 upload error: <actual error message>
```

Common errors:

- **NoCredentialsError**: AWS credentials not found or invalid
- **InvalidBucketName**: Bucket name misspelled
- **AccessDenied**: Credentials don't have permission
- **NetworkError**: Cannot reach S3 endpoint (firewall/connectivity issue)

### 3. **Verify S3 Credentials**

Go to Neon Console:
1. Select project → Branches → Storage
2. Verify Access Key ID and Secret are correct
3. Regenerate if needed

### 4. **Test Connection**

From your terminal, verify S3 connection:

```bash
# (Requires AWS CLI installed)
aws s3 ls s3://abhinayam \
  --endpoint-url https://br-sweet-recipe-bel6wz8n.storage.c-9.us-east-2.aws.neon.tech \
  --region us-east-2
```

### 5. **Check File Size Limit**

Maximum file size per image: **5MB**

### 6. **Verify Allowed Formats**

Allowed: JPG, PNG, WEBP only

### 7. **Network/Firewall**

If on corporate network:
- S3 endpoint requires HTTPS port 443
- Some firewalls block cloud storage
- Try mobile hotspot to test

### 8. **Enable Debug Logging**

Add this to `src/server.js` after config loading:

```javascript
if (config.aws) {
  console.log('✅ S3 Config loaded:');
  console.log('  Bucket:', config.aws.bucket);
  console.log('  Region:', config.aws.region);
  console.log('  Endpoint:', config.aws.endpoint);
  console.log('  Access Key:', config.aws.accessKeyId.substring(0, 10) + '...');
}
```

### 9. **Common Solutions**

| Error | Solution |
|-------|----------|
| Network timeout | Check firewall, try different network |
| Invalid credentials | Regenerate in Neon console |
| Bucket not found | Verify bucket name matches exactly |
| Permission denied | Check Neon access level settings |
| File too large | Maximum 5MB per file |

### 10. **Docker Container**

When running in Docker:
- Ensure `.env` file is passed to container
- Verify no secrets are hardcoded
- Check container has network access to S3

### Still Having Issues?

Check:
1. Server console output for specific error message
2. Neon Storage console - can you see uploaded files?
3. `.env` file - all values correct?
4. Network connectivity - can you access Neon console?
