'use client'

import { useState, useEffect } from "react";
import { useCategoriesQuery } from "@/stores/products";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from '@hugeicons/core-free-icons';
import { Button, Skeleton, useDisclosure } from "@heroui/react";
import { CategoryConfig } from "./visible-category-config";

const decodeHtmlEntities = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

const STORAGE_KEY = 'visible-categories';

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

export default function CategoriesList() {
    const { data: categories, isLoading } = useCategoriesQuery();
    const { isOpen, onOpenChange, onOpen } = useDisclosure();
    const [visibleCategories, setVisibleCategories] = useState<Set<string>>(() => {
        if (typeof window === 'undefined') return new Set();
        const stored = localStorage.getItem(STORAGE_KEY);
        return new Set(stored ? JSON.parse(stored) : []);
    });

    useEffect(() => {
        const handleStorageChange = () => {
            const stored = localStorage.getItem(STORAGE_KEY);
            setVisibleCategories(new Set(stored ? JSON.parse(stored) : []));
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleSaveCategories = (newCategories: Set<string>) => {
        setVisibleCategories(newCategories);
    };

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
                onSave={handleSaveCategories}
            />
        </Wrapper>
    );
}