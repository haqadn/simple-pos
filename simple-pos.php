<?php
/**
 * Plugin Name:       Simple POS
 * Description:       A simple POS front-end for WooCommerce.
 * Version:           1.0
 * Author:            Adnan Haque
 * Author URI:        https://eadnan.com
 * Domain Path:       /languages
 */
require plugin_dir_path( __FILE__ ) . 'vendor/autoload.php';
require_once plugin_dir_path( __FILE__ ) . 'utils/class-profile-assigner.php';
require_once plugin_dir_path( __FILE__ ) . 'utils/class-hotspot.php';


function spos_register_scripts() {
    wp_register_style( 'simple-pos-iconfont', 'https://cdn.jsdelivr.net/npm/@mdi/font@6.x/css/materialdesignicons.min.css', array(), '1.0.0', 'all' );
    wp_register_style( 'simple-pos', plugins_url( 'front-end/dist/assets/style.css', __FILE__ ), array('simple-pos-iconfont'), '1.0.0', 'all' );
    wp_register_script( 'simple-pos', plugins_url( 'front-end/dist/index.js', __FILE__ ), array(), '1.0.0', true );
    wp_localize_script( 'simple-pos', 'simplePosSettings', array(
        'nonce' => wp_create_nonce( 'wp_rest' ),
        'apiBase' => rest_url( 'wc/v3' ),
        'wpAdmin' => admin_url(),
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

function spos_create_hotspot_user( $order_id, $order ) {
    // No wifi password is set in this order
    if( !$order->get_meta('wifi_password') ) {
        return;
    }

    $hotspot = new Hotspot( $order_id );
    $hotspot->setPassword( $order->get_meta('wifi_password') );
    $hotspot->create_user();
}
add_action( 'spos_create_hotspot_user', 'spos_create_hotspot_user', 10, 2 );

function spos_assign_hotspot_profile( $order_id, $order ) {
    // No wifi password is set in this order
    if( !$order->get_meta('wifi_password') ) {
        return;
    }

    $hotspot = new Hotspot( $order_id );
    $profile_assigner = new Profile_Assigner($order);
    $hotspot->assign_profile( $profile_assigner->get_profile_name() );
}
add_action( 'spos_assign_hotspot_profile', 'spos_assign_hotspot_profile', 10, 2 );

function spos_on_order_created( $order_id, $order ) {
    $order->update_meta_data( 'wifi_password', Hotspot::generatePassword() );
    wp_schedule_single_event( time(), 'spos_create_hotspot_user', array( $order_id, $order ) );
    wp_schedule_single_event( time()+1, 'spos_assign_hotspot_profile', array( $order_id, $order ) );
}
// add_action( 'woocommerce_new_order', 'spos_on_order_created', 10, 2 );

function spos_on_order_updated( $order_id, $order ) {
    wp_schedule_single_event( time(), 'spos_assign_hotspot_profile', array( $order_id, $order ) );
}
// add_action( 'woocommerce_update_order', 'spos_on_order_updated', 10, 2 );
