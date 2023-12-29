<?php

class Customers {
    // Initialize the class
    public function init() {
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }

    // Register REST API routes
    public function register_rest_routes() {
        register_rest_route('wc/v3/simple-pos', '/customers', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_customers'),
            'permission_callback' => array($this, 'get_customers_permissions_check'),
            'args' => array(
                'search' => array(
                    'required' => true,
                    'validate_callback' => function($param, $request, $key) {
                        return !empty($param);
                    }
                ),
            ),
        ));
    }

    // Check if the user has permission to access customer data
    public function get_customers_permissions_check($request) {
        // Check if the current user can manage WooCommerce
        return current_user_can('manage_woocommerce');
    }

    // Handle retrieving customer data and return the result
    public function get_customers($request) {
        global $wpdb; // Global WordPress database object
    
        // Retrieve the 'search' parameter from the request
        $search = $request->get_param('search');
    
        // Start building the SQL query
        $query = "SELECT CONCAT(first_name, ' ', last_name) as name, phone FROM {$wpdb->prefix}wc_order_addresses";
    
        // Using OR conditions to search across first_name, last_name, and phone
        $search_like = '%' . $wpdb->esc_like($search) . '%';
        // Modify the query to search for full name (concatenated first and last names) or phone
        $query .= $wpdb->prepare(" WHERE (CONCAT(first_name, ' ', last_name) LIKE %s OR phone LIKE %s)", 
                                $search_like, $search_like);

        // Order by ID in descending order and limit to the 5 latest entries
        $query .= " ORDER BY id DESC LIMIT 5";
    
        // Execute the query
        $customers = $wpdb->get_results($query);
    
        // Return the response with just the customers data
        return new WP_REST_Response([ 'customers' => $customers ], 200);
    }
    
}
