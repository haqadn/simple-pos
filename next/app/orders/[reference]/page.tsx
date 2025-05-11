import CustomerInfo from "./components/customer-info";
import LineItems from "./components/line-items";
import PaymentCard from "./components/payment-card";
import OrderNote from "./components/order-note";
export default async function OrderPage({ params }: { params: { reference: string } }) {
    return (
        <>
            Order #{(await params).reference}
            <LineItems />
            <PaymentCard />
            <OrderNote />
            <CustomerInfo />
        </>
    );
}