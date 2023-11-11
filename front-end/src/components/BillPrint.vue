<template>
  <div>
    <header class="brand">
      <div class="logo">
        <logo-component />
      </div>

      <p class="text-caption mb-2">
        <strong>Phone: </strong> 01765553555 <br />
        Girls School Road, Chhatak, Sunamganj
      </p>
    </header>
    <header v-if="filteredCartItems.length > 0">
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
    <main v-if="filteredCartItems.length > 0">
      <table class="line-items text-caption mt-2">
        <thead>
          <tr>
            <td class="pr-1 text-left">Item</td>
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

      <table class="receipt-summary mt-2 text-body-2">
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
    <footer class="mt-4">
      <p class="text-caption">
        Online menu: <strong>www.mycozy.cafe/menu</strong>
        <br>
        Call us for home delivery!
      </p>
    </footer>
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
.logo svg {
  width: 50%;
  height: 60%;
}
header {
  text-align: center;
}

.brand {
  border-bottom: 1px dashed black;
}

.line-items {
  width: 100%;
}

.line-items thead tr:last-child td {
  border-bottom: 1px solid black;
}

.receipt-summary td:nth-child(2) {
  text-align: right;
}

.m-0 {
  margin: 0;
}
</style>
