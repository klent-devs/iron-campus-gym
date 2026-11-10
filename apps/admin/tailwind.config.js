import icgPreset from '@icg/tailwind-preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [icgPreset],
  content: ['./index.html', './src/**/*.{js,jsx}'],
};
