<?php
/**
 * Plugin Name:       Simple POS
 * Description:       A simple POS front-end for WooCommerce.
 * Version: 3.9
 * Author:            Adnan Haque
 * Author URI:        https://eadnan.com
 * Domain Path:       /languages
 */

use SimplePOS\Endpoints\PickupLocations;
use SimplePOS\Endpoints\Customers;
use SimplePOS\Endpoints\Orders;

$autoload = plugin_dir_path( __FILE__ ) . 'vendor/autoload.php';

// If this plugin was built with Composer, use the generated autoloader.
// Otherwise, fall back to a minimal PSR-4 autoloader (no external deps required).
if ( file_exists( $autoload ) ) {
	require $autoload;
} else {
	spl_autoload_register( function ( $class ) {
		$prefix   = 'SimplePOS\\Endpoints\\';
		$base_dir = plugin_dir_path( __FILE__ ) . 'endpoints/';

		$len = strlen( $prefix );
		if ( strncmp( $prefix, $class, $len ) !== 0 ) {
			return;
		}

		$relative_class = substr( $class, $len );
		$file           = $base_dir . str_replace( '\\', '/', $relative_class ) . '.php';

		if ( file_exists( $file ) ) {
			require $file;
		}
	} );
}

// Instantiate and initialize the custom endpoints
(new Customers())->init();
(new PickupLocations())->init();
(new Orders())->init();

add_action( 'init', function() {
	if ( defined( 'WP_CLI' ) && WP_CLI ) {
		return;
	}

	$request_uri = $_SERVER['REQUEST_URI'] ?? '';
	if ( ( defined( 'REST_REQUEST' ) && REST_REQUEST ) || strpos( $request_uri, '/wp-json/' ) === 0 ) {
		$_SERVER['HTTPS'] = 'on';
	}
}, 0 );

add_filter( 'rest_pre_serve_request', function( $served, $result, $request, $server ) {
	if ( strpos( $request->get_route(), '/wc/v3/' ) !== 0 ) {
		return $served;
	}

	header( 'Access-Control-Allow-Origin: *' );
	header( 'Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS' );
	header( 'Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce' );

	return $served;
}, 10, 4 );

add_filter('woocommerce_checkout_get_value', function($input, $key ) {

	global $current_user;

	switch ($key) :
		case 'billing_city':
		case 'shipping_city':
			return get_option( 'woocommerce_store_city' );
		break;
		case 'billing_postcode':
		case 'shipping_postcode':
			return get_option( 'woocommerce_store_postcode' );
		break;
	endswitch;

}, 10, 2);

// Register custom endpoint for local pickup shipping method
add_action('rest_api_init', function() {
    register_rest_route('wc/v3', '/shipping_methods/local_pickup', array(
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
        'permission_callback' => function() {
            return current_user_can('manage_woocommerce');
        }
    ));
});
