import {
	createInterpolateElement,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import {
	Button,
	ExternalLink,
	Notice,
	SelectControl,
	SnackbarList,
	Spinner,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';
import { __, sprintf } from '@wordpress/i18n';
import { Icon, shield } from '@wordpress/icons';
import { askAgain, getSettings, saveSettings } from './api';
import { data, errorMessage } from './utils';
import ColorField from './components/ColorField';
import Preview from './components/Preview';
import Section from './components/Section';

// Keys the form edits. The revision is raised apart, by "Ask everyone again".
const EDITABLE = [
	'enabled',
	'position',
	'colors',
	'gtm_id',
	'data_layer',
	'block_scripts',
	'text',
];

const GTM_ID = /^GTM-[A-Z0-9]+$/;

const BLOCKING_EXAMPLE =
	'<script type="text/plain" data-cookie-category="marketing" src="…"></script>';

const TEXT_FIELDS = [
	{
		key: 'title',
		label: __( 'Title', 'jcore-evasteet' ),
		rows: 0,
	},
	{
		key: 'message',
		label: __( 'Message', 'jcore-evasteet' ),
		rows: 3,
	},
	{
		key: 'necessaryDescription',
		label: __( 'Necessary cookies', 'jcore-evasteet' ),
		rows: 2,
	},
	{
		key: 'analyticsDescription',
		label: __( 'Analytics cookies', 'jcore-evasteet' ),
		rows: 2,
	},
	{
		key: 'marketingDescription',
		label: __( 'Marketing cookies', 'jcore-evasteet' ),
		rows: 2,
	},
];

// The banner's own colours, as in src/banner/style.scss.
const COLOR_FIELDS = [
	{
		key: 'background',
		label: __( 'Background', 'jcore-evasteet' ),
		fallback: '#111827',
	},
	{ key: 'text', label: __( 'Text', 'jcore-evasteet' ), fallback: '#f9fafb' },
	{
		key: 'button',
		label: __( 'Buttons', 'jcore-evasteet' ),
		fallback: '#f9fafb',
	},
	{
		key: 'button_text',
		label: __( 'Button text', 'jcore-evasteet' ),
		fallback: '#111827',
	},
	{
		key: 'switch',
		label: __( 'Switches', 'jcore-evasteet' ),
		fallback: '#0ea5e9',
	},
];

function Snackbars() {
	const notices = useSelect(
		( select ) => select( noticesStore ).getNotices(),
		[]
	);
	const { removeNotice } = useDispatch( noticesStore );

	return (
		<SnackbarList
			className="jcore-evasteet-admin__snackbars"
			notices={ notices.filter(
				( notice ) => notice.type === 'snackbar'
			) }
			onRemove={ removeNotice }
		/>
	);
}

export default function App() {
	const [ saved, setSaved ] = useState( null );
	const [ settings, setSettings ] = useState( null );
	const [ loadError, setLoadError ] = useState( null );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ isAsking, setIsAsking ] = useState( false );
	const [ settingsView, setSettingsView ] = useState( false );
	const { createSuccessNotice, createErrorNotice } =
		useDispatch( noticesStore );

	useEffect( () => {
		getSettings()
			.then( ( result ) => {
				setSaved( result );
				setSettings( result );
			} )
			.catch( ( caught ) => setLoadError( errorMessage( caught ) ) );
	}, [] );

	const isDirty =
		!! settings &&
		EDITABLE.some(
			( key ) =>
				JSON.stringify( settings[ key ] ) !==
				JSON.stringify( saved[ key ] )
		);

	// Warn before leaving the page with unsaved changes.
	useEffect( () => {
		if ( ! isDirty ) {
			return;
		}
		const warn = ( event ) => {
			event.preventDefault();
			event.returnValue = '';
		};
		window.addEventListener( 'beforeunload', warn );
		return () => window.removeEventListener( 'beforeunload', warn );
	}, [ isDirty ] );

	const textJson = JSON.stringify( settings?.text ?? {} );
	const previewText = useMemo(
		() => ( { ...data.defaultText, ...JSON.parse( textJson ) } ),
		[ textJson ]
	);

	if ( loadError ) {
		return (
			<div className="wrap jcore-evasteet-admin">
				<Notice status="error" isDismissible={ false }>
					{ loadError }
				</Notice>
			</div>
		);
	}

	if ( ! settings ) {
		return (
			<div className="wrap jcore-evasteet-admin">
				<Spinner />
			</div>
		);
	}

	const update = ( key, value ) =>
		setSettings( ( current ) => ( { ...current, [ key ]: value } ) );
	const updateIn = ( group, key, value ) =>
		setSettings( ( current ) => {
			const next = { ...current[ group ], [ key ]: value };
			if ( value === '' ) {
				delete next[ key ];
			}
			return { ...current, [ group ]: next };
		} );

	const gtmIdInvalid =
		settings.gtm_id !== '' && ! GTM_ID.test( settings.gtm_id );

	const save = async () => {
		setIsSaving( true );
		try {
			const result = await saveSettings(
				Object.fromEntries(
					EDITABLE.map( ( key ) => [ key, settings[ key ] ] )
				)
			);
			setSaved( result );
			setSettings( result );
			createSuccessNotice( __( 'Settings saved.', 'jcore-evasteet' ), {
				type: 'snackbar',
			} );
		} catch ( caught ) {
			createErrorNotice( errorMessage( caught ), { type: 'snackbar' } );
		} finally {
			setIsSaving( false );
		}
	};

	const askEveryoneAgain = async () => {
		// eslint-disable-next-line no-alert
		const confirmed = window.confirm(
			__(
				'Every visitor will see the cookie banner again, including those who have already answered. Continue?',
				'jcore-evasteet'
			)
		);
		if ( ! confirmed ) {
			return;
		}

		setIsAsking( true );
		try {
			const result = await askAgain();
			setSaved( ( current ) => ( {
				...current,
				revision: result.revision,
			} ) );
			setSettings( ( current ) => ( {
				...current,
				revision: result.revision,
			} ) );
			createSuccessNotice(
				__( 'Every visitor will be asked again.', 'jcore-evasteet' ),
				{ type: 'snackbar' }
			);
		} catch ( caught ) {
			createErrorNotice( errorMessage( caught ), { type: 'snackbar' } );
		} finally {
			setIsAsking( false );
		}
	};

	return (
		<div className="wrap jcore-evasteet-admin">
			<header className="jcore-evasteet-admin__header">
				<span className="jcore-evasteet-admin__logo" aria-hidden="true">
					<Icon icon={ shield } size={ 28 } />
				</span>
				<div>
					<h1>{ __( 'Cookie consent', 'jcore-evasteet' ) }</h1>
					<p className="jcore-evasteet-admin__tagline">
						{ __(
							'Ask visitors which optional cookies they allow, and pass the answer to Google tags and other plugins.',
							'jcore-evasteet'
						) }
					</p>
				</div>
			</header>
			<hr className="wp-header-end" />

			<div className="jcore-evasteet-admin__settings">
				<Section
					title={ __( 'Banner', 'jcore-evasteet' ) }
					description={ __(
						'Visitors are asked about analytics and marketing cookies. Cookies the site needs to work are always on and are not asked about.',
						'jcore-evasteet'
					) }
				>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Show the cookie banner',
							'jcore-evasteet'
						) }
						help={ __(
							'Leave this off if the site uses another consent manager, such as Cookiebot, CookieYes or Complianz.',
							'jcore-evasteet'
						) }
						checked={ !! settings.enabled }
						onChange={ ( checked ) =>
							update( 'enabled', checked ? 1 : 0 )
						}
					/>
					<SelectControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						className="jcore-evasteet-admin__short-field"
						label={ __( 'Position', 'jcore-evasteet' ) }
						value={ settings.position }
						options={ [
							{
								value: 'left',
								label: __( 'Bottom left', 'jcore-evasteet' ),
							},
							{
								value: 'right',
								label: __( 'Bottom right', 'jcore-evasteet' ),
							},
						] }
						onChange={ ( value ) => update( 'position', value ) }
					/>
					<div className="jcore-evasteet-admin__info">
						<strong>
							{ __( 'Privacy policy', 'jcore-evasteet' ) }
						</strong>
						<p>
							{ data.privacyPolicyUrl ? (
								<ExternalLink href={ data.privacyPolicyUrl }>
									{ data.privacyPolicyUrl }
								</ExternalLink>
							) : (
								__(
									'No published privacy policy page is set, so the banner links to none.',
									'jcore-evasteet'
								)
							) }
						</p>
						<p className="jcore-evasteet-admin__muted">
							{ createInterpolateElement(
								__(
									'The banner links to the page chosen in the <a>privacy settings</a>. Polylang and WPML point it to the translated page.',
									'jcore-evasteet'
								),
								// eslint-disable-next-line jsx-a11y/anchor-has-content
								{ a: <a href={ data.privacySettingsUrl } /> }
							) }
						</p>
					</div>
				</Section>

				<Section
					title={ __( 'Text', 'jcore-evasteet' ) }
					description={ __(
						'Leave a field empty to use the built-in text, which is shown in the language of the page.',
						'jcore-evasteet'
					) }
				>
					{ TEXT_FIELDS.map( ( { key, label, rows } ) => {
						const Control = rows ? TextareaControl : TextControl;
						return (
							<Control
								key={ key }
								__nextHasNoMarginBottom
								__next40pxDefaultSize={ ! rows || undefined }
								label={ label }
								rows={ rows || undefined }
								placeholder={ data.defaultText[ key ] }
								value={ settings.text[ key ] ?? '' }
								onChange={ ( value ) =>
									updateIn( 'text', key, value )
								}
							/>
						);
					} ) }
					<Notice
						status="info"
						isDismissible={ false }
						className="jcore-evasteet-admin__notice"
					>
						{ data.stringTranslation
							? createInterpolateElement(
									__(
										"Text written here is in the site's main language. Translate it under <a>string translations</a>.",
										'jcore-evasteet'
									),
									// eslint-disable-next-line jsx-a11y/anchor-has-content
									{ a: <a href={ data.stringTranslation } /> }
								)
							: __(
									'On a multilingual site, text written here is translated with the string translation of WPML or Polylang.',
									'jcore-evasteet'
								) }
					</Notice>
				</Section>

				<Section
					title={ __( 'Appearance', 'jcore-evasteet' ) }
					description={ __(
						"The banner uses the theme's fonts. Reject all and Accept all always look the same, so refusing is as easy as agreeing.",
						'jcore-evasteet'
					) }
				>
					<div className="jcore-evasteet-admin__colors">
						{ COLOR_FIELDS.map( ( { key, label, fallback } ) => (
							<ColorField
								key={ key }
								label={ label }
								fallback={ fallback }
								value={ settings.colors[ key ] }
								onChange={ ( value ) =>
									updateIn( 'colors', key, value )
								}
							/>
						) ) }
					</div>
					<div className="jcore-evasteet-admin__preview-frame">
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __(
								'Show the switches',
								'jcore-evasteet'
							) }
							checked={ settingsView }
							onChange={ setSettingsView }
						/>
						<Preview
							text={ previewText }
							colors={ settings.colors }
							position={ settings.position }
							privacyPolicyUrl={ data.privacyPolicyUrl }
							settingsView={ settingsView }
						/>
					</div>
				</Section>

				<Section
					title={ __( 'Google Tag Manager', 'jcore-evasteet' ) }
					description={ __(
						'The banner always sets Google Consent Mode: everything is denied until the visitor allows it, and every answer updates the signals. GA4 and Google Ads tags follow them; other tags need consent settings in the container.',
						'jcore-evasteet'
					) }
				>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						className="jcore-evasteet-admin__short-field"
						label={ __( 'Container ID', 'jcore-evasteet' ) }
						placeholder="GTM-XXXXXXX"
						value={ settings.gtm_id }
						help={
							gtmIdInvalid
								? __(
										'A container ID looks like GTM-XXXXXXX.',
										'jcore-evasteet'
									)
								: __(
										'Optional. Loads the container right after the consent defaults, so no tag can run before them. Leave empty if another plugin or the theme loads it.',
										'jcore-evasteet'
									)
						}
						onChange={ ( value ) =>
							update( 'gtm_id', value.trim().toUpperCase() )
						}
					/>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						className="jcore-evasteet-admin__short-field"
						label={ __( 'Data layer', 'jcore-evasteet' ) }
						value={ settings.data_layer }
						help={ __(
							'Change only if the container uses a data layer other than dataLayer.',
							'jcore-evasteet'
						) }
						onChange={ ( value ) => update( 'data_layer', value ) }
					/>
				</Section>

				<Section
					title={ __( 'Script blocking', 'jcore-evasteet' ) }
					description={ __(
						'Holds back scripts marked with the cookie category they need until the visitor allows it. Use it for tags that do not follow Google Consent Mode.',
						'jcore-evasteet'
					) }
				>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Block scripts by category',
							'jcore-evasteet'
						) }
						help={ __(
							'Scripts without a category are not affected.',
							'jcore-evasteet'
						) }
						checked={ !! settings.block_scripts }
						onChange={ ( checked ) =>
							update( 'block_scripts', checked ? 1 : 0 )
						}
					/>
					<div className="jcore-evasteet-admin__info">
						<code className="jcore-evasteet-admin__code">
							{ BLOCKING_EXAMPLE }
						</code>
						<p className="jcore-evasteet-admin__muted">
							{ __(
								'Mark a script with data-cookie-category set to analytics or marketing. It runs once the visitor allows that category, right away on later pages. Give it type="text/plain" as well to hold it back for certain, also when another script adds it to the page.',
								'jcore-evasteet'
							) }
						</p>
					</div>
				</Section>

				<Section
					title={ __( 'Changing an answer', 'jcore-evasteet' ) }
					description={ __(
						'Visitors must be able to change their answer at any time. A link to the address below opens the banner on its switches.',
						'jcore-evasteet'
					) }
				>
					<div className="jcore-evasteet-admin__info">
						<code className="jcore-evasteet-admin__code">
							{ data.settingsHash }
						</code>
						<p className="jcore-evasteet-admin__muted">
							{ data.menusUrl
								? createInterpolateElement(
										__(
											'Add it as a custom link to the footer <a>menu</a> or a Navigation block, or link to it from any text, for example with the label "Cookie settings".',
											'jcore-evasteet'
										),
										// eslint-disable-next-line jsx-a11y/anchor-has-content
										{ a: <a href={ data.menusUrl } /> }
									)
								: __(
										'Add it as a custom link to a Navigation block in the footer, or link to it from any text, for example with the label "Cookie settings".',
										'jcore-evasteet'
									) }
						</p>
					</div>
					<div className="jcore-evasteet-admin__info">
						<strong>
							{ __( 'WP Consent API', 'jcore-evasteet' ) }
						</strong>
						<p className="jcore-evasteet-admin__muted">
							{ data.wpConsentApi
								? __(
										'Active. Answers are passed on to plugins that follow the WP Consent API.',
										'jcore-evasteet'
									)
								: __(
										'Not installed. With the WP Consent API plugin, answers are also passed on to plugins that follow it, such as Site Kit.',
										'jcore-evasteet'
									) }
						</p>
					</div>
				</Section>

				<Section
					title={ __( 'Ask everyone again', 'jcore-evasteet' ) }
					description={ __(
						'When the cookies the site uses or the privacy policy change, ask every visitor again. Answers given before are discarded.',
						'jcore-evasteet'
					) }
				>
					<p className="jcore-evasteet-admin__muted">
						{ sprintf(
							/* translators: %d: revision number */
							__( 'Current revision: %d', 'jcore-evasteet' ),
							settings.revision
						) }
					</p>
					<div>
						<Button
							__next40pxDefaultSize
							variant="secondary"
							isDestructive
							isBusy={ isAsking }
							disabled={ isAsking }
							onClick={ askEveryoneAgain }
						>
							{ __( 'Ask everyone again', 'jcore-evasteet' ) }
						</Button>
					</div>
				</Section>

				<div className="jcore-evasteet-admin__footer">
					<Button
						__next40pxDefaultSize
						variant="primary"
						isBusy={ isSaving }
						disabled={ ! isDirty || isSaving || gtmIdInvalid }
						onClick={ save }
					>
						{ __( 'Save changes', 'jcore-evasteet' ) }
					</Button>
				</div>
			</div>

			<Snackbars />
		</div>
	);
}
