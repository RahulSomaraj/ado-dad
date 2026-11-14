const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
  `${colors.bright}${colors.cyan}🚀 Starting Comprehensive Test Suite${colors.reset}\n`,
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

  try {
    const startTime = Date.now();
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
const htmlReport = generateHTMLReport(summary);
const htmlReportPath = path.join(reportsDir, 'comprehensive-test-report.html');
fs.writeFileSync(htmlReportPath, htmlReport);

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
console.log(`\nReports generated:`);
console.log(`  📄 JSON Report: ${colors.yellow}${reportPath}${colors.reset}`);
console.log(
  `  🌐 HTML Report: ${colors.yellow}${htmlReportPath}${colors.reset}`,
);

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

function generateHTMLReport(summary) {
  const timestamp = new Date().toLocaleString();
  const successRate = summary.successRate;
  const statusColor = summary.failedSuites > 0 ? '#dc3545' : '#28a745';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Test Report - ${timestamp}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header .timestamp {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
            transition: transform 0.2s;
        }
        
        .card:hover {
            transform: translateY(-2px);
        }
        
        .card.success {
            border-left: 5px solid #28a745;
        }
        
        .card.warning {
            border-left: 5px solid #ffc107;
        }
        
        .card.danger {
            border-left: 5px solid #dc3545;
        }
        
        .card h3 {
            font-size: 2em;
            margin-bottom: 10px;
            color: #333;
        }
        
        .card p {
            font-size: 1.1em;
            color: #666;
            font-weight: 500;
        }
        
        .success-rate {
            font-size: 3em;
            font-weight: bold;
            color: ${statusColor};
            margin-bottom: 10px;
        }
        
        .results-table {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
        
        .table-header {
            background: #343a40;
            color: white;
            padding: 15px 20px;
            font-weight: bold;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 15px 20px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        
        .status {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 500;
        }
        
        .status.passed {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status.failed {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }
        
        .chart-container {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
        
        .progress-bar {
            width: 100%;
            height: 30px;
            background-color: #e9ecef;
            border-radius: 15px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s ease;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .header h1 {
                font-size: 2em;
            }
            
            .summary-cards {
                grid-template-columns: 1fr;
            }
            
            th, td {
                padding: 10px;
                font-size: 0.9em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Comprehensive Test Report</h1>
            <p class="timestamp">Generated on ${timestamp}</p>
        </div>
        
        <div class="summary-cards">
            <div class="card success">
                <h3>${summary.totalSuites}</h3>
                <p>Total Test Suites</p>
            </div>
            <div class="card success">
                <h3>${summary.passedSuites}</h3>
                <p>Passed Suites</p>
            </div>
            <div class="card ${summary.failedSuites > 0 ? 'danger' : 'success'}">
                <h3>${summary.failedSuites}</h3>
                <p>Failed Suites</p>
            </div>
            <div class="card ${summary.failedSuites > 0 ? 'warning' : 'success'}">
                <div class="success-rate">${successRate}%</div>
                <p>Success Rate</p>
            </div>
        </div>
        
        <div class="chart-container">
            <h3>Test Results Overview</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${successRate}%"></div>
            </div>
            <p style="text-align: center; margin-top: 10px; color: #666;">
                ${summary.passedSuites} passed, ${summary.failedSuites} failed
            </p>
        </div>
        
        <div class="results-table">
            <div class="table-header">
                <h3>Detailed Test Results</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Test Suite</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Timestamp</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${summary.results
                      .map(
                        (result) => `
                        <tr>
                            <td><strong>${result.name}</strong></td>
                            <td><span class="status ${result.status.toLowerCase()}">${result.status}</span></td>
                            <td>${result.duration}s</td>
                            <td>${new Date(result.timestamp).toLocaleString()}</td>
                            <td>${result.error ? `<span style="color: #dc3545;">${result.error}</span>` : '✅ All tests passed'}</td>
                        </tr>
                    `,
                      )
                      .join('')}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>This report was automatically generated by the test runner.</p>
            <p>For detailed logs and individual test results, check the console output and individual HTML reports.</p>
        </div>
    </div>
</body>
</html>`;
}
