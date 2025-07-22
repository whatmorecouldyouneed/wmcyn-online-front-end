#!/usr/bin/env node

/**
 * Firebase Production Diagnostic Script
 * Run this to test Firebase connectivity and configuration
 */

const https = require('https');

console.log('🔍 Firebase Production Diagnostic Tool');
console.log('=====================================\n');

// Check if this is running in the production environment
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);

// Check all required Firebase environment variables
const requiredVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

console.log('\n📋 Environment Variables Check:');
console.log('================================');

const missingVars = [];
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const exists = !!value;
  const masked = exists ? `${value.substring(0, 8)}...` : 'MISSING';
  console.log(`${exists ? '✅' : '❌'} ${varName}: ${masked}`);
  if (!exists) missingVars.push(varName);
});

if (missingVars.length > 0) {
  console.log(`\n❌ Missing required variables: ${missingVars.join(', ')}`);
  console.log('\n💡 To fix this:');
  console.log('1. Check your GitHub repository secrets');
  console.log('2. Ensure all Firebase secrets are set correctly');
  console.log('3. Trigger a new deployment after updating secrets');
  process.exit(1);
}

// Test Firebase project connectivity
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (projectId) {
  console.log('\n🌐 Testing Firebase Project Connectivity:');
  console.log('==========================================');
  
  const databaseUrl = `https://${projectId}-default-rtdb.firebaseio.com/.json`;
  console.log(`Testing database URL: ${databaseUrl}`);
  
  https.get(databaseUrl, (res) => {
    console.log(`✅ Database response status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log('✅ Firebase Realtime Database is accessible');
    } else {
      console.log('⚠️  Database returned non-200 status');
    }
  }).on('error', (err) => {
    console.log('❌ Database connection failed:', err.message);
  });
  
  // Test Firestore (if needed)
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  console.log(`Testing Firestore URL: ${firestoreUrl}`);
  
  https.get(firestoreUrl, (res) => {
    console.log(`✅ Firestore response status: ${res.statusCode}`);
    if (res.statusCode === 200 || res.statusCode === 401) {
      console.log('✅ Firestore is accessible (401 expected without auth)');
    } else {
      console.log('⚠️  Firestore returned unexpected status');
    }
  }).on('error', (err) => {
    console.log('❌ Firestore connection failed:', err.message);
  });
}

console.log('\n📝 Next Steps:');
console.log('==============');
console.log('1. Open your production site: https://whatmorecouldyouneed.com');
console.log('2. Open browser developer tools (F12)');
console.log('3. Go to Console tab');
console.log('4. Try submitting an email');
console.log('5. Look for Firebase logs starting with "Firebase config validation"');
console.log('6. Check for any red error messages');
console.log('\n💡 Common issues:');
console.log('- Missing environment variables in GitHub secrets');
console.log('- Firebase project not configured for web');
console.log('- Database rules preventing writes');
console.log('- Network/CORS issues');