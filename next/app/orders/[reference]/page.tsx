import CustomerInfo from "./components/customer-info";
import LineItems from "./components/line-items";
import PaymentCard from "./components/payment-card";
import OrderNote from "./components/order-note";
import Service from "./components/service";
export default async function OrderPage({ params }: { params: { reference: string } }) {
    return (
        <div className="overflow-y-auto h-full -m-4 p-4">
            Order #{(await params).reference}
            <Service />
            <LineItems />
            <PaymentCard />
            <OrderNote />
            <CustomerInfo />
        </div>
    );
}