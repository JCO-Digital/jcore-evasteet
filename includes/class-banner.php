<?php
/**
 * The cookie banner on the front end.
 *
 * @package Jcore\Evasteet
 */

namespace Jcore\Evasteet;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Asks visitors which optional cookies they allow: analytics and marketing.
 * Strictly necessary cookies need no consent and aren't asked about.
 *
 * The answer lives in the visitor's localStorage, never in a cookie the
 * server reads, so pages stay cacheable: whether to ask is decided in the
 * browser. Two scripts do the work. A small one, printed inline at the very
 * top of the head, pushes the Google Consent Mode default (everything denied)
 * plus any stored answer onto the data layer, then loads the Tag Manager
 * container if one is set, so tags never run ahead of the consent signals.
 * The banner itself loads deferred.
 *
 * Every answer is pushed as a Consent Mode update, so GA4 and Google Ads tags
 * follow it; other tags need consent settings in the container. With the WP
 * Consent API plugin active, the answer is mirrored into it as well, so
 * plugins that check `wp_has_consent()`, such as Site Kit, follow it too.
 */
final class Banner {

	/**
	 * Handle of the banner script and stylesheet.
	 */
	public const HANDLE = 'jcore-evasteet';

	/**
	 * Fragment of the links that reopen the banner on its switches.
	 */
	public const SETTINGS_HASH = '#cookie-settings';

	/**
	 * The localStorage key of the answer.
	 */
	private const STORAGE_KEY = 'jcore-evasteet';

	/**
	 * Handle of the WP Consent API script, which the banner must follow.
	 */
	private const WP_CONSENT_API_HANDLE = 'wp-consent-api';

	/**
	 * Hooks the banner.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_action( 'init', array( self::class, 'register_style' ) );

		// The plugin stores nothing but the visitor's answer, which is necessary.
		add_filter( 'wp_consent_api_registered_' . plugin_basename( JCORE_EVASTEET_FILE ), '__return_true' );

		if ( ! Settings::get( 'enabled' ) ) {
			return;
		}

		// Ahead of everything else on wp_head, tag snippets printed there included.
		add_action( 'wp_head', array( self::class, 'print_head_script' ), 0 );
		add_action( 'wp_enqueue_scripts', array( self::class, 'enqueue' ) );
		add_filter( 'wp_get_consent_type', array( self::class, 'consent_type' ) );
		add_action( 'admin_init', array( self::class, 'add_privacy_policy_content' ) );
	}

	/**
	 * Registers the banner stylesheet, which the settings screen's preview
	 * uses too. It is small and carries its path, so WordPress may inline it
	 * instead of adding a request.
	 *
	 * @return void
	 */
	public static function register_style(): void {
		$asset = self::asset( 'banner' );
		$file  = 'build/style-banner.css';
		if ( null === $asset || ! is_readable( JCORE_EVASTEET_PATH . $file ) ) {
			return;
		}

		wp_register_style( self::HANDLE, JCORE_EVASTEET_URL . $file, array(), $asset['version'] );
		wp_style_add_data( self::HANDLE, 'rtl', 'replace' );
		wp_style_add_data( self::HANDLE, 'path', JCORE_EVASTEET_PATH . $file );
	}

	/**
	 * Whether the banner belongs on the current request. Page builders
	 * render the page for editing, not for a visitor to answer.
	 *
	 * @return bool
	 */
	private static function is_active(): bool {
		if ( is_admin() || is_embed() ) {
			return false;
		}

		if ( class_exists( '\Elementor\Plugin' ) && isset( \Elementor\Plugin::$instance->preview ) && \Elementor\Plugin::$instance->preview->is_preview_mode() ) {
			return false;
		}

		/**
		 * Filters whether the cookie banner and its scripts load on this request.
		 *
		 * @param bool $active Whether they load.
		 */
		return (bool) apply_filters( 'jcore_evasteet_active', true );
	}

	/**
	 * Prints the settings both scripts read, the Consent Mode defaults and
	 * the Tag Manager container.
	 *
	 * @return void
	 */
	public static function print_head_script(): void {
		$path = JCORE_EVASTEET_PATH . 'build/head.js';
		if ( ! self::is_active() || ! is_readable( $path ) ) {
			return;
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local file of the plugin's own, inlined.
		$script = (string) file_get_contents( $path );

		// Consent has to be in place before any tag runs, so keep optimizers
		// (Cloudflare Rocket Loader, LiteSpeed Cache, WP Rocket) from
		// deferring or delaying this tag.
		$attributes = array(
			'id'               => self::HANDLE . '-head-js',
			'data-cfasync'     => 'false',
			'data-no-optimize' => '1',
			'data-no-defer'    => '1',
			'data-no-minify'   => '1',
			'nowprocket'       => true,
		);

		wp_print_inline_script_tag(
			sprintf(
				"window.jcoreEvasteetSettings = %s;\n%s",
				wp_json_encode( self::script_settings(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ),
				$script
			),
			$attributes
		);
	}

	/**
	 * Enqueues the banner script and stylesheet.
	 *
	 * @return void
	 */
	public static function enqueue(): void {
		$asset = self::asset( 'banner' );
		if ( ! self::is_active() || null === $asset ) {
			return;
		}

		$dependencies = $asset['dependencies'];

		// The WP Consent API asks banners to load after its script, so its
		// functions exist when the stored answer is mirrored. It enqueues
		// that script itself, late on this same hook.
		if ( function_exists( 'wp_consent_api_enqueue_assets' ) ) {
			$dependencies[] = self::WP_CONSENT_API_HANDLE;
		}

		wp_enqueue_script(
			self::HANDLE,
			JCORE_EVASTEET_URL . 'build/banner.js',
			$dependencies,
			$asset['version'],
			array(
				'strategy'  => 'defer',
				'in_footer' => false,
			)
		);

		wp_enqueue_style( self::HANDLE );

		$colors = self::color_properties();
		if ( '' !== $colors ) {
			wp_add_inline_style( self::HANDLE, ".jcore-evasteet {{$colors}}" );
		}
	}

	/**
	 * Tells the WP Consent API that consent is opt-in: nothing optional runs
	 * until the visitor allows it, which is what the banner enforces.
	 *
	 * @return string
	 */
	public static function consent_type(): string {
		return 'optin';
	}

	/**
	 * The colours chosen on the settings screen, as the stylesheet's custom
	 * properties.
	 *
	 * @param array<string, string>|null $colors Colours; the saved ones when null.
	 *
	 * @return string Declarations, or '' when every colour is the default.
	 */
	public static function color_properties( ?array $colors = null ): string {
		$colors       = $colors ?? Settings::get( 'colors' );
		$declarations = '';

		foreach ( Settings::COLOR_KEYS as $key ) {
			$color = sanitize_hex_color( $colors[ $key ] ?? '' );
			if ( $color ) {
				$declarations .= sprintf( '--jcore-evasteet-%s:%s;', str_replace( '_', '-', $key ), $color );
			}
		}

		return $declarations;
	}

	/**
	 * Settings for the scripts.
	 *
	 * @return array<string, mixed>
	 */
	private static function script_settings(): array {
		$settings = Settings::all();

		$script_settings = array(
			'storageKey'       => self::STORAGE_KEY,
			'revision'         => $settings['revision'],
			'dataLayerName'    => $settings['data_layer'],
			'gtmId'            => $settings['gtm_id'],
			'position'         => $settings['position'],
			'settingsHash'     => self::SETTINGS_HASH,
			'privacyPolicyUrl' => get_privacy_policy_url(),
			'text'             => array_merge( self::default_text(), Settings::text() ),
		);

		/**
		 * Filters the settings the cookie banner's scripts read.
		 *
		 * @param array<string, mixed> $script_settings Settings. Any key of `text` changes a string.
		 */
		return (array) apply_filters( 'jcore_evasteet_script_settings', $script_settings );
	}

	/**
	 * The built-in banner strings, in the language of the page.
	 *
	 * @return array<string, string>
	 */
	public static function default_text(): array {
		return array(
			'title'                => _x( 'Cookies', 'cookie banner', 'jcore-evasteet' ),
			'message'              => __( 'We use cookies to understand how the site is used and to measure our marketing. Cookies the site needs to work are always on.', 'jcore-evasteet' ),
			'privacyPolicy'        => _x( 'Privacy Policy', 'cookie banner', 'jcore-evasteet' ),
			'acceptAll'            => _x( 'Accept all', 'cookie banner', 'jcore-evasteet' ),
			'rejectAll'            => _x( 'Reject all', 'cookie banner', 'jcore-evasteet' ),
			'customize'            => _x( 'Customize', 'cookie banner', 'jcore-evasteet' ),
			'save'                 => _x( 'Save choices', 'cookie banner', 'jcore-evasteet' ),
			'necessary'            => _x( 'Necessary', 'cookie category', 'jcore-evasteet' ),
			'necessaryDescription' => __( 'Needed for the site to work, such as keeping you signed in. Always on.', 'jcore-evasteet' ),
			'analytics'            => _x( 'Analytics', 'cookie category', 'jcore-evasteet' ),
			'analyticsDescription' => __( 'How the site is used, so we can improve it.', 'jcore-evasteet' ),
			'marketing'            => _x( 'Marketing', 'cookie category', 'jcore-evasteet' ),
			'marketingDescription' => __( 'Measuring our ads and the visitors they bring.', 'jcore-evasteet' ),
		);
	}

	/**
	 * Suggests a paragraph for the privacy policy under Settings → Privacy.
	 *
	 * @return void
	 */
	public static function add_privacy_policy_content(): void {
		if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
			return;
		}

		$content = sprintf(
			'<p class="privacy-policy-tutorial">%1$s</p><p>%2$s</p>',
			esc_html__( 'Describe the analytics and marketing tools the site uses, and which category each one falls under.', 'jcore-evasteet' ),
			esc_html__( 'When you first visit this site, a cookie banner asks which optional cookies you allow: analytics and marketing. Cookies the site needs to work are always on. Your answer and the time you gave it are stored in your browser, are not sent to us, and are kept until you change them. You can change your answer at any time from the cookie settings link.', 'jcore-evasteet' )
		);

		wp_add_privacy_policy_content( __( 'JCORE Evästeet', 'jcore-evasteet' ), wp_kses_post( $content ) );
	}

	/**
	 * A build entry's asset file: its dependencies and content hash.
	 *
	 * @param string $entry Build entry name.
	 *
	 * @return array{dependencies: string[], version: string}|null Null when the plugin has not been built.
	 */
	public static function asset( string $entry ): ?array {
		$file = JCORE_EVASTEET_PATH . 'build/' . $entry . '.asset.php';
		if ( ! is_readable( $file ) ) {
			return null;
		}

		$asset = require $file;

		return array(
			'dependencies' => (array) ( $asset['dependencies'] ?? array() ),
			'version'      => (string) ( $asset['version'] ?? JCORE_EVASTEET_VERSION ),
		);
	}
}
