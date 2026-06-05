import React, { useState, useEffect } from "react";
import { 
  Activity, Cpu, ShieldAlert, Terminal, RefreshCw, Server, 
  Database, Zap, CheckCircle2, AlertTriangle, XCircle, Clock, 
  TrendingUp, Award, Flame, AlertCircle, HardDrive
} from "lucide-react";
import Card from "../components/Card";
import { getSystemHealth, getSystemMetrics, getSystemLogs } from "../api/devopsService";

export default function DevOpsMonitor() {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [logLimit, setLogLimit] = useState(30);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [healthData, metricsData, logsData] = await Promise.all([
        getSystemHealth(),
        getSystemMetrics(),
        getSystemLogs(logLimit)
      ]);
      setHealth(healthData);
      setMetrics(metricsData);
      setLogs(logsData || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load monitoring data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto refresh every 30 seconds
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [logLimit]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "healthy":
      case "connected":
      case "active":
      case "ok":
        return <CheckCircle2 className="text-emerald-500 h-5 w-5 animate-pulse" />;
      case "degraded":
      case "connecting":
      case "warning":
        return <AlertTriangle className="text-amber-500 h-5 w-5 animate-bounce" />;
      case "unreachable":
      case "disconnected":
      case "unavailable":
      case "critical":
        return <XCircle className="text-rose-500 h-5 w-5 animate-pulse" />;
      default:
        return <AlertCircle className="text-gray-400 h-5 w-5" />;
    }
  };

  const getStatusColorClass = (status) => {
    switch (status?.toLowerCase()) {
      case "healthy":
      case "connected":
      case "active":
      case "ok":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/50";
      case "degraded":
      case "connecting":
      case "warning":
        return "bg-amber-50 text-amber-700 border-amber-200/50";
      case "unreachable":
      case "disconnected":
      case "unavailable":
      case "critical":
        return "bg-rose-50 text-rose-700 border-rose-200/50";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent shadow-lg shadow-indigo-600/10"></div>
        <div className="font-display font-medium text-gray-500 animate-pulse">Initializing Advanced DevOps Dashboard...</div>
      </div>
    );
  }

  const system = metrics?.system || {};
  const ai = metrics?.ai || {};
  const security = metrics?.security || {};
  const queues = metrics?.queues || {};
  const activeAlerts = metrics?.activeAlerts || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header section with glassmorphism glow */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-gradient-to-r from-indigo-900/90 to-slate-900/95 text-white rounded-3xl shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 -mb-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl"></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
            <Activity className="text-emerald-400 h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Reliability & DevOps Monitor</h1>
            <p className="mt-1 text-sm text-indigo-200">
              Real-time resource logs, database states, active alert matrices, and AI operational latency metrics.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Live Monitoring Active
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 disabled:bg-white/5 disabled:text-gray-400 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95"
          >
            <RefreshCw size={15} className={`${refreshing ? "animate-spin text-emerald-400" : ""}`} />
            {refreshing ? "Refreshing..." : "Sync Metrics"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Dashboard Sync Warning</div>
            <div className="text-sm mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* Component Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Backend API */}
        <Card className="p-5 border border-border/60 hover:shadow-lg transition-all hover:-translate-y-0.5 duration-200">
          <div className="flex justify-between items-start">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Server size={20} />
            </div>
            {getStatusIcon("healthy")}
          </div>
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Core API Server</div>
            <div className="text-lg font-bold text-gray-800 mt-1">HRMS Backend</div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusColorClass("healthy")}`}>
                Healthy
              </span>
              <span className="text-xs text-gray-500 font-mono">Uptime: {Math.floor((system.uptime || 0) / 3600)}h {Math.floor(((system.uptime || 0) % 3600) / 60)}m</span>
            </div>
          </div>
        </Card>

        {/* Database */}
        <Card className="p-5 border border-border/60 hover:shadow-lg transition-all hover:-translate-y-0.5 duration-200">
          <div className="flex justify-between items-start">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Database size={20} />
            </div>
            {getStatusIcon(health?.components?.database?.status || "connected")}
          </div>
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Database Instance</div>
            <div className="text-lg font-bold text-gray-800 mt-1">MongoDB Storage</div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusColorClass(health?.components?.database?.status || "connected")}`}>
                {health?.components?.database?.status || "Connected"}
              </span>
              <span className="text-xs text-gray-500 font-mono">Latency: &lt; 10ms</span>
            </div>
          </div>
        </Card>

        {/* AI Service */}
        <Card className="p-5 border border-border/60 hover:shadow-lg transition-all hover:-translate-y-0.5 duration-200">
          <div className="flex justify-between items-start">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Zap size={20} />
            </div>
            {getStatusIcon(health?.components?.aiService?.status === "healthy" ? "healthy" : "degraded")}
          </div>
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Groq Client</div>
            <div className="text-lg font-bold text-gray-800 mt-1">FastAPI Engine</div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusColorClass(health?.components?.aiService?.status === "healthy" ? "healthy" : "degraded")}`}>
                {health?.components?.aiService?.status === "healthy" ? "Healthy" : "Degraded"}
              </span>
              <span className="text-xs text-gray-500 font-mono">Latency: {health?.components?.aiService?.latency || "~0ms"}</span>
            </div>
          </div>
        </Card>

        {/* Redis Queues */}
        <Card className="p-5 border border-border/60 hover:shadow-lg transition-all hover:-translate-y-0.5 duration-200">
          <div className="flex justify-between items-start">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <HardDrive size={20} />
            </div>
            {getStatusIcon(health?.components?.queue?.status === "active" ? "active" : "degraded")}
          </div>
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Redis Bull Queues</div>
            <div className="text-lg font-bold text-gray-800 mt-1">Job Workflows</div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusColorClass(health?.components?.queue?.status === "active" ? "active" : "degraded")}`}>
                {health?.components?.queue?.status === "active" ? "Active" : "Degraded"}
              </span>
              <span className="text-xs text-gray-500 font-mono">Tasks: {queues.analytics?.waiting || 0} wait / {queues.analytics?.active || 0} active</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main metrics section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Resource Gauges */}
        <Card className="p-6 border border-border/60 col-span-1">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Cpu className="text-indigo-600 h-5 w-5" />
            Infrastructure Resources
          </h2>
          <p className="text-xs text-gray-500 mt-1">Process CPU & memory tracking compared to allocated capacities.</p>
          
          <div className="mt-6 space-y-6">
            {/* Process RSS Memory */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-gray-700">Node.js Process RAM</span>
                <span className="text-xs text-gray-500 font-mono">{system.memory?.rss || "0 MB"} / 400 MB</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200/50">
                {(() => {
                  const rssVal = parseInt(system.memory?.rss || "0");
                  const percent = Math.min(Math.round((rssVal / 400) * 100), 100);
                  const color = percent > 85 ? "bg-rose-500" : percent > 60 ? "bg-amber-500" : "bg-indigo-600";
                  return <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }}></div>;
                })()}
              </div>
            </div>

            {/* Overall OS Memory */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-gray-700">OS Overall memory</span>
                {(() => {
                  const total = parseInt(system.os?.totalMem || "0");
                  const free = parseInt(system.os?.freeMem || "0");
                  const used = total - free;
                  const ratio = total > 0 ? Math.round((used / total) * 100) : 0;
                  return (
                    <>
                      <span className="text-xs text-gray-500 font-mono">{used} MB / {total} MB ({ratio}%)</span>
                    </>
                  );
                })()}
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200/50">
                {(() => {
                  const total = parseInt(system.os?.totalMem || "0");
                  const free = parseInt(system.os?.freeMem || "0");
                  const used = total - free;
                  const percent = total > 0 ? Math.round((used / total) * 100) : 0;
                  const color = percent > 85 ? "bg-rose-500" : percent > 60 ? "bg-amber-500" : "bg-emerald-500";
                  return <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }}></div>;
                })()}
              </div>
            </div>

            {/* Load average */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-gray-700">OS Load Average</span>
                <span className="text-xs font-mono text-gray-500">1m, 5m, 15m</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(system.os?.loadAvg || [0, 0, 0]).map((load, index) => {
                  const label = index === 0 ? "1 Min" : index === 1 ? "5 Min" : "15 Min";
                  const percent = Math.min(Math.round((load / 4) * 100), 100);
                  const color = load > 3.0 ? "text-rose-600 bg-rose-50 border-rose-200" : load > 1.5 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-emerald-600 bg-emerald-50 border-emerald-200";
                  return (
                    <div key={index} className={`flex flex-col items-center justify-center p-2 rounded-xl border ${color} text-center`}>
                      <span className="text-xs font-semibold">{label}</span>
                      <span className="text-base font-bold mt-1 font-mono">{load.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* AI Analytics Performance */}
        <Card className="p-6 border border-border/60 col-span-2">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="text-violet-600 h-5 w-5" />
            AI Analytics & Prompt Efficiency
          </h2>
          <p className="text-xs text-gray-500 mt-1">Real-time statistics on report generation, LLM response timing, and success margins.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-2xl text-center">
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Requests</div>
              <div className="text-2xl font-black text-slate-800 mt-1 font-mono">{(ai.totalRequests || 0).toLocaleString()}</div>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-200/40 p-4 rounded-2xl text-center">
              <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Successful</div>
              <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">{(ai.successfulRequests || 0).toLocaleString()}</div>
            </div>
            <div className="bg-rose-50/50 border border-rose-200/40 p-4 rounded-2xl text-center">
              <div className="text-xs text-rose-600 font-semibold uppercase tracking-wider">Failed / Timed Out</div>
              <div className="text-2xl font-black text-rose-700 mt-1 font-mono">{(ai.failedRequests || 0).toLocaleString()}</div>
            </div>
            <div className="bg-indigo-50/50 border border-indigo-200/40 p-4 rounded-2xl text-center">
              <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Avg Latency</div>
              <div className="text-2xl font-black text-indigo-700 mt-1 font-mono">{(ai.averageLatencyMs || 0)}ms</div>
            </div>
          </div>

          <div className="mt-6 bg-gradient-to-r from-violet-500/5 to-indigo-500/5 border border-indigo-100/50 rounded-2xl p-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/10 flex items-center justify-center text-violet-600">
                <Flame size={18} className="animate-bounce" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-800">Reliability & SLA Rate</div>
                <div className="text-xs text-gray-500">Goal exceeds 90% SLA threshold.</div>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-1 max-w-xs md:max-w-md">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden border border-gray-200/30">
                {(() => {
                  const rate = ai.successRate ? parseInt(ai.successRate) : 100;
                  const color = rate > 90 ? "bg-emerald-500" : rate > 75 ? "bg-amber-500" : "bg-rose-500";
                  return <div className={`h-full ${color}`} style={{ width: `${rate}%` }}></div>;
                })()}
              </div>
              <span className="text-lg font-black text-slate-800 font-mono">{ai.successRate || "100%"}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts and Logs row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active alert incidents list */}
        <Card className="p-6 border border-border/60 col-span-1 flex flex-col max-h-[500px]">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
            <ShieldAlert className="text-amber-500 h-5 w-5" />
            Active Warning & Security Feed
          </h2>
          <div className="mt-4 flex-1 overflow-y-auto space-y-3.5 pr-1">
            {activeAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <CheckCircle2 size={32} className="text-emerald-500/80 mb-2" />
                <span className="text-sm font-semibold">No Active Alerts</span>
                <span className="text-xs text-gray-500 mt-1">Infrastructure is secure and optimized.</span>
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div key={alert.id} className="p-3 bg-amber-50/60 border border-amber-200/50 rounded-xl flex items-start gap-2.5 shadow-sm">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-amber-800 font-mono tracking-wide">{alert.type}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-gray-700 mt-1.5 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Console Log Terminal */}
        <Card className="p-6 border border-border/60 col-span-2 flex flex-col max-h-[500px]">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Terminal className="text-slate-800 h-5 w-5" />
              DevOps Error & Status Logs
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Log Limit:</span>
              <select 
                value={logLimit} 
                onChange={(e) => setLogLimit(Number(e.target.value))}
                className="text-xs bg-slate-50 border border-gray-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-600 font-medium"
              >
                <option value={10}>10 lines</option>
                <option value={30}>30 lines</option>
                <option value={50}>50 lines</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex-1 bg-slate-950 rounded-2xl p-4 font-mono text-xs text-slate-300 overflow-y-auto max-h-[350px] shadow-inner border border-slate-900 relative">
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
            {logs.length === 0 ? (
              <div className="text-slate-500 italic py-12 text-center">No active error logs found. System running cleanly.</div>
            ) : (
              logs.map((log, index) => {
                let timestamp = log.timestamp || log.time || new Date().toISOString();
                let message = log.message || "";
                let level = log.level || "error";
                let colorClass = level === "error" || level === "fail" ? "text-rose-400" : level === "warning" || level === "warn" ? "text-amber-400" : "text-emerald-400";
                return (
                  <div key={index} className="py-1 border-b border-slate-900/50 hover:bg-slate-900/30 flex items-start gap-2">
                    <span className="text-slate-500 font-normal select-none">[{new Date(timestamp).toLocaleTimeString()}]</span>
                    <span className={`font-bold select-none ${colorClass} uppercase`}>{level}:</span>
                    <span className="flex-1 break-all">{message} {log.error ? `- ${log.error}` : ""} {log.endpoint ? `(Endpoint: ${log.endpoint} ${log.latency_ms ? `${log.latency_ms}ms` : ""})` : ""}</span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
