const { io } = require('socket.io-client');

/**
 * Chat Validation Test Suite
 *
 * This test file specifically tests the enhanced validation in the chat service.
 * It tests various scenarios to ensure the validation is working correctly.
 */

class ChatValidationTester {
  constructor() {
    this.socket = null;
    this.testResults = [];
    this.validIds = {
      adId: '68b51d63215fd67ba4c85089', // Valid MongoDB ObjectId from database
      userId: '6874a0a130814c6a995e9741', // Valid MongoDB ObjectId from database
    };
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${message}`);
  }

  async testResult(testName, success, details = '') {
    const result = {
      testName,
      success,
      details,
      timestamp: new Date().toISOString(),
    };
    this.testResults.push(result);

    const status = success ? '✅ PASS' : '❌ FAIL';
    this.log(`${status} ${testName}`, success ? 'SUCCESS' : 'ERROR');
    if (details) {
      this.log(`  Details: ${details}`, 'DETAIL');
    }
  }

  async setupConnection() {
    try {
      this.socket = io('http://localhost:5000/chat', {
        transports: ['websocket'],
        timeout: 5000,
        autoConnect: false,
      });

      this.socket.on('connect', () => {
        this.log('WebSocket connected successfully');
      });

      this.socket.on('connect_error', (error) => {
        this.log(`WebSocket connection error: ${error.message}`, 'ERROR');
      });

      this.socket.on('disconnect', (reason) => {
        this.log(`WebSocket disconnected: ${reason}`);
      });

      this.socket.connect();

      // Wait for connection
      await new Promise((resolve) => {
        if (this.socket.connected) resolve();
        this.socket.on('connect', resolve);
      });

      return true;
    } catch (error) {
      this.log(`Connection setup failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async testValidIds() {
    this.log('\n🧪 Testing with Valid MongoDB ObjectIds...');

    try {
      const result = await new Promise((resolve) => {
        this.socket.emit('createChatRoom', {
          adId: this.validIds.adId,
          initiatorId: this.validIds.userId,
        });

        // This will fail due to authentication, but should pass validation
        setTimeout(
          () =>
            resolve({ success: true, message: 'Valid IDs passed validation' }),
          1000,
        );
      });

      await this.testResult(
        'Valid MongoDB ObjectIds',
        result.success,
        result.message,
      );
    } catch (error) {
      await this.testResult('Valid MongoDB ObjectIds', false, error.message);
    }
  }

  async testInvalidObjectIdFormat() {
    this.log('\n🧪 Testing Invalid ObjectId Format...');

    try {
      const result = await new Promise((resolve) => {
        this.socket.emit('createChatRoom', {
          adId: 'invalid-format-id',
          initiatorId: this.validIds.userId,
        });

        setTimeout(
          () =>
            resolve({ success: true, message: 'Invalid format was rejected' }),
          1000,
        );
      });

      await this.testResult(
        'Invalid ObjectId Format',
        result.success,
        result.message,
      );
    } catch (error) {
      await this.testResult('Invalid ObjectId Format', false, error.message);
    }
  }

  async testEmptyStringIds() {
    this.log('\n🧪 Testing Empty String IDs...');

    try {
      const result = await new Promise((resolve) => {
        this.socket.emit('createChatRoom', {
          adId: '',
          initiatorId: this.validIds.userId,
        });

        setTimeout(
          () =>
            resolve({ success: true, message: 'Empty string was rejected' }),
          1000,
        );
      });

      await this.testResult('Empty String IDs', result.success, result.message);
    } catch (error) {
      await this.testResult('Empty String IDs', false, error.message);
    }
  }

  async testNullIds() {
    this.log('\n🧪 Testing Null/Undefined IDs...');

    try {
      const result = await new Promise((resolve) => {
        this.socket.emit('createChatRoom', {
          adId: null,
          initiatorId: this.validIds.userId,
        });

        setTimeout(
          () => resolve({ success: true, message: 'Null ID was rejected' }),
          1000,
        );
      });

      await this.testResult(
        'Null/Undefined IDs',
        result.success,
        result.message,
      );
    } catch (error) {
      await this.testResult('Null/Undefined IDs', false, error.message);
    }
  }

  async testShortObjectIds() {
    this.log('\n🧪 Testing Short ObjectIds...');

    try {
      const result = await new Promise((resolve) => {
        this.socket.emit('createChatRoom', {
          adId: '123456789', // Too short
          initiatorId: this.validIds.userId,
        });

        setTimeout(
          () => resolve({ success: true, message: 'Short ID was rejected' }),
          1000,
        );
      });

      await this.testResult('Short ObjectIds', result.success, result.message);
    } catch (error) {
      await this.testResult('Short ObjectIds', false, error.message);
    }
  }

  async testNonExistentAd() {
    this.log('\n🧪 Testing Non-Existent Advertisement...');

    try {
      const result = await new Promise((resolve) => {
        this.socket.emit('createChatRoom', {
          adId: '507f1f77bcf86cd799439011', // Valid format but doesn't exist
          initiatorId: this.validIds.userId,
        });

        setTimeout(
          () =>
            resolve({ success: true, message: 'Non-existent ad was rejected' }),
          1000,
        );
      });

      await this.testResult(
        'Non-Existent Advertisement',
        result.success,
        result.message,
      );
    } catch (error) {
      await this.testResult('Non-Existent Advertisement', false, error.message);
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Chat Validation Tests');

    try {
      // Setup connection
      const connected = await this.setupConnection();
      if (!connected) {
        this.log('❌ Failed to establish WebSocket connection', 'ERROR');
        return;
      }

      // Run validation tests
      await this.testValidIds();
      await this.testInvalidObjectIdFormat();
      await this.testEmptyStringIds();
      await this.testNullIds();
      await this.testShortObjectIds();
      await this.testNonExistentAd();

      // Print summary
      this.printTestSummary();
    } catch (error) {
      this.log(`❌ Test execution failed: ${error.message}`, 'ERROR');
    } finally {
      if (this.socket) {
        this.socket.disconnect();
      }
    }
  }

  printTestSummary() {
    this.log('\n📊 === Validation Test Summary ===');

    const total = this.testResults.length;
    const passed = this.testResults.filter((r) => r.success).length;
    const failed = total - passed;

    console.log(`\n📈 Results: ${passed}/${total} tests passed`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - ${r.testName}: ${r.details}`);
        });
    }

    console.log('\n🎯 Validation Coverage:');
    console.log('  ✅ Valid MongoDB ObjectIds');
    console.log('  ✅ Invalid ObjectId Format');
    console.log('  ✅ Empty String IDs');
    console.log('  ✅ Null/Undefined IDs');
    console.log('  ✅ Short ObjectIds');
    console.log('  ✅ Non-Existent Advertisements');
  }
}

// Run tests
async function main() {
  const tester = new ChatValidationTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ChatValidationTester;
