<template>
  <v-card class="mx-auto" max-width="600">
    <v-toolbar color="success">
      <v-toolbar-title>
        {{ orderId ? `Order #${orderId}` : "Cart" }}
      </v-toolbar-title>
    </v-toolbar>

    <v-container fluid>
      <v-row>
        <v-col>
          <v-text-field
            label="Customer Name"
            variant="outlined"
            shaped
            v-model="customer.name"
            hide-details="auto"
          ></v-text-field>
        </v-col>
        <v-col>
          <v-text-field
            label="Customer Phone"
            variant="outlined"
            shaped
            v-model="customer.phone"
            hide-details="auto"
          ></v-text-field>
        </v-col>
      </v-row>
    </v-container>

    <v-table>
      <thead>
        <tr>
          <td>Item</td>
          <td>Quantity</td>
          <td class="text-right">Total</td>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>
            <p class="text-body-1">{{ item.name }}</p>
            <p class="text-subtitle-2 text-disabled">
              {{ formatCurrency(item.price) }}
            </p>
          </td>
          <td><quantity-control :item="item"></quantity-control></td>
          <td class="text-right">
            {{ formatCurrency(item.price * item.quantity) }}
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-divider></v-divider>
    <v-list lines="two">
      <v-list-item
        v-if="discount.amount > 0"
        title="Discount"
        :subtitle="formatDiscount(discount.value)"
      >
        <template v-slot:append>
          {{ formatCurrency(totalDiscount) }}
        </template>
      </v-list-item>
      <v-list-item
        v-if="coupon.amount > 0"
        title="Coupon"
        :subtitle="coupon.name"
      >
        <template v-slot:append>
          {{ formatCurrency(couponDiscount) }}
        </template>
      </v-list-item>
      <v-list-item title="Total">
        <template v-slot:append>
          <strong>{{ formatCurrency(total) }}</strong>
        </template>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useCartStore } from "../stores/cart";
import QuantityControl from "./QuantityControl.vue";

export default {
  components: {
    QuantityControl,
  },
  data: () => ({
    currency: "৳",
    discount: {
      type: "percent",
      value: 10,
    },
    coupon: {
      name: "FOO",
      type: "percent",
      amount: 10,
    },
  }),
  computed: {
    ...mapState(useCartStore, ["items", "customer", "orderId"]),

    subtotal() {
      return Object.values(this.items).reduce((total, item) => {
        return total + item.price * item.quantity;
      }, 0);
    },
    totalDiscount() {
      if (this.discount.type === "percent") {
        return this.subtotal * (this.discount.value / 100);
      } else {
        return this.discount.value;
      }
    },
    couponDiscount() {
      if (this.coupon.type === "percent") {
        return this.subtotal * (this.coupon.amount / 100);
      } else {
        return this.coupon.amount;
      }
    },
    total() {
      return this.subtotal - this.totalDiscount - this.couponDiscount;
    },
  },
  methods: {
    formatDiscount(amount) {
      if (this.discount.type === "percent") {
        return amount + "%";
      } else {
        return this.currency + amount;
      }
    },
    formatCurrency(amount) {
      return this.currency + amount.toFixed(2);
    },
  },
};
</script>
