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
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.neutral.400'),
            '--tw-prose-headings': theme('colors.white'),
            '--tw-prose-lead': theme('colors.neutral.300'),
            '--tw-prose-links': theme('colors.amber.500'),
            '--tw-prose-bold': theme('colors.white'),
            '--tw-prose-counters': theme('colors.neutral.500'),
            '--tw-prose-bullets': theme('colors.neutral.500'),
            '--tw-prose-hr': theme('colors.neutral.800'),
            '--tw-prose-quotes': theme('colors.neutral.200'),
            '--tw-prose-quote-borders': theme('colors.amber.500'),
            '--tw-prose-captions': theme('colors.neutral.500'),
            '--tw-prose-code': theme('colors.white'),
            '--tw-prose-pre-code': theme('colors.neutral.300'),
            '--tw-prose-pre-bg': theme('colors.neutral.900'),
            '--tw-prose-th-borders': theme('colors.neutral.700'),
            '--tw-prose-td-borders': theme('colors.neutral.800'),
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // <-- 2. ADD IT HERE
  ],
}