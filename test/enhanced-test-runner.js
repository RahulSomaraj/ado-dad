const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const HTMLReportGenerator = require('./html-report-generator');

// Test suites to run
const testSuites = [
  { name: 'Authentication', command: 'npm run test:auth' },
  { name: 'Users', command: 'npm run test:users' },
  { name: 'Vehicle Inventory', command: 'npm run test:vehicle-inventory' },
  { name: 'Ads', command: 'npm run test:ads' },
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

console.log(
  `${colors.bright}${colors.cyan}🚀 Starting Comprehensive Test Suite with HTML Reports${colors.reset}\n`,
);

const results = [];
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Run each test suite
testSuites.forEach((suite, index) => {
  console.log(
    `${colors.bright}${colors.blue}[${index + 1}/${testSuites.length}] Running ${suite.name} Tests...${colors.reset}`,
  );

  const startTime = Date.now();
  try {
    execSync(suite.command, { stdio: 'inherit' });
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    results.push({
      name: suite.name,
      status: 'PASSED',
      duration: duration,
      timestamp: new Date().toISOString(),
    });

    passedTests++;
    console.log(
      `${colors.green}✅ ${suite.name} Tests PASSED (${duration}s)${colors.reset}\n`,
    );
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    results.push({
      name: suite.name,
      status: 'FAILED',
      duration: duration,
      timestamp: new Date().toISOString(),
      error: error.message,
    });

    failedTests++;
    console.log(
      `${colors.red}❌ ${suite.name} Tests FAILED (${duration}s)${colors.reset}\n`,
    );
  }
});

totalTests = testSuites.length;

// Generate summary report
const summary = {
  totalSuites: totalTests,
  passedSuites: passedTests,
  failedSuites: failedTests,
  successRate: ((passedTests / totalTests) * 100).toFixed(2),
  timestamp: new Date().toISOString(),
  results: results,
};

// Create reports directory if it doesn't exist
const reportsDir = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Save detailed JSON report
const reportPath = path.join(reportsDir, 'test-execution-report.json');
fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

// Generate comprehensive HTML report
const reportGenerator = new HTMLReportGenerator();
const htmlReportPath = reportGenerator.generateComprehensiveReport(summary);

// Generate individual HTML reports for each test suite
const individualReports = [];
testSuites.forEach((suite) => {
  const suiteResults = results.find((r) => r.name === suite.name);
  if (suiteResults) {
    const individualSummary = {
      totalSuites: 1,
      passedSuites: suiteResults.status === 'PASSED' ? 1 : 0,
      failedSuites: suiteResults.status === 'FAILED' ? 1 : 0,
      successRate: suiteResults.status === 'PASSED' ? '100.00' : '0.00',
      timestamp: suiteResults.timestamp,
      results: [suiteResults],
    };

    const individualReportPath = reportGenerator.generateIndividualReport(
      suite.name,
      individualSummary,
    );
    individualReports.push({ name: suite.name, path: individualReportPath });
  }
});

// Display final summary
console.log(
  `${colors.bright}${colors.cyan}📊 Test Execution Summary${colors.reset}`,
);
console.log(
  `${colors.bright}${colors.cyan}========================${colors.reset}`,
);
console.log(`Total Test Suites: ${colors.bright}${totalTests}${colors.reset}`);
console.log(`Passed: ${colors.green}${passedTests}${colors.reset}`);
console.log(`Failed: ${colors.red}${failedTests}${colors.reset}`);
console.log(
  `Success Rate: ${colors.bright}${summary.successRate}%${colors.reset}`,
);
console.log(`\n📄 Reports generated:`);
console.log(
  `  📊 Comprehensive Report: ${colors.yellow}${htmlReportPath}${colors.reset}`,
);
console.log(`  📄 JSON Report: ${colors.yellow}${reportPath}${colors.reset}`);
console.log(`\n📋 Individual Reports:`);
individualReports.forEach((report) => {
  console.log(
    `  📄 ${report.name}: ${colors.yellow}${report.path}${colors.reset}`,
  );
});

if (failedTests > 0) {
  console.log(
    `\n${colors.red}❌ Some tests failed. Please check the detailed reports for more information.${colors.reset}`,
  );
  process.exit(1);
} else {
  console.log(
    `\n${colors.green}🎉 All tests passed successfully!${colors.reset}`,
  );
}
