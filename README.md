# JCORE Evästeet

A cookie consent banner for WordPress, wired to Google Consent Mode v2 and the WP Consent API. It is a WordPress port of `@jquest/cookie-consent` from the SuperQuest admin.

This file covers the plugin's development workflow. What the plugin does, and how to use it, is in [readme.txt](readme.txt).

## Requirements

- PHP 8.2+
- WordPress 6.7+
- Node 22+ and [pnpm](https://pnpm.io/)
- [Composer](https://getcomposer.org/) and [WP-CLI](https://wp-cli.org/) (WP-CLI is only needed for the translation targets)

## Getting started

```sh
pnpm install
composer install
pnpm build
pnpm i18n
pnpm playground
```

The last one serves [WordPress Playground](https://wordpress.org/playground/) on <http://localhost:8884> from `.wp/blueprint.json`, logged in as `admin` / `password` and landing on **Settings → Cookie consent**. Plugin Check and the WP Consent API are installed alongside it.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm build` | Build the banner scripts and the admin app into `build/`. |
| `pnpm start` | Same, in watch mode. |
| `pnpm check` | Everything CI lints: ESLint, Stylelint and PHPCS. |
| `pnpm format` | Format `src/` with `wp-scripts format`. |
| `pnpm i18n` | Regenerate the POT, the MO files and the JS translation JSON. |
| `pnpm playground` | Serve the plugin in WordPress Playground. |

`make ci` is what the release workflow runs before packaging.

## How it works

The visitor's answer lives in `localStorage` (`jcore-evasteet`), never in a cookie the server reads, so cached pages need no variants: whether to ask is decided in the browser.

- `src/banner/head.js` is printed **inline at the top of `<head>`** (`wp_head`, priority 0) together with `window.jcoreEvasteetSettings`. It pushes the Consent Mode default (everything denied), then an update if a stored answer grants anything, then loads the Tag Manager container if one is set. Nothing can run ahead of the signals. The tag carries the opt-out attributes of the common optimizers so they leave it alone.
- `src/banner/index.js` loads **deferred**. It shows the banner when there is no answer for the current revision, handles `#cookie-settings` links, pushes `consent update` on every answer, mirrors answers into the WP Consent API and exposes `window.jcoreEvasteet`.
- `src/banner/blocking.js` is the optional script blocking (`block_scripts`). A `MutationObserver` started by `head.js` turns `<script data-cookie-category>` tags the stored answer doesn't allow into `type="text/plain"` while the page is parsed (the original type goes to `data-cookie-type`), and `index.js` replaces allowed ones with live copies, in document order, on load and on every answer. Scripts above the head bootstrap or added by other scripts aren't caught unless they are `type="text/plain"` already.
- `src/banner/ui.js` builds the banner DOM. The admin app's preview uses the same module, so the preview is the banner.
- The stylesheet is registered with its `path`, so WordPress inlines it when it fits the inline budget.

Category mapping:

| Category | Consent Mode | WP Consent API |
| --- | --- | --- |
| Necessary | none, always on | `functional` |
| Analytics | `analytics_storage` | `statistics`, `statistics-anonymous` |
| Marketing | `ad_storage`, `ad_user_data`, `ad_personalization` | `marketing` |

Reject all and Accept all share one CSS rule and nothing else, so refusing is exactly as easy and as visible as agreeing. Keep it that way: the `--reject` / `--accept` modifiers are hooks only.

### Multilingual

- Built-in strings are rendered in PHP with `__()`, so they follow the page's locale, including the one Polylang or WPML sets. Finnish and Swedish ship in `languages/`.
- Text typed on the settings screen lives in its own option, `jcore_evasteet_text`, which `wpml-config.xml` registers for string translation. Polylang reads the same file.
- The privacy policy link comes from **Settings → Privacy**, which Polylang and WPML map to the translated page.

## Layout

```
jcore-evasteet.php             Plugin header, constants, autoloader, bootstrap
uninstall.php                  Removes the settings on delete
wpml-config.xml                Registers the banner text for WPML / Polylang
includes/
  class-plugin.php             Wires every component to its hooks
  class-settings.php           Options and sanitizing
  class-banner.php             Front end: head script, banner assets, consent type
  admin/class-menu.php         Settings > Cookie consent page and its assets
  rest/class-controller.php    Shared namespace and permission check
  rest/class-settings-controller.php
views/admin/page.php           Mount point for the React app
src/banner/                    Head bootstrap, banner, its DOM and styles
src/admin/                     The admin app
languages/                     .po sources; .pot, .mo and .json are generated
```

## REST API

All routes require `manage_options`.

| Route | Methods | |
| --- | --- | --- |
| `jcore-evasteet/v1/settings` | GET, POST | The settings and the banner text |
| `jcore-evasteet/v1/settings/ask-again` | POST | Raises the revision, so every visitor is asked again |

## Stored data

- Option `jcore_evasteet_settings` – enabled, position, colours, Tag Manager container and data layer, script blocking, revision.
- Option `jcore_evasteet_text` – the banner text typed on the settings screen.

## Releasing

`.github/workflows/release.yml`: foonver bumps the version in `jcore-evasteet.php`, `readme.txt` and `package.json` from the conventional commits, then jcore-update's reusable workflow runs `make ci`, packages the tree minus `.distignore`, attaches the zip to a GitHub release and registers it with `update.jcore.fi` (needs the `UPDATE_API_KEY` secret).
