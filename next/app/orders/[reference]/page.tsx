import CategoriesList from "../components/categories-list";
import Products from "../components/products";

export default async function OrderPage({ params }: { params: { reference: string } }) {
    return (
        <div>
            <h1>Seeing Order #{(await params).reference}</h1>
            <CategoriesList />
            <Products />
        </div>
    );
}