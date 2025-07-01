const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.getSignedUrl = (key) => {
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Expires: 60 * 10
  });
};

exports.getKeyFromS3Url = (url) => {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.replace(/^\/+/, ''));
  } catch (e) {
    // fallback se não for URL válida
    return url;
  }
};