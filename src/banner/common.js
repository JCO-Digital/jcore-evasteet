/**
 * Shared by the head bootstrap and the banner: the settings PHP prints, the
 * stored answer and the Google Consent Mode signals it maps to.
 */

/**
 * The optional cookie categories. Strictly necessary ones need no consent and
 * aren't asked about.
 *
 * @typedef {{analytics: boolean, marketing: boolean}} ConsentChoices
 */

/**
 * A visitor's answer, as stored. `revision` is the one it was given for:
 * "Ask everyone again" on the settings screen raises it, which discards older
 * answers. `decidedAt` is kept as the record of when consent was given.
 *
 * @typedef {ConsentChoices & {revision: number, decidedAt: string}} ConsentRecord
 */

/**
 * Printed by `Jcore\Evasteet\Banner` ahead of both scripts.
 *
 * @type {{storageKey: string, revision: number, dataLayerName: string, gtmId: string, position: string, settingsHash: string, privacyPolicyUrl: string, text: Object<string, string>}}
 */
export const settings = window.jcoreEvasteetSettings;

export const CATEGORIES = [ 'analytics', 'marketing' ];

/** @type {ConsentChoices} */
export const NONE = { analytics: false, marketing: false };

/** @type {ConsentChoices} */
export const ALL = { analytics: true, marketing: true };

/**
 * Google Consent Mode v2 signals, per category.
 *
 * @param {ConsentChoices} choices Choices.
 * @return {Object<string, string>} Signals.
 */
export function consentSignals( choices ) {
	const value = ( granted ) => ( granted ? 'granted' : 'denied' );
	return {
		analytics_storage: value( choices.analytics ),
		ad_storage: value( choices.marketing ),
		ad_user_data: value( choices.marketing ),
		ad_personalization: value( choices.marketing ),
	};
}

/**
 * The stored answer for the current revision.
 *
 * @return {ConsentRecord|null} The answer, or null while undecided.
 */
export function readRecord() {
	try {
		const raw = window.localStorage.getItem( settings.storageKey );
		if ( ! raw ) {
			return null;
		}
		const parsed = JSON.parse( raw );
		if ( ! parsed || parsed.revision !== settings.revision ) {
			return null;
		}
		if (
			CATEGORIES.some(
				( category ) => typeof parsed[ category ] !== 'boolean'
			)
		) {
			return null;
		}
		return parsed;
	} catch {
		// Blocked storage or a mangled value: treat as undecided and ask.
		return null;
	}
}

/**
 * Stores an answer.
 *
 * @param {ConsentRecord} record Answer.
 */
export function writeRecord( record ) {
	try {
		window.localStorage.setItem(
			settings.storageKey,
			JSON.stringify( record )
		);
	} catch {
		// Blocked storage: the answer still holds for this page view, we just ask again next time.
	}
}

/**
 * The data layer Tag Manager reads, created if missing.
 *
 * @return {Array} Data layer.
 */
export function dataLayer() {
	const name = settings.dataLayerName;
	window[ name ] = window[ name ] || [];
	return window[ name ];
}

/**
 * Pushes a gtag() command onto the data layer. GTM only honours consent
 * commands pushed as an `arguments` object (what gtag.js does), not as a
 * plain array, hence `arguments` rather than rest parameters.
 */
export function gtag() {
	dataLayer().push( arguments );
}
