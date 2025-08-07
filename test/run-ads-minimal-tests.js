#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Ads Minimal Data Tests...\n');

// Configuration
const testFile = 'test/ads-minimal-data.e2e-spec.ts';
const jestConfig = 'test/jest-e2e.json';
const outputDir = 'test-results';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Test configuration
const testConfig = {
  testFile,
  outputFile: `${outputDir}/ads-minimal-tests-${timestamp}.json`,
  htmlReport: `${outputDir}/ads-minimal-tests-${timestamp}.html`,
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  coverage: process.argv.includes('--coverage') || process.argv.includes('-c'),
  watch: process.argv.includes('--watch') || process.argv.includes('-w'),
};

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

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logSubSection(title) {
  log(`\n${'-'.repeat(40)}`, 'yellow');
  log(`  ${title}`, 'bright');
  log(`${'-'.repeat(40)}`, 'yellow');
}

// Check if test file exists
if (!fs.existsSync(testFile)) {
  log(`❌ Test file not found: ${testFile}`, 'red');
  process.exit(1);
}

// Check if Jest config exists
if (!fs.existsSync(jestConfig)) {
  log(`❌ Jest config not found: ${jestConfig}`, 'red');
  process.exit(1);
}

// Build Jest command
function buildJestCommand() {
  let command = `npx jest ${testFile}`;

  // Add Jest config
  command += ` --config ${jestConfig}`;

  // Add JSON output
  command += ` --json --outputFile=${testConfig.outputFile}`;

  // Add verbose flag if requested
  if (testConfig.verbose) {
    command += ' --verbose';
  }

  // Add coverage if requested
  if (testConfig.coverage) {
    command += ' --coverage';
  }

  // Add watch mode if requested
  if (testConfig.watch) {
    command += ' --watch';
  }

  // Add timeout
  command += ' --testTimeout=30000';

  // Add max workers
  command += ' --maxWorkers=1';

  return command;
}

// Run tests
async function runTests() {
  try {
    logSection('ADS MINIMAL DATA TESTS');

    logSubSection('Test Configuration');
    log(`Test File: ${testFile}`, 'blue');
    log(`Output File: ${testConfig.outputFile}`, 'blue');
    log(`HTML Report: ${testConfig.htmlReport}`, 'blue');
    log(`Verbose: ${testConfig.verbose}`, 'blue');
    log(`Coverage: ${testConfig.coverage}`, 'blue');
    log(`Watch Mode: ${testConfig.watch}`, 'blue');

    logSubSection('Running Tests');
    const jestCommand = buildJestCommand();
    log(`Command: ${jestCommand}`, 'magenta');

    const startTime = Date.now();

    // Run the tests
    execSync(jestCommand, {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        MONGO_URI:
          process.env.MONGO_URI || 'mongodb://localhost:27017/ado-dad-test',
      },
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    logSubSection('Test Results');
    log(`✅ Tests completed in ${duration}s`, 'green');

    // Check if output file exists and parse results
    if (fs.existsSync(testConfig.outputFile)) {
      const testResults = JSON.parse(
        fs.readFileSync(testConfig.outputFile, 'utf8'),
      );
      generateReport(testResults, duration);
    }
  } catch (error) {
    logSubSection('Test Execution Failed');
    log(`❌ Error running tests: ${error.message}`, 'red');

    if (error.stdout) {
      log('STDOUT:', 'yellow');
      log(error.stdout.toString(), 'red');
    }

    if (error.stderr) {
      log('STDERR:', 'yellow');
      log(error.stderr.toString(), 'red');
    }

    process.exit(1);
  }
}

// Generate HTML report
function generateReport(testResults, duration) {
  logSubSection('Generating Report');

  const totalTests = testResults.numTotalTests;
  const passedTests = testResults.numPassedTests;
  const failedTests = testResults.numFailedTests;
  const skippedTests = testResults.numPendingTests;

  log(`Total Tests: ${totalTests}`, 'blue');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`Skipped: ${skippedTests}`, 'yellow');
  log(`Duration: ${duration}s`, 'blue');

  // Calculate success rate
  const successRate =
    totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0;
  log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : 'red');

  // Generate HTML report
  const htmlReport = generateHTMLReport(testResults, duration);
  fs.writeFileSync(testConfig.htmlReport, htmlReport);
  log(`📊 HTML Report generated: ${testConfig.htmlReport}`, 'green');

  // Display failed tests if any
  if (failedTests > 0) {
    logSubSection('Failed Tests');
    testResults.testResults.forEach((suite) => {
      suite.testResults.forEach((test) => {
        if (test.status === 'failed') {
          log(`❌ ${test.fullName}`, 'red');
          if (test.failureMessages && test.failureMessages.length > 0) {
            log(`   ${test.failureMessages[0]}`, 'red');
          }
        }
      });
    });
  }
}

// Generate HTML report
function generateHTMLReport(testResults, duration) {
  const totalTests = testResults.numTotalTests;
  const passedTests = testResults.numPassedTests;
  const failedTests = testResults.numFailedTests;
  const skippedTests = testResults.numPendingTests;
  const successRate =
    totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ads Minimal Data Tests Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background-color: #f8f9fa;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            font-size: 2em;
            font-weight: 300;
        }
        .summary-card p {
            margin: 0;
            color: #666;
            font-size: 0.9em;
        }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .total { color: #007bff; }
        .duration { color: #6c757d; }
        .content {
            padding: 30px;
        }
        .test-suite {
            margin-bottom: 30px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }
        .test-suite-header {
            background-color: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #e9ecef;
            font-weight: 600;
        }
        .test-result {
            padding: 10px 20px;
            border-bottom: 1px solid #f1f3f4;
        }
        .test-result:last-child {
            border-bottom: none;
        }
        .test-result.passed {
            background-color: #d4edda;
            color: #155724;
        }
        .test-result.failed {
            background-color: #f8d7da;
            color: #721c24;
        }
        .test-result.skipped {
            background-color: #fff3cd;
            color: #856404;
        }
        .test-name {
            font-weight: 500;
            margin-bottom: 5px;
        }
        .test-duration {
            font-size: 0.8em;
            opacity: 0.7;
        }
        .error-message {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-family: monospace;
            font-size: 0.9em;
            white-space: pre-wrap;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            border-top: 1px solid #e9ecef;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Ads Minimal Data Tests</h1>
            <p>Comprehensive test results for advertisement creation with minimal data requirements</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3 class="total">${totalTests}</h3>
                <p>Total Tests</p>
            </div>
            <div class="summary-card">
                <h3 class="passed">${passedTests}</h3>
                <p>Passed</p>
            </div>
            <div class="summary-card">
                <h3 class="failed">${failedTests}</h3>
                <p>Failed</p>
            </div>
            <div class="summary-card">
                <h3 class="skipped">${skippedTests}</h3>
                <p>Skipped</p>
            </div>
            <div class="summary-card">
                <h3 class="passed">${successRate}%</h3>
                <p>Success Rate</p>
            </div>
            <div class="summary-card">
                <h3 class="duration">${duration}s</h3>
                <p>Duration</p>
            </div>
        </div>
        
        <div class="content">
            ${testResults.testResults
              .map(
                (suite) => `
                <div class="test-suite">
                    <div class="test-suite-header">
                        ${suite.name}
                    </div>
                    ${suite.testResults
                      .map(
                        (test) => `
                        <div class="test-result ${test.status}">
                            <div class="test-name">${test.fullName}</div>
                            <div class="test-duration">${test.duration}ms</div>
                            ${
                              test.failureMessages &&
                              test.failureMessages.length > 0
                                ? `<div class="error-message">${test.failureMessages.join('\n')}</div>`
                                : ''
                            }
                        </div>
                    `,
                      )
                      .join('')}
                </div>
            `,
              )
              .join('')}
        </div>
        
        <div class="footer">
            <p>Generated on ${new Date().toLocaleString()} | Ads Minimal Data Tests</p>
        </div>
    </div>
</body>
</html>
  `;
}

// Main execution
if (require.main === module) {
  runTests().catch((error) => {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runTests, generateReport };
