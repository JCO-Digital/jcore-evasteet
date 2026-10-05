/**
 * The cookie banner and the public `window.jcoreEvasteet` API.
 *
 * Loaded deferred, after the head bootstrap (head.js) has pushed the Consent
 * Mode defaults. Asks on first visit; links to `#cookie-settings` reopen it on
 * the per-category switches. Every answer is pushed as a Consent Mode update,
 * mirrored into the WP Consent API when that plugin is active, and announced
 * with a `jcore-evasteet-change` event on `document`. With script blocking on,
 * held-back scripts run as soon as their categories are allowed.
 */

/**
 * Internal dependencies
 */
import {
	ALL,
	NONE,
	consentSignals,
	gtag,
	readRecord,
	settings,
	writeRecord,
} from './common';
import { releaseScripts } from './blocking';
import { createBanner } from './ui';
import './style.scss';

const listeners = new Set();
let record = readRecord();
let banner = null;

/**
 * The current choices; everything `false` while undecided.
 *
 * @return {import('./common').ConsentChoices} Choices.
 */
const current = () =>
	record
		? { analytics: record.analytics, marketing: record.marketing }
		: { ...NONE };

/**
 * Mirrors the choices into the WP Consent API, if that plugin is active, so
 * plugins that check `wp_has_consent()` follow them. The API only fires its
 * change event for values that actually change, so this is safe on every
 * page view.
 *
 * @param {import('./common').ConsentChoices} choices Choices.
 */
function syncWpConsent( choices ) {
	if ( typeof window.wp_set_consent !== 'function' ) {
		return;
	}

	const categories = {
		functional: true,
		'statistics-anonymous': choices.analytics,
		statistics: choices.analytics,
		marketing: choices.marketing,
	};
	Object.entries( categories ).forEach( ( [ category, allowed ] ) =>
		window.wp_set_consent( category, allowed ? 'allow' : 'deny' )
	);
}

/**
 * Stores an answer, pushes it to Consent Mode and the WP Consent API, hides
 * the banner and tells everyone listening.
 *
 * @param {import('./common').ConsentChoices} choices Choices.
 */
function save( choices ) {
	record = {
		revision: settings.revision,
		analytics: !! choices.analytics,
		marketing: !! choices.marketing,
		decidedAt: new Date().toISOString(),
	};
	writeRecord( record );
	gtag( 'consent', 'update', consentSignals( record ) );
	syncWpConsent( record );
	if ( settings.blockScripts ) {
		releaseScripts( record );
	}
	hide();

	const answer = current();
	listeners.forEach( ( listener ) => listener( answer ) );
	document.dispatchEvent(
		new window.CustomEvent( 'jcore-evasteet-change', { detail: answer } )
	);
}

/**
 * Shows the banner, built on first use so a visitor who has already answered
 * never gets any DOM.
 *
 * @param {{settings?: boolean}} [options] `settings: true` opens straight on the switches.
 */
function show( options = {} ) {
	banner ??= createBanner( {
		text: settings.text,
		privacyPolicyUrl: settings.privacyPolicyUrl,
		position: settings.position,
		onDecide: save,
	} );
	banner.show( current(), !! options.settings );
}

function hide() {
	banner?.hide();
}

window.jcoreEvasteet = {
	/** The stored answer for the current revision, or `null` while undecided. */
	get record() {
		return record;
	},
	/** The current choices; everything `false` while undecided. */
	get choices() {
		return current();
	},
	acceptAll: () => save( ALL ),
	rejectAll: () => save( NONE ),
	save,
	show,
	hide,
	/**
	 * Called on every answer (not on load).
	 *
	 * @param {function(import('./common').ConsentChoices): void} listener Receives the choices.
	 * @return {function(): void} Unsubscribe.
	 */
	onChange( listener ) {
		listeners.add( listener );
		return () => listeners.delete( listener );
	},
};

// Links from a menu, the Navigation block or any content reopen the switches.
document.addEventListener( 'click', ( event ) => {
	const link =
		event.target instanceof window.Element &&
		event.target.closest( `a[href$="${ settings.settingsHash }"]` );
	if ( ! link ) {
		return;
	}
	event.preventDefault();
	show( { settings: true } );
	banner.focusSwitches();
} );

if ( record ) {
	// Catches up on answers given before the WP Consent API was active, or
	// whose API cookies have since expired.
	syncWpConsent( record );
	// Deferred, so the page is parsed: every held-back script is in it.
	if ( settings.blockScripts ) {
		releaseScripts( record );
	}
} else {
	show();
}
