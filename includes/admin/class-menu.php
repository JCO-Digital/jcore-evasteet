<?php
/**
 * The Settings > Cookie consent screen and the React app it hosts.
 *
 * @package Jcore\Evasteet
 */

namespace Jcore\Evasteet\Admin;

use Jcore\Evasteet\Banner;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the admin page and enqueues its assets.
 */
final class Menu {

	/**
	 * Page slug, also the script and style handle.
	 */
	public const SLUG = 'jcore-evasteet-settings';

	/**
	 * Hook suffix `add_options_page()` returns for this screen.
	 */
	private const HOOK = 'settings_page_' . self::SLUG;

	/**
	 * Build entry the screen runs on.
	 */
	private const ENTRY = 'admin';

	/**
	 * Hooks the page and its assets.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'add_page' ) );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue_assets' ) );
	}

	/**
	 * Returns the admin URL of the screen.
	 *
	 * @return string
	 */
	public static function url(): string {
		return admin_url( 'options-general.php?page=' . self::SLUG );
	}

	/**
	 * Registers the Settings > Cookie consent sub-page.
	 *
	 * @return void
	 */
	public static function add_page(): void {
		add_options_page(
			__( 'Cookie consent', 'jcore-evasteet' ),
			__( 'Cookie consent', 'jcore-evasteet' ),
			'manage_options',
			self::SLUG,
			array( self::class, 'render_page' )
		);
	}

	/**
	 * Outputs the mount point the React app renders into.
	 *
	 * @return void
	 */
	public static function render_page(): void {
		require JCORE_EVASTEET_PATH . 'views/admin/page.php';
	}

	/**
	 * Enqueues the React app, on this screen only. The banner's own
	 * stylesheet comes along for the preview.
	 *
	 * @param string $hook The current admin page hook.
	 *
	 * @return void
	 */
	public static function enqueue_assets( string $hook ): void {
		$asset = Banner::asset( self::ENTRY );
		if ( self::HOOK !== $hook || null === $asset ) {
			return;
		}

		wp_enqueue_script(
			self::SLUG,
			JCORE_EVASTEET_URL . 'build/' . self::ENTRY . '.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_set_script_translations( self::SLUG, 'jcore-evasteet', JCORE_EVASTEET_PATH . 'languages' );

		wp_add_inline_script(
			self::SLUG,
			sprintf( 'window.jcoreEvasteetAdmin = %s;', wp_json_encode( self::app_data() ) ),
			'before'
		);

		$style_file = 'build/style-' . self::ENTRY . '.css';
		if ( is_readable( JCORE_EVASTEET_PATH . $style_file ) ) {
			$dependencies = array( 'wp-components' );
			if ( wp_style_is( Banner::HANDLE, 'registered' ) ) {
				$dependencies[] = Banner::HANDLE;
			}

			wp_enqueue_style( self::SLUG, JCORE_EVASTEET_URL . $style_file, $dependencies, $asset['version'] );
		}
	}

	/**
	 * What the app needs besides the settings themselves.
	 *
	 * @return array<string, mixed>
	 */
	private static function app_data(): array {
		$palette = wp_get_global_settings( array( 'color', 'palette', 'theme' ) );

		return array(
			'defaultText'        => Banner::default_text(),
			'settingsHash'       => Banner::SETTINGS_HASH,
			'privacyPolicyUrl'   => get_privacy_policy_url(),
			'privacySettingsUrl' => admin_url( 'options-privacy.php' ),
			'menusUrl'           => current_theme_supports( 'menus' ) ? admin_url( 'nav-menus.php' ) : '',
			'palette'            => is_array( $palette ) ? array_values( $palette ) : array(),
			'wpConsentApi'       => function_exists( 'wp_consent_api_enqueue_assets' ),
			'stringTranslation'  => self::string_translation_url(),
		);
	}

	/**
	 * Where the active multilingual plugin translates option strings.
	 *
	 * @return string URL, or '' when neither Polylang nor WPML String Translation is active.
	 */
	private static function string_translation_url(): string {
		if ( function_exists( 'pll_register_string' ) ) {
			return admin_url( 'admin.php?page=mlang_strings' );
		}

		if ( defined( 'WPML_ST_VERSION' ) ) {
			return admin_url( 'admin.php?page=wpml-string-translation/menu/string-translation.php' );
		}

		return '';
	}
}
