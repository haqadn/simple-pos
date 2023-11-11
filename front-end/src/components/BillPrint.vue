<template>
  <div>
    <header>
      <logo-component />

      <p class="text-caption mb-3">
        <strong>Phone: </strong> 01765553555 <br />
        Girls School Road, Chhatak, Sunamganj
      </p>

      <p class="text-h4 text-bold" v-if="orderId">Order# {{ orderId }}</p>
      <p class="text-body-2">{{ orderTime }}</p>

      <p>
        {{ cartName }}
        <span v-if="customer">
          <span v-if="customer && (customer.name || customer.phone)"> | </span>
          {{ customer.name }}
          <span v-if="customer.name && customer.phone"> | </span>
          {{ customer.phone }}
        </span>
      </p>
    </header>
    <main>
      <v-table>
        <thead>
          <tr>
            <td>Item</td>
            <td class="text-right">Cost</td>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cartItem in filteredCartItems" :key="cartItem.id">
            <td>
              <p class="text-body-1 m-0">
                {{ cartItem.name }} x{{ cartItem.quantity }}
              </p>
              <p class="text-caption m-0">
                {{ formatCurrency(cartItem.price) }}
              </p>
            </td>
            <td class="text-right total-column">
              {{ formatCurrency(cartItem.price * cartItem.quantity) }}
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-divider></v-divider>

      <v-table class="receipt-summary mt-5">
        <tbody>
          <tr>
            <td>Total Payable</td>
            <td>
              <strong>{{ formatCurrency(subtotal) }}</strong>
            </td>
          </tr>
          <tr v-if="discountTotal > 0">
            <td>Discount</td>
            <td>{{ formatCurrency(discountTotal) }}</td>
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
import LogoComponent from "./LogoComponent.vue";

export default {
  components: {
    LogoComponent,
  },
  computed: {
    ...mapState(useCartStore, [
      "items",
      "customer",
      "orderId",
      "orderTime",
      "payment",
      "subtotal",
      "remainingAmount",
      "customerNote",
      "coupons",
      "discountTotal",
      "wifiPassword",
      "cartName",
    ]),

    printTickets() {
      // return !!this.orderId;
      return false;
    },

    filteredCartItems() {
      return Object.values(this.items).filter((item) => item.quantity > 0);
    },

    formattedDiscount() {
      if (this.discount.type === "percent") {
        return this.discount.value + "%";
      } else {
        return this.discount.value;
      }
    },
  },
  methods: {
    ...mapActions(useCartStore, ["removeCoupon"]),

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
.logo {
  max-width: 70%;
}
header {
  text-align: center;
}

.receipt-summary td:nth-child(2) {
  text-align: right;
}

.wifi-details {
  margin: 1em;
  border: 1px double black;
  padding: 10pt;
  text-align: left;
}

.wifi-icon {
  width: 1em;
  height: 1em;
  vertical-align: middle;
  margin-right: 0.5em;
}

.token {
  page-break-before: always;
}

dl {
  display: grid;
  grid-template-columns: max-content auto;
}

dt {
  grid-column-start: 1;
}

dd {
  grid-column-start: 2;
  font-weight: bold;
  margin-left: 2em;
}

.m-0 {
  margin: 0;
}
</style>
