import Buttons from "./components/buttons";
import Order from "./components/order";

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = await params;

    return (
        <div className="flex flex-col h-full">
            <Order orderId={orderId} />
            <Buttons />
        </div>
    );
}