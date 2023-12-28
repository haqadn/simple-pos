<?php

class Report {
    public function init() {
        add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
    }

    public function register_rest_routes() {
        register_rest_route( 'wc/v3/simple-pos', '/report', array(
            'methods' => 'GET',
            'callback' => array( $this, 'get_report' ),
            'permission_callback' => array( $this, 'get_report_permissions_check' ),
            'args' => array(
                'from' => array(
                    'required' => true,
                    'validate_callback' => function($param, $request, $key) {
                        return strtotime($param) !== false;
                    }
                ),
                'to' => array(
                    'required' => true,
                    'validate_callback' => function($param, $request, $key) {
                        return strtotime($param) !== false;
                    }
                ),
            ),
        ) );
    }

    public function get_report_permissions_check( $request ) {
        return current_user_can('manage_woocommerce');
    }

    function get_report( $data ) {
        $from_date = date('Y-m-d H:i:s', strtotime($data['from']));
        $to_date = date('Y-m-d H:i:s', strtotime($data['to']));
    
    
        $report = array();
        $uareport = array();
        
        $page = 1;
        $per_page = 100;
        do {
            $args = array(
                'status' => 'completed',
                'date_created' => $from_date . '...' . $to_date,
                'page' => $page,
                'per_page' => $per_page,
            );
            $orders = wc_get_orders( $args );
            foreach ( $orders as $order ) {
                foreach( $order->get_items() as $item ) {
                    $product_id = $item->get_product_id();
                    if ( !isset( $report[ $product_id ] ) ) {
                        $report[ $product_id ] = array( 'count' => 0, 'total' => 0 );
                    }

                    // If the order was within last 3 hours than add it to a separate array
                    if ( strtotime( $order->get_date_created() ) > strtotime( '-3 hours' ) ) {
                        if ( !isset( $uareport[ $product_id ] ) ) {
                            $uareport[ $product_id ] = array( 'count' => 0, 'total' => 0 );
                        }
                        $uareport[ $product_id ]['count'] += $item->get_quantity();
                        $uareport[ $product_id ]['total'] += $item->get_total();
                    } else {
                        $report[ $product_id ]['count'] += $item->get_quantity();
                        $report[ $product_id ]['total'] += $item->get_total();
                    }
                }
            }
        } while ( count( $orders ) === $per_page && $page++ );

        foreach ( $report as $product_id => $product ) {
            $effective_price = $report[ $product_id ]['total'] / $report[ $product_id ]['count'];
            $report[ $product_id ]['count'] = round( $report[ $product_id ]['count'] * 0.35 );
            $report[ $product_id ]['total'] = round( $report[ $product_id ]['count'] * $effective_price );
        }

        // Add values from ua report to the main report
        foreach ( $uareport as $product_id => $product ) {
            $report[ $product_id ]['count'] += $product['count'];
            $report[ $product_id ]['total'] += $product['total'];
        }

        foreach ( $report as $product_id => $product ) {
            $product = wc_get_product( $product_id );
            $report[ $product_id ]['id'] = $product_id;
            $report[ $product_id ]['sku'] = $product->get_sku();
            $report[ $product_id ]['name'] = $product->get_name();
            $report[ $product_id ]['price'] = $product->get_price();
        }
    
        return new WP_REST_Response( array_values($report), 200 );
    }
}