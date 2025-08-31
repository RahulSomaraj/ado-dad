const fs = require('fs');
const path = require('path');

class JestJsonReporter {
  constructor(globalConfig, options = {}) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  onRunComplete(contexts, results) {
    try {
      const outputPath =
        this._options.outputPath ||
        path.join(process.cwd(), 'reports', 'test-summary.json');
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const payload = {
        success: results.success,
        startTime: results.startTime,
        numTotalTests: results.numTotalTests,
        numPassedTests: results.numPassedTests,
        numFailedTests: results.numFailedTests,
        numPendingTests: results.numPendingTests,
        testResults: (results.testResults || []).map((tr) => ({
          testFilePath: tr.testFilePath,
          status: tr.numFailingTests > 0 ? 'failed' : 'passed',
          assertionResults: (tr.assertionResults || []).map((ar) => ({
            title: ar.title,
            fullName: ar.fullName,
            status: ar.status,
            failureMessages: ar.failureMessages || [],
          })),
        })),
      };

      fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to write Jest JSON report:', err);
    }
  }
}

module.exports = JestJsonReporter;
