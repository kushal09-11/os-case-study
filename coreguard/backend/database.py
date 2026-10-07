import sqlite3
import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

DB_DIR = Path(__file__).resolve().parent.parent / "database"
DB_PATH = DB_DIR / "coreguard.db"

def get_db_connection():
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS simulation_runs (
        id TEXT PRIMARY KEY,
        name TEXT,
        mode TEXT,
        num_cores INTEGER,
        status TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS processes (
        id TEXT PRIMARY KEY,
        run_id TEXT,
        name TEXT,
        cpu_demand REAL,
        memory REAL,
        cache_sensitivity TEXT,
        security_level TEXT,
        assigned_core INTEGER,
        state TEXT,
        arrival_time REAL,
        duration REAL,
        priority INTEGER,
        FOREIGN KEY (run_id) REFERENCES simulation_runs (id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS migration_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT,
        timestamp REAL,
        process_id TEXT,
        source_core INTEGER,
        dest_core INTEGER,
        migration_cost REAL,
        expected_benefit REAL,
        migration_score REAL,
        source_load_before REAL,
        source_load_after REAL,
        dest_load_before REAL,
        dest_load_after REAL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS prediction_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT,
        timestamp REAL,
        core_id INTEGER,
        current_load REAL,
        predicted_load REAL,
        overload_predicted INTEGER,
        confidence REAL,
        trend REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT,
        timestamp REAL,
        mode TEXT,
        max_cpu_load REAL,
        avg_cpu_utilization REAL,
        load_imbalance REAL,
        migrations_count INTEGER,
        total_overhead REAL,
        avg_response_time REAL,
        security_violations_prevented INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()
    conn.close()

def record_migration(data: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO migration_events (
        run_id, timestamp, process_id, source_core, dest_core,
        migration_cost, expected_benefit, migration_score,
        source_load_before, source_load_after, dest_load_before, dest_load_after, reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("runId", "default"),
        data.get("timestamp", 0.0),
        data.get("processId"),
        data.get("sourceCore"),
        data.get("destCore"),
        data.get("migrationCost", 0.0),
        data.get("expectedBenefit", 0.0),
        data.get("migrationScore", 0.0),
        data.get("sourceLoadBefore", 0.0),
        data.get("sourceLoadAfter", 0.0),
        data.get("destLoadBefore", 0.0),
        data.get("destLoadAfter", 0.0),
        data.get("reason", "Overload Relief")
    ))
    conn.commit()
    event_id = cursor.lastrowid
    conn.close()
    return event_id

def record_prediction(data: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO prediction_results (
        run_id, timestamp, core_id, current_load, predicted_load,
        overload_predicted, confidence, trend
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("runId", "default"),
        data.get("timestamp", 0.0),
        data.get("coreId"),
        data.get("currentLoad", 0.0),
        data.get("predictedLoad", 0.0),
        1 if data.get("overloadPredicted") else 0,
        data.get("confidence", 0.0),
        data.get("trend", 0.0)
    ))
    conn.commit()
    pred_id = cursor.lastrowid
    conn.close()
    return pred_id

def record_metrics(data: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO performance_metrics (
        run_id, timestamp, mode, max_cpu_load, avg_cpu_utilization,
        load_imbalance, migrations_count, total_overhead, avg_response_time,
        security_violations_prevented
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("runId", "default"),
        data.get("timestamp", 0.0),
        data.get("mode", "PREDICTIVE"),
        data.get("maxCpuLoad", 0.0),
        data.get("avgCpuUtilization", 0.0),
        data.get("loadImbalance", 0.0),
        data.get("migrationsCount", 0),
        data.get("totalOverhead", 0.0),
        data.get("avgResponseTime", 0.0),
        data.get("securityViolationsPrevented", 0)
    ))
    conn.commit()
    m_id = cursor.lastrowid
    conn.close()
    return m_id

def get_recent_migrations(limit: int = 50):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM migration_events ORDER BY id DESC LIMIT ?", (limit,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def get_performance_history():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM performance_metrics ORDER BY id DESC LIMIT 50")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows
