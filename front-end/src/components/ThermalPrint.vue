<template>
  <div
    id="print-area"
    :style="{ width: `${printWidth}mm` }"
    class="d-print-block d-none"
  >
    <bill-print
      v-if="printMode === 'bill'"
      :items="items"
      :customer="customer"
      :order-reference="invoiceNumber"
      :order-time="orderTime"
      :payment="payment"
      :discount-total="discountTotal"
      :cart-name="cartName"
    />
    <kot-print 
      v-if="printMode === 'kot'"
      :items="kotItems"
      :order-reference="invoiceNumber"
      :cart-name="cartName"
    />
  </div>
</template>

<script lang="ts">
import BillPrint from "@/components/BillPrint.vue";
import KotPrint from "@/components/KotPrint.vue";
import config from "@/utils/config";
import { defineComponent } from "vue";
import { useCartManagerStore } from "@/stores/cart";
import { mapState } from "pinia";
import { useCartStore } from "../stores/cart";

export default defineComponent({
  name: "ThermalPrint",

  components: {
    BillPrint,
    KotPrint,
  },

  computed: {
    ...mapState(useCartManagerStore, ["printMode"]),
    ...mapState(useCartStore, [
      "items",
      "kotItems",
      "customer",
      "invoiceNumber",
      "orderTime",
      "payment",
      "customerNote",
      "discountTotal",
      "cartName",
    ]),

    printWidth() {
      return config.printWidth;
    },
  },
});
</script>

<style>
#print-area > * {
  width: 100%;
}
</style>
