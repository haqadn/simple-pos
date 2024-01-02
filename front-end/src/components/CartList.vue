<template>
  <div>
    <v-btn
      v-for="(cartReference, index) in cartsWithMeta"
      :key="cartReference.key"
      :to="`/${cartReference.key}`"
      :color="getCartBtnColor(cartReference)"
      class="mb-2 w-100"
      :variant="getCartBtnVariant(cartReference)"
    >
      <template v-slot:prepend>
        <v-chip size="x-small">{{ index + 1 }}</v-chip>
      </template>
      {{ cartReference.label }}
    </v-btn>
  </div>
</template>

<script lang="ts">
import {
  type CartRef,
  useCartManagerStore,
  useDynamicCartStore,
} from "@/stores/cart";
import { mapState } from "pinia";
import { defineComponent } from "vue";

export default defineComponent({
  name: "CartList",

  computed: {
    ...mapState(useCartManagerStore, ["cartsWithMeta", "activeCartReference"]),
  },

  methods: {
    getCartBtnVariant(cartReference: CartRef) {
      if (this.activeCartReference === cartReference.key) {
        return "elevated";
      }

      if (cartReference.meta?.hasItems) {
        return "outlined";
      }

      return "flat";
    },
    getCartBtnColor(cartReference: CartRef) {
      if (cartReference.meta?.hasIssue) {
        return "warning";
      }

      const cartStore = useDynamicCartStore(cartReference.key);
      if (cartStore.status === "completed") {
        return "success";
      }

      if (this.activeCartReference === cartReference.key) {
        return "primary";
      }

      return "default";
    },
  },
});
</script>
