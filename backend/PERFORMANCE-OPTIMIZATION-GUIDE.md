# Performance Optimization & Monitoring Guide

## Overview

This guide explains how to use the new performance monitoring, optimization, and testing tools integrated into your HRMS backend.

---

## 1. New Monitoring Endpoints

All endpoints require `Authorization: Bearer {token}` header for admin users.

### Performance Metrics
**GET `/api/devops/performance`**

Returns detailed performance data including requests, AI calls, database queries, and analytics.

```bash
curl http://localhost:3000/api/devops/performance \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timeWindow": "Last 60 minutes",
    "aggregated": {
      "totalRequests": 1250,
      "averageResponseTime": "245",
      "p95ResponseTime": 850,
      "p99ResponseTime": 1200,
      "cacheHitRate": "78%"
    },
    "aiCalls": {
      "total": 145,
      "successful": 142,
      "byModel": {"grok-enterprise": 145},
      "averageResponseTime": "2345"
    },
    "database": {
      "totalQueries": 5420,
      "byCollection": {...},
      "averageQueryTime": "125"
    }
  }
}
```

### Query Optimizations
**GET `/api/devops/query-optimizations`**

Get database query optimization recommendations.

```bash
curl http://localhost:3000/api/devops/query-optimizations \
  -H "Authorization: Bearer {token}"
```

**Response includes:**
- Index recommendations
- Slow queries analysis
- Query optimization suggestions

### Cache Optimizations
**GET `/api/devops/cache-optimizations`**

Get cache efficiency report and recommendations.

```bash
curl http://localhost:3000/api/devops/cache-optimizations \
  -H "Authorization: Bearer {token}"
```

### AI Optimizations
**GET `/api/devops/ai-optimizations`**

Get AI endpoint performance and optimization recommendations.

```bash
curl http://localhost:3000/api/devops/ai-optimizations \
  -H "Authorization: Bearer {token}"
```

### Performance Health
**GET `/api/devops/performance-health`**

Get current performance health status and score.

```bash
curl http://localhost:3000/api/devops/performance-health \
  -H "Authorization: Bearer {token}"
```

### System Analysis
**GET `/api/devops/analysis`**

Get comprehensive system analysis with all recommendations.

```bash
curl http://localhost:3000/api/devops/analysis \
  -H "Authorization: Bearer {token}"
```

### Run Performance Tests
**GET `/api/devops/performance-tests`**

Run full performance test suite (takes 1-2 minutes).

```bash
curl http://localhost:3000/api/devops/performance-tests \
  -H "Authorization: Bearer {token}"
```

---

## 2. Real-time Monitoring CLI

Start the real-time performance monitor:

```bash
node scripts/performance-monitor.js
```

This displays live metrics including:
- System health status
- Request metrics
- AI service metrics
- Database metrics
- Optimization recommendations

---

## 3. New Services & Files

### Performance Monitoring Service
**File:** `services/performanceMonitor.service.js`

Tracks all system metrics:
```javascript
const performanceMonitor = require('./services/performanceMonitor.service');

// Record API call
performanceMonitor.recordApiCall('/api/health', 45, 200, 'req-uuid');

// Record AI call
performanceMonitor.recordAiCall('/api/ai/analyze', 'grok-enterprise', 50, 145);

// Record analytics processing
performanceMonitor.recordAnalyticsProcessing('attendance-analysis', 1200, 500);

// Get health status
const health = performanceMonitor.getHealthStatus();

// Get detailed report
const report = performanceMonitor.getDetailedReport();
```

### Query Optimizer Service
**File:** `services/queryOptimizer.service.js`

Optimizes database queries:
```javascript
const queryOptimizer = require('./services/queryOptimizer.service');

// Analyze query performance
queryOptimizer.analyzeQuery('employees', {department: 'Engineering'}, {}, 450);

// Get optimization report
const report = queryOptimizer.getOptimizationReport();

// Get specific recommendations
const recs = queryOptimizer.getOptimizationRecommendations();
```

### Cache Optimizer Service
**File:** `services/cacheOptimizer.service.js`

Optimizes caching strategy:
```javascript
const cacheOptimizer = require('./services/cacheOptimizer.service');

// Record cache access
cacheOptimizer.recordAccess('user:123', true, 1024);

// Get efficiency metrics
const efficiency = cacheOptimizer.getCacheEfficiency();

// Get optimization report
const report = cacheOptimizer.getOptimizationReport();
```

### AI Optimizer Service
**File:** `services/aiOptimizer.service.js`

Optimizes AI performance:
```javascript
const aiOptimizer = require('./services/aiOptimizer.service');

// Record AI call metrics
aiOptimizer.recordAiCall('/api/ai/analyze', 'grok-enterprise', 45, 120, 2500);

// Get optimization report
const report = aiOptimizer.getOptimizationReport();

// Batch requests for efficiency
const batched = aiOptimizer.batchRequests(requests);
```

### Performance Testing Suite
**File:** `tests/performance.test.js`

Run performance tests:
```javascript
const PerformanceTestSuite = require('./tests/performance.test');

const suite = new PerformanceTestSuite('http://localhost:3000');

// Run individual tests
await suite.testConcurrentRequests('/api/health', 50);
await suite.testSustainedLoad('/api/health', 30000, 10);
await suite.testSpikeLoad('/api/health', 5, 100, 15000);
await suite.testMemoryStability(60000);
await suite.testErrorRecovery('/api/invalid', 10);

// Run all tests
const report = await suite.runAllTests();
```

---

## 4. Optimization Strategies

### Database Query Optimization

**Recommended Actions:**

1. **Create Suggested Indexes**
   ```bash
   # Check for index recommendations
   curl http://localhost:3000/api/devops/query-optimizations
   
   # Then create in MongoDB
   db.employees.createIndex({ department: 1 })
   db.attendance.createIndex({ employeeId: 1, date: 1 })
   ```

2. **Enable Query Caching**
   ```javascript
   // In controllers, add caching:
   const cacheKey = `query:${collection}:${JSON.stringify(filter)}`;
   let result = await cacheService.get(cacheKey);
   if (!result) {
     result = await Model.find(filter);
     await cacheService.set(cacheKey, result, 600); // 10 min TTL
   }
   ```

3. **Use Query Batching**
   ```javascript
   // Instead of 10 separate queries:
   const results = await Promise.all([
     User.findById(id1),
     User.findById(id2),
     // ... (many separate queries)
   ]);
   
   // Use batch queries:
   const results = await User.find({ _id: { $in: [id1, id2, ...] } });
   ```

### Cache Optimization

**Recommended Actions:**

1. **Implement Tiered Caching**
   - L1: In-memory cache (Node.js process)
   - L2: Redis cache (if available)
   - L3: Database

2. **Adjust TTLs Based on Access Patterns**
   ```
   High access (100+ calls/hour): 1 hour TTL
   Medium access (10-100 calls/hour): 30 min TTL
   Low access (1-10 calls/hour): 5 min TTL
   ```

3. **Cache Warming**
   - Pre-load frequently accessed data on startup
   - Refresh before expiration for critical data

### AI Response Optimization

**Recommended Actions:**

1. **Response Caching**
   - Cache AI analysis results for frequently analyzed employees
   - TTL: 10 minutes

2. **Prompt Optimization**
   - Remove unnecessary text from prompts
   - Use concise, structured prompts
   - Batch similar requests

3. **Use Appropriate Models**
   - Fast queries: `grok-enterprise` (~800ms)
   - Standard queries: `gpt-3.5-turbo` (~1500ms)
   - Complex analysis: `gpt-4` (~3000ms)

---

## 5. Performance Benchmarks

### Target Performance

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Avg Response Time | <500ms | TBD | Monitor |
| P95 Response Time | <2000ms | TBD | Monitor |
| Cache Hit Rate | >80% | TBD | Monitor |
| API Success Rate | >99% | TBD | Monitor |
| Database Query Avg | <200ms | TBD | Monitor |
| AI Response Time | <3000ms | TBD | Monitor |

### Load Testing Results

Run performance tests to establish baseline:
```bash
curl http://localhost:3000/api/devops/performance-tests
```

This tests:
- **Concurrent Requests**: 50 simultaneous requests
- **Sustained Load**: 10 requests/second for 30 seconds
- **Spike Load**: Sudden increase from 5 to 100 requests/second
- **Memory Stability**: Monitor heap growth over 60 seconds
- **Error Recovery**: Verify graceful error handling

---

## 6. Monitoring Best Practices

### Daily Monitoring

1. Check performance health status
   ```bash
   curl http://localhost:3000/api/devops/performance-health
   ```

2. Review optimization recommendations
   ```bash
   curl http://localhost:3000/api/devops/analysis
   ```

3. Monitor error rates
   ```bash
   curl http://localhost:3000/api/devops/logs
   ```

### Weekly Optimization

1. Review slow queries
   ```bash
   curl http://localhost:3000/api/devops/query-optimizations
   ```

2. Optimize cache usage
   ```bash
   curl http://localhost:3000/api/devops/cache-optimizations
   ```

3. Analyze AI performance
   ```bash
   curl http://localhost:3000/api/devops/ai-optimizations
   ```

### Monthly Performance Testing

1. Run full performance test suite
   ```bash
   curl http://localhost:3000/api/devops/performance-tests
   ```

2. Review trends vs previous months

3. Identify bottlenecks and optimize

---

## 7. Alert Thresholds

### Critical Alerts (Act Immediately)

```
- Response time > 5 seconds
- Cache hit rate < 30%
- Error rate > 5%
- Memory growth > 100MB/hour
- AI service unavailable
```

### Warning Alerts (Review & Plan)

```
- Response time > 2 seconds
- Cache hit rate < 50%
- Error rate > 1%
- Query avg > 1 second
- Memory growth > 50MB/hour
```

---

## 8. Scaling Recommendations

### When to Scale

Based on performance monitoring:

**Vertical Scaling (Bigger instance)**
- Memory usage consistently > 80%
- CPU consistently > 75%

**Horizontal Scaling (Multiple instances)**
- Requests/second consistently > 500
- Cache hit rate drops below 50%
- P99 response time > 2 seconds

**Database Scaling**
- Query avg > 500ms
- Slow queries > 5% of queries
- Database disk > 80% capacity

---

## 9. Implementation Checklist

- [x] Performance monitoring service created
- [x] Query optimizer service created
- [x] Cache optimizer service created
- [x] AI optimizer service created
- [x] Performance test suite created
- [x] Performance tracking middleware added
- [x] Devops endpoints enhanced
- [x] CLI monitoring tool created
- [ ] Deploy to production
- [ ] Set up monitoring alerts
- [ ] Establish performance baselines
- [ ] Schedule regular reviews

---

## 10. Troubleshooting

### High Response Times
1. Check database query performance
   ```bash
   curl http://localhost:3000/api/devops/query-optimizations
   ```
2. Review cache hit rate
3. Check AI service latency

### High Error Rate
1. Check error logs
2. Monitor rate limit status
3. Check external service connectivity

### Memory Issues
1. Check for memory leaks
   ```bash
   Run performance-tests and monitor heap growth
   ```
2. Reduce cache TTLs
3. Scale horizontally

---

## Summary

This optimization system provides:
✅ Real-time performance monitoring
✅ Automated optimization recommendations
✅ Performance testing capabilities
✅ AI/Database/Cache analysis
✅ Production-ready scaling guidance

Use these tools to maintain a high-performance, scalable backend system.
