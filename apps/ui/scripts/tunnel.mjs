#!/usr/bin/env node
/**
 * Tunnel Script - Multiple Provider Support
 * 
 * Starts a tunnel to localhost:3008 using your preferred provider.
 * 
 * Usage:
 *   node scripts/tunnel.mjs [port]
 *   TUNNEL_PROVIDER=cloudflared node scripts/tunnel.mjs
 * 
 * Providers:
 *   ngrok (default) - Requires auth token for most features
 *   cloudflared - Free, no auth required
 *   localtunnel - Free, no auth required
 * 
 * Environment:
 *   TUNNEL_PROVIDER - Which tunnel to use (ngrok, cloudflared, localtunnel)
 *   NGROK_AUTH_TOKEN - Required for ngrok (get at ngrok.com)
 *   NGROK_DOMAIN - Optional custom domain for ngrok
 * 
 * Examples:
 *   npm run tunnel                    # Uses ngrok on port 3008
 *   npm run tunnel 3008              # Specify port
 *   TUNNEL_PROVIDER=cloudflared npm run tunnel  # Use cloudflared
 */

import { spawn } from 'child_process';
import ngrok from '@ngrok/ngrok';

const PORT = parseInt(process.argv[2] || process.env.PORT || '3008', 10);
const TUNNEL_PROVIDER = process.env.TUNNEL_PROVIDER || 'ngrok';

console.log(`🔌 Starting ${TUNNEL_PROVIDER} tunnel to localhost:${PORT}...\n`);

async function startNgrok() {
  try {
    const config = {};
    if (process.env.NGROK_AUTH_TOKEN) {
      config.authtoken = process.env.NGROK_AUTH_TOKEN;
    }
    if (process.env.NGROK_DOMAIN) {
      config.domain = process.env.NGROK_DOMAIN;
    }

    const listener = await ngrok.connect({
      addr: PORT,
      ...config,
    });

    const url = listener.url();
    
    console.log('✅ Ngrok tunnel established!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Public URL: ${url}`);
    console.log(`📍 Local Port: ${PORT}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('💡 Use this URL for:');
    console.log(`   • CORS_ORIGIN environment variable: CORS_ORIGIN=${url}`);
    console.log(`   • VITE_SERVER_URL for build: VITE_SERVER_URL=${url}`);
    console.log(`   • Full deploy: VITE_SERVER_URL=${url} npm run juno:deploy:dev\n`);
    
    console.log('📝 Press Ctrl+C to stop the tunnel\n');

    // Keep the process running
    process.stdin.resume();

    // Handle cleanup
    const cleanup = async () => {
      console.log('\n🛑 Stopping ngrok tunnel...');
      await ngrok.disconnect();
      await ngrok.kill();
      console.log('✅ Tunnel closed');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

  } catch (error) {
    if (error.message.includes('ERR_NGROK_4018') || error.message.includes('verified account')) {
      console.error('❌ Ngrok requires a verified account.');
      console.error('\nTo fix this, you have 3 options:\n');
      console.error('1. Sign up for ngrok (free):');
      console.error('   • https://dashboard.ngrok.com/signup');
      console.error('   • Get token: https://dashboard.ngrok.com/get-started/your-authtoken');
      console.error('   • export NGROK_AUTH_TOKEN=your-token');
      console.error('\n2. Use cloudflared instead (free, no signup):');
      console.error('   • Install: brew install cloudflared');
      console.error(`   • Run: cloudflared tunnel --url http://localhost:${PORT}`);
      console.error(`   • Or: TUNNEL_PROVIDER=cloudflared npm run tunnel`);
      console.error('\n3. Use localtunnel instead (free, no signup):');
      console.error('   • Run: npx localtunnel --port 3008');
      console.error(`   • Or: TUNNEL_PROVIDER=localtunnel npm run tunnel\n`);
    } else {
      console.error('❌ Failed to start ngrok tunnel:', error.message);
    }
    process.exit(1);
  }
}

async function startCloudflared() {
  console.log('Starting cloudflared tunnel...\n');
  
  const tunnel = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`], {
    stdio: 'pipe'
  });

  let url = null;

  tunnel.stdout.on('data', (data) => {
    const output = data.toString();
    
    // Extract and display URL
    const match = output.match(/(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/);
    if (match && !url) {
      url = match[1];
      console.log('✅ Cloudflared tunnel established!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌐 Public URL: ${url}`);
      console.log(`📍 Local Port: ${PORT}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      console.log('💡 Use this URL for:');
      console.log(`   • CORS_ORIGIN environment variable: CORS_ORIGIN=${url}`);
      console.log(`   • VITE_SERVER_URL for build: VITE_SERVER_URL=${url}`);
      console.log(`   • Full deploy: VITE_SERVER_URL=${url} npm run juno:deploy:dev\n`);
      
      console.log('📝 Press Ctrl+C to stop the tunnel\n');
    } else {
      console.log('\x1b[90m[tunnel] ' + output.trim() + '\x1b[0m');
    }
  });

  tunnel.stderr.on('data', (data) => {
    const output = data.toString();
    
    // Sometimes cloudflared outputs URL to stderr
    const match = output.match(/(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/);
    if (match && !url) {
      url = match[1];
      console.log('✅ Cloudflared tunnel established!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌐 Public URL: ${url}`);
      console.log(`📍 Local Port: ${PORT}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      console.log('💡 Use this URL for:');
      console.log(`   • CORS_ORIGIN environment variable: CORS_ORIGIN=${url}`);
      console.log(`   • VITE_SERVER_URL for build: VITE_SERVER_URL=${url}`);
      console.log(`   • Full deploy: VITE_SERVER_URL=${url} npm run juno:deploy:dev\n`);
      
      console.log('📝 Press Ctrl+C to stop the tunnel\n');
    } else {
      console.log('\x1b[90m[tunnel] ' + output.trim() + '\x1b[0m');
    }
  });

  tunnel.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error('❌ cloudflared not found.\n');
      console.error('Install it:');
      console.error('  macOS: brew install cloudflared');
      console.error('  Other: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/');
      console.error('\nOr use ngrok/localtunnel instead:\n');
      console.error('  npm run tunnel:ngrok');
      console.error('  TUNNEL_PROVIDER=localtunnel npm run tunnel\n');
    } else {
      console.error('❌ cloudflared error:', err.message);
    }
    process.exit(1);
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping cloudflared tunnel...');
    tunnel.kill('SIGTERM');
  });

  process.on('SIGTERM', () => {
    tunnel.kill('SIGTERM');
    process.exit(0);
  });
}

async function startLocaltunnel() {
  console.log('Starting localtunnel...\n');
  
  const tunnel = spawn('npx', ['localtunnel', '--port', String(PORT)], {
    stdio: 'pipe'
  });

  let url = null;

  tunnel.stdout.on('data', (data) => {
    const output = data.toString();
    
    // Extract and display URL
    const match = output.match(/(https:\/\/[a-z0-9-]+\.loca\.lt)/);
    if (match && !url) {
      url = match[1];
      console.log('✅ Localtunnel established!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌐 Public URL: ${url}`);
      console.log(`📍 Local Port: ${PORT}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      console.log('💡 Use this URL for:');
      console.log(`   • CORS_ORIGIN environment variable: CORS_ORIGIN=${url}`);
      console.log(`   • VITE_SERVER_URL for build: VITE_SERVER_URL=${url}`);
      console.log(`   • Full deploy: VITE_SERVER_URL=${url} npm run juno:deploy:dev\n`);
      
      console.log('📝 Press Ctrl+C to stop the tunnel\n');
    } else {
      console.log('\x1b[90m[tunnel] ' + output.trim() + '\x1b[0m');
    }
  });

  tunnel.stderr.on('data', (data) => {
    console.log('\x1b[90m[tunnel] ' + data.toString().trim() + '\x1b[0m');
  });

  tunnel.on('error', (err) => {
    console.error('❌ localtunnel error:', err.message);
    process.exit(1);
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping localtunnel...');
    tunnel.kill('SIGTERM');
  });

  process.on('SIGTERM', () => {
    tunnel.kill('SIGTERM');
    process.exit(0);
  });
}

// Start the appropriate tunnel
switch (TUNNEL_PROVIDER) {
  case 'cloudflared':
    startCloudflared();
    break;
  case 'localtunnel':
    startLocaltunnel();
    break;
  case 'ngrok':
  default:
    startNgrok();
    break;
}
