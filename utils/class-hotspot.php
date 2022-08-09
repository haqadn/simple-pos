<?php

class Hotspot {
    private $username;

    public function __construct( $username ) {
        $this->username = $username;
        $this->password = $this->generatePassword();
    }

    private function get_client() {
        $config = new \RouterOS\Config([
            'host' => ROUTER_HOSTNAME,
            'user' => ROUTER_USERNAME,
            'pass' => ROUTER_PASSWORD,
            'port' => 8728,
        ]);
        $client = new \RouterOS\Client($config);

        return $client;
    }

    public function create_user() {
        $query =
            (new \RouterOS\Query('/ip/hotspot/user/add'))
                ->equal('name', $this->getUsername())
                ->equal('password', $this->getPassword())
                ->equal('limit-uptime', '00:30:00');
        $response = $this->get_client()->query($query)->read();
    }

    public function assign_profile( $profile_name ) {
        $query = (new \RouterOS\Query('/ip/hotspot/user/print'))
            ->where('name', $this->getUsername());
        $response = $this->get_client()->query($query)->read();

    
        if( count($response) == 0 || !isset($response[0]['.id']) ) {
            return;
        }

        $id = $response[0]['.id'];

        $query =
            (new \RouterOS\Query('/ip/hotspot/user/set'))
                ->equal('.id', $id)
                ->equal('profile', $profile_name);
        $response = $this->get_client()->query($query)->read();
    }

    public function getUsername() {
        return $this->username;
    }

    public function getPassword() {
        if( !$this->password ) {
            $this->password = $this->generatePassword();
        }
        return $this->password;
    }

    /**
     * Loosly based on wp_generate_password()
     */
    private function generatePassword() {
        $chars = '0123456789';

        $password = '';
        for ( $i = 0; $i < 5; $i++ ) {
            $password .= substr( $chars, wp_rand( 0, strlen( $chars ) - 1 ), 1 );
        }

        return $password;
    }
}