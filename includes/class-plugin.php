<?php
/**
 * Plugin bootstrap.
 *
 * @package Jcore\Evasteet
 */

namespace Jcore\Evasteet;

use Jcore\Update\Config\UpdateConfig;
use Jcore\Update\Hooks\PluginUpdateHooks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Wires every component to its hooks.
 */
final class Plugin {

	/**
	 * The single instance.
	 *
	 * @var Plugin|null
	 */
	private static ?Plugin $instance = null;

	/**
	 * Returns the single instance.
	 *
	 * @return Plugin
	 */
	public static function instance(): Plugin {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Registers every hook. Called once on `plugins_loaded`.
	 *
	 * @return void
	 */
	public function boot(): void {
		$this->register_updater();

		add_action( 'init', array( $this, 'load_textdomain' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );

		Banner::register();

		if ( is_admin() ) {
			Admin\Menu::register();
			add_filter( 'plugin_action_links_' . plugin_basename( JCORE_EVASTEET_FILE ), array( $this, 'action_links' ) );
		}
	}

	/**
	 * Loads the bundled translations. The banner's strings are rendered in
	 * PHP, so they follow the language of the page, including the one a
	 * multilingual plugin sets.
	 *
	 * @return void
	 */
	public function load_textdomain(): void {
		load_plugin_textdomain( 'jcore-evasteet', false, dirname( plugin_basename( JCORE_EVASTEET_FILE ) ) . '/languages' );
	}

	/**
	 * Hooks the plugin into the J&Co Digital update service.
	 *
	 * The library is vendored into the release; a source checkout without a
	 * `composer install` simply runs without update checks.
	 *
	 * @return void
	 */
	private function register_updater(): void {
		if ( ! class_exists( UpdateConfig::class ) ) {
			return;
		}

		$config = new UpdateConfig(
			pluginFile: JCORE_EVASTEET_FILE,
			slug: 'jcore-evasteet',
			version: JCORE_EVASTEET_VERSION,
			apiBaseUrl: 'https://update.jcore.fi/v1',
		);

		( new PluginUpdateHooks( $config ) )->register();
	}

	/**
	 * Registers the admin app's REST routes.
	 *
	 * @return void
	 */
	public function register_rest_routes(): void {
		( new Rest\Settings_Controller() )->register_routes();
	}

	/**
	 * Adds a Settings link on the Plugins screen.
	 *
	 * @param string[] $links Existing action links.
	 *
	 * @return string[]
	 */
	public function action_links( array $links ): array {
		array_unshift(
			$links,
			sprintf(
				'<a href="%s">%s</a>',
				esc_url( Admin\Menu::url() ),
				esc_html__( 'Settings', 'jcore-evasteet' )
			)
		);

		return $links;
	}
}
