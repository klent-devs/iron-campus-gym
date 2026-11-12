import icgPreset from '@icg/tailwind-preset';

// Motion for the admin website. Short and calm: things slide a few pixels and fade, nothing
// bounces. Every animation is wrapped in `motion-safe:` where it is used, so people who turn on
// "reduce motion" in Windows get no movement. Exit lengths match lib/usePresence.js EXIT_MS.
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [icgPreset],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        // QR scanner: the orange line sweeps up and down inside the frame while the camera is on.
        'scan-line': {
          '0%, 100%': { transform: 'translateY(-96px)' },
          '50%': { transform: 'translateY(96px)' },
        },
        // Scanner result: a soft ring that grows out of the result icon once.
        'ring-out': {
          from: { boxShadow: '0 0 0 0 rgb(255 255 255 / 0.55)' },
          to: { boxShadow: '0 0 0 18px rgb(255 255 255 / 0)' },
        },
        'fade-in': { from: { opacity: '0' } },
        'fade-out': { to: { opacity: '0' } },
        rise: { from: { opacity: '0', transform: 'translateY(10px)' } },
        'drop-in': { from: { opacity: '0', transform: 'translateY(-4px)' } },
        'dialog-in': { from: { opacity: '0', transform: 'translateY(16px) scale(0.97)' } },
        'dialog-out': { to: { opacity: '0', transform: 'translateY(8px) scale(0.98)' } },
        'drawer-in': { from: { transform: 'translateX(100%)' } },
        'drawer-out': { to: { transform: 'translateX(100%)' } },
        'toast-in': { from: { opacity: '0', transform: 'translateY(16px) scale(0.96)' } },
        'toast-out': { to: { opacity: '0', transform: 'translateX(24px)' } },
        // Orange glow that fades away on a table row that just changed.
        'row-flash': {
          '0%, 25%': { backgroundColor: 'rgb(255 61 10 / 0.16)' },
          '100%': { backgroundColor: 'rgb(255 61 10 / 0)' },
        },
        // A summary number that just changed.
        'value-pop': {
          from: { opacity: '0.2', transform: 'translateY(6px)' },
        },
      },
      animation: {
        'scan-line': 'scan-line 2.4s ease-in-out infinite',
        'ring-out': 'ring-out 700ms ease-out 120ms both',
        'fade-in': `fade-in 200ms ${EASE_OUT} both`,
        'fade-out': `fade-out 160ms ${EASE_IN} both`,
        rise: `rise 420ms ${EASE_OUT} both`,
        'drop-in': `drop-in 180ms ${EASE_OUT} both`,
        'dialog-in': `dialog-in 260ms ${EASE_OUT} both`,
        'dialog-out': `dialog-out 160ms ${EASE_IN} both`,
        'drawer-in': `drawer-in 320ms ${EASE_OUT} both`,
        'drawer-out': `drawer-out 200ms ${EASE_IN} both`,
        'toast-in': `toast-in 320ms ${EASE_OUT} both`,
        'toast-out': `toast-out 180ms ${EASE_IN} both`,
        'row-flash': 'row-flash 1600ms ease-out both',
        'value-pop': `value-pop 360ms ${EASE_OUT} both`,
      },
    },
  },
};
