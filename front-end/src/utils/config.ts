type settings = {
  wpAdmin: string; // WP-Admin URL
  apiBase: string; // API base URL
} & (
  | {
      method: "nonce";
      nonce: string;
    }
  | {
      method: "key";
      consumerKey: string;
      consumerSecret: string;
    }
);

const lsConfig = localStorage.getItem("simplePosSettings");

if (typeof window.simplePosSettings === "undefined" && lsConfig === null) {
  throw new Error("simplePosSettings not configured");
}

let simplePosSettings = window.simplePosSettings as settings;

if (!simplePosSettings) {
  simplePosSettings = JSON.parse(lsConfig as string);
}

const config = {
  method: simplePosSettings.method,
  api: {
    url: simplePosSettings.apiBase,
    nonce: simplePosSettings.nonce,
    consumerKey: simplePosSettings.consumerKey,
    consumerSecret: simplePosSettings.consumerSecret,
    version: "wc/v3",
  },
  adminUrl: simplePosSettings.wpAdmin,
};
export default config;
