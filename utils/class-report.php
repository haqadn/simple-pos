<?php

class Report {
    public function init() {
        add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
    }

    public function register_rest_routes() {
        register_rest_route( 'simple-pos/v1', '/report', array(
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
        return true;
    }

    function get_report( $data ) {
        $from_date = date('Y-m-d H:i:s', strtotime($data['from']));
        $to_date = date('Y-m-d H:i:s', strtotime($data['to']));
    
        // Query to get orders between the specified dates
        $args = array(
            'status' => 'completed',
            'date_created' => $from_date . '...' . $to_date,
        );
    
        $orders = wc_get_orders( $args );
        $report = array();
    
        foreach ( $orders as $order ) {
            foreach( $order->get_items() as $item ) {
                $product_id = $item->get_product_id();
                if ( !isset( $report[ $product_id ] ) ) {
                    $report[ $product_id ] = array( 'count' => 0, 'total' => 0 );
                }
                $report[ $product_id ]['count']++;
                $report[ $product_id ]['total'] += $item->get_total();
            }
        }
    
        return new WP_REST_Response( $report, 200 );
    }
}