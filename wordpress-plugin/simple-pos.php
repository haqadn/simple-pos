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

    // ------------------------------------------------------------
    // Updates hosting helper (for Electron auto-updates)
    // ------------------------------------------------------------
    // This allows CI to upload update artifacts to a stable URL under wp-uploads:
    //   /wp-content/uploads/simple-pos-updates/
    // using a WordPress Application Password (Basic Auth).

    register_rest_route('simple-pos/v1', '/updates/upload', array(
        'methods' => 'POST',
        'permission_callback' => function() {
            return current_user_can('manage_options');
        },
        'callback' => function( $request ) {
            $params = $request->get_params();
            $name   = isset( $params['name'] ) ? sanitize_file_name( $params['name'] ) : '';

            if ( empty( $name ) ) {
                return new WP_Error( 'simplepos_missing_name', 'Missing required parameter: name', array( 'status' => 400 ) );
            }

            if ( empty( $_FILES ) || empty( $_FILES['file'] ) ) {
                return new WP_Error( 'simplepos_missing_file', 'Missing required file upload: file', array( 'status' => 400 ) );
            }

            $upload_dir = wp_upload_dir();
            $base_dir   = trailingslashit( $upload_dir['basedir'] ) . 'simple-pos-updates/';
            $base_url   = trailingslashit( $upload_dir['baseurl'] ) . 'simple-pos-updates/';

            if ( ! file_exists( $base_dir ) ) {
                wp_mkdir_p( $base_dir );
            }

            $tmp  = $_FILES['file']['tmp_name'];
            $dest = $base_dir . $name;

            if ( ! @move_uploaded_file( $tmp, $dest ) ) {
                // Fallback if move_uploaded_file fails (some hosts)
                if ( ! @copy( $tmp, $dest ) ) {
                    return new WP_Error( 'simplepos_upload_failed', 'Failed to save uploaded file', array( 'status' => 500 ) );
                }
            }

            return rest_ensure_response( array(
                'ok'  => true,
                'url' => $base_url . $name,
                'path' => $dest,
            ) );
        }
    ) );

    register_rest_route('simple-pos/v1', '/updates/base', array(
        'methods' => 'GET',
        'permission_callback' => function() {
            return current_user_can('manage_options');
        },
        'callback' => function() {
            $upload_dir = wp_upload_dir();
            return rest_ensure_response( array(
                'baseUrl' => trailingslashit( $upload_dir['baseurl'] ) . 'simple-pos-updates/',
            ) );
        }
    ) );
});
