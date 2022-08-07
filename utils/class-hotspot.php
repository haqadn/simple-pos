<?php

class Hotspot {
    private $username;

    public function __construct( $username ) {
        $this->username = $username;
    }

    public function create_user() {
        // TODO: create a user in the hotspot system
    }

    public function assign_profile() {
        // TODO: assign a profile to the user
    }

    public function getUsername() {
        return $this->username;
    }

    public function getPassword() {
        return wp_generate_password( 5, false, false );
    }
}