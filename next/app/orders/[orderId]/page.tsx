
import Buttons from "./components/buttons";
import CustomerInfo from "./components/customer-info";
import LineItems from "./components/line-items";
import OrderNote from "./components/order-note";
import PaymentCard from "./components/payment-card";
import Service from "./components/service";

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = await params;

    return (
        <div className="flex flex-col h-full w-2/5 min-w-[500]">
            <h2 className="text-xl font-bold mb-4">Order #{orderId}</h2>
            <div className="flex-1 flex flex-row overflow-hidden">
                <div className="flex flex-col h-full w-1/2 p-4">
                    <LineItems />
                    <div className="flex-1"></div>
                    <OrderNote />
                    <PaymentCard />
                </div>
                <div className="w-1/2 overflow-y-auto h-full p-4">
                    <Service />
                    <CustomerInfo />
                </div>
            </div>
            <div className="mx-4">
                <Buttons />
            </div>
        </div>
    );
}