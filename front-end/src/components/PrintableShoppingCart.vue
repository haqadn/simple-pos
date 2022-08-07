<template>
  <v-card class="mx-auto" max-width="600">
    <v-toolbar color="success">
      <v-toolbar-title v-if="orderId">
        Order
        <a
          target="_blank"
          :href="`/wp-admin/post.php?post=${orderId}&action=edit`"
          >#{{ orderId }}</a
        >
      </v-toolbar-title>
      <v-toolbar-title v-else> Cart </v-toolbar-title>
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
          <td>Total</td>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cartItem in filteredCartItems" :key="cartItem.id">
          <td>
            <p class="text-body-1">{{ cartItem.name }}</p>
            <p class="text-subtitle-2 text-disabled">
              {{ formatCurrency(cartItem.price) }}
            </p>
          </td>
          <td><quantity-control :item="cartItem"></quantity-control></td>
          <td class="text-right total-column">
            {{ formatCurrency(cartItem.price * cartItem.quantity) }}
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-divider></v-divider>
    <v-list lines="two">
      <v-list-item title="Total">
        <template v-slot:append>
          <strong>{{ formatCurrency(subtotal) }}</strong>
        </template>
      </v-list-item>
      <v-list-item title="Discount" v-if="discountTotal">
        <template v-slot:append>
          {{ formatCurrency(discountTotal) }}
        </template>
      </v-list-item>
      <v-list-item title="Payment" v-if="payment">
        <template v-slot:append>
          {{ formatCurrency(payment) }}
        </template>
      </v-list-item>
      <v-list-item title="Remaining" v-if="payment">
        <template v-slot:append>
          {{ formatCurrency(remainingAmount) }}
        </template>
      </v-list-item>
      <v-list-item title="Coupons" v-if="coupons.length > 0">
        <template v-slot>
          <v-list>
            <v-list-item v-for="coupon in coupons" :key="coupon.id">
              {{ coupon.code }}

              <template v-slot:append>
                <v-icon
                  @click="() => removeCoupon(coupon.code)"
                  color="red"
                  icon="mdi-close"
                ></v-icon>
              </template>
            </v-list-item>
          </v-list>
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
import { mapActions, mapState } from "pinia";
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
      "coupons",
      "discountTotal",
    ]),

    filteredCartItems() {
      return Object.values(this.items).filter((item) => item.quantity > 0);
    },

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
    ...mapActions(useCartStore, ["removeCoupon"]),

    formatCurrency(amount) {
      return this.currency + amount.toFixed(2);
    },
  },
};
</script>

<style scoped>
.total-column {
  word-break: keep-all;
}
</style>
