'use client'

import { useCategoriesQuery } from "@/stores/products";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from '@hugeicons/core-free-icons';
import { Button, Link, Skeleton, useDisclosure } from "@heroui/react";
import { CategoryConfig, useVisibleCategories, VisibleCategoriesProvider } from "./visible-category-config";
import { useSelectedCategory } from "./selected-category";

const decodeHtmlEntities = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

const CategorySkeleton = () => {
    return (
        <Button className="m-1" variant="light" aria-label="Loading category">
            <Skeleton className="w-24 h-4" />
        </Button>
    )
}

const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="-mx-1 my-4 flex flex-wrap" role="list" aria-label="Product categories">
            {children}
        </div>
    )
}

const CategoriesListContent = () => {
    const { data: categories, isLoading } = useCategoriesQuery();
    const { isOpen, onOpenChange, onOpen } = useDisclosure();
    const { visibleCategories } = useVisibleCategories();
    const { selectedCategoryId, setSelectedCategoryId } = useSelectedCategory();

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
            <Link 
                className="m-1 mr-4" 
                onPress={() => setSelectedCategoryId(null)}
                aria-label="Show all categories"
                size="sm"
                color={selectedCategoryId === null ? "primary" : "foreground"}
                href="#"
            >
                All
            </Link>
            {filteredCategories.map((category) => (
                <Link 
                    className="m-1 mr-4" 
                    key={category.id}
                    color={selectedCategoryId === category.id ? "primary" : "foreground"}
                    href="#"
                    onPress={() => setSelectedCategoryId(category.id)}
                    aria-label={`Select ${decodeHtmlEntities(category.name)} category`}
                    size="sm"
                >
                    {decodeHtmlEntities(category.name)}
                </Link>
            ))}
            <Link 
                className="m-1" 
                onPress={onOpen}
                aria-label="Configure visible categories"
                size="sm"
                color="foreground"
                href="#"
            >
                <HugeiconsIcon icon={Settings01Icon} className="h-4 w-4" />
            </Link>
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