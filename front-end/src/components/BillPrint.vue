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
      <p class="my-1 text-body-2">
        {{ humanizedCartName }}
        <br v-if="hasCustomerInfo" />
        <span v-if="hasCustomerInfo">
          {{ customer.name }}
          <span v-if="customer.name && customer.phone"> | </span>
          {{ customer.phone }}
        </span>
      </p>
      <p class="text-body-2 my-1">Invoice#: {{ orderReference }}</p>
      <p class="text-body-2 my-1">
        Date: <strong>{{ orderVisibleDate }}</strong> Time:
        <strong>{{ orderVisibleTime }}</strong>
      </p>
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
            <td class="pr-1">
              {{ complexItemName(cartItem).name }}
              <ul
                v-for="subItem in complexItemName(cartItem).subItems"
                :key="subItem"
              >
                <li>{{ subItem }}</li>
              </ul>
            </td>
            <td class="px-1">{{ cartItem.quantity }}</td>
            <td class="px-1 text-right">
              {{ formatCurrency(cartItem.price) }}
            </td>
            <td class="pl-1 text-right total-column">
              {{ formatCurrency(cartItem.price * cartItem.quantity) }}
            </td>
          </tr>
        </tbody>
      </table>

      <v-divider></v-divider>

      <table class="receipt-summary mt-2 text-body-2">
        <tbody>
          <tr v-if="discountTotal > 0">
            <td class="w-100">Discount</td>
            <td>{{ formatCurrency(-discountTotal) }}</td>
          </tr>
          <tr>
            <td class="w-100">Total</td>
            <td>
              <strong>{{ formatCurrency(subtotal) }}</strong>
            </td>
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
        <br />
        Call us for home delivery!
      </p>
    </footer>
  </div>
</template>

<script>
import LogoComponent from "./LogoComponent.vue";

export default {
  components: {
    LogoComponent,
  },
  props: [
    "items",
    "customer",
    "orderReference",
    "orderTime",
    "payment",
    "discountTotal",
    "cartName",
  ],
  computed: {
    subtotal() {
      return Object.values(this.items).reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );
    },

    remainingAmount() {
      return this.payment - this.subtotal;
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

    hasCustomerInfo() {
      return this.customer && (this.customer.name || this.customer.phone);
    },

    humanizedCartName() {
      if (/T[^a-zA-Z]/g.test(this.cartName)) {
        return "Table " + this.cartName.slice(2);
      } else if (/D[^a-zA-Z]/g.test(this.cartName)) {
        return "Home Delivery";
      } else if (/P[^a-zA-Z]/g.test(this.cartName)) {
        return "Take away";
      }

      return this.cartName;
    },

    orderVisibleDate() {
      return new Date(this.orderTime).toLocaleDateString("en-GB");
    },

    orderVisibleTime() {
      return new Date(this.orderTime).toLocaleTimeString();
    },
  },
  methods: {
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

ul {
  margin-left: 1em;
}
</style>
