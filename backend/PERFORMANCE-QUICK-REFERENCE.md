# Performance Monitoring & Optimization - Quick Reference

## 🚀 Quick Start

### 1. View Performance Dashboard
```bash
curl http://localhost:3000/api/devops/performance-health
curl http://localhost:3000/api/devops/analysis
```

### 2. Monitor in Real-time
```bash
node scripts/performance-monitor.js
```

### 3. Run Performance Tests
```bash
curl http://localhost:3000/api/devops/performance-tests
```

---

## 📊 Key Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `/api/devops/performance-health` | Health status | {status, score, recommendations} |
| `/api/devops/performance` | Metrics | {aggregated, aiCalls, database, ...} |
| `/api/devops/analysis` | Full analysis | {performance, recommendations, score} |
| `/api/devops/query-optimizations` | Database tips | {slowQueries, indexes, recommendations} |
| `/api/devops/cache-optimizations` | Cache tips | {hitRate, hotspots, recommendations} |
| `/api/devops/ai-optimizations` | AI tips | {endpoints, tokens, recommendations} |
| `/api/devops/performance-tests` | Run tests | {summary, tests, recommendations} |

---

## 🎯 Key Metrics

### Performance Health Score
- **80-100**: Excellent ✅
- **60-79**: Good ⚠️
- **40-59**: Fair ⚠️
- **0-39**: Critical 🚨

**Factors:**
- Response time (lower = better)
- Cache hit rate (higher = better)
- Error count (lower = better)

### Response Time Targets
```
Avg: <500ms
P95: <2s
P99: <3s
```

### Cache Hit Rate Target
```
Recommended: >80%
Acceptable: >50%
Poor: <30%
```

---

## 🔧 Optimization Recommendations

### Database Queries (Slow?)
1. Check `/query-optimizations` endpoint
2. Create recommended indexes
3. Use query batching
4. Enable caching

### Cache (Low hit rate?)
1. Check `/cache-optimizations` endpoint
2. Increase TTL for hot items
3. Implement cache warming
4. Reduce cache eviction

### AI (Slow responses?)
1. Check `/ai-optimizations` endpoint
2. Implement response caching
3. Batch similar requests
4. Select faster models when possible

---

## 📈 Performance Tests

### Run All Tests (2 minutes)
```bash
curl http://localhost:3000/api/devops/performance-tests
```

### Test Types
1. **Concurrent**: 50 simultaneous requests
2. **Sustained**: 10 RPS for 30 seconds
3. **Spike**: Sudden load increase
4. **Memory**: Leak detection
5. **Recovery**: Error handling

---

## 🚨 Alert Thresholds

### Critical (Act Now)
- Response time >5s
- Error rate >5%
- Memory growth >100MB/hour
- Cache hit <30%

### Warning (Review)
- Response time >2s
- Error rate >1%
- Memory growth >50MB/hour
- Cache hit <50%

---

## 📝 Integration Points

### Automatic Tracking
- All API requests tracked
- All AI calls monitored
- Database queries analyzed
- Cache access recorded
- Errors logged

### New Middleware
```javascript
app.use(performanceTrackingMiddleware);
```

### Available Services
```javascript
const performanceMonitor = require('./services/performanceMonitor.service');
const queryOptimizer = require('./services/queryOptimizer.service');
const cacheOptimizer = require('./services/cacheOptimizer.service');
const aiOptimizer = require('./services/aiOptimizer.service');
```

---

## 💡 Best Practices

### Daily Checks
1. Check health status
2. Review errors
3. Monitor response times

### Weekly Reviews
1. Analyze slow queries
2. Check cache efficiency
3. Review AI performance

### Monthly Optimization
1. Run full test suite
2. Implement recommendations
3. Update baselines

---

## 🔍 Troubleshooting

### High Response Times?
```bash
curl http://localhost:3000/api/devops/query-optimizations
```
→ Check slow queries, add indexes

### Low Cache Hit Rate?
```bash
curl http://localhost:3000/api/devops/cache-optimizations
```
→ Increase TTL, implement warming

### Slow AI Responses?
```bash
curl http://localhost:3000/api/devops/ai-optimizations
```
→ Cache responses, batch requests

### Memory Issues?
```bash
curl http://localhost:3000/api/devops/performance-tests
```
→ Check for memory leaks

---

## 📊 Example Responses

### Health Status
```json
{
  "status": "HEALTHY",
  "score": 92,
  "recommendations": [
    "System performing normally. No immediate optimizations needed."
  ]
}
```

### Performance Metrics
```json
{
  "aggregated": {
    "totalRequests": 1250,
    "averageResponseTime": "245",
    "p95ResponseTime": 850,
    "cacheHitRate": "78%",
    "totalErrors": 2
  }
}
```

### Analysis
```json
{
  "performance": {
    "status": "HEALTHY",
    "score": 92
  },
  "overallScore": 89,
  "queryOptimization": ["Create indexes..."],
  "cacheOptimization": ["Monitor eviction..."],
  "aiOptimization": ["Implement caching..."]
}
```

---

## 🛠️ Maintenance

### Cleanup Old Metrics
Automatic cleanup removes old data:
- Keeps last 1000 requests
- Keeps last 1000 AI calls
- Keeps last 1000 queries
- Keeps last 20 errors

### Reset Statistics
```javascript
performanceMonitor.cleanup();
queryOptimizer.reset();
cacheOptimizer.reset();
aiOptimizer.reset();
```

---

## 📚 Full Documentation

For complete details, see:
- `PERFORMANCE-OPTIMIZATION-GUIDE.md` - Full user guide
- `PERFORMANCE-OPTIMIZATION-COMPLETE.md` - Implementation details

---

## ✅ Verification Checklist

- [x] Performance monitoring active
- [x] All endpoints operational
- [x] Real-time CLI working
- [x] Performance tests ready
- [x] No API changes made
- [x] 100% backward compatible
- [x] Production ready

---

**Status:** ✅ PRODUCTION READY  
**Last Updated:** May 20, 2026
