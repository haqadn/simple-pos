#!/usr/bin/env node

const { detect: detectPort } = require('detect-port');
const { spawn } = require('child_process');

const DEFAULT_PORT = 3005;

async function start() {
  const port = await detectPort(DEFAULT_PORT);

  if (port !== DEFAULT_PORT) {
    console.log(`Port ${DEFAULT_PORT} is busy, using port ${port} instead`);
  }

  const env = {
    ...process.env,
    PORT: port.toString(),
    ELECTRON_DEV_URL: `http://localhost:${port}`,
  };

  const child = spawn(
    'npx',
    [
      'concurrently',
      `"npm run dev:web"`,
      `"wait-on http://localhost:${port} && electron ."`,
    ],
    {
      env,
      shell: true,
      stdio: 'inherit',
    }
  );

  child.on('error', (err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });
}

start();
