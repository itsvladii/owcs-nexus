// tailwind.config.mjs
import defaultTheme from 'tailwindcss/defaultTheme';
import typography from '@tailwindcss/typography'; // <-- 1. IMPORT IT

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        title: ['"Big Noodle Titling"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [
    typography(), // <-- 2. ADD IT HERE
  ],
}