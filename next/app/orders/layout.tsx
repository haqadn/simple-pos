import CategoriesList from "./components/categories-list";
import Products from "./components/products";

export default function OrderLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-row h-full">
            <div className="w-64">
                Sidebar
                {children}
            </div>
            <div className="flex flex-col h-full flex-1">
                <div className="-m-4 p-4 bg-gray-50">
                    <CategoriesList />
                </div>
                <Products />
            </div>
        </div>
    );
}