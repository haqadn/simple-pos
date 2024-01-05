<template>
  <div>
    <header>
      <p class="text-h2 font-weight-black text-right">{{ cartName }}</p>
      <p class="text-h5 text-bold" v-if="orderReference">
        Order# {{ orderReference }}
      </p>
    </header>
    <main>
      <v-table>
        <thead>
          <tr>
            <td>Item</td>
            <td class="text-right">Quantity</td>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              {{ item.name }}
            </td>
            <td>
              <span
                class="old quantity"
                v-if="
                  item.quantity !== item.previousQuantity &&
                  item.previousQuantity !== undefined &&
                  item.previousQuantity !== 0
                "
                >{{ item.previousQuantity }}</span
              >
              <span
                class="quantity"
                :class="{
                  changed: item.quantity !== item.previousQuantity,
                }"
              >
                {{ item.quantity }}
              </span>
            </td>
          </tr>
        </tbody>
      </v-table>
    </main>
    <div v-if="customerNote" class="my-4 mx-2 pa-2 customer-note">
      {{ customerNote }}
    </div>
  </div>
</template>

<script lang="ts">
export default {
  data: () => ({}),
  props: {
    cartName: {
      type: String,
      required: true,
    },
    orderReference: {
      type: String,
      required: true,
    },
    customerNote: {
      type: String,
      required: false,
    },
    items: {
      type: Array<{
        id: number;
        name: string;
        quantity: number;
        previousQuantity?: number;
      }>,
      required: true,
    },
  },
};
</script>

<style scoped>
* {
  color: black !important;
  word-break: keep-all;
}
header {
  text-align: center;
}

tbody tr td {
  border-bottom: 2px solid black !important;
}

tr td:last-child {
  text-align: right;
}

.quantity {
  display: inline-block;
  padding: 4px;
  min-width: 1em;
  margin-left: 4px;
}

.changed {
  border: 1px solid black;
  border-radius: 100%;
  min-width: 1em;
  margin-left: 4px;
}

.old {
  text-decoration: line-through;
}

.customer-note {
  border: 2px solid black;
}
</style>
