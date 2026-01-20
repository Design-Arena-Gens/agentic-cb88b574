'use client';

import { useState, useEffect, useRef } from 'react';

interface PingResult {
  timestamp: number;
  latency: number | null;
  success: boolean;
  error?: string;
}

interface Stats {
  totalPings: number;
  successfulPings: number;
  failedPings: number;
  minLatency: number;
  maxLatency: number;
  avgLatency: number;
  packetLoss: number;
  jitter: number;
  uptime: number;
}

export default function Home() {
  const [target, setTarget] = useState('google.com');
  const [interval, setInterval] = useState(1000);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<PingResult[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPings: 0,
    successfulPings: 0,
    failedPings: 0,
    minLatency: 0,
    maxLatency: 0,
    avgLatency: 0,
    packetLoss: 0,
    jitter: 0,
    uptime: 0,
  });

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const pingTarget = async () => {
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`/api/ping?target=${encodeURIComponent(target)}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (response.ok) {
        return {
          timestamp: Date.now(),
          latency,
          success: true,
        };
      } else {
        return {
          timestamp: Date.now(),
          latency: null,
          success: false,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        timestamp: Date.now(),
        latency: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const calculateStats = (results: PingResult[]): Stats => {
    if (results.length === 0) {
      return {
        totalPings: 0,
        successfulPings: 0,
        failedPings: 0,
        minLatency: 0,
        maxLatency: 0,
        avgLatency: 0,
        packetLoss: 0,
        jitter: 0,
        uptime: 0,
      };
    }

    const successfulResults = results.filter(r => r.success && r.latency !== null);
    const latencies = successfulResults.map(r => r.latency!);

    const totalPings = results.length;
    const successfulPings = successfulResults.length;
    const failedPings = totalPings - successfulPings;

    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

    const packetLoss = totalPings > 0 ? Math.round((failedPings / totalPings) * 100) : 0;

    // Calculate jitter (average deviation from mean)
    let jitter = 0;
    if (latencies.length > 1) {
      const deviations = latencies.map(l => Math.abs(l - avgLatency));
      jitter = Math.round(deviations.reduce((a, b) => a + b, 0) / deviations.length);
    }

    const uptime = totalPings > 0 ? Math.round((successfulPings / totalPings) * 100) : 0;

    return {
      totalPings,
      successfulPings,
      failedPings,
      minLatency,
      maxLatency,
      avgLatency,
      packetLoss,
      jitter,
      uptime,
    };
  };

  const startPinging = () => {
    if (!target) return;

    setIsRunning(true);
    setResults([]);
    startTimeRef.current = Date.now();

    const ping = () => {
      pingTarget().then(result => {
        setResults(prev => [...prev.slice(-99), result]); // Keep last 100 results
      });
    };

    ping(); // First ping immediately
    intervalRef.current = window.setInterval(ping, interval);
  };

  const stopPinging = () => {
    setIsRunning(false);
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    setStats(calculateStats(results));
  }, [results]);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return '#00ff00';
    if (latency < 100) return '#ffff00';
    if (latency < 200) return '#ff9900';
    return '#ff0000';
  };

  return (
    <div className="container">
      <header className="header">
        <h1>⚓ BATTLESHIP PINGER ⚓</h1>
        <div className="battleship">{`                                      |__
                                     |\\/
                                     ---
                                     / | [
                              !      | |||
                            _/|     _/|-++'
                        +  +--|    |--|--|_ |-
                     { /|__|  |/\\__|  |--- |||__/
                    +---------------___[}-_===_.'____                 /\\
                ____\`-' ||___-{]_| _[}-  |     |_[___\\==--            \\/   _
 __..._____--==/___]_|__|_____________________________[___\\==--____,------' .7
|                                                                     BB-61/
 \\_________________________________________________________________________|`}</div>
      </header>

      <div className="input-section">
        <div className="input-group">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Enter target (e.g., google.com)"
            disabled={isRunning}
          />
          <input
            type="number"
            value={interval}
            onChange={(e) => setInterval(Math.max(100, parseInt(e.target.value) || 1000))}
            placeholder="Interval (ms)"
            disabled={isRunning}
            min="100"
          />
          <button onClick={isRunning ? stopPinging : startPinging}>
            {isRunning ? 'CEASE FIRE' : 'FIRE!'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={`status-indicator ${isRunning ? 'active' : 'inactive'}`}></span>
          <span>{isRunning ? 'FIRING' : 'READY'}</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">TOTAL SALVOS</div>
          <div className="stat-value">{stats.totalPings}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">HITS</div>
          <div className="stat-value" style={{ color: '#00ff00' }}>{stats.successfulPings}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">MISSES</div>
          <div className="stat-value" style={{ color: '#ff0000' }}>{stats.failedPings}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">AVG LATENCY</div>
          <div className="stat-value">{stats.avgLatency} ms</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">MIN LATENCY</div>
          <div className="stat-value" style={{ color: '#00ff00' }}>{stats.minLatency} ms</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">MAX LATENCY</div>
          <div className="stat-value" style={{ color: '#ff9900' }}>{stats.maxLatency} ms</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">JITTER</div>
          <div className="stat-value">{stats.jitter} ms</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">PACKET LOSS</div>
          <div className="stat-value" style={{ color: stats.packetLoss > 5 ? '#ff0000' : '#00ff00' }}>
            {stats.packetLoss}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">UPTIME</div>
          <div className="stat-value">{stats.uptime}%</div>
          <div className="packet-loss-meter">
            <div className="packet-success" style={{ width: `${stats.uptime}%` }}></div>
            <div className="packet-fail" style={{ width: `${100 - stats.uptime}%` }}></div>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="charts">
          <div className="chart">
            <h3>LATENCY TRAJECTORY</h3>
            <div className="latency-graph">
              {results.slice(-50).map((result, index) => {
                const maxHeight = Math.max(...results.slice(-50).filter(r => r.latency !== null).map(r => r.latency!), 100);
                const height = result.latency ? (result.latency / maxHeight) * 100 : 0;
                return (
                  <div
                    key={index}
                    className="latency-bar"
                    style={{
                      height: `${height}%`,
                      background: result.success && result.latency
                        ? `linear-gradient(to top, ${getLatencyColor(result.latency)}, ${getLatencyColor(result.latency)}88)`
                        : '#ff0000'
                    }}
                    data-value={result.latency ? `${result.latency}ms` : 'Failed'}
                  ></div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="ping-log">
          <h2>COMBAT LOG</h2>
          {results.slice(-20).reverse().map((result, index) => (
            <div key={index} className={`ping-entry ${result.success ? 'success' : 'error'}`}>
              [{formatTime(result.timestamp)}] {target} → {
                result.success
                  ? `HIT! ${result.latency}ms`
                  : `MISS! ${result.error || 'Unknown error'}`
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
