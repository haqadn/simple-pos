<template>
  <div
    id="print-area"
    :style="{ width: `${printWidth}mm` }"
    class="d-print-block d-none"
  >
    <bill-print
      v-if="printType === 'bill'"
      :items="printData.items"
      :customer="printData.customer"
      :order-reference="printData.invoiceNumber"
      :order-time="printData.orderTime"
      :payment="printData.payment"
      :discount-total="printData.discountTotal"
      :cart-name="printData.cartName"
    />
    <kot-print
      v-if="printType === 'kot'"
      :items="printData.kotItems"
      :order-reference="printData.invoiceNumber"
      :cart-name="printData.cartName"
    />
  </div>
</template>

<script lang="ts">
import BillPrint from "@/components/BillPrint.vue";
import KotPrint from "@/components/KotPrint.vue";
import config from "@/utils/config";
import { defineComponent } from "vue";
import { mapActions, mapState } from "pinia";
import { usePrintStore } from "@/stores/print";

export default defineComponent({
  name: "ThermalPrint",

  components: {
    BillPrint,
    KotPrint,
  },
  data() {
    return {
      printType: undefined as "bill" | "kot" | "drawer" | undefined,
      printData: null as any,
    };
  },

  watch: {
    nextJob: {
      handler() {
        this.handleJob();
      },
      immediate: true,
    },
  },

  computed: {
    ...mapState(usePrintStore, ["nextJob"]),

    printWidth() {
      return config.printWidth;
    },
  },

  methods: {
    ...mapActions(usePrintStore, ["pop", "push"]),
    async handleJob() {
      if (this.nextJob === undefined) {
        this.printType = undefined;
        return;
      }
      this.printType = this.nextJob?.type;
      this.printData = this.nextJob?.data;
      await this.$nextTick();
      await this.printReceipt();
      this.pop();
    },

    getPrinterName(): string {
      switch (this.printType) {
        case "drawer":
          return config.drawerPrinter;
        case "kot":
          return config.kitchenPrinter;
        default:
          return config.billPrinter;
      }
    },

    printReceipt() {
      return new Promise<void>((resolve) => {
        if (window.electron) {
          window.electron.print({
            ...config.printerConfig,
            deviceName: this.getPrinterName(),
            silent: config.silentPrinting,
            pageSize: {
              width: parseInt(config.printWidth) * 1000,
              height: parseInt(config.printHeight) * 1000,
            },
          });
          setTimeout(() => {
            // Give it some time to print
            resolve();
          }, 1000);
        } else {
          window.onafterprint = () => {
            window.onafterprint = null;
            resolve();
          };
          window.print();
        }
      });
    },
  },
});
</script>

<style>
#print-area > * {
  width: 100%;
}
</style>
