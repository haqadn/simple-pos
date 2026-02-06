import { ProductSchema } from "@/stores/products";

/**
 * Creates a function that checks if a line item should be skipped on KOT
 * based on its product category.
 *
 * @param products - Array of products to search through
 * @param skipKotCategories - Array of category IDs to skip on KOT
 * @returns A function that takes productId and variationId and returns true if should skip
 */
export function createShouldSkipForKot(
  products: ProductSchema[] | undefined,
  skipKotCategories: number[]
): (productId: number, variationId: number) => boolean {
  if (!products || products.length === 0 || skipKotCategories.length === 0) {
    return () => false;
  }

  return (productId: number, variationId: number) => {
    const product = products.find(
      p => p.product_id === productId && p.variation_id === variationId
    );
    if (!product) return false;
    return product.categories.some(cat => skipKotCategories.includes(cat.id));
  };
}
