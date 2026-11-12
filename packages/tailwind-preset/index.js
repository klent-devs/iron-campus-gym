/**
 * IRON CAMPUS GYM design tokens (from the Brand & Design System canvas).
 * Use in each app's tailwind.config.js:  presets: [icgPreset]
 */
const icgPreset = {
  theme: {
    extend: {
      colors: {
        base: '#090A0C', // main background
        sidebar: '#0D0E10',
        card: '#151619',
        'card-2': '#1D1F23', // secondary card
        line: '#292B30', // borders
        brand: {
          DEFAULT: '#FF3D0A', // primary orange: active nav, primary buttons
          hover: '#E93408',
          text: '#FF6A3D', // orange text/links on dark (readable contrast)
          light: '#D93208', // orange text on white (receipts)
        },
        ink: {
          DEFAULT: '#FFFFFF',
          muted: '#A1A1AA', // secondary text
          soft: '#D4D4D8',
          dim: '#71717A', // small print on dark panels (login footnote)
          faint: '#52525B', // expenses bars, quiet chart marks
        },
        success: { DEFAULT: '#24B47E', text: '#3DD598' },
        warning: { DEFAULT: '#F2A93B', text: '#F5B95A' },
        danger: { DEFAULT: '#E34D4D', text: '#F07070' },
      },
      fontFamily: {
        heading: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        btn: '12px',
        card: '16px',
        sheet: '24px',
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
    },
  },
};

export default icgPreset;
