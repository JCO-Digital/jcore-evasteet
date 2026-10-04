const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	entry: {
		admin: './src/admin/index.js',
		// Inlined at the top of <head> by Banner::print_head_script().
		head: './src/banner/head.js',
		banner: './src/banner/index.js',
	},
};
