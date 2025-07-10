const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚗 Starting Vehicle Inventory CRUD Tests...\n');

// Test configuration
const testConfig = {
  timeout: 30000,
  verbose: true,
  coverage: false,
};

// Test files to run
const testFiles = [
  'test/vehicle-inventory-manufacturers.e2e-spec.ts',
  'test/vehicle-inventory-models.e2e-spec.ts',
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runTest(testFile) {
  log(
    `\n${colors.cyan}Running tests for: ${path.basename(testFile)}${colors.reset}`,
  );
  log(`${colors.yellow}File: ${testFile}${colors.reset}\n`);

  try {
    const command = `npx jest ${testFile} --config=jest-e2e.json --timeout=${testConfig.timeout} --verbose=${testConfig.verbose}`;

    log(`${colors.blue}Executing: ${command}${colors.reset}\n`);

    const output = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    log(`${colors.green}✅ Test passed successfully!${colors.reset}\n`);
    console.log(output);
    return { success: true, output };
  } catch (error) {
    log(`${colors.red}❌ Test failed!${colors.reset}\n`);
    console.log(error.stdout || error.message);
    return { success: false, error: error.stdout || error.message };
  }
}

function generateTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedTests: results.filter((r) => r.success).length,
    failedTests: results.filter((r) => !r.success).length,
    results: results,
  };

  const reportFile = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  log(`${colors.blue}📊 Test report saved to: ${reportFile}${colors.reset}`);

  return report;
}

function displaySummary(report) {
  log('\n' + '='.repeat(60), 'bright');
  log('📋 VEHICLE INVENTORY CRUD TESTS SUMMARY', 'bright');
  log('='.repeat(60), 'bright');

  log(`\n${colors.cyan}Total Tests: ${report.totalTests}${colors.reset}`);
  log(`${colors.green}Passed: ${report.passedTests}${colors.reset}`);
  log(`${colors.red}Failed: ${report.failedTests}${colors.reset}`);

  const successRate = ((report.passedTests / report.totalTests) * 100).toFixed(
    1,
  );
  log(`${colors.yellow}Success Rate: ${successRate}%${colors.reset}`);

  if (report.failedTests > 0) {
    log(`\n${colors.red}Failed Tests:${colors.reset}`);
    report.results.forEach((result, index) => {
      if (!result.success) {
        log(`  ${index + 1}. ${result.testFile}`, 'red');
      }
    });
  }

  log('\n' + '='.repeat(60), 'bright');
}

// Main execution
async function main() {
  log('🔧 Vehicle Inventory CRUD Test Suite', 'bright');
  log('Testing Manufacturers and Models endpoints\n', 'yellow');

  const results = [];

  for (const testFile of testFiles) {
    if (fs.existsSync(testFile)) {
      const result = runTest(testFile);
      result.testFile = path.basename(testFile);
      results.push(result);
    } else {
      log(`${colors.red}❌ Test file not found: ${testFile}${colors.reset}`);
      results.push({
        success: false,
        testFile: path.basename(testFile),
        error: 'Test file not found',
      });
    }
  }

  const report = generateTestReport(results);
  displaySummary(report);

  // Exit with appropriate code
  const exitCode = report.failedTests > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\n🛑 Tests interrupted by user', 'yellow');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(
    `\n\n${colors.red}💥 Uncaught Exception: ${error.message}${colors.reset}`,
  );
  process.exit(1);
});

// Run the tests
main().catch((error) => {
  log(
    `\n\n${colors.red}💥 Test runner failed: ${error.message}${colors.reset}`,
  );
  process.exit(1);
});
