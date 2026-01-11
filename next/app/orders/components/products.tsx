'use client'
import { ProductSchema, useProductsQuery } from "@/stores/products";
import { CardHeader, Card, Kbd, Tooltip } from "@heroui/react";
import { useSelectedCategory } from "./selected-category";
import { useCurrentOrder, useLineItemQuery } from "@/stores/orders";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/format";

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
        <div className="flex flex-wrap gap-4 my-1 overflow-y-auto p-5 -m-5">
            {filteredProducts?.map((product) => (
                <div key={product.id} className="flex-1 min-w-[150px] max-w-[200px]">
                    <ProductCard product={product} />
                </div>
            ))}
        </div>
    );
}

const ProductCard = ({ product }: { product: ProductSchema }) => {
    const orderQuery = useCurrentOrder();
    const [query, mutation] = useLineItemQuery(orderQuery, product);

    const currentQuantity = query.data?.quantity ?? 0;

    const formatPrice = (price: number) => {
        if (isNaN(price)) return 'N/A';
        return formatCurrency(price);
    };

    const addToOrder = () => {
        mutation.mutate({ quantity: currentQuantity + 1 });
    }

    const hasDescription = !!product.description;

    const card = (
        <Card isPressable className="h-full w-full" onPress={() => addToOrder()}>
            <CardHeader className="flex-col items-start gap-0 p-3 text-left">
                <p className="text-sm font-semibold leading-snug line-clamp-2 text-left w-full">{product.name}</p>
                {product.variation_name && (
                    <span className="text-xs text-default-400 mt-0.5">{product.variation_name}</span>
                )}
                <div className="w-full border-t border-default-200 mt-2 pt-2">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5">
                            {product.sku && <Kbd className="text-[10px] px-1.5">{product.sku}</Kbd>}
                            {hasDescription && (
                                <span className="text-[10px] text-default-400" title="Hover for details">ⓘ</span>
                            )}
                        </div>
                        <span className="text-sm font-semibold text-default-700">{formatPrice(product.price)}</span>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );

    if (hasDescription) {
        return (
            <Tooltip
                content={
                    <div className="max-w-xs p-2">
                        <p className="font-semibold mb-1">{product.name}</p>
                        <p className="text-small text-default-600" dangerouslySetInnerHTML={{ __html: product.description }} />
                    </div>
                }
                placement="top"
                delay={300}
                closeDelay={0}
            >
                {card}
            </Tooltip>
        );
    }

    return card;
}