/**
 * API Service for Backend Communication (MERN Stack)
 */

const API_BASE = '/api';

export async function fetchScenarios() {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error('Failed to fetch scenarios');
  return res.json();
}

export async function saveScenario(scenarioData) {
  const res = await fetch(`${API_BASE}/scenarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenarioData)
  });
  if (!res.ok) throw new Error('Failed to save scenario');
  return res.json();
}

export async function deleteScenario(id) {
  const res = await fetch(`${API_BASE}/scenarios/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete scenario');
  return res.json();
}

export async function runFullSimulation(scenarioData) {
  const res = await fetch(`${API_BASE}/simulation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenarioData)
  });
  if (!res.ok) throw new Error('Failed to execute simulation');
  return res.json();
}

export async function fetchIvPvCurves(irradiance, ambientTemp, pvConfig) {
  const res = await fetch(`${API_BASE}/simulation/iv-pv-curve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ irradiance, ambientTemp, pvConfig })
  });
  if (!res.ok) throw new Error('Failed to compute I-V curves');
  return res.json();
}

export async function fetchBatteryDegradation(params) {
  const res = await fetch(`${API_BASE}/simulation/battery-degradation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Failed to project battery degradation');
  return res.json();
}

export async function runServerOptimization(scenarioData) {
  const res = await fetch(`${API_BASE}/optimizer/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenarioData)
  });
  if (!res.ok) throw new Error('Failed to run dispatch optimization');
  return res.json();
}
