import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://www.catcolorcalculator.icu',
  trailingSlash: 'always',
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
});
