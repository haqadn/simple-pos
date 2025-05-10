'use client'

import { useState } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Checkbox,
} from "@heroui/react";
import { useCategoriesQuery } from "@/stores/products";

const STORAGE_KEY = 'visible-categories';

const decodeHtmlEntities = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

export const CategoryConfig = ({ 
    isOpen, 
    onOpenChange,
    onSave
}: { 
    isOpen: boolean, 
    onOpenChange: (isOpen: boolean) => void,
    onSave: (categories: Set<string>) => void
}) => {
    const { data: categories } = useCategoriesQuery();
    const [visibleCategories, setVisibleCategories] = useState<Set<string>>(() => {
        if (typeof window === 'undefined') return new Set();
        const stored = localStorage.getItem(STORAGE_KEY);
        return new Set(stored ? JSON.parse(stored) : []);
    });

    const handleToggleCategory = (categoryId: number) => {
        const categoryIdStr = categoryId.toString();
        const newVisibleCategories = new Set(visibleCategories);
        if (newVisibleCategories.has(categoryIdStr)) {
            newVisibleCategories.delete(categoryIdStr);
        } else {
            newVisibleCategories.add(categoryIdStr);
        }
        setVisibleCategories(newVisibleCategories);
    };

    const handleSave = (onClose: () => void) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...visibleCategories]));
        onSave(visibleCategories);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">Configure Visible Categories</ModalHeader>
                        <ModalBody>
                            <div className="flex flex-col gap-2">
                                {categories?.map((category) => (
                                    <Checkbox
                                        key={category.id}
                                        isSelected={visibleCategories.has(category.id.toString())}
                                        onValueChange={() => handleToggleCategory(category.id)}
                                    >
                                        {decodeHtmlEntities(category.name)}
                                    </Checkbox>
                                ))}
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="primary" onPress={() => handleSave(onClose)}>
                                Done
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
