const HTMLReportGenerator = require('./html-report-generator');

// Demo test results
const demoResults = {
  totalSuites: 4,
  passedSuites: 3,
  failedSuites: 1,
  successRate: '75.00',
  timestamp: new Date().toISOString(),
  results: [
    {
      name: 'Authentication',
      status: 'PASSED',
      duration: '2.45',
      timestamp: new Date().toISOString()
    },
    {
      name: 'Users',
      status: 'PASSED',
      duration: '1.23',
      timestamp: new Date().toISOString()
    },
    {
      name: 'Vehicle Inventory',
      status: 'FAILED',
      duration: '3.67',
      timestamp: new Date().toISOString(),
      error: 'Some tests failed due to missing endpoints'
    },
    {
      name: 'Ads',
      status: 'PASSED',
      duration: '1.89',
      timestamp: new Date().toISOString()
    }
  ]
};

// Generate comprehensive HTML report
const reportGenerator = new HTMLReportGenerator();
const htmlReportPath = reportGenerator.generateComprehensiveReport(demoResults);

// Generate individual reports
demoResults.results.forEach(result => {
  const individualSummary = {
    totalSuites: 1,
    passedSuites: result.status === 'PASSED' ? 1 : 0,
    failedSuites: result.status === 'FAILED' ? 1 : 0,
    successRate: result.status === 'PASSED' ? '100.00' : '0.00',
    timestamp: result.timestamp,
    results: [result]
  };
  
  const individualReportPath = reportGenerator.generateIndividualReport(result.name, individualSummary);
  console.log(`Generated individual report for ${result.name}: ${individualReportPath}`);
});

// Generate coverage report
const coverageData = {
  statements: 85,
  branches: 72,
  functions: 90,
  lines: 88
};

const coverageReportPath = reportGenerator.generateCoverageReport(coverageData);

console.log('\n🎉 HTML Reports Generated Successfully!');
console.log('=====================================');
console.log(`📊 Comprehensive Report: ${htmlReportPath}`);
console.log(`📈 Coverage Report: ${coverageReportPath}`);
console.log('\n📋 Individual Reports:');
demoResults.results.forEach(result => {
  const status = result.status === 'PASSED' ? '✅' : '❌';
  console.log(`  ${status} ${result.name}: ${result.duration}s`);
});

console.log('\n🌐 Open the HTML reports in your browser to view the beautiful test reports!');
console.log(`   Main report: file://${htmlReportPath}`);
console.log(`   Coverage report: file://${coverageReportPath}`); 