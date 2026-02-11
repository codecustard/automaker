#!/usr/bin/env node
/**
 * Full Juno Deployment with Tunnel
 * 
 * This script automates the full workflow:
 * 1. Builds the server (if needed)
 * 2. Starts the local server in the background
 * 3. Starts a tunnel (ngrok, cloudflared, or localtunnel)
 * 4. Builds the UI with the tunnel URL
 * 5. Deploys to Juno
 * 
 * Usage:
 *   node scripts/juno-deploy-with-tunnel.mjs [environment]
 * 
 * Environment:
 *   JUNO_SATELLITE_ID - Required. Your Juno satellite ID
 *   TUNNEL_PROVIDER - Optional. 'ngrok' (default), 'cloudflared', or 'localtunnel'
 *   NGROK_AUTH_TOKEN - Optional. For ngrok custom domains
 *   NGROK_DOMAIN - Optional. Custom ngrok domain
 * 
 * Examples:
 *   node scripts/juno-deploy-with-tunnel.mjs dev
 *   TUNNEL_PROVIDER=cloudflared node scripts/juno-deploy-with-tunnel.mjs staging
 */

import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { createConnection } from 'net';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ENV = process.argv[2] || 'dev';
const VALID_ENVS = ['dev', 'development', 'staging', 'prod', 'production'];
const TUNNEL_PROVIDER = process.env.TUNNEL_PROVIDER || 'ngrok';
const SERVER_PORT = 3008;
const SERVER_START_TIMEOUT = 30000; // 30 seconds

if (!VALID_ENVS.includes(ENV)) {
  console.error(`❌ Invalid environment: ${ENV}`);
  console.error(`Valid options: ${VALID_ENVS.join(', ')}`);
  process.exit(1);
}

const TARGET = ENV.startsWith('dev') ? 'development' : 
               ENV.startsWith('staging') ? 'staging' : 'production';

console.log(`🚀 Starting Juno deployment to ${TARGET.toUpperCase()} with ${TUNNEL_PROVIDER} tunnel...\n`);

// Check for required env vars
if (!process.env.JUNO_SATELLITE_ID) {
  console.error('❌ JUNO_SATELLITE_ID environment variable is required');
  console.error('   Set it with: export JUNO_SATELLITE_ID=your-satellite-id\n');
  process.exit(1);
}

let serverProcess = null;
let tunnelUrl = null;
let tunnelProcess = null;

async function cleanup() {
  console.log('\n🧹 Cleaning up...');
  
  if (tunnelProcess) {
    console.log('   Stopping tunnel...');
    tunnelProcess.kill('SIGTERM');
    console.log('   ✅ Tunnel stopped');
  }
  
  if (serverProcess) {
    console.log('   Stopping server...');
    serverProcess.kill('SIGTERM');
    console.log('   ✅ Server stopped');
  }
}

async function isPortOpen(port, host = 'localhost', timeout = 1000) {
  return new Promise((resolve) => {
    const socket = createConnection(port, host);
    
    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.setTimeout(timeout);
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port, timeout = SERVER_START_TIMEOUT) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await isPortOpen(port)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
}

async function buildServer() {
  const serverBuildPath = join(__dirname, '..', '..', 'server', 'dist', 'index.js');
  
  // Check if server is already built
  if (existsSync(serverBuildPath)) {
    console.log('✅ Server already built\n');
    return;
  }
  
  console.log('📦 Building server...\n');
  
  return new Promise((resolve, reject) => {
    const build = spawn('npm', ['run', 'build:server'], {
      stdio: 'inherit',
      cwd: join(__dirname, '..', '..', '..')
    });

    build.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Server built\n');
        resolve();
      } else {
        reject(new Error(`Server build failed with code ${code}`));
      }
    });

    build.on('error', (err) => {
      reject(new Error(`Server build error: ${err.message}`));
    });
  });
}

async function startServer() {
  console.log('🚀 Starting local server...');
  
  const serverPath = join(__dirname, '..', '..', 'server', 'dist', 'index.js');
  
  if (!existsSync(serverPath)) {
    throw new Error(`Server not found at ${serverPath}. Run 'npm run build:server' first.`);
  }
  
  serverProcess = spawn('node', [serverPath], {
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: String(SERVER_PORT),
    }
  });

  // Log server output in gray
  serverProcess.stdout.on('data', (data) => {
    console.log('\x1b[90m[server] ' + data.toString().trim() + '\x1b[0m');
  });

  serverProcess.stderr.on('data', (data) => {
    console.log('\x1b[90m[server] ' + data.toString().trim() + '\x1b[0m');
  });

  serverProcess.on('error', (err) => {
    console.error('Server error:', err);
  });

  // Wait for port to be open
  console.log(`   Waiting for server on port ${SERVER_PORT}...`);
  const isReady = await waitForPort(SERVER_PORT);
  
  if (!isReady) {
    throw new Error(`Server failed to start within ${SERVER_START_TIMEOUT}ms`);
  }
  
  console.log('✅ Server is ready\n');
}

async function startNgrok() {
  console.log('🔌 Starting ngrok tunnel...');
  
  // Try to import ngrok
  let ngrok;
  try {
    ngrok = await import('@ngrok/ngrok');
  } catch (err) {
    throw new Error('ngrok package not found. Install with: npm install @ngrok/ngrok');
  }
  
  const config = {};
  if (process.env.NGROK_AUTH_TOKEN) {
    config.authtoken = process.env.NGROK_AUTH_TOKEN;
  }
  if (process.env.NGROK_DOMAIN) {
    config.domain = process.env.NGROK_DOMAIN;
  }

  try {
    const listener = await ngrok.connect({
      addr: SERVER_PORT,
      ...config,
    });

    return listener.url();
  } catch (err) {
    if (err.message.includes('ERR_NGROK_4018') || err.message.includes('verified account')) {
      throw new Error(
        'ngrok requires a verified account.\n' +
        '  1. Sign up at https://dashboard.ngrok.com/signup\n' +
        '  2. Get your auth token at https://dashboard.ngrok.com/get-started/your-authtoken\n' +
        '  3. Set it: export NGROK_AUTH_TOKEN=your-token\n' +
        '\n  Or use cloudflared instead: TUNNEL_PROVIDER=cloudflared npm run juno:deploy:tunnel:dev'
      );
    }
    throw err;
  }
}

async function startCloudflared() {
  console.log('🔌 Starting cloudflared tunnel...');
  
  return new Promise((resolve, reject) => {
    let url = null;
    
    tunnelProcess = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${SERVER_PORT}`], {
      stdio: 'pipe'
    });

    tunnelProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('\x1b[90m[tunnel] ' + output.trim() + '\x1b[0m');
      
      // Extract URL from output
      const match = output.match(/(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/);
      if (match && !url) {
        url = match[1];
        resolve(url);
      }
    });

    tunnelProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('\x1b[90m[tunnel] ' + output.trim() + '\x1b[0m');
      
      // Sometimes cloudflared outputs URL to stderr
      const match = output.match(/(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/);
      if (match && !url) {
        url = match[1];
        resolve(url);
      }
    });

    tunnelProcess.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error(
          'cloudflared not found. Install it:\n' +
          '  macOS: brew install cloudflared\n' +
          '  Other: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/'
        ));
      } else {
        reject(err);
      }
    });

    tunnelProcess.on('exit', (code) => {
      if (!url) {
        reject(new Error(`cloudflared exited with code ${code}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!url) {
        reject(new Error('cloudflared failed to provide URL within 30 seconds'));
      }
    }, 30000);
  });
}

async function startLocaltunnel() {
  console.log('🔌 Starting localtunnel...');
  
  return new Promise((resolve, reject) => {
    let url = null;
    
    tunnelProcess = spawn('npx', ['localtunnel', '--port', String(SERVER_PORT)], {
      stdio: 'pipe'
    });

    tunnelProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('\x1b[90m[tunnel] ' + output.trim() + '\x1b[0m');
      
      // Extract URL from output
      const match = output.match(/(https:\/\/[a-z0-9-]+\.loca\.lt)/);
      if (match && !url) {
        url = match[1];
        resolve(url);
      }
    });

    tunnelProcess.stderr.on('data', (data) => {
      console.log('\x1b[90m[tunnel] ' + data.toString().trim() + '\x1b[0m');
    });

    tunnelProcess.on('error', (err) => {
      reject(new Error(`localtunnel error: ${err.message}`));
    });

    tunnelProcess.on('exit', (code) => {
      if (!url) {
        reject(new Error(`localtunnel exited with code ${code}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!url) {
        reject(new Error('localtunnel failed to provide URL within 30 seconds'));
      }
    }, 30000);
  });
}

async function startTunnel() {
  switch (TUNNEL_PROVIDER) {
    case 'cloudflared':
      return await startCloudflared();
    case 'localtunnel':
      return await startLocaltunnel();
    case 'ngrok':
    default:
      return await startNgrok();
  }
}

async function buildUI(serverUrl) {
  return new Promise((resolve, reject) => {
    console.log(`🔨 Building UI for ${TARGET}...`);
    console.log(`   Server URL: ${serverUrl}\n`);
    
    const buildCommand = TARGET === 'development' ? 'build:juno:dev' :
                         TARGET === 'staging' ? 'build:juno:staging' : 'build:juno:prod';
    
    const build = spawn('npm', ['run', buildCommand], {
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_SERVER_URL: serverUrl,
      },
      cwd: join(__dirname, '..')
    });

    build.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Build complete\n');
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });

    build.on('error', (err) => {
      reject(new Error(`Build error: ${err.message}`));
    });
  });
}

async function deploy() {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Deploying to Juno (${TARGET})...\n`);
    
    const deploy = spawn('npx', ['juno', 'deploy', '--target', TARGET], {
      stdio: 'inherit',
      env: process.env,
      cwd: join(__dirname, '..')
    });

    deploy.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Deployment complete!');
        resolve();
      } else {
        reject(new Error(`Deployment failed with code ${code}`));
      }
    });

    deploy.on('error', (err) => {
      reject(new Error(`Deployment error: ${err.message}`));
    });
  });
}

async function main() {
  try {
    // Setup cleanup handlers
    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });

    // Step 1: Build server (if needed)
    await buildServer();

    // Step 2: Start server
    await startServer();

    // Step 3: Start tunnel
    tunnelUrl = await startTunnel();
    
    console.log('✅ Tunnel established!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Public URL: ${tunnelUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 4: Build UI
    await buildUI(tunnelUrl);

    // Step 5: Deploy
    await deploy();

    console.log('\n🎉 All done!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Your app is live at your ICP domain`);
    console.log(`📡 Connected to local server via: ${tunnelUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('⚠️  Keep this terminal open to maintain the tunnel.');
    console.log('   Press Ctrl+C when you want to stop.\n');

    // Keep running
    process.stdin.resume();

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    await cleanup();
    process.exit(1);
  }
}

main();
