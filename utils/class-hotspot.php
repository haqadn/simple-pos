<?php

class Hotspot {
    /**
     * Loosly based on wp_generate_password()
     */
    public static function generatePassword() {
        $chars = '0123456789';

        $password = '';
        for ( $i = 0; $i < 5; $i++ ) {
            $password .= substr( $chars, wp_rand( 0, strlen( $chars ) - 1 ), 1 );
        }

        return $password;
    }
}