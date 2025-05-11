'use client'
import { ProductSchema } from "@/api/products";
import { useProductsQuery } from "@/stores/products";
import { CardBody, Divider, Table, TableBody, TableCell, TableRow, CardFooter, CardHeader, Card, TableHeader, TableColumn, Kbd } from "@heroui/react";
import { useSelectedCategory } from "./selected-category";
import { useSetOrderLineItem } from "@/stores/orders";

export default function Products() {
    const { data: products, isLoading } = useProductsQuery();
    const { selectedCategoryId } = useSelectedCategory();

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

    const filteredProducts = selectedCategoryId === null 
        ? products 
        : products.filter(product => 
            product.categories?.some(category => category.id === selectedCategoryId)
        );

    return (
        <div className="flex flex-wrap gap-4 my-1 h-full overflow-y-auto p-5 -m-5">
            {filteredProducts.map((product) => (
                <div key={product.id} className="flex-1 min-w-[300px] max-w-[400px]">
                    <ProductCard product={product} />
                </div>
            ))}
        </div>
    );
}

const ProductCard = ({ product }: { product: ProductSchema }) => {
    const { mutate: addToOrder } = useSetOrderLineItem();

    const formatPrice = (price: number) => {
        if (isNaN(price)) return 'N/A';
        return price.toFixed(2);
    };

    return (
        <Card isPressable className="h-full w-full max-h-[300px]" onPress={() => addToOrder({ product, quantity: 1 })}>
            <CardHeader className="flex gap-3">
                <div className="text-left">
                    <p className="text-xl font-bold">{product.name}</p>
                    <p className="text-small text-default-500">{product.variation_name}</p>
                </div>
            </CardHeader>
            {product.description && <Divider />}
            <CardBody className="flex-1">
                <p className="text-black/75 text-small" dangerouslySetInnerHTML={{ __html: product.description }} />
            </CardBody>
            <Divider />
            <CardFooter>
                <Table 
                    className="text-black/50" 
                    removeWrapper 
                    isStriped 
                    hideHeader
                    aria-label={`Product details for ${product.name}`}
                >
                    <TableHeader>
                        <TableColumn>Details</TableColumn>
                        <TableColumn>Value</TableColumn>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell>Price</TableCell>
                            <TableCell className="text-right">{formatPrice(product.price)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>SKU</TableCell>
                            <TableCell className="text-right">{product.sku ? <Kbd>{product.sku}</Kbd> : ''}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardFooter>
        </Card>
    );
}