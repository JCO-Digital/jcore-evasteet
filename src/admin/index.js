import { createRoot } from '@wordpress/element';
import App from './App';
import './style.scss';

const root = document.getElementById( 'jcore-evasteet-app' );
if ( root ) {
	createRoot( root ).render( <App /> );
}
