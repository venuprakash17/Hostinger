// Script to verify API URL configuration
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

console.log('Current .env VITE_API_BASE_URL:');
const match = envContent.match(/VITE_API_BASE_URL=(.+)/);
if (match) {
  const url = match[1].trim();
  console.log(`  ${url}`);
  
  if (url.includes('72.60.101.14')) {
    console.log('\n❌ ERROR: Production URL detected!');
    console.log('Fixing to localhost:8000...');
    
    const newContent = envContent.replace(
      /VITE_API_BASE_URL=.*/,
      'VITE_API_BASE_URL=http://localhost:8000/api/v1'
    );
    
    fs.writeFileSync(envPath, newContent);
    console.log('✅ Fixed! Restart frontend to apply changes.');
  } else if (url.includes('localhost:8000')) {
    console.log('\n✅ Correct: Using localhost:8000');
  } else {
    console.log('\n⚠️  Warning: Unexpected URL');
  }
} else {
  console.log('  Not found - will use default');
}
