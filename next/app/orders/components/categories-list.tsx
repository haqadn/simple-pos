'use client'

import { Chip, Skeleton } from "@heroui/react";
import { useCategoriesQuery } from "@/stores/products";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from '@hugeicons/core-free-icons';

const CategorySkeleton = () => {
    return (
        <Chip className="m-1">
            <Skeleton className="w-24 h-4" />
        </Chip>
    )
}

const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="-mx-1 my-4 flex flex-wrap">
            {children}
        </div>
    )
}

export default function CategoriesList() {
    const { data: categories, isLoading } = useCategoriesQuery();

    if( ! categories && isLoading ) {
        return (
            <Wrapper>
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
            </Wrapper>
        );
    }

    if ( !categories ) {
        return (
            <Wrapper>
                <p>No categories found</p>
            </Wrapper>
        );
    }

    return (
        <Wrapper>
            {categories.map((category) => (
                <Chip className="m-1" key={category.id}>{category.name}</Chip>
            ))}
            <Chip className="m-1">
                <HugeiconsIcon icon={Settings01Icon} className="h-4 w-4" />
            </Chip>
        </Wrapper>
    )
}
