import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Activity,
  Cpu,
  BookOpen
} from 'lucide-react';

export default function MpptLab() {
  const { scenario, setScenario, telemetry, historyBuffer } = useSimulation();
  const { mppt, pv } = telemetry;

  const [selectedAlgo, setSelectedAlgo] = useState(scenario.pvConfig.mpptAlgorithm || 'Incremental Conductance');
  const [stepSize, setStepSize] = useState(scenario.pvConfig.mpptStepSize || 0.005);

  const handleAlgoChange = (algo) => {
    setSelectedAlgo(algo);
    setScenario(prev => ({
      ...prev,
      pvConfig: { ...prev.pvConfig, mpptAlgorithm: algo }
    }));
  };

  const handleStepSizeChange = (val) => {
    setStepSize(val);
    setScenario(prev => ({
      ...prev,
      pvConfig: { ...prev.pvConfig, mpptStepSize: val }
    }));
  };

  // Oscilloscope chart data from real-time rolling history buffer
  const timeLabels = historyBuffer.map(h => h.time);
  const pvPowerHistory = historyBuffer.map(h => h.pvPowerMW);
  const dutyHistory = historyBuffer.map(h => h.pvPowerMW > 0 ? Number((0.45 + (100 - h.pvPowerMW) * 0.002).toFixed(3)) : 0);

  const mpptChartData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Extracted PV Power P_mppt (MW)',
        data: pvPowerHistory,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        yAxisID: 'yPower',
        borderWidth: 2.5,
        tension: 0.2,
        pointRadius: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { labels: { color: '#cbd5e1', font: { family: 'Plus Jakarta Sans', size: 12 } } },
      tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)' }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: { color: '#94a3b8', maxTicksLimit: 8, font: { family: 'JetBrains Mono' } }
      },
      yPower: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Power (MW)', color: '#f59e0b' },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: { color: '#f59e0b', font: { family: 'JetBrains Mono' } }
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              Maximum Power Point Tracking (MPPT) Laboratory
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Analyze tracking dynamics, step-response convergence, and steady-state oscillation between Incremental Conductance and Perturb & Observe.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Current Controller:</span>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-mono font-bold">
              {selectedAlgo}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Live Oscilloscope & Controller Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-Time Tracking Oscilloscope */}
        <div className="lg:col-span-2 glass-panel p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <h3 className="font-heading font-bold text-white text-sm">
                Real-Time MPPT Tracking Oscilloscope & Step Response
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Tracker Status:</span>
              <span className="text-emerald-400 font-bold">{mppt.statusText}</span>
            </div>
          </div>

          <div className="h-[340px] w-full">
            {historyBuffer.length > 2 ? (
              <Line data={mpptChartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                Gathering real-time tracking points...
              </div>
            )}
          </div>

          {/* Telemetry Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 text-xs font-mono">
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Extracted Power:</span>
              <span className="font-bold text-amber-400 text-sm">{mppt.powerMW} MW</span>
            </div>
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">True Peak P_max:</span>
              <span className="font-bold text-white text-sm">{mppt.pMppTrue} MW</span>
            </div>
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Tracking Efficiency:</span>
              <span className="font-bold text-emerald-400 text-sm">{mppt.trackingEfficiency}%</span>
            </div>
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Duty Cycle (D):</span>
              <span className="font-bold text-orange-400 text-sm">{mppt.dutyCycle}</span>
            </div>
          </div>
        </div>

        {/* Algorithm Control & Electrical Derivation */}
        <div className="space-y-6">
          
          {/* Algorithm Switcher */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-heading font-bold text-sm">
              <Sliders className="w-4 h-4" />
              <span>MPPT Algorithm Configuration</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-mono block">Tracking Method:</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleAlgoChange('Incremental Conductance')}
                  className={`p-3 rounded-xl text-left text-xs font-mono transition-all border ${
                    selectedAlgo === 'Incremental Conductance'
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-amber-300">Incremental Conductance</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    dI/dV = -I/V condition. Superior under rapid irradiance transients; zero steady-state oscillation at MPP.
                  </div>
                </button>

                <button
                  onClick={() => handleAlgoChange('Perturb & Observe')}
                  className={`p-3 rounded-xl text-left text-xs font-mono transition-all border ${
                    selectedAlgo === 'Perturb & Observe'
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-amber-300">Perturb & Observe (P&O)</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Hill climbing algorithm. Simple implementation; exhibits continuous small limit-cycle oscillations around MPP.
                  </div>
                </button>
              </div>
            </div>

            {/* Step Size Parameter */}
            <div className="pt-2">
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-300">Perturbation Step Size (ΔD):</span>
                <span className="text-amber-400 font-bold">{stepSize}</span>
              </div>
              <input
                type="range"
                min="0.001"
                max="0.02"
                step="0.001"
                value={stepSize}
                onChange={(e) => handleStepSizeChange(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.001 (Slow, Low Ripple)</span>
                <span>0.02 (Fast, High Oscillation)</span>
              </div>
            </div>
          </div>

          {/* Mathematical Derivation Box */}
          <div className="glass-panel p-5 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-heading font-bold text-sm">
              <BookOpen className="w-4 h-4" />
              <span>Mathematical Formulation</span>
            </div>
            <div className="text-xs text-slate-300 space-y-2 font-mono bg-black/40 p-3 rounded-xl border border-white/10">
              <div>P = V · I</div>
              <div>dP/dV = d(V·I)/dV = I + V · (dI/dV) = 0</div>
              <div className="text-amber-400 font-bold">⇒ dI/dV = -I/V (at Maximum Power Point)</div>
              <div className="pt-2 text-[11px] text-slate-400 border-t border-white/10 space-y-1">
                <div>• If dI/dV &gt; -I/V: Left of MPP (Increase V / Decrease D)</div>
                <div>• If dI/dV &lt; -I/V: Right of MPP (Decrease V / Increase D)</div>
                <div>• If dI/dV = -I/V: At Exact MPP (Hold Duty D)</div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
