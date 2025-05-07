import CategoriesList from "./components/categories-list";
import Products from "./components/products";

export default function OrderLayout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <CategoriesList />
            <Products />
            {children}
        </div>
    );
}