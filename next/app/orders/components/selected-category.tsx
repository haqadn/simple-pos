'use client'

import { createContext, useContext, useState } from "react";

type SelectedCategoryContextType = {
    selectedCategoryId: number | null;
    setSelectedCategoryId: (id: number | null) => void;
};

const SelectedCategoryContext = createContext<SelectedCategoryContextType | null>(null);

export const SelectedCategoryProvider = ({ children }: { children: React.ReactNode }) => {
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(41);

    return (
        <SelectedCategoryContext.Provider value={{
            selectedCategoryId,
            setSelectedCategoryId
        }}>
            {children}
        </SelectedCategoryContext.Provider>
    );
};

export const useSelectedCategory = () => {
    const context = useContext(SelectedCategoryContext);
    if (!context) {
        throw new Error('useSelectedCategory must be used within a SelectedCategoryProvider');
    }
    return context;
}; 