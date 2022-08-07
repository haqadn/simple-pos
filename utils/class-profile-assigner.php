<?php

class Profile_Assigner {
    private $order;

    public function __construct( $order ) {
        $this->order = $order;
    }

    public function get_profile_name() {
        $item_count = $this->count_items();

        switch ( $item_count ) {
            case 1:
                return 'one-item';
            default:
                return 'large-order';
        }
    }

    private function count_items( ) {
        $total_quantity = 0;
        foreach ( $this->order->get_items() as $item_id => $item ) {
           $quantity = $item->get_quantity();
           $total_quantity += $quantity;
        }
        return $total_quantity;
    }
}       