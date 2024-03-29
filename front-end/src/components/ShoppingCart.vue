<template>
  <v-card class="mx-auto" max-width="600">
    <v-toolbar color="success">
      <v-toolbar-title v-if="orderId">
        <span class="hidden-md-and-down">Order</span>
        <a
          target="_blank"
          class="text-decoration-none text-white"
          :href="`${adminUrl}post.php?post=${orderId}&action=edit`"
          :title="orderId"
          >#{{ invoiceNumber }}</a
        >
      </v-toolbar-title>
      <v-toolbar-title v-else>New Order</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-text-field
        v-model="currentCartName"
        outlined
        hide-details="auto"
        label="Cart Name"
      ></v-text-field>
    </v-toolbar>

    <v-container fluid>
      <v-row v-if="customer">
        <v-col>
          <v-combobox
            label="Customer Name"
            variant="underlined"
            shaped
            hide-details="auto"
            :items="customers"
            item-value="name"
            item-title="name"
            :model-value="customer.name"
            @update:search="(text) => searchCustomers(text, 'name')"
            @update:modelValue="(customer) => selectCustomer(customer, 'name')"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item
                v-bind="props"
                :title="item.raw.name"
                :subtitle="item.raw.phone"
              ></v-list-item>
            </template>
          </v-combobox>
        </v-col>
        <v-col>
          <v-combobox
            label="Customer Phone"
            variant="underlined"
            shaped
            hide-details="auto"
            :items="customers"
            item-value="phone"
            item-title="phone"
            :model-value="customer.phone"
            @update:search="(text) => searchCustomers(text, 'phone')"
            @update:modelValue="(customer) => selectCustomer(customer, 'phone')"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item
                v-bind="props"
                :title="item.raw.name"
                :subtitle="item.raw.phone"
              ></v-list-item>
            </template>
          </v-combobox>
        </v-col>
      </v-row>
      <v-row v-else>
        <a class="ma-2" href="#" @click.prevent="enableCustomer"
          >Add customer info</a
        >
      </v-row>
    </v-container>

    <v-table>
      <thead>
        <tr>
          <td>Item</td>
          <td>Quantity</td>
          <td class="hidden-md-and-down">Total</td>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="cartItem in filteredCartItems"
          :key="`${cartItem.line_item_id}-${cartItem.product_id}-${cartItem.variation_id}`"
        >
          <td>
            <p class="text-body-1">
              {{ complexItemName(cartItem).name }}
            </p>
            <p class="text-subtitle-2 text-disabled">
              {{ formatCurrency(cartItem.price) }}
            </p>
          </td>
          <td><quantity-control :item="cartItem"></quantity-control></td>
          <td class="text-right total-column hidden-md-and-down">
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
              v-model="cartPayment"
              @keyup.enter="done"
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
            v-model="note"
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
          :disabled="!hasItems"
          @click="printBill"
          >Bill</v-btn
        >
        <v-btn
          variant="flat"
          class="mr-2"
          :disabled="!hasItems"
          @click="printKOT"
          >KOT</v-btn
        >
        <v-btn
          variant="flat"
          :disabled="!hasItems || !isDirty"
          class="mr-2"
          @click="save"
          >Save</v-btn
        >
        <v-btn
          variant="tonal"
          class="hidden-md-and-down"
          color="success"
          :disabled="!hasItems"
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
import CustomersAPI from "../api/customers";
import debounce from "lodash/debounce";

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
    customers: [],
  }),
  computed: {
    ...mapState(useCartStore, [
      "payment",
      "line_items",
      "customer",
      "orderId",
      "invoiceNumber",
      "subtotal",
      "remainingAmount",
      "customerNote",
      "coupons",
      "discountTotal",
      "cartName",
      "hasItems",
      "isDirty",
    ]),

    cartPayment: {
      get() {
        return this.payment;
      },
      set(value) {
        this.addCartPayment(value);
      },
    },

    currentCartName: {
      get() {
        return this.cartName;
      },
      set(value) {
        this.setCartName(value);
      },
    },

    note: {
      get() {
        return this.customerNote;
      },
      set(value) {
        this.setCustomerNote(value);
      },
    },

    filteredCartItems() {
      return Object.values(this.line_items).filter((item) => item.quantity > 0);
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
      "addCartCustomerInfo",
      "setCartName",
      "setCustomerNote",
    ]),

    complexItemName(item) {
      const parts = item.name.split(":").map((part) => part.trim());
      let subItems = [];
      if (parts.length > 1) {
        subItems = parts[1].split(",").map((part) => part.trim());
      }
      return {
        name: parts[0],
        subItems,
      };
    },

    enableCustomer() {
      this.addCartCustomerInfo("name", "");
    },

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

    printBill() {
      const command = new PrintCommand("bill");
      command.execute();
    },

    printKOT() {
      const command = new PrintCommand("kot");
      command.execute();
    },

    searchCustomers: debounce(async function (search, property) {
      if (!search) {
        return;
      }

      this.customer[property] = search;

      const result = await CustomersAPI.get(search);
      this.customers = result.data.customers;
    }, 300),

    selectCustomer(customer, property) {
      if (typeof customer === "string") {
        this.customer[property] = customer;
        return;
      }
      if (!customer) {
        return;
      }
      this.customer.name = customer.name;
      this.customer.phone = customer.phone;
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
