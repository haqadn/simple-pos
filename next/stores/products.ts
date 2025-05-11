import ProductsAPI, { ProductCategorySchema, ProductSchema } from "@/api/products";
import { useQuery } from "@tanstack/react-query";

const getProductsAndVariations = async (): Promise<ProductSchema[]> => {
    const products = await ProductsAPI.getProducts();

    // Process all products and their variations into a flat array
    const allProductsAndVariations = await Promise.all(products.map(async (product): Promise<ProductSchema[]> => {
        if (product.variations?.length === 0) {
            return [{
                ...product,
                product_id: product.id,
                variation_id: 0,
            }];
        } else {
            const variations = await ProductsAPI.getVariations(product.id);
            return variations.map(variation => ({
                ...variation,
                product_id: product.id,
                variation_id: variation.id,
                name: product.name,
                variation_name: `${variation.name}`,
                categories: product.categories
            }));
        }
    }));

    // Flatten the array of arrays into a single array
    return allProductsAndVariations.flat();
}

export const useProductsQuery = () => {
    return useQuery<ProductSchema[]>({
        queryKey: ['products'],
        queryFn: getProductsAndVariations,
        staleTime: 60 * 60 * 1000
    });
}

export const useGetProductById = () => {
    const { data: products } = useProductsQuery();
    
    return (product_id: number, variation_id: number) => {
        return products?.find(product => product.product_id === product_id && product.variation_id === variation_id);
    }
}

export const useCategoriesQuery = () => {
    return useQuery<ProductCategorySchema[]>({
        queryKey: ['categories'],
        queryFn: () => ProductsAPI.getCategories(),
        staleTime: 60 * 60 * 1000,
    });
}