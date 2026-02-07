const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

// Upload one file to the Simple POS WP upload endpoint.
//
// Env:
//   WP_UPDATES_BASE_URL   e.g. https://daves-wordpress.tuktak.dev
//   WP_UPDATES_USER       e.g. dave
//   WP_UPDATES_APP_PASSWORD (may contain spaces)
//
// Usage:
//   node scripts/wp-updates-upload.js <filePath> [remoteName]

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function upload({ baseUrl, user, appPassword, filePath, remoteName }) {
  const fileBuf = fs.readFileSync(filePath);
  const fileName = remoteName || path.basename(filePath);

  const pw = appPassword.replace(/\s+/g, '');
  const auth = Buffer.from(`${user}:${pw}`).toString('base64');

  const boundary = `----simplepos-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const pre1 = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="name"\r\n\r\n` +
      `${fileName}\r\n`
  );

  const pre2 = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`
  );

  const post = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([pre1, pre2, fileBuf, post]);

  const url = new URL(baseUrl);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || 443,
        path: '/wp-json/simple-pos/v1/updates/upload',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(data);
              resolve(json);
            } catch (e) {
              resolve({ ok: true, raw: data });
            }
          } else {
            reject(new Error(`Upload failed (${res.statusCode}): ${data}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const filePath = process.argv[2];
  const remoteName = process.argv[3];
  if (!filePath) {
    console.error('Usage: node scripts/wp-updates-upload.js <filePath> [remoteName]');
    process.exit(2);
  }

  const baseUrl = required('WP_UPDATES_BASE_URL');
  const user = required('WP_UPDATES_USER');
  const appPassword = required('WP_UPDATES_APP_PASSWORD');

  const result = await upload({ baseUrl, user, appPassword, filePath, remoteName });
  console.log(JSON.stringify({ file: path.basename(filePath), remoteName: remoteName || null, ...result }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
