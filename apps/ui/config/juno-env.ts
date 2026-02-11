/**
 * Environment Configuration for Juno Deployment
 *
 * This module handles environment-specific configurations for
 * deploying to different Juno environments (development, staging, production).
 */

import { resolve } from 'path';
import { config } from 'dotenv';

export type JunoEnvironment = 'development' | 'staging' | 'production';

export interface JunoConfig {
  satelliteId: string;
  environment: JunoEnvironment;
  customDomain?: string;
  source: string;
}

export interface AppConfig {
  serverUrl: string;
  appMode: string;
  appEnv: string;
  skipElectron: boolean;
}

/**
 * Load environment configuration for a specific Juno environment
 */
export function loadJunoEnvironment(env: JunoEnvironment): JunoConfig {
  // Load environment-specific .env file
  const envFile = `.env.juno.${env}`;
  config({ path: envFile });

  return {
    satelliteId: process.env.JUNO_SATELLITE_ID || '',
    environment: env,
    customDomain: process.env.JUNO_CUSTOM_DOMAIN,
    source: './dist',
  };
}

/**
 * Get the current Juno environment from environment variables
 */
export function getCurrentJunoEnvironment(): JunoEnvironment {
  const env = process.env.JUNO_ENV || process.env.NODE_ENV;

  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
}

/**
 * Validate Juno configuration
 */
export function validateJunoConfig(config: JunoConfig): void {
  if (!config.satelliteId) {
    throw new Error(
      'JUNO_SATELLITE_ID is required. Please set it in your environment file or .env.juno.{environment}'
    );
  }

  if (!['development', 'staging', 'production'].includes(config.environment)) {
    throw new Error(
      `Invalid Juno environment: ${config.environment}. Must be one of: development, staging, production`
    );
  }
}

/**
 * Get environment-specific build configuration
 */
export function getBuildConfig(env: JunoEnvironment) {
  const isProduction = env === 'production';
  const isStaging = env === 'staging';

  return {
    // Source maps enabled only in development
    sourcemap: !isProduction && !isStaging,

    // Minification settings
    minify: isProduction || isStaging ? 'terser' : false,

    // Output directory
    outDir: 'dist',

    // Clean output directory before build
    emptyOutDir: true,

    // Rollup options for production
    rollupOptions: isProduction
      ? {
          output: {
            // Chunk size optimization
            manualChunks: {
              vendor: ['react', 'react-dom'],
              router: ['@tanstack/react-router'],
              ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
            },
          },
        }
      : undefined,
  };
}

/**
 * Get environment-specific Vite define values
 */
export function getDefineConfig(env: JunoEnvironment, version: string) {
  const appConfig: AppConfig = {
    serverUrl: process.env.VITE_SERVER_URL || 'http://localhost:3008',
    appMode: process.env.VITE_APP_MODE || env,
    appEnv: process.env.VITE_APP_ENV || env,
    skipElectron: process.env.VITE_SKIP_ELECTRON === 'true',
  };

  return {
    __APP_VERSION__: JSON.stringify(version),
    __APP_ENV__: JSON.stringify(appConfig.appEnv),
    __APP_MODE__: JSON.stringify(appConfig.appMode),
    'process.env.VITE_SERVER_URL': JSON.stringify(appConfig.serverUrl),
    'process.env.VITE_APP_MODE': JSON.stringify(appConfig.appMode),
    'process.env.VITE_APP_ENV': JSON.stringify(appConfig.appEnv),
  };
}
