# Juno.build Deployment Guide

This guide explains how to deploy the Automaker frontend application to the Internet Computer (ICP) blockchain using [Juno.build](https://juno.build) hosting platform.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Environment Setup](#environment-setup)
- [Deployment](#deployment)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

Juno.build is a decentralized hosting platform that allows you to deploy static websites and applications to the Internet Computer blockchain. This setup provides:

- **Decentralized hosting**: Your frontend runs on the Internet Computer
- **Edge distribution**: Global CDN with edge caching
- **Custom domains**: Support for custom domains with SSL
- **No server maintenance**: Serverless architecture

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User Browser  │────▶│   Juno (ICP)    │────▶│   Backend API   │
│                 │◀────│   (Frontend)    │◀────│   (Your Server) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Asset Canister │
                        │  (Static Files) │
                        └─────────────────┘
```

## Prerequisites

1. **Node.js 22+** (as specified in `engines`)
2. **npm** or **yarn**
3. **Juno CLI**: Install globally with `npm install -g @junobuild/cli`
4. **Internet Identity**: Create an account at [https://console.juno.build](https://console.juno.build)
5. **Satellite**: Create a satellite (canister) for each environment in Juno Console

## Quick Start

### 1. Install Dependencies

```bash
# From the root of the monorepo
npm install

# Install Juno CLI globally (optional, but recommended)
npm install -g @junobuild/cli
```

### 2. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cd apps/ui
cp .env.juno.development .env.juno.development.local
```

Edit `.env.juno.development.local` and add your satellite ID:

```env
JUNO_SATELLITE_ID=your-satellite-id-here
```

### 3. Login to Juno

```bash
npm run juno:login
```

This will open a browser window to authenticate with Internet Identity.

### 4. Deploy

```bash
# Deploy to development
npm run juno:deploy:dev

# Or deploy to staging
npm run juno:deploy:staging

# Or deploy to production
npm run juno:deploy:prod
```

## Configuration

### Juno Configuration Files

Three configuration files are provided:

1. **`juno.config.js`** - JavaScript configuration with environment variable support
2. **`juno.config.ts`** - TypeScript configuration (requires `@junobuild/config`)
3. **`juno.json`** - JSON configuration (recommended for CI/CD)

The configuration includes:

- **Asset headers**: Proper MIME types and caching headers for different file types
- **SPA routing**: Rewrites all routes to `index.html` for client-side routing
- **Gzip compression**: Enabled for better performance
- **Ignored files**: Source maps and development files excluded from deployment

### Vite Configuration

The `vite.config.mts` file has been updated to support Juno deployments:

- **Environment-specific builds**: Different configurations for dev/staging/prod
- **Chunk optimization**: Code splitting for better caching on ICP
- **Asset hashing**: Long-term caching with content-based hashing
- **Environment variables**: Injected at build time

## Environment Setup

### Environment Files

Three environment templates are provided:

- **`.env.juno.development`** - Development environment
- **`.env.juno.staging`** - Staging environment
- **`.env.juno.production`** - Production environment

### Required Environment Variables

| Variable             | Description              | Example                                |
| -------------------- | ------------------------ | -------------------------------------- |
| `JUNO_SATELLITE_ID`  | Your Juno satellite ID   | `abc123-def456`                        |
| `JUNO_ENV`           | Environment name         | `development`, `staging`, `production` |
| `JUNO_CUSTOM_DOMAIN` | Custom domain (optional) | `app.automaker.io`                     |
| `VITE_SERVER_URL`    | Backend API URL          | `https://api.automaker.io`             |

### Getting Your Satellite ID

1. Go to [https://console.juno.build](https://console.juno.build)
2. Create a new satellite or select an existing one
3. Copy the satellite ID from the dashboard
4. Add it to your environment file

### Setting Up Multiple Satellites

Create separate satellites for each environment:

1. **Development**: For testing and PR previews
2. **Staging**: For pre-production testing
3. **Production**: For live users

## Deployment

### Manual Deployment

#### Development

```bash
cd apps/ui
npm run juno:deploy:dev
```

This will:

1. Build the application with development settings
2. Deploy to your development satellite

#### Staging

```bash
cd apps/ui
npm run juno:deploy:staging
```

#### Production

```bash
cd apps/ui
npm run juno:deploy:prod
```

### Using the Deployment Script

A helper script is provided for more control:

```bash
node scripts/deploy-juno.mjs [environment]

# Examples:
node scripts/deploy-juno.mjs development
node scripts/deploy-juno.mjs staging
node scripts/deploy-juno.mjs production
```

### Available npm Scripts

| Script                        | Description                     |
| ----------------------------- | ------------------------------- |
| `npm run build:juno:dev`      | Build for development           |
| `npm run build:juno:staging`  | Build for staging               |
| `npm run build:juno:prod`     | Build for production            |
| `npm run juno:deploy:dev`     | Build and deploy to development |
| `npm run juno:deploy:staging` | Build and deploy to staging     |
| `npm run juno:deploy:prod`    | Build and deploy to production  |
| `npm run juno:login`          | Authenticate with Juno          |
| `npm run juno:init`           | Initialize Juno project         |

## CI/CD Integration

### GitHub Actions

Three workflows are configured:

#### 1. Development Deployment (`.github/workflows/juno-deploy-dev.yml`)

- **Triggers**: On pull requests to main
- **Environment**: development
- **Features**: PR comments with deployment URL

#### 2. Staging Deployment (`.github/workflows/juno-deploy-staging.yml`)

- **Triggers**: On push to main branch
- **Environment**: staging
- **Features**: Automatic deployment after merge

#### 3. Production Deployment (`.github/workflows/juno-deploy-production.yml`)

- **Triggers**: On release published or manual dispatch
- **Environment**: production
- **Features**:
  - Manual confirmation required
  - Post-deployment verification
  - Release notes updated

### Required GitHub Secrets

Configure these secrets in your repository settings:

| Secret                      | Description               | Required For     |
| --------------------------- | ------------------------- | ---------------- |
| `JUNO_TOKEN`                | Juno authentication token | All environments |
| `JUNO_SATELLITE_ID_DEV`     | Development satellite ID  | Development      |
| `JUNO_SATELLITE_ID_STAGING` | Staging satellite ID      | Staging          |
| `JUNO_SATELLITE_ID_PROD`    | Production satellite ID   | Production       |

### Required GitHub Variables

Configure these variables in your repository settings:

| Variable                  | Description            | Example                            |
| ------------------------- | ---------------------- | ---------------------------------- |
| `VITE_SERVER_URL_DEV`     | Dev backend URL        | `https://api-dev.automaker.io`     |
| `VITE_SERVER_URL_STAGING` | Staging backend URL    | `https://api-staging.automaker.io` |
| `VITE_SERVER_URL_PROD`    | Production backend URL | `https://api.automaker.io`         |

### Getting a Juno Token

1. Login locally: `npx juno login`
2. Get token: `npx juno token`
3. Copy the token and add it to GitHub secrets

## Custom Domains

### Setting Up a Custom Domain

1. In Juno Console, go to your satellite
2. Navigate to "Custom Domain"
3. Add your domain (e.g., `app.automaker.io`)
4. Add the DNS records as instructed by Juno
5. Add `JUNO_CUSTOM_DOMAIN` to your environment variables

### DNS Configuration

You'll typically need to add:

- **CNAME record**: Point your domain to Juno's gateway
- **TXT record**: Verify domain ownership

## Troubleshooting

### Common Issues

#### "JUNO_SATELLITE_ID not set"

**Solution**: Set the satellite ID in your environment file:

```bash
echo "JUNO_SATELLITE_ID=your-id" >> .env.juno.development.local
```

#### "Not logged in to Juno"

**Solution**: Authenticate with Juno:

```bash
npm run juno:login
```

#### Build fails with memory error

**Solution**: Increase Node.js memory limit:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build:juno:prod
```

#### Assets not loading (404 errors)

**Check**:

1. Verify `juno.json` has proper rewrites configuration
2. Ensure all assets are in the `dist` folder after build
3. Check Juno Console for deployment status

#### API requests failing

**Check**:

1. Verify `VITE_SERVER_URL` is set correctly
2. Ensure backend API allows CORS from your Juno domain
3. Check browser console for CORS errors

### Checking Deployment Status

```bash
cd apps/ui
npx juno status
```

### Rollback

To rollback to a previous version:

1. Go to Juno Console: https://console.juno.build
2. Select your satellite
3. Navigate to "Deployments"
4. Select the previous version to restore

### Verifying MIME Types

After deployment, verify assets are served with correct MIME types:

```bash
curl -I https://your-satellite.icp0.io/assets/app.js
```

Should show: `Content-Type: application/javascript`

### Performance Optimization

1. **Enable compression**: Already enabled in `juno.json`
2. **Optimize images**: Use WebP format where possible
3. **Lazy loading**: Implement code splitting for routes
4. **Caching headers**: Already configured for optimal caching

## Security Considerations

- **No API keys in frontend**: Never commit API keys to the repository
- **Environment isolation**: Use separate satellites for each environment
- **HTTPS only**: Juno enforces HTTPS for all deployments
- **CORS configuration**: Ensure your backend allows requests from Juno domains

## Support

- **Juno Documentation**: https://juno.build/docs
- **Juno Console**: https://console.juno.build
- **Internet Computer Docs**: https://internetcomputer.org/docs

## Additional Resources

- [Juno Configuration Reference](https://juno.build/docs/configuration)
- [Internet Computer Asset Canister](https://internetcomputer.org/docs/current/developer-docs/build/cdks/motoko-dfinity/asset-canister)
- [Vite Build Configuration](https://vitejs.dev/config/build-options.html)
