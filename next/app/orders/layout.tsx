import { Divider } from "@heroui/react";
import CategoriesList from "./components/categories-list";
import Products from "./components/products";
import { SelectedCategoryProvider } from "./components/selected-category";

export default function OrderLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-row h-full -mx-4">
            <div className="w-96 px-4">
                {children}
            </div>
            <div className="flex flex-col h-full flex-1 px-4">
                <SelectedCategoryProvider>
                    <div className="-m-4 p-4">
                        <CategoriesList />
                    </div>
                    <Divider />
                    <Products />
                </SelectedCategoryProvider>
            </div>
        </div>
    );
}