#!/usr/bin/env node

/**
 * Check if backend is running before running Cypress tests
 */

import http from 'http';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const HEALTH_ENDPOINT = `${BACKEND_URL}/api/v1/health`;

console.log(`[Backend Check] Checking backend at ${HEALTH_ENDPOINT}...`);

const checkBackend = () => {
  return new Promise((resolve, reject) => {
    const req = http.get(HEALTH_ENDPOINT, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Backend is running at ${BACKEND_URL}`);
          resolve(true);
        } else {
          console.error(`❌ Backend returned status ${res.statusCode}`);
          reject(new Error(`Backend returned status ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`❌ Backend check failed: ${error.message}`);
      console.error(`\n💡 Make sure backend is running:`);
      console.error(`   cd backend && source venv/bin/activate && python -m uvicorn app.main:app --reload --port 8000\n`);
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Backend check timeout'));
    });
  });
};

checkBackend()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n❌ Backend is not running. Please start it first.`);
    process.exit(1);
  });

