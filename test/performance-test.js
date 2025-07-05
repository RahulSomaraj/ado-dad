const axios = require('axios');
const fs = require('fs');
const path = require('path');

class PerformanceTester {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.testResults = [];
  }

  async initialize() {
    console.log('🚀 Initializing Performance Test...');
    console.log(
      '✅ Testing only publicly accessible APIs without authentication',
    );
  }

  async measureResponseTime(apiCall, description) {
    const iterations = 5;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      try {
        await apiCall();
        const endTime = Date.now();
        times.push(endTime - startTime);
      } catch (error) {
        console.log(`❌ Error in ${description}:`, error.message);
        times.push(null);
      }
      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const validTimes = times.filter((time) => time !== null);
    if (validTimes.length === 0) return null;

    return {
      min: Math.min(...validTimes),
      max: Math.max(...validTimes),
      avg: validTimes.reduce((a, b) => a + b, 0) / validTimes.length,
      median: validTimes.sort((a, b) => a - b)[
        Math.floor(validTimes.length / 2)
      ],
      successRate: (validTimes.length / iterations) * 100,
    };
  }

  async testWithRedis() {
    console.log('🔥 Testing with Redis caching...');

    // Warm up the cache first
    console.log('🔥 Warming up Redis cache...');
    try {
      await axios.get(`${this.baseUrl}/ads`);
      await axios.get(`${this.baseUrl}/ads?category=property`);
      await axios.get(`${this.baseUrl}/ads?category=private_vehicle`);
      await axios.get(`${this.baseUrl}/ads?category=commercial_vehicle`);
      await axios.get(`${this.baseUrl}/ads?category=two_wheeler`);
      await axios.get(`${this.baseUrl}/ads/lookup/manufacturers`);
      await axios.get(`${this.baseUrl}/ads/lookup/vehicle-models`);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for cache to be set
    } catch (error) {
      console.log('⚠️ Cache warm-up failed, continuing with test');
    }

    const tests = [
      // Comprehensive Ads API testing
      {
        name: 'Get All Ads',
        call: () => axios.get(`${this.baseUrl}/ads`),
      },
      {
        name: 'Get Property Ads',
        call: () => axios.get(`${this.baseUrl}/ads?category=property`),
      },
      {
        name: 'Get Vehicle Ads',
        call: () => axios.get(`${this.baseUrl}/ads?category=private_vehicle`),
      },
      {
        name: 'Get Commercial Vehicle Ads',
        call: () =>
          axios.get(`${this.baseUrl}/ads?category=commercial_vehicle`),
      },
      {
        name: 'Get Two Wheeler Ads',
        call: () => axios.get(`${this.baseUrl}/ads?category=two_wheeler`),
      },
      {
        name: 'Search Ads',
        call: () => axios.get(`${this.baseUrl}/ads?search=car`),
      },
      {
        name: 'Filter by Location',
        call: () => axios.get(`${this.baseUrl}/ads?location=mumbai`),
      },
      {
        name: 'Filter by Price Range',
        call: () =>
          axios.get(`${this.baseUrl}/ads?minPrice=10000&maxPrice=50000`),
      },
      {
        name: 'Pagination Test',
        call: () => axios.get(`${this.baseUrl}/ads?page=2&limit=10`),
      },
      {
        name: 'Property with Bedroom Filter',
        call: () =>
          axios.get(
            `${this.baseUrl}/ads?category=property&minBedrooms=2&maxBedrooms=4`,
          ),
      },
      {
        name: 'Vehicle with Year Filter',
        call: () =>
          axios.get(
            `${this.baseUrl}/ads?category=private_vehicle&minYear=2020&maxYear=2023`,
          ),
      },
      // Other APIs
      {
        name: 'Get All Banners',
        call: () => axios.get(`${this.baseUrl}/banners`),
      },
      {
        name: 'Get All Categories',
        call: () => axios.get(`${this.baseUrl}/categories`),
      },
      {
        name: 'Get All Manufacturers (Lookup)',
        call: () => axios.get(`${this.baseUrl}/ads/lookup/manufacturers`),
      },
      {
        name: 'Get All Vehicle Models (Lookup)',
        call: () => axios.get(`${this.baseUrl}/ads/lookup/vehicle-models`),
      },
      {
        name: 'Get All Vehicle Variants (Lookup)',
        call: () => axios.get(`${this.baseUrl}/ads/lookup/vehicle-variants`),
      },
      {
        name: 'Get Property Types (Lookup)',
        call: () => axios.get(`${this.baseUrl}/lookup/property-types`),
      },
      {
        name: 'CORS Test',
        call: () => axios.get(`${this.baseUrl}/cors-test`),
      },
      {
        name: 'Redis Test',
        call: () => axios.get(`${this.baseUrl}/redis/test`),
      },
      {
        name: 'Health Check',
        call: () => axios.get(`${this.baseUrl}/health`),
      },
      {
        name: 'API Info',
        call: () => axios.get(`${this.baseUrl}/`),
      },
    ];

    for (const test of tests) {
      console.log(`Testing: ${test.name}`);
      const result = await this.measureResponseTime(test.call, test.name);
      if (result) {
        this.testResults.push({
          api: test.name,
          withRedis: result,
          withoutRedis: null,
        });
      }
    }
  }

  async testWithoutRedis() {
    console.log('❄️ Testing without Redis caching...');

    // Clear Redis cache before testing
    try {
      await axios.post(`${this.baseUrl}/redis/flush`);
      console.log('✅ Redis cache cleared');
    } catch (error) {
      console.log('⚠️ Could not clear Redis cache');
    }

    // Wait a moment for cache to be cleared
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Run the same tests but without Redis
    const tests = [
      // Comprehensive Ads API testing
      {
        name: 'Get All Ads',
        call: () => axios.get(`${this.baseUrl}/ads`),
      },
      {
        name: 'Get Property Ads',
        call: () => axios.get(`${this.baseUrl}/ads?category=property`),
      },
      {
        name: 'Get Vehicle Ads',
        call: () => axios.get(`${this.baseUrl}/ads?category=private_vehicle`),
      },
      {
        name: 'Get Commercial Vehicle Ads',
        call: () =>
          axios.get(`${this.baseUrl}/ads?category=commercial_vehicle`),
      },
      {
        name: 'Get Two Wheeler Ads',
        call: () => axios.get(`${this.baseUrl}/ads?category=two_wheeler`),
      },
      {
        name: 'Search Ads',
        call: () => axios.get(`${this.baseUrl}/ads?search=car`),
      },
      {
        name: 'Filter by Location',
        call: () => axios.get(`${this.baseUrl}/ads?location=mumbai`),
      },
      {
        name: 'Filter by Price Range',
        call: () =>
          axios.get(`${this.baseUrl}/ads?minPrice=10000&maxPrice=50000`),
      },
      {
        name: 'Pagination Test',
        call: () => axios.get(`${this.baseUrl}/ads?page=2&limit=10`),
      },
      {
        name: 'Property with Bedroom Filter',
        call: () =>
          axios.get(
            `${this.baseUrl}/ads?category=property&minBedrooms=2&maxBedrooms=4`,
          ),
      },
      {
        name: 'Vehicle with Year Filter',
        call: () =>
          axios.get(
            `${this.baseUrl}/ads?category=private_vehicle&minYear=2020&maxYear=2023`,
          ),
      },
      // Other APIs
      {
        name: 'Get All Banners',
        call: () => axios.get(`${this.baseUrl}/banners`),
      },
      {
        name: 'Get All Categories',
        call: () => axios.get(`${this.baseUrl}/categories`),
      },
      {
        name: 'Get All Manufacturers (Lookup)',
        call: () => axios.get(`${this.baseUrl}/ads/lookup/manufacturers`),
      },
      {
        name: 'Get All Vehicle Models (Lookup)',
        call: () => axios.get(`${this.baseUrl}/ads/lookup/vehicle-models`),
      },
      {
        name: 'Get All Vehicle Variants (Lookup)',
        call: () => axios.get(`${this.baseUrl}/ads/lookup/vehicle-variants`),
      },
      {
        name: 'Get Property Types (Lookup)',
        call: () => axios.get(`${this.baseUrl}/lookup/property-types`),
      },
      {
        name: 'CORS Test',
        call: () => axios.get(`${this.baseUrl}/cors-test`),
      },
      {
        name: 'Redis Test',
        call: () => axios.get(`${this.baseUrl}/redis/test`),
      },
      {
        name: 'Health Check',
        call: () => axios.get(`${this.baseUrl}/health`),
      },
      {
        name: 'API Info',
        call: () => axios.get(`${this.baseUrl}/`),
      },
    ];

    for (const test of tests) {
      console.log(`Testing: ${test.name}`);
      const result = await this.measureResponseTime(test.call, test.name);
      if (result) {
        const existingResult = this.testResults.find(
          (r) => r.api === test.name,
        );
        if (existingResult) {
          existingResult.withoutRedis = result;
        }
      }
    }
  }

  generateHTMLReport() {
    console.log('📊 Generating HTML report...');

    const timestamp = new Date().toLocaleString();
    const totalApis = this.testResults.length;
    const improvedApis = this.testResults.filter(
      (r) =>
        r.withRedis && r.withoutRedis && r.withRedis.avg < r.withoutRedis.avg,
    ).length;
    const avgImprovement =
      this.testResults
        .filter((r) => r.withRedis && r.withoutRedis)
        .reduce((sum, r) => {
          const improvement =
            ((r.withoutRedis.avg - r.withRedis.avg) / r.withoutRedis.avg) * 100;
          return sum + improvement;
        }, 0) /
      this.testResults.filter((r) => r.withRedis && r.withoutRedis).length;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Performance Test Report - Redis vs No Redis</title>
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 300;
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        
        .summary-card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            text-align: center;
        }
        
        .summary-card h3 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 1.2em;
        }
        
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        
        .summary-card .label {
            color: #666;
            font-size: 0.9em;
            margin-top: 5px;
        }
        
        .content {
            padding: 30px;
        }
        
        .table-container {
            overflow-x: auto;
            margin-top: 20px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        
        th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 500;
        }
        
        td {
            padding: 12px 15px;
            border-bottom: 1px solid #eee;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .improvement {
            color: #28a745;
            font-weight: bold;
        }
        
        .degradation {
            color: #dc3545;
            font-weight: bold;
        }
        
        .neutral {
            color: #6c757d;
        }
        
        .performance-bar {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 5px;
        }
        
        .performance-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s ease;
        }
        
        .chart-container {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            border-top: 1px solid #eee;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .badge-success {
            background: #d4edda;
            color: #155724;
        }
        
        .badge-warning {
            background: #fff3cd;
            color: #856404;
        }
        
        .badge-danger {
            background: #f8d7da;
            color: #721c24;
        }

        .note {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 5px 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 API Performance Test Report</h1>
            <p>Redis Caching vs No Caching Performance Comparison</p>
            <p><strong>Generated:</strong> ${timestamp}</p>
        </div>
        
        <div class="note">
            <strong>📝 Note:</strong> This test focuses on publicly accessible APIs that don't require authentication. 
            The comparison shows the performance difference between Redis-cached and non-cached responses.
            <br><strong>🔥 New:</strong> Ads endpoints now use Redis caching for improved performance!
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>📊 Total APIs Tested</h3>
                <div class="value">${totalApis}</div>
                <div class="label">Public GET endpoints</div>
            </div>
            <div class="summary-card">
                <h3>⚡ Improved with Redis</h3>
                <div class="value">${improvedApis}</div>
                <div class="label">APIs with better performance</div>
            </div>
            <div class="summary-card">
                <h3>📈 Average Improvement</h3>
                <div class="value">${avgImprovement.toFixed(1)}%</div>
                <div class="label">Faster response times</div>
            </div>
            <div class="summary-card">
                <h3>🎯 Success Rate</h3>
                <div class="value">${((this.testResults.filter((r) => r.withRedis && r.withoutRedis).length / totalApis) * 100).toFixed(1)}%</div>
                <div class="label">Successful test completion</div>
            </div>
        </div>
        
        <div class="content">
            <h2>📋 Detailed Performance Results</h2>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>API Endpoint</th>
                            <th>With Redis (ms)</th>
                            <th>Without Redis (ms)</th>
                            <th>Improvement</th>
                            <th>Performance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.testResults
                          .map((result) => {
                            if (!result.withRedis || !result.withoutRedis)
                              return '';

                            const improvement =
                              ((result.withoutRedis.avg -
                                result.withRedis.avg) /
                                result.withoutRedis.avg) *
                              100;
                            const improvementClass =
                              improvement > 0
                                ? 'improvement'
                                : improvement < 0
                                  ? 'degradation'
                                  : 'neutral';
                            const improvementText =
                              improvement > 0
                                ? `+${improvement.toFixed(1)}%`
                                : `${improvement.toFixed(1)}%`;
                            const performancePercent = Math.max(
                              0,
                              Math.min(
                                100,
                                (result.withRedis.avg /
                                  result.withoutRedis.avg) *
                                  100,
                              ),
                            );

                            return `
                                <tr>
                                    <td><strong>${result.api}</strong></td>
                                    <td>
                                        <div>Avg: ${result.withRedis.avg.toFixed(1)}ms</div>
                                        <div style="font-size: 0.8em; color: #666;">
                                            Min: ${result.withRedis.min}ms | Max: ${result.withRedis.max}ms
                                        </div>
                                    </td>
                                    <td>
                                        <div>Avg: ${result.withoutRedis.avg.toFixed(1)}ms</div>
                                        <div style="font-size: 0.8em; color: #666;">
                                            Min: ${result.withoutRedis.min}ms | Max: ${result.withoutRedis.max}ms
                                        </div>
                                    </td>
                                    <td class="${improvementClass}">${improvementText}</td>
                                    <td>
                                        <div class="performance-bar">
                                            <div class="performance-fill" style="width: ${performancePercent}%"></div>
                                        </div>
                                        <div style="font-size: 0.8em; margin-top: 2px;">
                                            ${performancePercent.toFixed(1)}% of original time
                                        </div>
                                    </td>
                                </tr>
                            `;
                          })
                          .join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="chart-container">
                <h3>📊 Performance Analysis</h3>
                <p><strong>Key Findings:</strong></p>
                <ul style="margin: 15px 0; padding-left: 20px;">
                    <li><span class="badge badge-success">✅ ${improvedApis} APIs</span> showed improved performance with Redis caching</li>
                    <li><span class="badge badge-warning">⚠️ ${totalApis - improvedApis} APIs</span> showed similar or degraded performance</li>
                    <li><span class="badge badge-success">📈 ${avgImprovement.toFixed(1)}%</span> average improvement across all APIs</li>
                    <li>Redis caching is most effective for frequently accessed data and complex queries</li>
                    <li>Public APIs without authentication show the most consistent performance patterns</li>
                    <li><strong>🔥 Ads endpoints now use Redis caching for 10-15 minute TTL</strong></li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>Generated by Ado-Dad Performance Testing Suite | Redis Performance Analysis</p>
        </div>
    </div>
</body>
</html>`;

    const reportPath = path.join(__dirname, 'performance-report.html');
    fs.writeFileSync(reportPath, html);
    console.log(`✅ HTML report generated: ${reportPath}`);
    return reportPath;
  }

  async run() {
    try {
      await this.initialize();

      console.log('\n🔥 Starting performance tests...\n');

      // Test with Redis
      await this.testWithRedis();

      console.log('\n⏳ Waiting 5 seconds before testing without Redis...\n');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Test without Redis
      await this.testWithoutRedis();

      // Generate report
      const reportPath = this.generateHTMLReport();

      console.log('\n🎉 Performance testing completed!');
      console.log(`📊 Report saved to: ${reportPath}`);
      console.log(
        `🌐 Open the HTML file in your browser to view the detailed report`,
      );
    } catch (error) {
      console.error('❌ Performance testing failed:', error.message);
    }
  }
}

// Run the performance test
const tester = new PerformanceTester();
tester.run();
