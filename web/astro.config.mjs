// @ts-check
import { defineConfig } from 'astro/config';
import v7 from './src/v7/integration.mjs';

export default defineConfig({
  site: 'https://mateos.ai',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  // Keep authored whitespace: the markup must match today's site (and fragments rely on their spacing).
  compressHTML: false,
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'he'],
    routing: { prefixDefaultLocale: false },
  },
  devToolbar: { enabled: false },
  integrations: [v7()],
});
