#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Test configurations
const TESTS = {
  'setup': {
    description: 'Setup test data (users and ads)',
    command: 'node setup-test-data-simple.js'
  },
  'login': {
    description: 'Test user authentication only',
    command: 'node test-individual-features.js login'
  },
  'websocket': {
    description: 'Test WebSocket connections only',
    command: 'node test-individual-features.js websocket'
  },
  'chatrooms': {
    description: 'Test chat room functionality only',
    command: 'node test-individual-features.js chatrooms'
  },
  'apis': {
    description: 'Test REST APIs only',
    command: 'node test-individual-features.js apis'
  },
  'individual': {
    description: 'Test all individual features',
    command: 'node test-individual-features.js'
  },
  'comprehensive': {
    description: 'Run comprehensive test suite',
    command: 'node test-chat-system.js'
  }
};

function printUsage() {
  console.log('\n🚀 Chat System Test Runner');
  console.log('==========================\n');
  console.log('Usage: node run-tests.js <test-type>\n');
  console.log('Available tests:');
  
  Object.entries(TESTS).forEach(([key, test]) => {
    console.log(`  ${key.padEnd(15)} - ${test.description}`);
  });
  
  console.log('\nExamples:');
  console.log('  node run-tests.js setup          # Setup test data');
  console.log('  node run-tests.js login          # Test authentication');
  console.log('  node run-tests.js comprehensive  # Run all tests');
  console.log('  node run-tests.js all            # Run setup + comprehensive');
}

function runTest(testName) {
  const test = TESTS[testName];
  if (!test) {
    console.error(`❌ Unknown test type: ${testName}`);
    printUsage();
    process.exit(1);
  }
  
  console.log(`\n🧪 Running: ${test.description}`);
  console.log(`📝 Command: ${test.command}\n`);
  
  const [cmd, ...args] = test.command.split(' ');
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: true
  });
  
  child.on('close', (code) => {
    if (code === 0) {
      console.log(`\n✅ Test completed successfully: ${testName}`);
    } else {
      console.log(`\n❌ Test failed: ${testName} (exit code: ${code})`);
      process.exit(code);
    }
  });
  
  child.on('error', (error) => {
    console.error(`\n❌ Failed to run test: ${error.message}`);
    process.exit(1);
  });
}

async function runAllTests() {
  console.log('\n🚀 Running all tests in sequence...\n');
  
  const testOrder = ['setup', 'comprehensive'];
  
  for (const testName of testOrder) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Running: ${testName}`);
    console.log(`${'='.repeat(50)}`);
    
    await new Promise((resolve, reject) => {
      const test = TESTS[testName];
      const [cmd, ...args] = test.command.split(' ');
      const child = spawn(cmd, args, {
        stdio: 'inherit',
        shell: true
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`\n✅ ${testName} completed successfully`);
          resolve();
        } else {
          console.log(`\n❌ ${testName} failed (exit code: ${code})`);
          reject(new Error(`Test ${testName} failed with exit code ${code}`));
        }
      });
      
      child.on('error', (error) => {
        console.error(`\n❌ Failed to run ${testName}: ${error.message}`);
        reject(error);
      });
    });
  }
  
  console.log('\n🎉 All tests completed successfully!');
}

// Main execution
const testType = process.argv[2];

if (!testType || testType === '--help' || testType === '-h') {
  printUsage();
  process.exit(0);
}

if (testType === 'all') {
  runAllTests().catch((error) => {
    console.error(`\n❌ Test suite failed: ${error.message}`);
    process.exit(1);
  });
} else {
  runTest(testType);
}
