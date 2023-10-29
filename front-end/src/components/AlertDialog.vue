<template>
  <v-dialog v-model="visible" width="500">
    <v-card>
      <v-card-text> {{ alert.message }} </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>

        <v-btn @click="dismissAlert">Ok</v-btn>
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
    ...mapState(useAlertsStore, ["alert"]),

    visible: {
      get() {
        return this.alert.visible;
      },
      set(value: boolean) {
        if (value === false) {
          this.dismissAlert();
        }
      },
    },
  },
  methods: {
    ...mapActions(useAlertsStore, ["dismissAlert"]),
  },
};
</script>
