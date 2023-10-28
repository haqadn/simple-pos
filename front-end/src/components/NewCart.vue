<template>
  <v-btn>
    +

    <v-dialog v-model="dialog" activator="parent" width="auto">
      <v-card class="pa-4">
        <v-text-field
          v-model="newCartName"
          label="New Cart Name"
          outlined
          dense
          autofocus
          tabindex="1"
          :hide-details="true"
        ></v-text-field>
        <v-card-actions>
          <v-btn color="default" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="addNewCart()">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-btn>
</template>

<script lang="ts">
import { mapActions } from "pinia";
import { useCartManagerStore } from "../stores/cart";

export default {
  data() {
    return {
      dialog: false,
      newCartName: "P",
    };
  },
  methods: {
    ...mapActions(useCartManagerStore, ["createCart"]),

    addNewCart() {
      this.createCart(this.newCartName);
      this.newCartName = "P";
      this.dialog = false;
    },
  },
};
</script>
