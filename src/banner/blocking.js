/**
 * Script blocking: holds back scripts marked with the categories they need,
 * `<script data-cookie-category="marketing">`, until the visitor allows them.
 * Several categories, separated by spaces, must all be allowed. `necessary`
 * never waits; a category the banner doesn't know never runs.
 *
 * It is a soft block. The head bootstrap (head.js) watches the page while it
 * is parsed and turns marked scripts into `type="text/plain"` before the
 * browser runs them, keeping the original type in `data-cookie-type`. The
 * banner (index.js) puts allowed ones back, in document order. Scripts above
 * the head bootstrap, or added by other scripts, are not caught: written as
 * `type="text/plain"` from the start, they are held back wherever they are.
 * Withdrawing consent can't stop a script that has already run; it is held
 * back again from the next page on.
 */

/**
 * Internal dependencies
 */
import { CATEGORIES } from './common';

const SELECTOR = 'script[data-cookie-category]';
const BLOCKED = 'text/plain';
const ORIGINAL_TYPE = 'data-cookie-type';

/**
 * Whether the choices allow every category a script is marked with.
 *
 * @param {HTMLScriptElement}                 script  Script.
 * @param {import('./common').ConsentChoices} choices Choices.
 * @return {boolean} Whether it may run.
 */
function isAllowed( script, choices ) {
	return script.dataset.cookieCategory
		.split( /\s+/ )
		.filter( Boolean )
		.every(
			( category ) =>
				category === 'necessary' ||
				( CATEGORIES.includes( category ) && choices[ category ] )
		);
}

/**
 * Holds back marked scripts the choices don't allow while the page is
 * parsed. The parser runs pending observer callbacks before each script, so
 * the type changes in time; scripts added by other scripts have already
 * started by then and are left alone, which is why watching ends with the
 * parsing.
 *
 * @param {import('./common').ConsentChoices} choices Choices on load.
 */
export function blockScripts( choices ) {
	const observer = new window.MutationObserver( ( mutations ) => {
		mutations.forEach( ( { addedNodes } ) =>
			addedNodes.forEach( ( node ) => {
				if (
					! ( node instanceof window.HTMLScriptElement ) ||
					! node.matches( SELECTOR ) ||
					node.type === BLOCKED ||
					isAllowed( node, choices )
				) {
					return;
				}

				if ( node.hasAttribute( 'type' ) ) {
					node.setAttribute( ORIGINAL_TYPE, node.type );
				}
				node.type = BLOCKED;
				// Firefox may run it anyway, unless told not to here.
				node.addEventListener(
					'beforescriptexecute',
					( event ) => event.preventDefault(),
					{ once: true }
				);
			} )
		);
	} );

	observer.observe( document.documentElement, {
		childList: true,
		subtree: true,
	} );
	document.addEventListener( 'DOMContentLoaded', () =>
		observer.disconnect()
	);
}

// Scripts already put back, or waiting their turn.
const released = new WeakSet();
let queue = Promise.resolve();

/**
 * Puts one held-back script back. An external script that isn't async is
 * waited for, so the scripts after it find what it defines.
 *
 * @param {HTMLScriptElement} held Held-back script.
 * @return {Promise<void>} Settles once the next one may go.
 */
function release( held ) {
	const script = document.createElement( 'script' );
	Array.from( held.attributes ).forEach( ( { name, value } ) => {
		if ( name !== 'type' && name !== ORIGINAL_TYPE ) {
			script.setAttribute( name, value );
		}
	} );
	if ( held.hasAttribute( ORIGINAL_TYPE ) ) {
		script.type = held.getAttribute( ORIGINAL_TYPE );
	}
	// Browsers hide the nonce attribute's value; the property keeps it.
	script.nonce = held.nonce;
	script.text = held.text;

	return new Promise( ( resolve ) => {
		if ( script.src && ! held.hasAttribute( 'async' ) ) {
			// A script created here is async unless told otherwise.
			script.async = false;
			script.addEventListener( 'load', () => resolve() );
			script.addEventListener( 'error', () => resolve() );
		} else {
			resolve();
		}
		held.replaceWith( script );
	} );
}

/**
 * Runs the held-back scripts the choices now allow, in document order.
 *
 * @param {import('./common').ConsentChoices} choices Choices.
 */
export function releaseScripts( choices ) {
	const scripts = Array.from(
		document.querySelectorAll( `${ SELECTOR }[type="${ BLOCKED }"]` )
	).filter(
		( script ) => ! released.has( script ) && isAllowed( script, choices )
	);

	scripts.forEach( ( script ) => {
		released.add( script );
		queue = queue.then( () => release( script ) );
	} );
}
