// Simple verification script for environment setup
console.log('🔍 Verifying environment setup...\n');

// Check required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const optionalEnvVars = [
  'HCAPTCHA_SECRET_KEY',
  'NEXT_PUBLIC_BASE_URL'
];


console.log('Required Environment Variables:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value && value !== 'example-url' && value !== 'example-anon-key' && value !== 'example-service-key') {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`❌ ${varName}: Not set or using default value`);
  }
});

console.log('\nOptional Environment Variables:');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`⚠️  ${varName}: Not set (optional)`);
  }
});

console.log('\n📋 Summary:');
console.log('- Make sure you have set up your Supabase project');
console.log('- Run the SQL scripts in scripts/supabase-chat-schema.sql to create the required tables');
console.log('- Set the required environment variables in your .env.local file');
console.log('- The room creation system should work once these are properly configured');

console.log('\n🚀 Next steps:');
console.log('1. Create a .env.local file with your Supabase credentials');
console.log('2. Run the database schema scripts');
console.log('3. Test the room creation flow in your application'); 