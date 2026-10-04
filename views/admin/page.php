<?php
/**
 * Mount point for the cookie consent settings app.
 *
 * The app renders its own `.wrap` container, so this element stays bare.
 *
 * @package Jcore\Evasteet
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

?>
<div id="jcore-evasteet-app"></div>
<noscript>
	<div class="wrap">
		<p><?php esc_html_e( 'The cookie consent settings need JavaScript.', 'jcore-evasteet' ); ?></p>
	</div>
</noscript>
