import ProductsAPI from "@/api/products";
import type { Product } from "@/types";
import config from "@/utils/config";
import { defineStore } from "pinia";

export const useItemStore = defineStore("items", {
  state: () => ({
    items: <Product[]>[],
    categories: [],
  }),
  getters: {
    productCategoryMap() {
      const items = this.items;
      const catMap: { [productId: number]: number[] } = {};
      items.forEach(
        (item: { id: number; categories?: Array<{ id: number }> }) => {
          if (item.categories) {
            catMap[item.id] = item.categories.map((category) => category.id);
          }
        }
      );

      return catMap;
    },
  },
  actions: {
    async loadItems() {
      const response = await ProductsAPI.getProducts();
      // const products = (response.data as Array<any>).map((item) => {
      //   return {
      //     ...item,
      //     price: parseFloat(item.price),
      //     regular_price: parseFloat(item.regular_price),
      //   };
      // });

      const products = <Array<Product>>[];

      console.log('Before', products.length);

      for (const product of response.data as Array<any>) {
        if (product.variations.length === 0) {
          products.push({
            ...product,
            price: parseFloat(product.price),
            categories: product.categories,
          });
        } else {
          const variations = await ProductsAPI.getVariations(product.id);
          (variations.data as Array<any>).forEach((variation) => {
            console.log('Pushing variation', variation);
            products.push({
              ...variation,
              name: `${product.name} - ${variation.name}`,
              price: parseFloat(variation.price),
              categories: product.categories,
            });
          });
        }
      }

      console.log('After', products.length);

      this.items = products;
    },
    async loadCategories() {
      const response = await ProductsAPI.getCategories();
      const categories = response.data;

      this.categories = categories;
    },
    shouldSkipProductFromKot(productId: number) {
      // Do not skip if we cannot determine the product category
      if (!this.productCategoryMap[productId]) {
        return false;
      }
      return this.productCategoryMap[productId].some((category) =>
        config.skipKotCategories.includes(category)
      );
    },
  },
});
