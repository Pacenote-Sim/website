// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.pacenote.tech',
  integrations: [sitemap()],
  redirects: { '/docs': '/docs/getting-started/' },
  trailingSlash: 'always',
  markdown: {
    shikiConfig: { theme: 'github-dark-default' },
  },
  build: { inlineStylesheets: 'auto' },
});
