export const BASE_URL = 'https://wordpress.simple-pos.orb.local/wp-json/wc/v3';
export const CONSUMER_KEY = 'ck_857f37fac852b7cb5d03711cfa8041f6b9766016';
export const CONSUMER_SECRET = 'cs_9f3abbe9282c208645b6b8aa49c254c4bc3c3cdd';

const get = async ( path: string ) => {
    const response = await fetch(`${BASE_URL}/${path}`, {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64')}`
        }
    });

    return response.json();
}

export const getOrders = () => get('orders');