<?php
/**
 * Plugin Name:       Simple POS
 * Description:       A simple POS front-end for WooCommerce.
 * Version: 2.0
 * Author:            Adnan Haque
 * Author URI:        https://eadnan.com
 * Domain Path:       /languages
 */
require plugin_dir_path( __FILE__ ) . 'vendor/autoload.php';
require_once plugin_dir_path( __FILE__ ) . 'utils/class-hotspot.php';
require_once plugin_dir_path( __FILE__ ) . 'utils/class-authentication.php';


function spos_register_scripts() {
    wp_register_style( 'simple-pos-iconfont', 'https://cdn.jsdelivr.net/npm/@mdi/font@6.x/css/materialdesignicons.min.css', array(), '1.0.0', 'all' );
    wp_register_style( 'simple-pos', plugins_url( 'front-end/dist/assets/style.css', __FILE__ ), array('simple-pos-iconfont'), '1.0.0', 'all' );
    wp_register_script( 'simple-pos', plugins_url( 'front-end/dist/index.js', __FILE__ ), array(), '1.0.0', true );
    wp_localize_script( 'simple-pos', 'simplePosSettings', array(
        'nonce' => wp_create_nonce( 'wp_rest' ),
        'apiBase' => rest_url( 'wc/v3' ),
        'wpAdmin' => admin_url(),
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

function spos_register_post_type() {
    register_post_type( 'qt',
        array(
			'labels'                => array(
                'name'              => 'QT',

			),
			'public'                => true,
			'capability_type'       => 'post',
			'map_meta_cap'          => true,
			'menu_position'         => 56,
			'menu_icon'             => 'dashicons-admin-post',
			'hierarchical'          => false,
			'rewrite'               => false,
			'query_var'             => false,
			'delete_with_user'      => true,
			'supports'              => array( 'title', 'editor', 'custom-fields' ),
			'show_in_rest'          => true,
			'rest_base'             => 'qt',
		));
}
add_action( 'init', 'spos_register_post_type' );
