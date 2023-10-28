type settings = {
  wpAdmin: string; // WP-Admin URL
  apiBase: string; // API base URL
  tables: string[]; // List of table numbers
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

let simplePosSettings = window.simplePosSettings as settings;

if (lsConfig) {
  simplePosSettings = JSON.parse(lsConfig as string);
}

export const hasConfig = !!simplePosSettings;

const config = {
  method: simplePosSettings?.method || "key",
  api: {
    url: simplePosSettings?.apiBase,
    nonce: simplePosSettings?.nonce,
    consumerKey: simplePosSettings?.consumerKey,
    consumerSecret: simplePosSettings?.consumerSecret,
    version: "wc/v3",
  },
  adminUrl: simplePosSettings?.wpAdmin,
  tables: simplePosSettings?.tables || [1, 2, 3, 4, 5, 6],
  billPrinter: simplePosSettings?.billPrinter || "",
  kitchenPrinter: simplePosSettings?.kitchenPrinter || "",
  drawerPrinter: simplePosSettings?.drawerPrinter || "",
  silentPrinting: simplePosSettings?.silentPrinting || false,
  printWidth: simplePosSettings?.printWidth || 80,
  printerConfig: JSON.parse(simplePosSettings?.printerConfig) || {},
};
export default config;
