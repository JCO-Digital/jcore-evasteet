import { useEffect, useRef } from '@wordpress/element';
import { createBanner } from '../../banner/ui';
import { colorProperties, cx } from '../utils';

const NONE = { analytics: false, marketing: false };

/**
 * The banner itself, built by the same code the site runs, with the unsaved
 * text and colours.
 *
 * @param {Object}                 props
 * @param {Object<string, string>} props.text             Banner strings.
 * @param {Object<string, string>} props.colors           Colours by setting key.
 * @param {string}                 props.position         `left` or `right`.
 * @param {string}                 props.privacyPolicyUrl Privacy policy link.
 * @param {boolean}                props.settingsView     Show the switches.
 */
export default function Preview( {
	text,
	colors,
	position,
	privacyPolicyUrl,
	settingsView,
} ) {
	const ref = useRef();

	useEffect( () => {
		const banner = createBanner( {
			text,
			privacyPolicyUrl,
			position,
			onDecide: () => {},
			container: ref.current,
		} );
		banner.show( NONE, settingsView );

		return () => banner.root.remove();
	}, [ text, privacyPolicyUrl, position, settingsView ] );

	return (
		<div
			ref={ ref }
			className={ cx(
				'jcore-evasteet-admin__preview',
				position === 'right' && 'is-right'
			) }
			style={ colorProperties( colors ) }
		/>
	);
}
