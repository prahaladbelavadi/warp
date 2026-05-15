import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#1a1a1a',
        border: '#2a2a2a',
        muted: '#888888',
        green: { DEFAULT: '#25d366', dark: '#1da851' },
      },
    },
  },
};

export default config;
