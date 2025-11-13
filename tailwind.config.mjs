// tailwind.config.mjs
import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        // This 'title' name creates the 'font-title' class
        title: ['"Big Noodle Titling"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}