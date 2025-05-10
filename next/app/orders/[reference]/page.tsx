import CustomerInfo from "./components/customer-info";
import LineItems from "./components/line-items";
import PaymentCard from "./components/payment-card";

export default async function OrderPage({ params }: { params: { reference: string } }) {
    return (
        <>
            Seeing Order #{(await params).reference}
            <LineItems />
            <PaymentCard />
            <CustomerInfo />
        </>
    );
}