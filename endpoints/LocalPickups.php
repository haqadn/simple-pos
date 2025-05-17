<?php

namespace SimplePOS\Endpoints;

class LocalPickups {
    public function init() {
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }

    public function register_rest_routes() {
        register_rest_route('wc/v3/simple-pos', '/shipping_methods/local_pickup', array(
            'methods' => 'GET',
            'callback' => function($request) {
                // Get the shipping method
                $shipping_method = WC()->shipping()->get_shipping_methods()['local_pickup'];
                
                // Get pickup locations from shipping method settings
                $pickup_locations = get_option('pickup_location_pickup_locations');
                
                // Prepare the response
                $response = array(
                    'id' => 'local_pickup',
                    'title' => $shipping_method->get_method_title(),
                    'description' => $shipping_method->get_method_description(),
                    'pickup_locations' => $pickup_locations
                );
                
                return rest_ensure_response($response);
            },
            'permission_callback' => array($this, 'get_local_pickups_permissions_check'),
        ));
    }

    public function get_local_pickups_permissions_check($request) {
        return current_user_can('manage_woocommerce');
    }
    
    
}