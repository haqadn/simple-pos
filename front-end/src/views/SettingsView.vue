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
        v-model="settings.version"
        label="Version"
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
        version: "",
        wpAdmin: "",
        tables: [],
        billPrinter: "",
        kitchenPrinter: "",
        drawerPrinter: "",
        silentPrinting: false,
      },
      printers: [],
    };
  },
  methods: {
    saveSettings() {
      localStorage.setItem("simplePosSettings", JSON.stringify(this.settings));
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
        console.log(printers);
      });
    }

    const savedSettings = localStorage.getItem("simplePosSettings");
    if (savedSettings) {
      this.settings = JSON.parse(savedSettings);
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
