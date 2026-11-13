import icgPreset from '@icg/tailwind-preset';

const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [icgPreset],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(10px)' } },
        'sheet-in': { from: { transform: 'translateY(100%)' } },
        'fade-in': { from: { opacity: '0' } },
      },
      animation: {
        rise: `rise 380ms ${EASE_OUT} both`,
        'sheet-in': `sheet-in 320ms ${EASE_OUT} both`,
        'fade-in': `fade-in 200ms ${EASE_OUT} both`,
      },
    },
  },
};
