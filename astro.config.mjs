// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // This is still correct
  output: 'static',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [react()],
  adapter: vercel()
});