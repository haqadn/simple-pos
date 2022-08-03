<template>
  <div>
    <v-text-field
      outlined
      dense
      :value="modelValue"
      max-width="100"
      prepend-icon="mdi-minus"
      append-icon="mdi-plus"
      @click:prepend="() => input(modelValue - 1)"
      @click:append="() => input(modelValue + 1)"
      class="text-center"
      hide-details="auto"
    ></v-text-field>
  </div>
</template>

<script>
export default {
  data() {
    return {
      content: this.modelValue,
    };
  },
  props: ["modelValue"],
  emits: ["update:modelValue"],
  methods: {
    input(newValue) {
      console.log("Shopuld update", newValue);
      this.$emit("update:modelValue", newValue);
    },
  },
};
</script>

<style scoped>
div {
  max-width: 150px;
}
</style>
