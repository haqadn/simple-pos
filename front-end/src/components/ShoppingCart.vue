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
          <strong>{{ formatCurrency(subtotal) }}</strong>
        </template>
      </v-list-item>
      <v-list-item title="Payment" v-if="payment">
        <template v-slot:append>
          <strong>{{ formatCurrency(payment) }}</strong>
        </template>
      </v-list-item>
      <v-list-item title="Remaining" v-if="payment">
        <template v-slot:append>
          <strong>{{ formatCurrency(remainingAmount) }}</strong>
        </template>
      </v-list-item>
      <v-list-item>
        <template v-slot>
          <v-text-field
            v-model="customerNote"
            outlined
            hide-details="auto"
            label="Note"
            placeholder="Enter note"
          ></v-text-field>
        </template>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script>
import { mapState } from "pinia";
import { useCartStore } from "../stores/cart";
import QuantityControl from "./QuantityControl.vue";

export default {
  components: {
    QuantityControl,
  },
  data: () => ({
    currency: "৳",
    coupon: {
      name: "FOO",
      type: "percent",
      amount: 0,
    },
  }),
  computed: {
    ...mapState(useCartStore, [
      "items",
      "customer",
      "orderId",
      "payment",
      "subtotal",
      "remainingAmount",
      "customerNote",
    ]),

    formattedDiscount() {
      if (this.discount.type === "percent") {
        return this.discount.value + "%";
      } else {
        return this.currency + this.discount.value;
      }
    },
    couponDiscount() {
      if (this.coupon.type === "percent") {
        return this.subtotal * (this.coupon.amount / 100);
      } else {
        return this.coupon.amount;
      }
    },
  },
  methods: {
    formatCurrency(amount) {
      return this.currency + amount.toFixed(2);
    },
  },
};
</script>
