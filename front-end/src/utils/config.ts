type settings = {
  url: string; // Site URL
  tables: string[]; // List of table numbers
  skipKotCategories: number[]; // List of categories to skip in KOT
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
    url: simplePosSettings?.url + "/wp-json/wc/v3",
    nonce: simplePosSettings?.nonce,
    consumerKey: simplePosSettings?.consumerKey,
    consumerSecret: simplePosSettings?.consumerSecret,
  },
  adminUrl: simplePosSettings?.url + "/wp-admin",
  tables: simplePosSettings?.tables || [1, 2, 3, 4, 5, 6],
  skipKotCategories: simplePosSettings?.skipKotCategories || [],
  billPrinter: simplePosSettings?.billPrinter || "",
  kitchenPrinter: simplePosSettings?.kitchenPrinter || "",
  drawerPrinter: simplePosSettings?.drawerPrinter || "",
  silentPrinting: simplePosSettings?.silentPrinting || false,
  printWidth: simplePosSettings?.printWidth || 80,
  printHeight: simplePosSettings?.printHeight || 300,
  printerConfig: simplePosSettings?.printerConfig || {},
};
console.log(config);
export default config;
