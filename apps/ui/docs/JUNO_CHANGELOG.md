# Juno Deployment Setup

## Overview

This feature implements deployment of the Automaker frontend application to the Internet Computer (ICP) blockchain using Juno.build hosting platform.

## Files Added/Modified

### Configuration Files

- `apps/ui/juno.config.js` - JavaScript configuration for Juno CLI
- `apps/ui/juno.config.ts` - TypeScript configuration (requires @junobuild/config)
- `apps/ui/juno.json` - JSON configuration for CI/CD
- `apps/ui/.env.juno.development` - Development environment template
- `apps/ui/.env.juno.staging` - Staging environment template
- `apps/ui/.env.juno.production` - Production environment template
- `apps/ui/config/juno-env.ts` - Environment configuration utilities

### Modified Files

- `apps/ui/vite.config.mts` - Updated to support Juno builds with environment-specific configurations
- `apps/ui/package.json` - Added Juno CLI dependency and deployment scripts
- `apps/ui/.gitignore` - Added Juno-related ignore patterns

### Scripts

- `apps/ui/scripts/deploy-juno.mjs` - Deployment helper script with environment support

### CI/CD Workflows

- `.github/workflows/juno-deploy-dev.yml` - Deploy to development on PRs
- `.github/workflows/juno-deploy-staging.yml` - Deploy to staging on main branch push
- `.github/workflows/juno-deploy-production.yml` - Deploy to production on releases

### Documentation

- `apps/ui/docs/JUNO_DEPLOYMENT.md` - Comprehensive deployment guide

## NPM Scripts Added

```bash
# Build commands
npm run build:juno:dev       # Build for development
npm run build:juno:staging   # Build for staging
npm run build:juno:prod      # Build for production

# Deployment commands
npm run juno:deploy:dev      # Deploy to development
npm run juno:deploy:staging  # Deploy to staging
npm run juno:deploy:prod     # Deploy to production
npm run juno:deploy          # Deploy using juno.json configuration

# Utility commands
npm run juno:login           # Authenticate with Juno
npm run juno:init            # Initialize Juno project
npm run juno:config:validate # Validate Juno configuration
```

## Environment Variables

### Required

- `JUNO_SATELLITE_ID` - Your Juno satellite ID
- `JUNO_ENV` - Environment name (development/staging/production)

### Optional

- `JUNO_CUSTOM_DOMAIN` - Custom domain for your deployment
- `VITE_SERVER_URL` - Backend API URL
- `JUNO_TOKEN` - Authentication token for CI/CD

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   npm install -g @junobuild/cli
   ```

2. Configure environment:

   ```bash
   cp apps/ui/.env.juno.development apps/ui/.env.juno.development.local
   # Edit and add your JUNO_SATELLITE_ID
   ```

3. Login to Juno:

   ```bash
   npm run juno:login
   ```

4. Deploy:
   ```bash
   npm run juno:deploy:dev
   ```

## Features

### Asset Configuration

- Proper MIME types for all file types (JS, CSS, images, fonts, audio)
- Optimized caching headers (immutable for assets, no-cache for HTML)
- Gzip compression enabled
- SPA routing support (all routes → index.html)

### Build Optimization

- Environment-specific builds
- Code splitting for optimal caching
- Content-based hashing for long-term caching
- Source maps (development only)
- Terser minification (production/staging)

### CI/CD Integration

- Automatic deployments on PRs (development)
- Automatic deployments on main branch (staging)
- Manual deployments for production with confirmation
- Environment protection rules
- Deployment verification

## Security

- Separate satellites for each environment
- No API keys in build output
- HTTPS enforced by Juno
- CORS configuration support
- Environment isolation

## Dependencies Added

- `@junobuild/cli` (devDependency) - Juno CLI for deployment

## Breaking Changes

None. This feature is purely additive.

## Migration Guide

No migration needed. Existing builds and deployments continue to work as before.

## Known Limitations

- Requires separate backend deployment (Juno is frontend-only)
- Backend must support CORS from Juno domains
- First deployment may take a few minutes to propagate on ICP
