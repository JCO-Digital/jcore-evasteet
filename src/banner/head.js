/**
 * Printed inline at the very top of <head>: pushes the Consent Mode default
 * (everything denied) and, if the visitor has already answered, an update
 * with their answer, then loads the Tag Manager container if one is set.
 *
 * The order is the point. The signals are on the data layer before any
 * container processes anything, so this is Consent Mode's advanced mode: the
 * container always loads, and until a category is allowed Google's tags send
 * cookieless pings only. Later answers reach the running container as
 * consent updates from the banner (index.js), which loads deferred.
 */

/**
 * Internal dependencies
 */
import {
	NONE,
	consentSignals,
	dataLayer,
	gtag,
	readRecord,
	settings,
} from './common';

gtag( 'consent', 'default', {
	...consentSignals( NONE ),
	wait_for_update: 500,
} );

const record = readRecord();
if ( record && ( record.analytics || record.marketing ) ) {
	gtag( 'consent', 'update', consentSignals( record ) );
}

if ( settings.gtmId ) {
	dataLayer().push( { 'gtm.start': Date.now(), event: 'gtm.js' } );
	const script = document.createElement( 'script' );
	const layer =
		settings.dataLayerName === 'dataLayer'
			? ''
			: `&l=${ encodeURIComponent( settings.dataLayerName ) }`;
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtm.js?id=${ encodeURIComponent(
		settings.gtmId
	) }${ layer }`;
	document.head.appendChild( script );
}
