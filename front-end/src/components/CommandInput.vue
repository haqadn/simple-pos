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
      "saveOrder",
      "loadOrder",
      "addToCart",
      "setItemQuantity",
      "clearCart",
      "reduceFromCart",
      "addCartCustomerInfo",
      "addCartPayment",
      "addCoupon",
    ]),

    async executeCommand() {
      if (
        this.clear() ||
        this.removeItemBySku() ||
        this.addCustomerInfo() ||
        this.openOrder() ||
        this.saveOrderData() ||
        this.addPayment() ||
        this.applyCoupon() ||
        (await this.markDone()) ||
        this.addItemBySku()
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
      if (command[0] === "cus") {
        this.addCartCustomerInfo("phone", command[1]);
        this.addCartCustomerInfo("name", command[2]);
        return true;
      }
      return false;
    },
    addItemBySku() {
      const sku = this.command.split(" ")[0];
      const item = this.items.find((item) => item.sku === sku);
      if (item) {
        const quantity = this.command.split(" ")[1];

        if (quantity) {
          this.setItemQuantity(item, quantity);
        } else {
          this.addToCart(item);
        }

        return true;
      }
      return false;
    },
    removeItemBySku() {
      const reduce = ["remove", "rm"].includes(this.command.split(" ")[0]);
      if (!reduce) return false;

      const sku = this.command.split(" ")[1];
      const item = this.items.find((item) => item.sku === sku);
      const quantity = this.command.split(" ")[2];
      if (item) {
        if (quantity) {
          this.reduceFromCart(item, quantity);
        } else {
          this.setItemQuantity(item, 0);
        }
        return true;
      }
      return false;
    },
    addPayment() {
      const command = this.command.split(" ");
      if (command[0] === "pay") {
        this.addCartPayment(parseFloat(command[1]));
        return true;
      }
      return false;
    },
    applyCoupon() {
      const command = this.command.split(" ");
      if (command[0] === "coupon") {
        this.addCoupon(command[1]);
        return true;
      }
      return false;
    },
    saveOrderData() {
      if (this.command === "up") {
        this.saveOrder();
        return true;
      }
      return false;
    },
    async markDone() {
      const command = this.command.split(" ");

      if (command[0] === "done") {
        const paymentAmount = parseFloat(command[1]);
        await this.saveOrder();
        if (this.total > paymentAmount) {
          alert(
            "Payment amount must be greater than or equal to the total amount"
          );
          return false;
        }
        this.addCartPayment(paymentAmount);
        window.onafterprint = (e) => {
          this.clearCart();
          window.onafterprint = null;
        };
        window.print();
        return true;
      }
      return false;
    },
    openOrder() {
      if (this.command.split(" ")[0] === "open") {
        this.loadOrder(this.command.split(" ")[1]);
        return true;
      }
      return false;
    },
  },
  computed: {
    ...mapState(useItemStore, ["items"]),
    ...mapState(useCartStore, ["total"]),
  },
};
</script>
