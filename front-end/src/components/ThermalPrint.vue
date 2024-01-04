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
      :invoice-number="invoiceNumber"
      :orderTime="orderTime"
      :payment="payment"
      :discountTotal="discountTotal"
      :cartName="cartName"
    />
    <kot-print v-if="printMode === 'kot'" />
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
