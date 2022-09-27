<?php

class Authentication {
    public function __construct() {
        add_action( 'wp_ajax_hotspot_login', array( $this, 'login' ) );
        add_action( 'wp_ajax_nopriv_hotspot_login', array( $this, 'login' ) );
    }

    private function get_credentials() {
        return array(
            'username' => HOTSPOT_USERNAME,
            'password' => HOTSPOT_PASSWORD,
        );

        return $credentials;
    }

    public function login() {
        $orderNumber = $_POST['orderNumber'];
        $password = $_POST['password'];
        $phone = $_POST['phone'];

        try {
            $order = wc_get_order( $orderNumber );
            if( !$order ) {
                throw new Exception( 'Order not found' );
            }
    
            $wifiPassword = $order->get_meta( 'wifi_password', true );
            if( $wifiPassword != $password ) {
                throw new Exception( 'Invalid password' );
            }

            $credentials = $this->get_credentials();
            $order->set_billing_phone( $phone );
            $order->save();
            wp_send_json( $credentials );
        } catch (Exception $e) {

            // If the order authentication didn't work, perhaps an actual hotspot login credentials was submitted. Pass them back to the client.
            // The client will then try to login with the hotspot credentials.
            wp_send_json( array(
                'username' => $orderNumber,
                'password' => $password,
            ) );
        }

        exit;
    }
}

new Authentication();