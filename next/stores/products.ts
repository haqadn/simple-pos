import ProductsAPI, { ProductSchema } from "@/api/products";
import { useQuery } from "@tanstack/react-query";

const getProductsAndVariations = async () => {
    const products = await ProductsAPI.getProducts();

    // Process all products and their variations into a flat array
    const allProductsAndVariations = await Promise.all(products.map(async (product) => {
        if (product.variations.length === 0) {
            return [product];
        } else {
            const variations = await ProductsAPI.getVariations(product.id);
            return variations.map((variation) => ({
                ...variation,
            }));
        }
    }));

    // Flatten the array of arrays into a single array
    return allProductsAndVariations.flat();
}

export const useProductsStore = () => {
    const productsQuery = useQuery<ProductSchema[]>({
        queryKey: ['products'],
        queryFn: getProductsAndVariations,
        initialData: []
    });

    return {
        productsQuery
    }
}
