const simplePosSettings = window.simplePosSettings || {
  api: {
    base: 'https://example.com',
    nonce: 'banana',
  },
  adminUrl: 'https://example.com'
};

export default {
  api: {
    base: simplePosSettings.apiBase,
    nonce: simplePosSettings.nonce,
  },
  adminUrl: simplePosSettings.wpAdmin,
};
