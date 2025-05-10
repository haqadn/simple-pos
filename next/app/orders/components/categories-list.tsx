'use client'

import { Chip, Skeleton } from "@heroui/react";
import { useProductsStore } from "@/stores/products";

const CategorySkeleton = () => {
    return (
        <Chip className="m-1">
            <Skeleton className="w-24 h-4" />
        </Chip>
    )
}

export default function CategoriesList() {
    const { categoriesQuery: { data: categories, isLoading } } = useProductsStore();

    if( isLoading && categories.length === 0 ) {
        return (
            <div className="-mx-1">
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
            </div>
        );
    }

    return (
        <div className="-mx-1">
            {categories.map((category) => (
                <Chip className="m-1" key={category.id}>{category.name}</Chip>
            ))}
        </div>
    )
}