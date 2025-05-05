export default async function OrderPage({ params }: { params: { reference: string } }) {
    return (
        <div>
            <h1>Seeing Order #{(await params).reference}</h1>
        </div>
    );
}