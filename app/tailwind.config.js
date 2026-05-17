const daisyThemes = require('daisyui/src/theming/themes');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,css}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        light: {
          ...daisyThemes.light,
          primary: '#4a90b8',
          'primary-content': '#ffffff',
        },
      },
      {
        dark: {
          ...daisyThemes.dark,
          primary: '#4a90b8',
          'primary-content': '#ffffff',
        },
      },
    ],
  },
};
