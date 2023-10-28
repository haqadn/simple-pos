type settings = {
  wpAdmin: string; // WP-Admin URL
  apiBase: string; // API base URL
  tables: string[]; // List of table numbers
  billPrinter: string; // Bill printer name
  kitchenPrinter: string; // Kitchen printer name
  drawerPrinter: string; // Drawer printer name
  silentPrinting: boolean;
  printWidth: number; // Print width in mm
  printHeight: number; // Print height in mm
  printerConfig: string; // Printer config
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
  printHeight: simplePosSettings?.printHeight || 300,
  printerConfig: simplePosSettings?.printerConfig || {},
};
export default config;
