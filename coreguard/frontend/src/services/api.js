const API_BASE = 'http://localhost:8000/api';

export const api = {
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch {
      return { status: 'offline' };
    }
  },

  async predictOverload(params) {
    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(3000)
      });
      if (!res.ok) throw new Error('Predict API error');
      return await res.json();
    } catch {
      // Local fallback logic
      const trend = params.trend || 0;
      const current = params.currentLoad || 50;
      const predictedLoad = Math.min(100, Math.round(current + (trend > 0 ? trend * 1.5 + 4 : 2)));
      const isOverload = predictedLoad >= 88;
      return {
        coreId: params.coreId,
        overloadPredicted: isOverload,
        confidence: Math.round(85 + Math.random() * 10),
        overloadProbability: Math.round((isOverload ? 0.82 : 0.18) * 100),
        predictedLoad,
        riskLevel: isOverload ? 'CRITICAL' : 'NOMINAL',
        recommendation: isOverload ? 'MIGRATION_REQUIRED' : 'KEEP_AFFINITY'
      };
    }
  },

  async analyzeMigration(params) {
    try {
      const res = await fetch(`${API_BASE}/migration/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(3000)
      });
      if (!res.ok) throw new Error('Migration analyze error');
      return await res.json();
    } catch {
      return null; // Let client simulation engine compute local breakdown
    }
  },

  async recordMigration(record) {
    try {
      const res = await fetch(`${API_BASE}/migration/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
        signal: AbortSignal.timeout(3000)
      });
      return await res.json();
    } catch (e) {
      console.warn('Backend record migration skipped:', e);
      return { status: 'local_only' };
    }
  },

  async getMigrations() {
    try {
      const res = await fetch(`${API_BASE}/migrations`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error('Failed to fetch migrations');
      return await res.json();
    } catch {
      return { migrations: [] };
    }
  },

  async getPerformanceData() {
    try {
      const res = await fetch(`${API_BASE}/performance`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error('Failed to fetch performance');
      return await res.json();
    } catch {
      return null;
    }
  }
};
