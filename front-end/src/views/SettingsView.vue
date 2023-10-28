<template>
  <v-container>
    <v-btn to="/">Home</v-btn>
    <h1>Settings</h1>
    <h2>API Settings</h2>

    <div>
      <v-text-field
        v-model="settings.apiBase"
        label="API Base"
        outlined
      ></v-text-field>
      <v-text-field
        v-model="settings.consumerKey"
        label="Consumer Key"
        outlined
      ></v-text-field>
      <v-text-field
        v-model="settings.consumerSecret"
        label="Consumer Secret"
        outlined
      ></v-text-field>
      <v-text-field
        v-model="settings.wpAdmin"
        label="WP Admin"
        outlined
      ></v-text-field>
    </div>

    <h2>Restaurant Settings</h2>
    <div>
      <v-text-field
        v-model="tablesString"
        label="Table Names"
        hint="Separate with commas"
        outlined
      ></v-text-field>
    </div>

    <h2>Printer Settings</h2>
    <v-checkbox
      label="Silent Printing"
      v-model="settings.silentPrinting"
    ></v-checkbox>
    <div>
      <v-select
        v-model="settings.billPrinter"
        label="Bill"
        :items="printers"
        item-title="displayName"
        item-value="name"
      ></v-select>
      <v-select
        v-model="settings.kitchenPrinter"
        label="Kitchen"
        :items="printers"
        item-title="displayName"
        item-value="name"
      ></v-select>
      <v-select
        v-model="settings.drawerPrinter"
        label="Drawer"
        :items="printers"
        item-title="displayName"
        item-value="name"
      ></v-select>
      <v-text-field
        v-model="settings.printWidth"
        label="Print Width"
        outlined
      ></v-text-field>
      <v-text-field
        v-model="settings.printHeight"
        label="Print Height"
        outlined
      ></v-text-field>
      <v-textarea
        v-model="settings.printerConfig"
        label="Printer Config"
        outlined
      ></v-textarea>
    </div>

    <v-btn @click="saveSettings">Save</v-btn>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      settings: {
        apiBase: "",
        consumerKey: "",
        consumerSecret: "",
        wpAdmin: "",
        tables: [1, 2, 3, 4, 5, 6],
        billPrinter: "",
        kitchenPrinter: "",
        drawerPrinter: "",
        silentPrinting: false,
        printWidth: 80,
        printHeight: 300,
        printerConfig: "{}",
      },
      printers: [],
    };
  },
  methods: {
    saveSettings() {
      const settings = { ...this.settings };
      settings.printerConfig = JSON.parse(settings.printerConfig);
      localStorage.setItem("simplePosSettings", JSON.stringify(settings));
      window.location.reload();
    },
  },
  computed: {
    tablesString: {
      get() {
        return this.settings.tables.join(",");
      },
      set(value) {
        this.settings.tables = value.split(",").map((table) => table.trim());
      },
    },
  },
  mounted() {
    if (window.electron) {
      setTimeout(() => window.electron.getPrinters(), 100);
      window.electron.onPrintersList((printers) => {
        this.printers = printers;
      });
    }

    const savedSettingsString = localStorage.getItem("simplePosSettings");
    if (savedSettingsString) {
      const savedSettings = JSON.parse(savedSettingsString);
      if (savedSettings?.printerConfig) {
        savedSettings.printerConfig = JSON.stringify(
          savedSettings.printerConfig
        );
      } else {
        savedSettings.printerConfig = "{}";
      }

      this.settings = savedSettings;
    }
  },
};
</script>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>
