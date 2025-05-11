import Buttons from "./components/buttons";
import Order from "./components/order";

export default async function OrderPage({ params }: { params: { reference: string } }) {
    return (
        <div className="flex flex-col h-full">
            <Order orderId={(await params).reference} />
            <Buttons />
        </div>
    );
}