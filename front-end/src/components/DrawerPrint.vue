<template>
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
</template>

<script>
import { mapActions, mapState } from "pinia";
import { useCartStore } from "../stores/cart";

export default {
  data: () => ({
    currency: "৳",
  }),
  computed: {
    ...mapState(useCartStore, [
      "orderId",
      "payment",
      "subtotal",
      "remainingAmount",
    ]),
  },
  methods: {
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
