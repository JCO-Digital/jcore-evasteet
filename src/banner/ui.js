/**
 * The banner element. Used by the banner script on the site and by the
 * preview on the settings screen, so both show exactly the same thing.
 *
 * Two views share it: the summary (Reject all / Accept all, and a link to
 * customize) and the settings (one switch per category, Reject all / Save
 * choices). Reject all and Accept all look identical, so refusing is exactly
 * as easy as agreeing; see style.scss. Strings go in as text, never markup.
 */

let instances = 0;

/**
 * Creates an element with a class and, optionally, text.
 *
 * @param {string} tag       Tag name.
 * @param {string} className Class names.
 * @param {string} [content] Text content.
 * @return {HTMLElement} Element.
 */
function el( tag, className, content ) {
	const node = document.createElement( tag );
	node.className = className;
	if ( content ) {
		node.textContent = content;
	}
	return node;
}

/**
 * One category row: name, description and a switch.
 *
 * @param {string} name        Category name.
 * @param {string} description Category description.
 * @return {{row: HTMLElement, input: HTMLInputElement}} Row and its switch.
 */
function option( name, description ) {
	const row = el( 'label', 'jcore-evasteet__option' );
	const label = el( 'span', 'jcore-evasteet__option-text' );
	label.append(
		el( 'span', 'jcore-evasteet__option-name', name ),
		el( 'span', 'jcore-evasteet__option-desc', description )
	);
	const input = el( 'input', 'jcore-evasteet__switch' );
	input.type = 'checkbox';
	input.setAttribute( 'role', 'switch' );
	row.append( label, input );
	return { row, input };
}

/**
 * Builds the banner, hidden, into `container`.
 *
 * @param {Object}                                            options
 * @param {Object<string, string>}                            options.text               Strings.
 * @param {string}                                            [options.privacyPolicyUrl] Linked from the message, if given.
 * @param {string}                                            [options.position]         `left` or `right`.
 * @param {function(import('./common').ConsentChoices): void} options.onDecide           Called with the visitor's answer.
 * @param {HTMLElement}                                       [options.container]        Defaults to the body.
 * @return {{root: HTMLElement, show: function(import('./common').ConsentChoices, boolean): void, hide: function(): void, focusSwitches: function(): void}} The banner.
 */
export function createBanner( {
	text,
	privacyPolicyUrl,
	position = 'left',
	onDecide,
	container = document.body,
} ) {
	const titleId = `jcore-evasteet-title-${ ++instances }`;

	// Non-modal: the page stays usable while the question is open.
	const root = el(
		'section',
		`jcore-evasteet jcore-evasteet--${
			position === 'right' ? 'right' : 'left'
		}`
	);
	root.setAttribute( 'role', 'region' );
	root.setAttribute( 'aria-labelledby', titleId );
	root.hidden = true;

	const title = el( 'h2', 'jcore-evasteet__title', text.title );
	title.id = titleId;
	const message = el( 'p', 'jcore-evasteet__message', text.message );
	if ( privacyPolicyUrl ) {
		const link = el( 'a', 'jcore-evasteet__link', text.privacyPolicy );
		link.href = privacyPolicyUrl;
		link.target = '_blank';
		link.rel = 'noopener noreferrer';
		message.append( ' ', link );
	}

	const optionsList = el( 'div', 'jcore-evasteet__options' );
	const necessary = option( text.necessary, text.necessaryDescription );
	necessary.input.checked = true;
	necessary.input.disabled = true;
	const analytics = option( text.analytics, text.analyticsDescription );
	const marketing = option( text.marketing, text.marketingDescription );
	optionsList.append( necessary.row, analytics.row, marketing.row );

	const actions = el( 'div', 'jcore-evasteet__actions' );
	const reject = el(
		'button',
		'jcore-evasteet__button jcore-evasteet__button--reject',
		text.rejectAll
	);
	reject.type = 'button';
	reject.addEventListener( 'click', () =>
		onDecide( { analytics: false, marketing: false } )
	);
	// "Accept all" in the summary, "Save choices" in the settings.
	const primary = el(
		'button',
		'jcore-evasteet__button jcore-evasteet__button--accept'
	);
	primary.type = 'button';
	primary.addEventListener( 'click', () =>
		onDecide(
			optionsList.hidden
				? { analytics: true, marketing: true }
				: {
						analytics: analytics.input.checked,
						marketing: marketing.input.checked,
					}
		)
	);
	actions.append( reject, primary );

	const customize = el(
		'button',
		'jcore-evasteet__customize',
		text.customize
	);
	customize.type = 'button';
	customize.addEventListener( 'click', () => {
		setView( true );
		analytics.input.focus();
	} );

	function setView( settingsView ) {
		optionsList.hidden = ! settingsView;
		customize.hidden = settingsView;
		primary.textContent = settingsView ? text.save : text.acceptAll;
	}

	root.append( title, message, optionsList, actions, customize );
	container.appendChild( root );

	return {
		root,
		/**
		 * Shows the banner with the switches set to `choices`.
		 *
		 * @param {import('./common').ConsentChoices} choices      Current choices.
		 * @param {boolean}                           settingsView Open on the switches.
		 */
		show( choices, settingsView ) {
			analytics.input.checked = choices.analytics;
			marketing.input.checked = choices.marketing;
			setView( settingsView );
			root.hidden = false;
		},
		hide() {
			root.hidden = true;
		},
		focusSwitches() {
			analytics.input.focus();
		},
	};
}
