'use client'
import { ProductSchema, useProductsQuery } from "@/stores/products";
import { CardBody, Divider, CardFooter, CardHeader, Card, Kbd } from "@heroui/react";
import { useSelectedCategory } from "./selected-category";
import { useCurrentOrder, useLineItemQuery } from "@/stores/orders";
import { useMemo } from "react";

export default function Products() {
    const { data: products, isLoading } = useProductsQuery();
    const { selectedCategoryId } = useSelectedCategory();

    const filteredProducts = useMemo(() => {
        return selectedCategoryId === null 
            ? products 
            : products?.filter(product => 
                product.categories?.some(category => category.id === selectedCategoryId)
            );
    }, [products, selectedCategoryId]);

    if( isLoading ) {
        return (
            <div>
                Products are loading...
            </div>
        );
    }

    if (! products || products.length === 0) {
        return (
            <div className="my-4">
                No products found
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-4 my-1 h-full overflow-y-auto p-5 -m-5">
            {filteredProducts?.map((product) => (
                <div key={product.id} className="flex-1 min-w-[150px] max-w-[200px]">
                    <ProductCard product={product} />
                </div>
            ))}
        </div>
    );
}

const ProductCard = ({ product }: { product: ProductSchema }) => {
    const { query: orderQuery } = useCurrentOrder();
    const [query, mutation] = useLineItemQuery(orderQuery, product);

    const currentQuantity = query.data?.quantity ?? 0;

    const formatPrice = (price: number) => {
        if (isNaN(price)) return 'N/A';
        return price.toFixed(2);
    };

    const addToOrder = () => {
        mutation.mutate({ quantity: currentQuantity + 1 });
    }

    return (
        <Card isPressable className="h-full w-full" onPress={() => addToOrder()}>
            <CardHeader className="flex gap-3">
                <div className="text-left">
                    <p className="text-xl font-bold">{product.name}</p>
                    <p className="text-small text-default-500">{product.variation_name} {product.sku && <Kbd>{product.sku}</Kbd>}</p>
                </div>
            </CardHeader>
            {product.description && <Divider />}
            <CardBody className="flex-1">
                <p className="text-black/75 text-small" dangerouslySetInnerHTML={{ __html: product.description }} />
            </CardBody>
            <Divider />
            <CardFooter>
                <div className="w-full -m-4 p-4">
                    <div className="text-black/75 text-small flex flex-row flex-start">
                        <div className="flex-1 text-left">Price</div>
                        <div>{formatPrice(product.price)}</div>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}