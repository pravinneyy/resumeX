/**
 * Supabase Connection Diagnostic Tool
 * Run this to verify your Supabase configuration
 * 
 * Usage: node scripts/test-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Supabase Connection Diagnostic\n');
console.log('━'.repeat(50));

// Check if variables are set
console.log('\n📋 Environment Variables Check:');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);

if (supabaseUrl) {
    console.log(`   URL Value: ${supabaseUrl}`);
}

if (supabaseAnonKey) {
    console.log(`   Key Length: ${supabaseAnonKey.length} characters`);
    console.log(`   Key Starts With: ${supabaseAnonKey.substring(0, 10)}...`);
    
    // Check if it's the correct format (JWT tokens start with eyJ)
    if (supabaseAnonKey.startsWith('eyJ')) {
        console.log('   Key Format: ✅ Appears to be valid JWT format');
    } else {
        console.log('   Key Format: ❌ Does NOT appear to be valid JWT format');
        console.log('   ⚠️  Expected format: eyJ...');
    }
}

console.log('\n━'.repeat(50));

// Try to create client
if (!supabaseUrl || !supabaseAnonKey) {
    console.log('\n❌ Cannot test connection: Missing environment variables');
    console.log('\n💡 Next Steps:');
    console.log('   1. Create .env.local file in project root');
    console.log('   2. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.log('   3. Get the correct anon key from Supabase Dashboard → Settings → API');
    process.exit(1);
}

console.log('\n🔌 Testing Connection...\n');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test a simple query
async function testConnection() {
    try {
        // Try to fetch from a common table (adjust table name as needed)
        const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .limit(1);

        if (error) {
            console.log('❌ Connection Failed:');
            console.log(`   Error: ${error.message}`);
            console.log(`   Code: ${error.code || 'N/A'}`);
            console.log(`   Details: ${error.details || 'N/A'}`);
            
            if (error.message.includes('JWT') || error.message.includes('API key')) {
                console.log('\n💡 This looks like an API key issue!');
                console.log('   Make sure you\'re using the "anon" key, not the "service_role" key');
                console.log('   Get it from: Supabase Dashboard → Settings → API → anon public');
            }
        } else {
            console.log('✅ Connection Successful!');
            console.log(`   Retrieved ${data?.length || 0} record(s) from 'jobs' table`);
            console.log('\n🎉 Your Supabase configuration is working correctly!');
        }
    } catch (err) {
        console.log('❌ Unexpected Error:');
        console.log(`   ${err.message}`);
    }
}

testConnection().then(() => {
    console.log('\n━'.repeat(50));
    console.log('\n✨ Diagnostic Complete\n');
});
