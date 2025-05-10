
export default async function OrderPage({ params }: { params: { reference: string } }) {
    return (
        <>
            Seeing Order #{(await params).reference}
        </>
    );
}