# 🧪 Chat System Testing Guide

This guide covers comprehensive testing for the chat system with authentication, WebSocket connections, and chat room functionality.

## 📋 Test Overview

The testing system includes:

- **Authentication Tests**: User login/logout with JWT tokens
- **WebSocket Tests**: Secure WebSocket connections with authentication
- **Chat Room Tests**: Creating, joining, and managing chat rooms
- **API Tests**: REST API endpoints and protected routes
- **Database Tests**: Test data setup and cleanup

## 🚀 Quick Start

### 1. Setup Test Data

```bash
# Setup test users and ads
node run-tests.js setup
```

### 2. Run All Tests

```bash
# Run comprehensive test suite
node run-tests.js all
```

### 3. Run Individual Tests

```bash
# Test specific features
node run-tests.js login          # Authentication only
node run-tests.js websocket      # WebSocket connections only
node run-tests.js chatrooms      # Chat room functionality only
node run-tests.js apis           # REST APIs only
```

## 📁 Test Files

### Core Test Files

- **`test-chat-system.js`** - Comprehensive test suite with full coverage
- **`test-individual-features.js`** - Individual feature testing
- **`setup-test-data-simple.js`** - Test data setup and cleanup
- **`run-tests.js`** - Test runner with multiple options

### Test Data Files

- **`create-test-users.js`** - User creation script
- **`setup-test-data.js`** - Complete test data setup
- **`check-ads.js`** - Database verification script

## 🧪 Test Coverage

### Authentication Tests

✅ **User Login**
- Valid credentials with JWT token generation
- Invalid credentials rejection
- Token validation and user ID extraction

✅ **User Logout**
- Token clearing
- WebSocket disconnection

### WebSocket Tests

✅ **Authenticated Connections**
- JWT token validation
- User context extraction
- Connection status tracking

✅ **Unauthenticated Connections**
- Proper rejection of invalid tokens
- Security validation

### Chat Room Tests

✅ **Room Creation**
- Ad-based room creation
- Participant assignment
- Room ID generation

✅ **Room Joining**
- Participant validation
- Role assignment (Initiator/Receiver)
- Real-time notifications

✅ **Room Management**
- User chat room listing
- Room leaving functionality
- Status tracking

### API Tests

✅ **Health Check**
- Server status verification

✅ **Protected Routes**
- JWT token validation
- User profile access
- Authorization checks

### Database Tests

✅ **Data Setup**
- Test user creation with bcrypt hashing
- Test ad creation
- Data cleanup

✅ **Schema Validation**
- MongoDB ObjectId validation
- Required field validation
- Relationship integrity

## 🎯 Test Scenarios

### Scenario 1: Basic Authentication Flow

1. **Setup**: Create test users
2. **Login**: Authenticate users and get JWT tokens
3. **Validation**: Verify token structure and user data
4. **Logout**: Clear tokens and verify cleanup

### Scenario 2: WebSocket Chat Flow

1. **Connection**: Establish authenticated WebSocket connections
2. **Room Creation**: Create chat room for specific ad
3. **Joining**: Multiple users join the same room
4. **Communication**: Real-time message exchange
5. **Management**: List rooms, leave rooms

### Scenario 3: Multi-User Chat

1. **Setup**: Multiple authenticated users
2. **Room Creation**: User A creates room for ad
3. **Joining**: User B joins the room
4. **Role Assignment**: Verify initiator/receiver roles
5. **Notifications**: Real-time user join/leave events

## 📊 Test Results

### Success Indicators

- ✅ **Green checkmarks** for passed tests
- 📊 **Test summary** with pass/fail counts
- 🎯 **Coverage report** showing tested features
- ⏱️ **Timing information** for performance insights

### Error Handling

- ❌ **Red X marks** for failed tests
- 📝 **Detailed error messages** with context
- 🔍 **Debug information** for troubleshooting
- 🛠️ **Cleanup procedures** for failed tests

## 🔧 Configuration

### Environment Variables

```bash
# Server configuration
BASE_URL=http://localhost:5000
WS_URL=http://localhost:5000

# Database configuration
MONGODB_URI=mongodb://localhost:27017/ado-dad
```

### Test Data

```javascript
// Test users
const testUsers = [
  { email: 'user@example.com', password: '123456' },
  { email: 'user2@example.com', password: '123456' }
];

// Test ads
const testAds = [
  { description: 'Test Car for Sale', price: 25000 },
  { description: 'Test Motorcycle', price: 8000 }
];
```

## 🛠️ Troubleshooting

### Common Issues

1. **Connection Errors**
   ```bash
   # Check if server is running
   curl http://localhost:5000/health
   ```

2. **Database Issues**
   ```bash
   # Verify MongoDB connection
   node check-ads.js
   ```

3. **Authentication Failures**
   ```bash
   # Test login directly
   node test-individual-features.js login
   ```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* node test-chat-system.js
```

## 📈 Performance Testing

### Load Testing

```bash
# Test multiple concurrent connections
node test-individual-features.js websocket
```

### Memory Testing

```bash
# Monitor memory usage during tests
node --inspect test-chat-system.js
```

## 🔒 Security Testing

### Authentication Security

- ✅ JWT token validation
- ✅ Password hashing verification
- ✅ Unauthorized access prevention

### WebSocket Security

- ✅ Token-based authentication
- ✅ Connection validation
- ✅ User context isolation

## 📝 Test Reports

### HTML Reports

Test results are automatically generated and can be viewed in:

- **Browser**: Open test result files
- **Console**: Real-time test output
- **Logs**: Detailed test logs

### Coverage Reports

- **Feature Coverage**: All major features tested
- **Edge Case Coverage**: Error scenarios covered
- **Integration Coverage**: End-to-end workflows tested

## 🚀 Continuous Integration

### Automated Testing

```bash
# Run in CI environment
npm run test:ci
```

### Pre-commit Hooks

```bash
# Run tests before commit
npm run test:pre-commit
```

## 📚 Additional Resources

- **API Documentation**: See API endpoints and usage
- **WebSocket Events**: Complete event documentation
- **Database Schema**: MongoDB collection structures
- **Authentication Flow**: JWT implementation details

## 🤝 Contributing

### Adding New Tests

1. **Create test file** in test directory
2. **Add test configuration** to `run-tests.js`
3. **Update documentation** with new test details
4. **Run test suite** to verify integration

### Test Standards

- **Naming**: Clear, descriptive test names
- **Documentation**: Inline comments for complex tests
- **Error Handling**: Proper error messages and cleanup
- **Performance**: Reasonable timeouts and resource usage

---

**Happy Testing! 🎉**

For questions or issues, check the troubleshooting section or create an issue in the repository.
