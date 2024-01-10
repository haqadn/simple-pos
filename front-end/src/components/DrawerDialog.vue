<template>
  <v-dialog class="d-print-none" v-model="dialog" width="500">
    <v-card>
      <v-card-text>
        <div>
          <header>
            <p class="text-bold" v-if="orderId">Order# {{ orderId }}</p>

            <p>
              {{ cartName }}
            </p>
          </header>
          <main>
            <v-table class="receipt-summary mt-5">
              <tbody>
                <tr>
                  <td>Total Payable</td>
                  <td>
                    <strong>{{ formatCurrency(subtotal) }}</strong>
                  </td>
                </tr>
                <tr v-if="payment">
                  <td>Payment</td>
                  <td>{{ formatCurrency(payment) }}</td>
                </tr>
                <tr v-if="payment">
                  <td>Remaining</td>
                  <td>{{ formatCurrency(remainingAmount) }}</td>
                </tr>
              </tbody>
            </v-table>
          </main>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>

        <v-btn @click="dialog = false" color="primary" autofocus>Ok</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useCartManagerStore, useCartStore } from "../stores/cart";

export default {
  computed: {
    ...mapState(useCartStore, [
      "orderId",
      "payment",
      "subtotal",
      "remainingAmount",
      "isDirty",
      "status",
      "invoiceNumber",
    ]),
    ...mapState(useCartManagerStore, ["drawerDialog"]),

    dialog: {
      get() {
        return this.drawerDialog;
      },
      set(value) {
        if (value === false) {
          this.handleClose();
        }
      },
    },
  },
  methods: {
    ...mapActions(useCartManagerStore, ["hideDrawerDialog", "addRecentOrder"]),
    ...mapActions(useCartStore, ["clearCart", "saveOrder", "setOrderStatus"]),

    async handleClose() {
      this.hideDrawerDialog();
      await this.setOrderStatus("completed");
      if (this.orderId) {
        this.addRecentOrder(this.invoiceNumber);
      }

      this.clearCart();
    },

    formatCurrency(amount) {
      return amount.toFixed(0);
    },
  },
};
</script>

<style scoped>
* {
  color: black !important;
  word-break: keep-all;
}
header {
  text-align: center;
}
.receipt-summary td:nth-child(2) {
  text-align: right;
}
</style>
