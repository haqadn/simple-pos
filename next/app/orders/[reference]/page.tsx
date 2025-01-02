export default function OrderPage({ params }: { params: { reference: string } }) {
    return (
        <div>
            <h1>Order {params.reference}</h1>
        </div>
    );
}