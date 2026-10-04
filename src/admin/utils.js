import { __, sprintf } from '@wordpress/i18n';

/**
 * What PHP prints for the app: built-in text, links and the theme palette.
 *
 * @type {{defaultText: Object<string, string>, settingsHash: string, privacyPolicyUrl: string, privacySettingsUrl: string, menusUrl: string, palette: Array<{name: string, slug: string, color: string}>, wpConsentApi: boolean, stringTranslation: string}}
 */
export const data = window.jcoreEvasteetAdmin;

/**
 * Joins the truthy arguments into a class string.
 *
 * @param {...(string|false|null|undefined)} names Class names.
 * @return {string} Space-separated class names.
 */
export function cx( ...names ) {
	return names.filter( Boolean ).join( ' ' );
}

/**
 * The colours as the banner stylesheet's custom properties.
 *
 * @param {Object<string, string>} colors Colours by setting key; empty means default.
 * @return {Object<string, string>} Inline style.
 */
export function colorProperties( colors ) {
	return Object.fromEntries(
		Object.entries( colors )
			.filter( ( [ , value ] ) => value )
			.map( ( [ key, value ] ) => [
				`--jcore-evasteet-${ key.replace( '_', '-' ) }`,
				value,
			] )
	);
}

/**
 * Message of a failed apiFetch() call.
 *
 * @param {{message?: string, code?: string}} error Rejection value.
 * @return {string} Message.
 */
export function errorMessage( error ) {
	return (
		error?.message ||
		sprintf(
			/* translators: %s: error code */
			__( 'Request failed (%s).', 'jcore-evasteet' ),
			error?.code ?? 'unknown'
		)
	);
}
