// Generate WooCommerce API credentials (executed via wp eval)
if (!function_exists('wc_rand_hash')) {
    require_once WP_PLUGIN_DIR . '/woocommerce/includes/wc-core-functions.php';
}

// Get admin user
$admin_user = get_user_by('login', 'admin');
if (!$admin_user) {
    $admin_id = wp_create_user('admin', 'password', 'admin@example.com');
    $admin_user = get_user_by('ID', $admin_id);
    $admin_user->set_role('administrator');
}

// Generate new API key
$consumer_key = 'ck_' . wc_rand_hash();
$consumer_secret = 'cs_' . wc_rand_hash();

global $wpdb;

// Delete old E2E test keys
$wpdb->query("DELETE FROM {$wpdb->prefix}woocommerce_api_keys WHERE description LIKE 'E2E Tests%'");

// Insert new key
$wpdb->insert(
    $wpdb->prefix . 'woocommerce_api_keys',
    array(
        'user_id' => $admin_user->ID,
        'description' => 'E2E Tests',
        'permissions' => 'read_write',
        'consumer_key' => wc_api_hash($consumer_key),
        'consumer_secret' => $consumer_secret,
        'truncated_key' => substr($consumer_key, -7),
    ),
    array('%d', '%s', '%s', '%s', '%s', '%s')
);

// Output JSON
echo json_encode(array(
    'consumer_key' => $consumer_key,
    'consumer_secret' => $consumer_secret
));
