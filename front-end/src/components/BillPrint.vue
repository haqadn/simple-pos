<template>
  <div>
    <header>
      <logo-component />

      <p class="text-caption mb-2">
        <strong>Phone: </strong> 01765553555 <br />
        Girls School Road, Chhatak, Sunamganj
      </p>

      <p class="my-2">
        {{ cartName }}
        <span v-if="customer">
          <span v-if="customer && (customer.name || customer.phone)"> | </span>
          {{ customer.name }}
          <span v-if="customer.name && customer.phone"> | </span>
          {{ customer.phone }}
        </span>
      </p>

      <p class="text-body-2 my-2">{{ orderTime }}</p>
    </header>
    <main>
      <table class="line-items text-caption mt-2">
        <thead>
          <tr>
            <td class="pr-1">Item</td>
            <td class="px-1">Qty</td>
            <td class="px-1">Price</td>
            <td class="pl-1 text-right">T.Price</td>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cartItem in filteredCartItems" :key="cartItem.id">
            <td class="pr-1">{{ cartItem.name }}</td>
            <td class="px-1">{{ cartItem.quantity }}</td>
            <td class="px-1 text-right">{{ formatCurrency(cartItem.price) }}</td>
            <td class="pl-1 text-right total-column">{{ formatCurrency(cartItem.price * cartItem.quantity) }}</td>
          </tr>
        </tbody>
      </table>

      <v-divider></v-divider>

      <table class="receipt-summary mt-2">
        <tbody>
          <tr>
            <td class="w-100">Total</td>
            <td>
              <strong>{{ formatCurrency(subtotal) }}</strong>
            </td>
          </tr>
          <tr v-if="discountTotal > 0">
            <td class="w-100">Discount</td>
            <td>{{ formatCurrency(discountTotal) }}</td>
          </tr>
          <tr v-if="payment">
            <td class="w-100">Payment</td>
            <td>{{ formatCurrency(payment) }}</td>
          </tr>
          <tr v-if="payment">
            <td class="w-100">Change</td>
            <td>{{ formatCurrency(-remainingAmount) }}</td>
          </tr>
        </tbody>
      </table>
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
