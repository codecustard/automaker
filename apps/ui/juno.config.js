import { defineConfig } from '@junobuild/config';

/** @type {import('@junobuild/config').JunoConfig} */
export default defineConfig({
  satellite: {
    ids: {
      development: process.env.JUNO_SATELLITE_ID || '',
      staging: process.env.JUNO_SATELLITE_ID_STAGING || process.env.JUNO_SATELLITE_ID || '',
      production: process.env.JUNO_SATELLITE_ID_PROD || process.env.JUNO_SATELLITE_ID || '',
    },
    source: './dist',
  },
  storage: {
    gzip: true,
    headers: [
      {
        source: '**/*.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Content-Type', value: 'text/html; charset=utf-8' },
        ],
      },
      {
        source: '**/*.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '**/*.css',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Type', value: 'text/css; charset=utf-8' },
        ],
      },
      {
        source: '**/*.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
        ],
      },
      {
        source: '**/*.svg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Type', value: 'image/svg+xml' },
        ],
      },
      {
        source: '**/*.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Type', value: 'image/png' },
        ],
      },
      {
        source: '**/*.ico',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Type', value: 'image/x-icon' },
        ],
      },
      {
        source: '**/*.woff2',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Type', value: 'font/woff2' },
        ],
      },
      {
        source: '**/*.woff',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Type', value: 'font/woff' },
        ],
      },
      {
        source: '**/*.mp3',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Type', value: 'audio/mpeg' },
        ],
      },
    ],
    rewrites: [{ source: '**', destination: '/index.html' }],
  },
  ignore: [
    '**/*.map',
    '**/npm-debug.log*',
    '**/yarn-debug.log*',
    '**/yarn-error.log*',
    '**/.env*',
    '**/*.js.map',
    '**/*.css.map',
  ],
});
