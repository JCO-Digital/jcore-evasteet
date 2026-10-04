/**
 * A settings section: title and description beside a card of controls.
 *
 * @param {Object}                    props
 * @param {string}                    props.title         Heading.
 * @param {import('react').ReactNode} [props.description] Intro under the heading.
 * @param {import('react').ReactNode} props.children      Controls.
 */
export default function Section( { title, description, children } ) {
	return (
		<section className="jcore-evasteet-admin__section">
			<div className="jcore-evasteet-admin__section-intro">
				<h2>{ title }</h2>
				{ description && <p>{ description }</p> }
			</div>
			<div className="jcore-evasteet-admin__card jcore-evasteet-admin__section-body">
				{ children }
			</div>
		</section>
	);
}
