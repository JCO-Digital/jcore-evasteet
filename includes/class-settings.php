<?php
/**
 * Plugin settings.
 *
 * @package Jcore\Evasteet
 */

namespace Jcore\Evasteet;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Reads and sanitizes the plugin options.
 *
 * Two options: the settings, and the site's own banner text. The text is kept
 * apart so wpml-config.xml can hand exactly that option to WPML or Polylang
 * for string translation.
 */
final class Settings {

	/**
	 * Option holding the settings.
	 */
	public const OPTION = 'jcore_evasteet_settings';

	/**
	 * Option holding the banner text typed on the settings screen. Strings
	 * left empty fall back to the built-in, translated text.
	 */
	public const TEXT_OPTION = 'jcore_evasteet_text';

	/**
	 * Banner strings a site can rewrite.
	 */
	public const TEXT_KEYS = array( 'title', 'message', 'necessaryDescription', 'analyticsDescription', 'marketingDescription' );

	/**
	 * Colours a site can set; empty keeps the banner's own.
	 */
	public const COLOR_KEYS = array( 'background', 'text', 'button', 'button_text', 'switch' );

	/**
	 * Corners the banner can sit in.
	 */
	public const POSITIONS = array( 'left', 'right' );

	/**
	 * Default option values.
	 *
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'enabled'    => 1,
			'position'   => 'left',
			'colors'     => array_fill_keys( self::COLOR_KEYS, '' ),
			'gtm_id'     => '',
			'data_layer' => 'dataLayer',
			// Raised to ask every visitor again; answers for older revisions are dropped.
			'revision'   => 1,
		);
	}

	/**
	 * All settings merged with defaults.
	 *
	 * @return array<string, mixed>
	 */
	public static function all(): array {
		$stored = get_option( self::OPTION, array() );

		return self::sanitize( array_merge( self::defaults(), is_array( $stored ) ? $stored : array() ) );
	}

	/**
	 * A single setting.
	 *
	 * @param string $key Setting key.
	 *
	 * @return mixed
	 */
	public static function get( string $key ) {
		$all = self::all();

		return $all[ $key ] ?? null;
	}

	/**
	 * The site's own banner text. On the front end WPML and Polylang return
	 * it in the language of the page.
	 *
	 * @return array<string, string> Only the strings that were filled in.
	 */
	public static function text(): array {
		return self::sanitize_text( get_option( self::TEXT_OPTION, array() ) );
	}

	/**
	 * Settings as the admin app edits them.
	 *
	 * @return array<string, mixed>
	 */
	public static function for_client(): array {
		$settings         = self::all();
		$settings['text'] = (object) self::text();

		return $settings;
	}

	/**
	 * Merges the supplied keys into the stored settings and saves them. The
	 * revision is not among them: see ask_again().
	 *
	 * @param array<string, mixed> $input Keys to change. Unknown keys are ignored; `text` replaces the banner text.
	 *
	 * @return void
	 */
	public static function update( array $input ): void {
		if ( array_key_exists( 'text', $input ) ) {
			update_option( self::TEXT_OPTION, self::sanitize_text( $input['text'] ) );
		}

		$editable = array_diff_key( self::defaults(), array( 'revision' => true ) );
		$current  = self::all();

		update_option( self::OPTION, self::sanitize( array_merge( $current, array_intersect_key( $input, $editable ) ) ) );
	}

	/**
	 * Raises the revision, so every visitor is asked again.
	 *
	 * @return void
	 */
	public static function ask_again(): void {
		$settings              = self::all();
		$settings['revision'] += 1;

		update_option( self::OPTION, $settings );
	}

	/**
	 * Sanitizes a complete settings array.
	 *
	 * @param mixed $input Raw input.
	 *
	 * @return array<string, mixed>
	 */
	public static function sanitize( $input ): array {
		$input    = is_array( $input ) ? $input : array();
		$defaults = self::defaults();
		$clean    = array();

		$clean['enabled']  = empty( $input['enabled'] ) ? 0 : 1;
		$clean['position'] = in_array( $input['position'] ?? '', self::POSITIONS, true ) ? $input['position'] : $defaults['position'];

		$colors          = is_array( $input['colors'] ?? null ) ? $input['colors'] : array();
		$clean['colors'] = array();
		foreach ( self::COLOR_KEYS as $key ) {
			$clean['colors'][ $key ] = is_string( $colors[ $key ] ?? null ) ? (string) sanitize_hex_color( $colors[ $key ] ) : '';
		}

		$gtm_id          = strtoupper( trim( (string) ( $input['gtm_id'] ?? '' ) ) );
		$clean['gtm_id'] = preg_match( '/^GTM-[A-Z0-9]+$/', $gtm_id ) ? $gtm_id : '';

		// Becomes a window property name in the page's script, so only identifiers pass.
		$data_layer          = trim( (string) ( $input['data_layer'] ?? '' ) );
		$clean['data_layer'] = preg_match( '/^[A-Za-z_$][A-Za-z0-9_$]*$/', $data_layer ) ? $data_layer : $defaults['data_layer'];

		$clean['revision'] = max( 1, absint( $input['revision'] ?? $defaults['revision'] ) );

		return $clean;
	}

	/**
	 * Sanitizes the banner text. Unknown keys are dropped, and so are empty
	 * strings, so the built-in text applies.
	 *
	 * @param mixed $input Raw input.
	 *
	 * @return array<string, string>
	 */
	public static function sanitize_text( $input ): array {
		$input = is_array( $input ) ? $input : array();
		$text  = array();

		foreach ( self::TEXT_KEYS as $key ) {
			$string = is_scalar( $input[ $key ] ?? null ) ? trim( sanitize_textarea_field( (string) $input[ $key ] ) ) : '';
			if ( '' !== $string ) {
				$text[ $key ] = $string;
			}
		}

		return $text;
	}
}
