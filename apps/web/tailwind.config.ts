import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        conservative: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        balanced: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        growth: {
          50: '#fdf4ff',
          500: '#a855f7',
          600: '#9333ea',
        },
      },
    },
  },
  plugins: [],
};

export default config;
