import os
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, mean_squared_error

def generate_simulation_dataset(n_samples: int = 5000, random_state: int = 42):
    np.random.seed(random_state)
    
    # Generate realistic multicore cloud server workload samples
    # Current load ranges from 15% to 98%
    current_load = np.random.uniform(15.0, 95.0, n_samples)
    
    # Delta / momentum of workload fluctuation
    delta = np.random.normal(loc=1.5, scale=4.0, size=n_samples)
    prev_load = np.clip(current_load - delta, 10.0, 100.0)
    
    trend = current_load - prev_load
    moving_avg = 0.6 * current_load + 0.4 * prev_load + np.random.normal(0, 1.5, n_samples)
    moving_avg = np.clip(moving_avg, 10.0, 100.0)
    
    # Number of processes assigned to this core
    process_count = np.random.randint(1, 7, size=n_samples)
    avg_process_load = current_load / np.maximum(process_count, 1)
    
    # Future load after 3-5 ticks with stochastic burstiness
    future_burst = np.where(
        (trend > 2.0) & (current_load > 75.0),
        np.random.uniform(5.0, 18.0, n_samples),
        np.random.normal(loc=0.5, scale=3.5, size=n_samples)
    )
    future_load = np.clip(current_load + (trend * 1.4) + future_burst, 10.0, 100.0)
    
    # Target: 1 if future load exceeds 88.0% threshold (imminent overload)
    overload_target = (future_load >= 88.0).astype(int)
    
    df = pd.DataFrame({
        'current_load': current_load,
        'prev_load': prev_load,
        'moving_avg': moving_avg,
        'trend': trend,
        'process_count': process_count,
        'avg_process_load': avg_process_load,
        'future_load': future_load,
        'overload_target': overload_target
    })
    return df

def train_and_save_model():
    ml_dir = Path(__file__).resolve().parent
    model_path = ml_dir / "model.pkl"
    
    print("[CoreGuard ML] Generating synthetic multicore telemetry dataset...")
    df = generate_simulation_dataset(n_samples=6000)
    
    feature_cols = ['current_load', 'prev_load', 'moving_avg', 'trend', 'process_count', 'avg_process_load']
    X = df[feature_cols]
    y_clf = df['overload_target']
    y_reg = df['future_load']
    
    X_train, X_test, y_train_clf, y_test_clf, y_train_reg, y_test_reg = train_test_split(
        X, y_clf, y_reg, test_size=0.2, random_state=42
    )
    
    print("[CoreGuard ML] Training Random Forest Classifier...")
    clf = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
    clf.fit(X_train, y_train_clf)
    
    print("[CoreGuard ML] Training Random Forest Regressor for projected load...")
    reg = RandomForestRegressor(n_estimators=80, max_depth=8, random_state=42)
    reg.fit(X_train, y_train_reg)
    
    test_acc = clf.score(X_test, y_test_clf)
    rmse = np.sqrt(mean_squared_error(y_test_reg, reg.predict(X_test)))
    print(f"[CoreGuard ML] Model trained. Accuracy: {test_acc*100:.2f}%, Load RMSE: {rmse:.2f}%")
    
    model_bundle = {
        'classifier': clf,
        'regressor': reg,
        'feature_cols': feature_cols,
        'metrics': {
            'accuracy': float(test_acc),
            'rmse': float(rmse)
        }
    }
    
    joblib.dump(model_bundle, model_path)
    print(f"[CoreGuard ML] Saved model bundle to {model_path}")
    return model_path

if __name__ == "__main__":
    train_and_save_model()
