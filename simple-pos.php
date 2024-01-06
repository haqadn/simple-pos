<?php
/**
 * Plugin Name:       Simple POS
 * Description:       A simple POS front-end for WooCommerce.
 * Version: 3.7
 * Author:            Adnan Haque
 * Author URI:        https://eadnan.com
 * Domain Path:       /languages
 */
require plugin_dir_path( __FILE__ ) . 'vendor/autoload.php';
require_once plugin_dir_path( __FILE__ ) . 'utils/class-hotspot.php';
require_once plugin_dir_path( __FILE__ ) . 'utils/class-authentication.php';
require_once plugin_dir_path( __FILE__ ) . 'utils/class-report.php';
require_once plugin_dir_path( __FILE__ ) . 'utils/class-customers.php';

// Init report endpoint
$report = new Report();
$report->init();


// Instantiate and initialize the Customers endpoint
$customers = new Customers();
$customers->init();


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

function spos_on_order_created( $order_id, $order ) {
	$order->update_meta_data( 'wifi_password', Hotspot::generatePassword() );
}
// add_action( 'woocommerce_new_order', 'spos_on_order_created', 10, 2 );

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
