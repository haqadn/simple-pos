<template>
  <div>
    <v-container fluid>
      <h1>POS Sale Report</h1>
    </v-container>
    <v-form @submit.prevent="onSubmit">
      <v-container fluid>
        <v-row>
          <v-col cols="1" class="d-print-none">
            <v-btn to="/" type="button" variant="text">POS</v-btn>
          </v-col>
          <v-col cols="5">
            <v-text-field
              v-model="from"
              label="From"
              type="date"
              variant="outlined"
              density="compact"
            ></v-text-field>
          </v-col>
          <v-col cols="5">
            <v-text-field
              v-model="to"
              label="To"
              type="date"
              variant="outlined"
              density="compact"
            ></v-text-field>
          </v-col>
          <v-col cols="1" class="d-print-none">
            <v-btn type="submit" color="primary">Submit</v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-form>
    <v-container fluid>
      <v-btn class="d-print-none" type="button" @click="print">Print</v-btn>
      <v-table>
        <thead>
          <tr>
            <th class="text-left">Item</th>
            <th class="text-left">SKU</th>
            <th class="text-left">Price</th>
            <th class="text-left">Quantity Sold</th>
            <th class="text-left">Total Price</th>
            <th class="text-left">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.sku }}</td>
            <td>{{ item.price }}</td>
            <td>{{ item.count }}</td>
            <td>{{ item.count * item.price }}</td>
            <td>{{ item.total }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-container>
  </div>
</template>

<script lang="ts">
import ReportAPI from "@/api/report";
import { defineComponent } from "vue";

// Components
export default defineComponent({
  name: "ReportView",
  data() {
    return {
      //`from` and `to` are the date range for the report, default to start and end of this month
      from: new Date().toISOString().slice(0, 8) + "01",
      to: new Date(new Date().setDate(new Date().getDate() - 1))
        .toISOString()
        .slice(0, 10),
      items: null,
    };
  },
  methods: {
    loadReport(from, to) {
      this.items = null;
      ReportAPI.get(from, to).then((response) => {
        this.items = response.data;
      });
    },
    onSubmit() {
      this.loadReport(this.from, this.to);
    },
    print() {
      if (window.electron) {
        window.electron.print({
          silent: false,
        });
      } else {
        window.print();
      }
    },
  },
  mounted() {
    this.onSubmit();
  },
});
</script>
