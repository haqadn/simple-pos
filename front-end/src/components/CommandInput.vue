<template>
  <v-combobox
    label="Command"
    tabindex="1"
    variant="outlined"
    prefix="> "
    autofocus
    :model-value="command"
    :error="error"
    @update:search="(text) => (command = text)"
    @keyup.enter="executeCommand"
    @keyup.tab="executeCommand"
    @keyup.ctrl.up="historyUp"
    @keyup.ctrl.down="historyDown"
    enterkeyhint="done"
    :custom-filter="itemFiler"
    :items="products"
    item-value="sku"
    item-title="sku"
  >
    <template v-slot:item="{ props, item }">
      <v-list-item
        v-bind="props"
        :title="item.raw.name"
        :subtitle="item.raw.sku"
      ></v-list-item>
    </template>
  </v-combobox>
</template>

<script>
import { tryToExecuteCommand } from "../utils/command";
import { useCatalogStore } from "@/stores/catalog";
import { mapState } from "pinia";

export default {
  data() {
    return {
      command: "",
      error: false,
      history: [],
      commandHistoryPointer: 0,
    };
  },
  computed: {
    ...mapState(useCatalogStore, ["products"]),
  },
  methods: {
    itemFiler(name, search, item) {
      return !!(
        item.raw.name.toLowerCase().includes(search.toLowerCase()) ||
        item.raw.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.raw.menu_order == search
      );
    },
    async executeCommand() {
      if (tryToExecuteCommand(this.command)) {
        this.onCommandSuccess(this.command);
      } else {
        this.error = true;
      }
    },
    onCommandSuccess(command) {
      this.history.push(command);
      this.command = "";
      this.error = false;
      this.commandHistoryPointer = this.history.length;
    },
    historyUp() {
      if (this.commandHistoryPointer > 0) {
        this.commandHistoryPointer--;
        this.command = this.history[this.commandHistoryPointer];
      }
    },
    historyDown() {
      if (this.commandHistoryPointer < this.history.length - 1) {
        this.commandHistoryPointer++;
        this.command = this.history[this.commandHistoryPointer];
      } else {
        this.command = "";
        this.commandHistoryPointer = this.history.length;
      }
    },
  },
};
</script>
