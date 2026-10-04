import apiFetch from '@wordpress/api-fetch';

const BASE = '/jcore-evasteet/v1';

export const getSettings = () => apiFetch( { path: `${ BASE }/settings` } );

export const saveSettings = ( data ) =>
	apiFetch( { path: `${ BASE }/settings`, method: 'POST', data } );

export const askAgain = () =>
	apiFetch( { path: `${ BASE }/settings/ask-again`, method: 'POST' } );
