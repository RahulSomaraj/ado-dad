const jwt = require('jsonwebtoken');

// Test token from the login response
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NzRhMGEyMzA4MTRjNmE5OTVlOTc2NiIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInVzZXJUeXBlIjoiTlUiLCJpYXQiOjE3NTY2MTY2NjgsImV4cCI6MTc1NjcwMzA2OCwiYXVkIjoiYWRvLWRhZC11c2VycyIsImlzcyI6ImFkby1kYWQtYXBpIn0.zsi_BWiB9YLogjrMFCI4JWTi5MLmk0Pz6V9pwG1iKGY';

console.log('🔍 Environment Check:');
console.log('TOKEN_KEY:', process.env.TOKEN_KEY ? 'SET' : 'NOT SET');
console.log('JWT_PUBLIC_KEY:', process.env.JWT_PUBLIC_KEY ? 'SET' : 'NOT SET');

console.log('\n🔍 Token Analysis:');
const decoded = jwt.decode(testToken, { complete: true });
console.log('Algorithm:', decoded.header.alg);
console.log('Payload:', decoded.payload);

console.log('\n🔍 JWT Verification Test:');
try {
  const tokenKey = process.env.TOKEN_KEY || 'default-secret-key-change-in-production';
  const payload = jwt.verify(testToken, tokenKey, { algorithms: ['HS256'] });
  console.log('✅ JWT verification successful');
  console.log('User ID:', payload.id);
  console.log('Email:', payload.email);
} catch (error) {
  console.log('❌ JWT verification failed:', error.message);
}
