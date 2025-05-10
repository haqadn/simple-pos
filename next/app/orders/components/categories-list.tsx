'use client'

import { useCategoriesQuery } from "@/stores/products";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from '@hugeicons/core-free-icons';
import { Button, Skeleton, useDisclosure } from "@heroui/react";
import { CategoryConfig, useVisibleCategories, VisibleCategoriesProvider } from "./visible-category-config";

const decodeHtmlEntities = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

const CategorySkeleton = () => {
    return (
        <Button className="m-1" variant="light">
            <Skeleton className="w-24 h-4" />
        </Button>
    )
}

const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="-mx-1 my-4 flex flex-wrap">
            {children}
        </div>
    )
}

const CategoriesListContent = () => {
    const { data: categories, isLoading } = useCategoriesQuery();
    const { isOpen, onOpenChange, onOpen } = useDisclosure();
    const { visibleCategories } = useVisibleCategories();

    if (!categories && isLoading) {
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

    if (!categories) {
        return (
            <Wrapper>
                <p>No categories found</p>
            </Wrapper>
        );
    }

    const filteredCategories = categories.filter(category => 
        visibleCategories.size === 0 || visibleCategories.has(category.id.toString())
    );

    return (
        <Wrapper>
            {filteredCategories.map((category) => (
                <Button className="m-1" variant="light" key={category.id}>
                    {decodeHtmlEntities(category.name)}
                </Button>
            ))}
            <Button className="m-1" variant="light" onPress={onOpen}>
                <HugeiconsIcon icon={Settings01Icon} className="h-4 w-4" />
            </Button>
            <CategoryConfig 
                isOpen={isOpen} 
                onOpenChange={onOpenChange}
            />
        </Wrapper>
    );
};

export default function CategoriesList() {
    return (
        <VisibleCategoriesProvider>
            <CategoriesListContent />
        </VisibleCategoriesProvider>
    );
}