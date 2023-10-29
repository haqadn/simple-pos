<template>
  <v-dialog v-model="visible" width="500">
    <v-card>
      <v-card-text> {{ confirm.message }} </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>

        <v-btn @click="dismissConfirm">Cancel</v-btn>
        <v-btn @click="callbackConfirm" color="primary">Ok</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { mapActions, mapState } from "pinia";
import { useAlertsStore } from "../stores/alerts";
export default {
  data: () => ({}),
  computed: {
    ...mapState(useAlertsStore, ["confirm"]),

    visible: {
      get() {
        return this.confirm.visible;
      },
      set(value: boolean) {
        if (value === false) {
          this.dismissConfirm();
        }
      },
    },
  },
  methods: {
    ...mapActions(useAlertsStore, ["dismissConfirm", "callbackConfirm"]),
  },
};
</script>
