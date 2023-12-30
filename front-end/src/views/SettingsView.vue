<template>
  <v-container>
    <v-btn to="/">Home</v-btn>
    <h1>Settings</h1>
    <h2>API Settings</h2>

    <div>
      <v-text-field
        v-model="settings.url"
        label="Website URL"
        type="url"
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
    <div>
      <v-select
        v-model="settings.skipKotCategories"
        :items="decodedCategories"
        label="Skip KOT Categories"
        multiple
        hint="The categories that should be skipped when printing KOT"
        item-title="name"
        item-value="id"
        persistent-hint
      ></v-select>
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
import { mapActions, mapState } from "pinia";
import { useItemStore } from "../stores/items";
export default {
  data() {
    return {
      settings: {
        url: "",
        consumerKey: "",
        consumerSecret: "",
        tables: [1, 2, 3, 4, 5, 6],
        billPrinter: "",
        kitchenPrinter: "",
        drawerPrinter: "",
        silentPrinting: false,
        printWidth: 80,
        printHeight: 300,
        printerConfig: "{}",
        skipKotCategories: [],
      },
      printers: [],
    };
  },
  methods: {
    ...mapActions(useItemStore, ["loadCategories"]),
    saveSettings() {
      const settings = { ...this.settings };
      settings.printerConfig = JSON.parse(settings.printerConfig);
      localStorage.setItem("simplePosSettings", JSON.stringify(settings));
      window.location.reload();
    },
    decodeHtmlEntity(str) {
      const textArea = document.createElement("textarea");
      textArea.innerHTML = str;
      return textArea.value;
    },
  },
  computed: {
    ...mapState(useItemStore, ["categories"]),

    decodedCategories() {
      return this.categories.map((category) => ({
        ...category,
        name: this.decodeHtmlEntity(category.name)
      }));
    },

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

    this.loadCategories();
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
