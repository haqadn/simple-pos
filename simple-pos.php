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

require plugin_dir_path( __FILE__ ) . 'vendor/autoload.php';

// Instantiate and initialize the custom endpoints
(new Customers())->init();
(new PickupLocations())->init();

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


function spos_register_scripts() {

	$manifest = json_decode( file_get_contents( plugin_dir_path( __FILE__ ) . 'front-end/dist/manifest.json' ), true );

	$js = $manifest['index.html']['file'];
	$css = $manifest['style.css']['file'];

	wp_register_style( 'simple-pos-iconfont', 'https://cdn.jsdelivr.net/npm/@mdi/font@6.x/css/materialdesignicons.min.css', array(), '1.0.0', 'all' );
	wp_register_style( 'simple-pos', plugins_url( "front-end/dist/$css", __FILE__ ), array('simple-pos-iconfont'), '1.0.0', 'all' );
	wp_register_script( 'simple-pos', plugins_url( "front-end/dist/$js", __FILE__ ), array(), '1.0.0', true );
	wp_localize_script( 'simple-pos', 'simplePosSettings', array(
		'nonce' => wp_create_nonce( 'wp_rest' ),
		'url' => get_bloginfo( 'url' ),
		'method' => 'nonce'
	) );
}
add_action( 'wp_enqueue_scripts', 'spos_register_scripts' );

function spos_shortcode() {
	ob_start();
	wp_enqueue_style( 'simple-pos-iconfont' );
	wp_enqueue_style( 'simple-pos' );
	wp_enqueue_script( 'simple-pos' );
	add_filter('script_loader_tag', 'spos_add_type_attribute' , 10, 3);
	?>
	<div id="pos-app"></div>
	<?php
	return ob_get_clean();
}
add_shortcode('simple-pos', 'spos_shortcode');


function spos_add_type_attribute($tag, $handle, $src) {
	if ( 'simple-pos' === $handle){
		$tag = '<script crossorigin type="module" type="text/javascript" src="' . esc_url( $src ) . '" id="simple-pos"></script>';   
	}
	return $tag;
}

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
