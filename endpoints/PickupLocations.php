<?php

namespace SimplePOS\Endpoints;

class PickupLocations {
    public function init() {
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }

    public function register_rest_routes() {
        register_rest_route('wc/v3/simple-pos', '/pickup-locations', array(
            'methods' => 'GET',
            'callback' => array($this, 'response'),
            'permission_callback' => array($this, 'permissions_check'),
        ));
    }

    public function response( $request ) {
        // Get pickup locations from shipping method settings
        $pickup_locations = get_option('pickup_location_pickup_locations');

        // Prepare the response
        $response = array(
            'id' => 'tables',
            'title' => 'Tables',
            'description' => 'Tables as configured as pickup locations in local pickup shipping method',
            'pickup_locations' => is_array( $pickup_locations ) ? $pickup_locations : array()
        );
        
        return rest_ensure_response($response);
    }

    public function permissions_check($request) {
        return current_user_can('manage_woocommerce');
    }
    
    
}