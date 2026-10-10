/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				brand: {
					dark: '#0A1120',
					cardDark: '#131F37',
					mint: '#34D399',
					sage: '#10B981',
					accent: '#0284C7'
				}
			}
		}
	},
	plugins: []
};
