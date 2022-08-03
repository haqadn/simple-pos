<template>
  <v-text-field
    label="Command"
    variant="outlined"
    prefix="> "
    autofocus
    v-model="command"
    :error="error"
    @keyup.enter="executeCommand"
    @keyup.up="historyUp"
    @keyup.down="historyDown"
  ></v-text-field>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useItemStore } from "../stores/items";
import { useCartStore } from "../stores/cart";

export default {
  data() {
    return {
      command: "",
      error: false,
      history: [],
      commandHistoryPointer: 0,
    };
  },
  methods: {
    ...mapActions(useCartStore, [
      "addToCart",
      "clearCart",
      "reduceFromCart",
      "addCartCustomerInfo",
    ]),

    executeCommand() {
      if (
        this.addItemBySku() ||
        this.clear() ||
        this.reduceItemBySku() ||
        this.addCustomerInfo()
      ) {
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
    clear() {
      if (this.command === "clear") {
        this.clearCart();
        this.command = "";
        return true;
      }
      return false;
    },
    addCustomerInfo() {
      const command = this.command.split(" ");
      if (["name", "phone"].includes(command[0])) {
        this.addCartCustomerInfo(command[0], command[1]);
        return true;
      }
    },
    addItemBySku() {
      const sku = this.command.split(" ")[0];
      const quantity = this.command.split(" ")[1] || 1;
      const item = this.items.find((item) => item.sku === sku);
      if (item) {
        this.addToCart(item, quantity);
        return true;
      }
      return false;
    },
    reduceItemBySku() {
      const reduce = ["reduce", "rd"].includes(this.command.split(" ")[0]);
      if (!reduce) return false;

      const sku = this.command.split(" ")[1];
      const quantity = this.command.split(" ")[2] || 1;
      const item = this.items.find((item) => item.sku === sku);
      if (item) {
        this.reduceFromCart(item, quantity);
        return true;
      }
      return false;
    },
  },
  computed: {
    ...mapState(useItemStore, ["items"]),
  },
};
</script>
