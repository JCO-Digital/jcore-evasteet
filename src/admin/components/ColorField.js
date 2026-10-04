import {
	BaseControl,
	Button,
	ColorIndicator,
	ColorPalette,
	Dropdown,
} from '@wordpress/components';
import { useInstanceId } from '@wordpress/compose';
import { __ } from '@wordpress/i18n';
import { data } from '../utils';

/**
 * One banner colour: a swatch button opening the theme palette and a picker.
 * Clearing it returns to the banner's own colour.
 *
 * @param {Object}                 props
 * @param {string}                 props.label    Label.
 * @param {string}                 props.value    Hex colour, or '' for the default.
 * @param {string}                 props.fallback The banner's own colour, shown while empty.
 * @param {function(string): void} props.onChange Receives the new colour, or ''.
 */
export default function ColorField( { label, value, fallback, onChange } ) {
	const id = useInstanceId( ColorField, 'jcore-evasteet-color' );

	return (
		<BaseControl
			__nextHasNoMarginBottom
			id={ id }
			label={ label }
			className="jcore-evasteet-admin__color"
		>
			<Dropdown
				popoverProps={ { placement: 'bottom-start' } }
				renderToggle={ ( { isOpen, onToggle } ) => (
					<Button
						__next40pxDefaultSize
						id={ id }
						variant="secondary"
						aria-expanded={ isOpen }
						onClick={ onToggle }
						className="jcore-evasteet-admin__color-toggle"
					>
						<ColorIndicator colorValue={ value || fallback } />
						<span>
							{ value || __( 'Default', 'jcore-evasteet' ) }
						</span>
					</Button>
				) }
				renderContent={ () => (
					<div className="jcore-evasteet-admin__color-popover">
						<ColorPalette
							colors={ data.palette }
							value={ value }
							onChange={ ( color ) => onChange( color ?? '' ) }
							clearable
						/>
					</div>
				) }
			/>
		</BaseControl>
	);
}
