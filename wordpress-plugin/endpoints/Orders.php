<?php

namespace SimplePOS\Endpoints;

class Orders {
    public function init() {
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }

    public function register_rest_routes() {
        register_rest_route('wc/v3', '/simple-pos/orders', array(
            array(
                'methods' => 'GET',
                'callback' => array($this, 'search_orders'),
                'permission_callback' => array($this, 'permissions_check'),
                'args' => array(
                    'search' => array(
                        'required' => true,
                        'validate_callback' => function($param) {
                            return !empty($param);
                        }
                    ),
                ),
            ),
            array(
                'methods' => 'OPTIONS',
                'callback' => function() {
                    return new \WP_REST_Response(null, 200);
                },
                'permission_callback' => '__return_true',
            ),
        ));
    }

    public function permissions_check() {
        return current_user_can('manage_woocommerce');
    }

    public function search_orders($request) {
        $search = $request->get_param('search');
        $found_orders = [];

        // Search by pos_frontend_id meta
        $meta_orders = wc_get_orders(array(
            'limit' => 10,
            'orderby' => 'date',
            'order' => 'DESC',
            'meta_query' => array(
                array(
                    'key' => 'pos_frontend_id',
                    'value' => $search,
                    'compare' => 'LIKE',
                ),
            ),
        ));

        foreach ($meta_orders as $order) {
            $found_orders[$order->get_id()] = $order;
        }

        // Search by server ID if numeric
        if (is_numeric($search)) {
            $exact = wc_get_order((int) $search);
            if ($exact && $exact->get_id()) {
                $found_orders[$exact->get_id()] = $exact;
            }
        }

        // Format results
        $results = array();
        foreach ($found_orders as $order) {
            $results[] = array(
                'id' => $order->get_id(),
                'pos_frontend_id' => $order->get_meta('pos_frontend_id') ?: null,
                'total' => $order->get_total(),
                'date_created' => $order->get_date_created() ? $order->get_date_created()->format('Y-m-d H:i:s') : '',
                'status' => $order->get_status(),
            );
        }

        // Sort by date descending and limit
        usort($results, function($a, $b) {
            return strcmp($b['date_created'], $a['date_created']);
        });
        $results = array_slice($results, 0, 10);

        return new \WP_REST_Response(['orders' => $results], 200);
    }
}
