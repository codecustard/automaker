#!/usr/bin/env node

/**
 * Juno Deployment Script
 *
 * This script handles deployment to Juno (Internet Computer) with support for
 * multiple environments (development, staging, production).
 *
 * Usage:
 *   node scripts/deploy-juno.mjs [environment]
 *
 * Environment values:
 *   - development (default)
 *   - staging
 *   - production
 *
 * Environment Variables:
 *   - JUNO_SATELLITE_ID: The satellite ID for deployment
 *   - JUNO_TOKEN: Authentication token (optional, uses CLI login if not set)
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg) => console.error(`${colors.red}✗ ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.bright}\n▶ ${msg}${colors.reset}`),
};

function validateEnvironment(env) {
  const validEnvironments = ['development', 'staging', 'production'];

  if (!validEnvironments.includes(env)) {
    log.error(`Invalid environment: ${env}`);
    log.info(`Valid environments: ${validEnvironments.join(', ')}`);
    process.exit(1);
  }
}

function loadEnvFile(env) {
  const envFile = resolve(process.cwd(), `.env.juno.${env}`);

  if (!existsSync(envFile)) {
    log.warning(`Environment file not found: ${envFile}`);
    log.info('Creating from template...');
    return null;
  }

  const content = readFileSync(envFile, 'utf-8');
  const envVars = {};

  content.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });

  return envVars;
}

function checkJunoCLI() {
  try {
    execSync('npx juno --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function checkSatelliteId(env) {
  const satelliteId = process.env.JUNO_SATELLITE_ID;

  if (!satelliteId) {
    const envVars = loadEnvFile(env);
    if (envVars?.JUNO_SATELLITE_ID) {
      process.env.JUNO_SATELLITE_ID = envVars.JUNO_SATELLITE_ID;
      return true;
    }
    return false;
  }

  return true;
}

function buildForEnvironment(env) {
  log.step(`Building for ${env} environment...`);

  try {
    const buildCommand = `npm run build:juno:${env === 'production' ? 'prod' : env}`;
    execSync(buildCommand, {
      stdio: 'inherit',
      env: {
        ...process.env,
        JUNO_ENV: env,
      },
    });
    log.success('Build completed successfully');
  } catch (error) {
    log.error('Build failed');
    process.exit(1);
  }
}

function deployToJuno(env) {
  log.step(`Deploying to Juno (${env})...`);

  try {
    // Check if user is logged in
    try {
      execSync('npx juno whoami', { stdio: 'ignore' });
    } catch {
      log.warning('Not logged in to Juno. Please run: npm run juno:login');
      process.exit(1);
    }

    // Deploy
    const deployCommand = `npx juno deploy --target ${env}`;
    execSync(deployCommand, {
      stdio: 'inherit',
      env: {
        ...process.env,
        JUNO_ENV: env,
      },
    });

    log.success(`Deployment to ${env} completed successfully!`);

    // Show deployment info
    const envVars = loadEnvFile(env);
    if (envVars?.JUNO_CUSTOM_DOMAIN) {
      log.info(`\nCustom domain: ${envVars.JUNO_CUSTOM_DOMAIN}`);
    }
    log.info(`Satellite ID: ${process.env.JUNO_SATELLITE_ID}`);
  } catch (error) {
    log.error(`Deployment to ${env} failed`);
    console.error(error.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const env = args[0] || process.env.JUNO_ENV || 'development';

  log.step(`Juno Deployment - ${env.toUpperCase()}`);
  log.info(`Working directory: ${process.cwd()}`);

  // Validate environment
  validateEnvironment(env);

  // Check if Juno CLI is available
  if (!checkJunoCLI()) {
    log.error('Juno CLI not found. Please install: npm install -g @junobuild/cli');
    process.exit(1);
  }

  // Check satellite ID
  if (!checkSatelliteId(env)) {
    log.error('JUNO_SATELLITE_ID not set');
    log.info('Please set it in your environment or .env.juno.{environment} file');
    log.info('You can get your satellite ID from: https://console.juno.build');
    process.exit(1);
  }

  // Load environment variables
  const envVars = loadEnvFile(env);
  if (envVars) {
    Object.keys(envVars).forEach((key) => {
      if (!process.env[key]) {
        process.env[key] = envVars[key];
      }
    });
  }

  // Build and deploy
  buildForEnvironment(env);
  deployToJuno(env);

  log.success('Deployment complete!');
}

main();
