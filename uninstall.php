<?php
/**
 * Removes the plugin's settings when it is deleted.
 *
 * Visitors' answers live in their own browsers and are not touched.
 *
 * @package Jcore\Evasteet
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

/**
 * Deletes the plugin's options on the current site.
 *
 * Names are spelled out rather than read from the classes so this file stands
 * alone, as uninstall.php runs without the plugin loaded.
 *
 * @return void
 */
function jcore_evasteet_uninstall_site(): void {
	delete_option( 'jcore_evasteet_settings' );
	delete_option( 'jcore_evasteet_text' );
}

if ( is_multisite() ) {
	$jcore_evasteet_site_ids = get_sites(
		array(
			'fields' => 'ids',
			'number' => 0,
		)
	);

	foreach ( $jcore_evasteet_site_ids as $jcore_evasteet_site_id ) {
		switch_to_blog( (int) $jcore_evasteet_site_id );
		jcore_evasteet_uninstall_site();
		restore_current_blog();
	}
} else {
	jcore_evasteet_uninstall_site();
}
