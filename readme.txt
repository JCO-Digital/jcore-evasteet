=== JCORE Evästeet ===
Contributors: jcodigital
Tags: cookies, consent, gdpr, consent mode, google tag manager
Requires at least: 6.7
Tested up to: 7.1
Requires PHP: 8.2
Stable tag: 0.2.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A cookie consent banner wired to Google Consent Mode v2 and the WP Consent API.

== Description ==

The banner asks visitors which optional cookies they allow: analytics and marketing. Cookies the site needs to work are always on and are not asked about. **Reject all** and **Accept all** look exactly the same, so refusing is as easy as agreeing; **Customize** opens one switch per category.

= Features =

* **Google Consent Mode v2** – everything is denied until the visitor allows it, set at the very top of the page before any tag can run. Every answer updates the signals, so GA4 and Google Ads tags follow it.
* **Google Tag Manager** – optionally loads your container right after the consent defaults.
* **WP Consent API** – with that plugin active, answers are passed on to plugins that follow it, such as Site Kit.
* **Multilingual** – the built-in text is translated into Finnish and Swedish and follows the language of the page. Text you write yourself is translated with the string translation of Polylang or WPML. The privacy policy link follows the translated page.
* **Script blocking** – optionally holds back scripts marked with `data-cookie-category` until the visitor allows that category.
* **Cache friendly** – the answer is kept in the visitor's browser, so cached pages work as they are.
* **Settings → Cookie consent** – text, colours and position with a live preview, and **Ask everyone again** for when the cookies or the policy change.
* **Automatic updates** through the J&Co Digital update service.

= Changing an answer =

Visitors must be able to change their answer at any time. Any link to `#cookie-settings` opens the banner on its switches: add one as a custom link to the footer menu or a Navigation block.

= For developers =

* `window.jcoreEvasteet` – `choices`, `record`, `show( { settings: true } )`, `hide()`, `acceptAll()`, `rejectAll()`, `save( choices )` and `onChange( listener )`.
* The `jcore-evasteet-change` event on `document` carries the choices in `detail`.
* `jcore_evasteet_script_settings` (filter) – the settings the banner scripts read, text included.
* `jcore_evasteet_active` (filter) – return `false` to leave the banner and its scripts off a request.
* The colours are custom properties, such as `--jcore-evasteet-background`, that a theme can set too.

= External services =

When a Google Tag Manager container ID is set, visitors' browsers load the container from `https://www.googletagmanager.com`, operated by Google. As with any resource served by a third party, the visitor's IP address, browser information and the page address are sent to that server. What the container's tags do depends on their configuration and on the visitor's consent. See Google's terms (https://policies.google.com/terms) and privacy policy (https://policies.google.com/privacy).

The plugin checks for updates against `https://update.jcore.fi`, operated by J&Co Digital Oy. It sends the plugin slug and the installed version, and the site URL as the request's origin.

= Source code =

The scripts are built with `@wordpress/scripts`. Their readable source is published at https://github.com/JCO-Digital/jcore-evasteet.

== Installation ==

1. Upload the `jcore-evasteet` folder to `/wp-content/plugins/`, or install the zip from the Plugins screen.
2. Activate JCORE Evästeet. The banner shows right away.
3. Under **Settings → Privacy**, choose the privacy policy page the banner links to.
4. Under **Settings → Cookie consent**, adjust the text and colours and, if you use Google Tag Manager, enter the container ID.
5. Add a link to `#cookie-settings` to the footer menu, so visitors can change their answer.

== Frequently Asked Questions ==

= Does the plugin block scripts until consent is given? =

Only scripts you mark, and only with **Block scripts by category** on under **Settings → Cookie consent**. Give the script tag the category it needs, `analytics` or `marketing`:

`<script type="text/plain" data-cookie-category="marketing" src="https://example.com/pixel.js"></script>`

It runs once the visitor allows that category. Several categories, separated by spaces, must all be allowed; `necessary` never waits. Without `type="text/plain"`, marked scripts in the page are held back while it loads, but scripts added by other scripts are not, so `type="text/plain"` is the sure way. Put a `type` such as `module` in `data-cookie-type`. A script that has run keeps running until the next page, even if the visitor withdraws consent.

Other scripts are left alone. The plugin sets the consent signals that Google's tags follow, passes the answer to plugins through the WP Consent API, and tells your own scripts through `window.jcoreEvasteet` and the `jcore-evasteet-change` event. Tags in Tag Manager that are not Google's need consent settings in the container.

= Where is the answer stored? =

In the visitor's browser (localStorage, key `jcore-evasteet`), with the time it was given. Nothing is sent to the server.

= Does the plugin set cookies? =

No. With the WP Consent API plugin active, that plugin stores the answer in its own `wp_consent_*` cookies.

== Changelog ==

= 0.2.0 =

* Feature: add cookie consent banner plugin
