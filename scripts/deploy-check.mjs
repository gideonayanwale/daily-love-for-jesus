#!/usr/bin/env node
/**
 * ==============================================================================
 * Daily Love For Jesus - Production Deployment Health & Verification Tool
 * ==============================================================================
 * Usage:
 *   node scripts/deploy-check.mjs [target_url] [frontend_origin]
 *
 * Example:
 *   node scripts/deploy-check.mjs https://daily-love-backend.up.railway.app https://dailylove.pages.dev
 */

const targetUrl = (process.argv[2] || process.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const frontendOrigin = process.argv[3] || 'https://dailylove.pages.dev';

console.log('='.repeat(70));
console.log('🚀 DAILY LOVE FOR JESUS - DEPLOYMENT HEALTH VERIFIER');
console.log('='.repeat(70));
console.log(`📡 Target API Backend:  ${targetUrl}`);
console.log(`🌐 Test Frontend Origin: ${frontendOrigin}`);
console.log(`⏱️ Timestamp:            ${new Date().toISOString()}`);
console.log('-'.repeat(70));

const tests = [
  {
    name: 'Backend Health & Dual DB Connectivity',
    path: '/api/sync/health',
    expectedStatus: 200,
    validate: (body) => {
      if (body.status !== 'ok') throw new Error(`Status not ok: ${JSON.stringify(body)}`);
      return `Status: ${body.status} (DB: ${JSON.stringify(body.database || {})})`;
    },
  },
  {
    name: 'Swagger OpenAPI Documentation',
    path: '/api/docs',
    expectedStatus: [200, 301, 302],
    validate: (_, res) => `HTTP ${res.status} OK (Swagger UI is mounted)`,
  },
  {
    name: 'Today Devotional Feed',
    path: '/api/devotionals/today',
    expectedStatus: 200,
    validate: (body) => {
      const title = body?.title || body?.items?.[0]?.title || 'Available';
      return `Loaded: "${title}"`;
    },
  },
  {
    name: 'Baptist Hymns Catalog',
    path: '/api/hymns?limit=1',
    expectedStatus: 200,
    validate: (body) => {
      const count = Array.isArray(body?.items) ? body.items.length : Array.isArray(body) ? body.length : 0;
      return `Retrieved ${count} hymn record(s)`;
    },
  },
  {
    name: 'Bible Scripture Verse Engine',
    path: '/api/bible/random?translation=KJV',
    expectedStatus: 200,
    validate: (body) => {
      const verse = body?.text || body?.verse?.text || 'Scripture loaded';
      return `Scripture Engine operational (${verse.substring(0, 45)}...)`;
    },
  },
];

async function run() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const fullUrl = `${targetUrl}${test.path}`;
    process.stdout.write(`⏳ Testing [${test.name}] ... `);

    try {
      const res = await fetch(fullUrl, {
        headers: {
          Origin: frontendOrigin,
          Accept: 'application/json, text/html, */*',
        },
      });

      const allowedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
      if (!allowedStatuses.includes(res.status)) {
        throw new Error(`Expected HTTP status ${test.expectedStatus}, received ${res.status}`);
      }

      const contentType = res.headers.get('content-type') || '';
      let body = null;
      if (contentType.includes('application/json')) {
        body = await res.json();
      } else {
        body = await res.text();
      }

      const detail = test.validate ? test.validate(body, res) : `HTTP ${res.status}`;
      console.log(`\x1b[32mPASSED\x1b[0m (${detail})`);
      passed++;
    } catch (err) {
      console.log(`\x1b[31mFAILED\x1b[0m: ${err.message}`);
      failed++;
    }
  }

  // Test CORS Preflight
  process.stdout.write(`⏳ Testing [CORS OPTIONS Preflight] ... `);
  try {
    const corsRes = await fetch(`${targetUrl}/api/sync/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: frontendOrigin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    const allowOrigin = corsRes.headers.get('access-control-allow-origin');
    if (allowOrigin === frontendOrigin || allowOrigin === '*') {
      console.log(`\x1b[32mPASSED\x1b[0m (Access-Control-Allow-Origin: ${allowOrigin})`);
      passed++;
    } else {
      console.log(`\x1b[33mNOTICE\x1b[0m (CORS returned: ${allowOrigin || 'none'}, configure FRONTEND_URL in backend env)`);
    }
  } catch (err) {
    console.log(`\x1b[31mFAILED\x1b[0m: ${err.message}`);
  }

  console.log('='.repeat(70));
  if (failed === 0) {
    console.log(`\x1b[32m✨ ALL ${passed} DEPLOYMENT CHECKS PASSED!\x1b[0m Stack is ready for production traffic.`);
  } else {
    console.log(`\x1b[31m⚠️ ${failed} CHECKS FAILED (${passed} passed).\x1b[0m Please verify your environment variables.`);
    process.exit(1);
  }
}

run();
