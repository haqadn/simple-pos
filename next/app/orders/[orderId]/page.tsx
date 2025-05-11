import Buttons from "./components/buttons";
import Order from "./components/order";

export default async function OrderPage({ params }: { params: { orderId: string } }) {
    return (
        <div className="flex flex-col h-full">
            <Order orderId={params.orderId} />
            <Buttons />
        </div>
    );
}