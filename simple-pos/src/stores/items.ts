import { defineStore } from "pinia";

export const useItemStore = defineStore('items', {
  state: () => ({
    items: [
      { id: 1, name: "Item 1", price: 1.99 },
      { id: 2, name: "Item 2", price: 2.99 },
      { id: 3, name: "Item 3", price: 3.99 },
      { id: 4, name: "Item 4", price: 4.99 },
      { id: 5, name: "Item 5", price: 5.99 },
      { id: 6, name: "Item 6", price: 6.99 },
      { id: 7, name: "Item 7", price: 7.99 },
      { id: 8, name: "Item 8", price: 8.99 },
      { id: 9, name: "Item 9", price: 9.99 },
      { id: 10, name: "Item 10", price: 10.99 },
      { id: 11, name: "Item 11", price: 11.99 },
    ]
  }),
});
