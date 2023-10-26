<template>
  <v-card class="mx-auto" max-width="600">
    <v-toolbar color="success">
      <v-toolbar-title v-if="orderId">
        Order
        <a
          target="_blank"
          :href="`${adminUrl}post.php?post=${orderId}&action=edit`"
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
        <tr v-for="cartItem in filteredCartItems" :key="cartItem.product_id">
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
    <v-table class="cart-summary">
      <tbody>
        <tr>
          <td>Total</td>
          <th>{{ formatCurrency(subtotal) }}</th>
        </tr>
        <tr v-if="discountTotal">
          <td>Discount</td>
          <th>{{ formatCurrency(discountTotal) }}</th>
        </tr>
        <tr>
          <td>Payment</td>
          <th>
            <v-text-field
              dense
              hide-details="auto"
              variant="underlined"
              :value="payment"
              @input="(event) => addCartPayment(event.target.value)"
            />
          </th>
        </tr>
        <tr v-if="payment != ''">
          <td>Remaining</td>
          <th>{{ formatCurrency(remainingAmount) }}</th>
        </tr>
      </tbody>
    </v-table>
    <v-list lines="two">
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
      <v-list-item>
        <v-btn
          variant="flat"
          class="mr-2"
          :disabled="subtotal === 0"
          @click="print"
          >Print</v-btn
        >
        <v-btn
          variant="flat"
          :disabled="subtotal === 0"
          class="mr-2"
          @click="save"
          >Save</v-btn
        >
        <v-btn
          variant="tonal"
          color="success"
          :disabled="subtotal === 0"
          @click="done"
          >Done</v-btn
        >

        <v-btn variant="flat" class="float-right" @click="clear">Clear</v-btn>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script>
import { mapActions, mapState } from "pinia";
import { useCartStore } from "../stores/cart";
import QuantityControl from "./QuantityControl.vue";
import config from "../utils/config";
import DoneCommand from "../commands/done";
import ClearCommand from "../commands/clear";
import SaveCommand from "../commands/save";
import PrintCommand from "../commands/print";

export default {
  components: {
    QuantityControl,
  },
  data: () => ({
    currency: "৳",
    coupon: {
      name: "",
      type: "percent",
      amount: 0,
    },
    adminUrl: config.adminUrl,
  }),
  computed: {
    ...mapState(useCartStore, [
      "payment",
      "items",
      "customer",
      "orderId",
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
  },
  methods: {
    ...mapActions(useCartStore, [
      "removeCoupon",
      "addCartPayment",
      "addCoupon",
    ]),

    formatCurrency(amount) {
      return this.currency + (amount || 0).toFixed(2);
    },

    async save() {
      const command = new SaveCommand();
      await command.execute();
    },

    async done() {
      const command = new DoneCommand();
      if (command.setAmount(this.payment)) {
        await command.execute();
      }
    },

    async clear() {
      const command = new ClearCommand();
      await command.execute();
    },

    print() {
      const command = new PrintCommand();
      command.execute();
    },
  },
};
</script>

<style scoped>
.total-column {
  word-break: keep-all;
}
.cart-summary th,
.cart-summary td {
  font-size: 1rem !important;
}
.cart-summary th {
  width: 100px;
  text-align: right;
}
</style>
