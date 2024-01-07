<template>
  <div>
    <h3 class="mb-3">
      Page Shortcuts
      <v-btn @click="addItem" icon="mdi-plus"></v-btn>
    </h3>
    <v-row v-for="(item, index) of modelValue" :key="index">
      <v-col cols="4">
        <v-text-field
          density="compact"
          label="Name"
          v-model="item.name"
        ></v-text-field>
      </v-col>
      <v-col cols="7">
        <v-text-field
          density="compact"
          type="url"
          label="URL"
          v-model="item.url"
        ></v-text-field>
      </v-col>
      <v-col cols="1">
        <v-btn
          density="compact"
          @click="removeItem(index)"
          icon="mdi-minus"
        ></v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

type ValueType = Array<{ name: string; url: string }>;

export default defineComponent({
  name: "KeyValueInput",

  props: {
    modelValue: {
      type: Array<{ name: string; url: string }>,
      required: true,
    },
  },

  computed: {
    items: {
      get(): ValueType {
        return this.modelValue;
      },
      set(value: ValueType) {
        this.$emit("update:modelValue", value);
      },
    },
  },

  methods: {
    addItem() {
      this.items.push({ name: "", url: "" });
    },
    removeItem(index: number) {
      console.log(index);
      this.items.splice(index, 1);
    },
  },
});
</script>
