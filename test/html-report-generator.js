const fs = require('fs');
const path = require('path');

class HTMLReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '..', 'reports');
    this.ensureReportsDirectory();
  }

  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  generateComprehensiveReport(testResults) {
    const timestamp = new Date().toLocaleString();
    const successRate = testResults.successRate;
    const statusColor = testResults.failedSuites > 0 ? '#dc3545' : '#28a745';

    const html = this.getHTMLTemplate({
      title: 'Comprehensive Test Report',
      timestamp,
      testResults,
      statusColor,
      successRate,
    });

    const reportPath = path.join(
      this.reportsDir,
      'comprehensive-test-report.html',
    );
    fs.writeFileSync(reportPath, html);
    return reportPath;
  }

  generateIndividualReport(suiteName, testResults) {
    const timestamp = new Date().toLocaleString();
    const successRate = testResults.successRate;
    const statusColor = testResults.failedSuites > 0 ? '#dc3545' : '#28a745';

    const html = this.getHTMLTemplate({
      title: `${suiteName} Test Report`,
      timestamp,
      testResults,
      statusColor,
      successRate,
    });

    const sanitizedName = suiteName.toLowerCase().replace(/\s+/g, '-');
    const reportPath = path.join(
      this.reportsDir,
      `${sanitizedName}-test-report.html`,
    );
    fs.writeFileSync(reportPath, html);
    return reportPath;
  }

  generateCoverageReport(coverageData) {
    const timestamp = new Date().toLocaleString();

    const html = this.getCoverageHTMLTemplate({
      title: 'Code Coverage Report',
      timestamp,
      coverageData,
    });

    const reportPath = path.join(this.reportsDir, 'coverage-report.html');
    fs.writeFileSync(reportPath, html);
    return reportPath;
  }

  getHTMLTemplate({ title, timestamp, testResults, statusColor, successRate }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${timestamp}</title>
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
        
        .error-details {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 5px;
            padding: 15px;
            margin: 10px 0;
            color: #721c24;
        }
        
        .navigation {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
        
        .nav-links {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }
        
        .nav-link {
            padding: 10px 20px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.3s;
        }
        
        .nav-link:hover {
            background: #0056b3;
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
            
            .nav-links {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 ${title}</h1>
            <p class="timestamp">Generated on ${timestamp}</p>
        </div>
        
        <div class="navigation">
            <h3>📊 Quick Navigation</h3>
            <div class="nav-links">
                <a href="#summary" class="nav-link">Summary</a>
                <a href="#results" class="nav-link">Test Results</a>
                <a href="#details" class="nav-link">Details</a>
            </div>
        </div>
        
        <div id="summary" class="summary-cards">
            <div class="card success">
                <h3>${testResults.totalSuites}</h3>
                <p>Total Test Suites</p>
            </div>
            <div class="card success">
                <h3>${testResults.passedSuites}</h3>
                <p>Passed Suites</p>
            </div>
            <div class="card ${testResults.failedSuites > 0 ? 'danger' : 'success'}">
                <h3>${testResults.failedSuites}</h3>
                <p>Failed Suites</p>
            </div>
            <div class="card ${testResults.failedSuites > 0 ? 'warning' : 'success'}">
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
                ${testResults.passedSuites} passed, ${testResults.failedSuites} failed
            </p>
        </div>
        
        <div id="results" class="results-table">
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
                    ${testResults.results
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
        
        <div id="details" class="chart-container">
            <h3>Error Details</h3>
            ${testResults.results
              .filter((result) => result.error)
              .map(
                (result) => `
                <div class="error-details">
                    <h4>${result.name}</h4>
                    <p><strong>Error:</strong> ${result.error}</p>
                    <p><strong>Duration:</strong> ${result.duration}s</p>
                    <p><strong>Timestamp:</strong> ${new Date(result.timestamp).toLocaleString()}</p>
                </div>
            `,
              )
              .join('')}
            ${
              testResults.results.filter((result) => result.error).length === 0
                ? '<p style="text-align: center; color: #28a745; font-weight: bold;">✅ No errors found!</p>'
                : ''
            }
        </div>
        
        <div class="footer">
            <p>This report was automatically generated by the HTML Report Generator.</p>
            <p>For detailed logs and individual test results, check the console output and individual HTML reports.</p>
        </div>
    </div>
</body>
</html>`;
  }

  getCoverageHTMLTemplate({ title, timestamp, coverageData }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${timestamp}</title>
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
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
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
        
        .coverage-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .coverage-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        .coverage-percentage {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .coverage-high { color: #28a745; }
        .coverage-medium { color: #ffc107; }
        .coverage-low { color: #dc3545; }
        
        .coverage-details {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 ${title}</h1>
            <p>Generated on ${timestamp}</p>
        </div>
        
        <div class="coverage-summary">
            <div class="coverage-card">
                <div class="coverage-percentage coverage-high">${coverageData.statements || 0}%</div>
                <p>Statements</p>
            </div>
            <div class="coverage-card">
                <div class="coverage-percentage coverage-high">${coverageData.branches || 0}%</div>
                <p>Branches</p>
            </div>
            <div class="coverage-card">
                <div class="coverage-percentage coverage-high">${coverageData.functions || 0}%</div>
                <p>Functions</p>
            </div>
            <div class="coverage-card">
                <div class="coverage-percentage coverage-high">${coverageData.lines || 0}%</div>
                <p>Lines</p>
            </div>
        </div>
        
        <div class="coverage-details">
            <h3>Coverage Details</h3>
            <p>This report shows the code coverage metrics for your test suite.</p>
            <p>For detailed coverage information, check the Jest coverage report in the coverage directory.</p>
        </div>
        
        <div class="footer">
            <p>This coverage report was automatically generated.</p>
        </div>
    </div>
</body>
</html>`;
  }
}

module.exports = HTMLReportGenerator;
