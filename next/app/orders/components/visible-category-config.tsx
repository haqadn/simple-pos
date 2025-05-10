'use client'

import { useState, useEffect, createContext, useContext } from "react";
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

const STORAGE_KEY = 'visible-category-filters';

const decodeHtmlEntities = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

type VisibleCategoriesContextType = {
    visibleCategories: Set<string>;
    saveVisibleCategories: (categories: Set<string>) => void;
};

const VisibleCategoriesContext = createContext<VisibleCategoriesContextType | null>(null);

export const VisibleCategoriesProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, setState] = useState<{ categories: Set<string>, version: number }>(() => {
        if (typeof window === 'undefined') return { categories: new Set<string>(), version: 0 };
        const stored = localStorage.getItem(STORAGE_KEY);
        return { 
            categories: new Set(stored ? JSON.parse(stored) : []),
            version: 0
        };
    });

    useEffect(() => {
        const handleStorageChange = () => {
            const stored = localStorage.getItem(STORAGE_KEY);
            setState(prev => ({
                categories: new Set(stored ? JSON.parse(stored) : []),
                version: prev.version + 1
            }));
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const saveVisibleCategories = (categories: Set<string>) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...categories]));
        setState(prev => ({
            categories,
            version: prev.version + 1
        }));
    };

    return (
        <VisibleCategoriesContext.Provider value={{
            visibleCategories: state.categories,
            saveVisibleCategories
        }}>
            {children}
        </VisibleCategoriesContext.Provider>
    );
};

export const useVisibleCategories = () => {
    const context = useContext(VisibleCategoriesContext);
    if (!context) {
        throw new Error('useVisibleCategories must be used within a VisibleCategoriesProvider');
    }
    return context;
};

export const CategoryConfig = ({ 
    isOpen, 
    onOpenChange,
}: { 
    isOpen: boolean, 
    onOpenChange: (isOpen: boolean) => void,
}) => {
    const { data: categories } = useCategoriesQuery();
    const { visibleCategories, saveVisibleCategories } = useVisibleCategories();
    const [localVisibleCategories, setLocalVisibleCategories] = useState(visibleCategories);

    useEffect(() => {
        setLocalVisibleCategories(visibleCategories);
    }, [visibleCategories]);

    const handleToggleCategory = (categoryId: number) => {
        const categoryIdStr = categoryId.toString();
        const newVisibleCategories = new Set(localVisibleCategories);
        if (newVisibleCategories.has(categoryIdStr)) {
            newVisibleCategories.delete(categoryIdStr);
        } else {
            newVisibleCategories.add(categoryIdStr);
        }
        setLocalVisibleCategories(newVisibleCategories);
    };

    const handleSave = (onClose: () => void) => {
        saveVisibleCategories(localVisibleCategories);
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
                                        isSelected={localVisibleCategories.has(category.id.toString())}
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
