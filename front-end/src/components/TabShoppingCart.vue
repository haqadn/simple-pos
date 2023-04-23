<template>
  <v-card class="mx-auto text-caption pa-3" variant="outlined" width="300">
    <div class="d-flex flex-column fill-height">
      <div class="table-wrapper">
        <table>
          <tbody>
            <tr v-for="cartItem in filteredCartItems" :key="cartItem.id">
              <td>
                <p>{{ cartItem.name }} x{{ cartItem.quantity }}</p>
              </td>
              <td class="amount-column">
                <div>
                  {{ formatCurrency(cartItem.price * cartItem.quantity) }}
                </div>
              </td>
            </tr>
            <tr>
              <td height="100%">&nbsp;</td>
            </tr>
          </tbody>
        </table>
      </div>
      <table>
        <tbody>
          <tr>
            <th class="text-left">Total</th>
            <th class="amount-column">
              {{ formatCurrency(subtotal) }}
            </th>
          </tr>
          <tr>
            <td colspan="2" class="text-center py-3">
              <v-btn
                v-for="(amount, index) in paymentOptions"
                :key="index"
                variant="outlined"
                rounded="xl"
                class="payment-button"
                @click="addCartPayment(amount)"
              >
                {{ amount }}
              </v-btn>
            </td>
          </tr>
          <tr>
            <td>Received</td>
            <td class="amount-column">
              <v-text-field
                variant="underlined"
                v-model="payment"
                @input="(e) => addCartPayment(e.target.value)"
              ></v-text-field>
            </td>
          </tr>
          <tr :class="{ 'text-red': remainingAmount > 0 }">
            <td>Change</td>
            <td class="amount-column">
              <b>{{ -1 * remainingAmount }}</b>
            </td>
          </tr>
        </tbody>
      </table>
      <v-spacer></v-spacer>
      <v-btn
        v-if="orderId != null"
        variant="tonal"
        color="error"
        @click="this.cancelOrder"
        prepend-icon="mdi-trash-can-outline"
        class="mb-3"
        >Cancel Order</v-btn
      >
      <v-btn
        v-if="subtotal > 0 || orderId != null"
        variant="tonal"
        color="success"
        @click="done"
        prepend-icon="mdi-check"
        size="x-large"
        >{{ saveButtonText }}</v-btn
      >
      <v-btn
        v-else
        variant="tonal"
        color="warning"
        prepend-icon="mdi-recycle"
        size="x-large"
        @click="loadLastOrder"
        >Last Order</v-btn
      >

      <v-btn prepend-icon="mdi-close" variant="flat" @click="clearCart"
        >Clear</v-btn
      >
    </div>
  </v-card>
</template>

<script>
import { mapActions, mapState } from "pinia";
import { useCartStore } from "../stores/cart";
import config from "../utils/config";
import SaveCommand from "../commands/save";
import lastOrder from "../commands/last-order";
import OrdersAPI from "../api/orders";

export default {
  data: () => ({
    currency: "৳",
    adminUrl: config.adminUrl,
    paymentOptions: [20, 50, 100, 200, 500, 1000],
  }),
  computed: {
    ...mapState(useCartStore, [
      "payment",
      "items",
      "orderId",
      "subtotal",
      "remainingAmount",
    ]),

    filteredCartItems() {
      return Object.values(this.items).filter((item) => item.quantity > 0);
    },

    saveButtonText() {
      if (this.orderId != null) {
        return "Update Order";
      } else {
        return "Create Order";
      }
    },
  },
  methods: {
    ...mapActions(useCartStore, [
      "removeCoupon",
      "addCartPayment",
      "saveOrder",
      "clearCart",
    ]),

    formatCurrency(amount) {
      return amount.toFixed(0);
    },

    async save() {
      const command = new SaveCommand();
      await command.execute();
    },

    async done() {
      this.saveOrder(false);
      this.clearCart();
    },

    async loadLastOrder() {
      const command = new lastOrder();
      await command.execute();
    },

    async cancelOrder() {
      if (this.orderId != null) {
        console.log("cancelling");
        await OrdersAPI.cancelOrder(this.orderId);
      }
      this.clearCart();
    },
  },
};
</script>

<style scoped>
.amount-column {
  word-break: keep-all;
  text-align: right;
}
.payment-button {
  margin: 1px;
}
.table-wrapper {
  overflow-y: auto;
  height: 50%;
}
.table-wrapper table {
  height: 100%;
}

table {
  width: 100%;
}
</style>
