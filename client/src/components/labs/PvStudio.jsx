import React, { useState, useMemo } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { generateDetailedCurve } from '../../simulation/pvModel';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  Sun,
  Thermometer,
  Layers,
  Zap,
  Sliders,
  Maximize2,
  ShieldCheck,
  Grid
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function PvStudio() {
  const { scenario, setScenario, telemetry, shadingPattern, setShadingPattern } = useSimulation();
  const { pv } = telemetry;

  const [testIrradiance, setTestIrradiance] = useState(1000);
  const [testTemp, setTestTemp] = useState(25);
  const [isLiveSync, setIsLiveSync] = useState(true);

  const effectiveG = isLiveSync ? telemetry.environment.irradiance : testIrradiance;
  const effectiveT = isLiveSync ? telemetry.environment.ambientTemp : testTemp;

  // Generate curve points
  const curvePoints = useMemo(() => {
    return generateDetailedCurve(effectiveG, effectiveT, scenario.pvConfig, shadingPattern);
  }, [effectiveG, effectiveT, scenario.pvConfig, shadingPattern]);

  const voltages = curvePoints.map(p => p.voltage);
  const currents = curvePoints.map(p => p.current);
  const powers = curvePoints.map(p => p.powerMW);

  // Chart data configuration
  const ivPvData = {
    labels: voltages,
    datasets: [
      {
        label: 'I-V Curve (Current vs Voltage)',
        data: currents,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        yAxisID: 'yCurrent',
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.2
      },
      {
        label: 'P-V Curve (Power vs Voltage)',
        data: powers,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        yAxisID: 'yPower',
        borderWidth: 3,
        pointRadius: 0,
        fill: true,
        tension: 0.2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1',
          font: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: { family: 'JetBrains Mono', size: 12 },
        bodyFont: { family: 'JetBrains Mono', size: 12 },
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'PV Array Voltage V_pv (Volts)', color: '#94a3b8' },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono' } }
      },
      yCurrent: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Current I_pv (Amperes)', color: '#06b6d4' },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: { color: '#06b6d4', font: { family: 'JetBrains Mono' } }
      },
      yPower: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Power P_pv (Megawatts)', color: '#f59e0b' },
        grid: { drawOnChartArea: false },
        ticks: { color: '#f59e0b', font: { family: 'JetBrains Mono' } }
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Studio Header */}
      <div className="glass-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-400" />
              PV Array Physics & Characteristic Curves Studio
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Single-diode Shockley semiconductor physics, cell NOCT thermal dissipation, string sizing, and bypass diode partial shading simulation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLiveSync(!isLiveSync)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                isLiveSync
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              }`}
            >
              {isLiveSync ? '🟢 Live Clock Synced' : '⚪ Manual Sandbox Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart on Left, Physics & Shading Sandbox on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* I-V and P-V Curve Interactive Graph */}
        <div className="lg:col-span-2 glass-panel p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="font-heading font-bold text-white text-sm">
                I-V & P-V Characteristic Curves ({effectiveG} W/m², {effectiveT}°C)
              </h3>
            </div>

            {/* Live MPP Marker Card */}
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg text-xs font-mono text-amber-300">
              <span>● MPP:</span>
              <span className="font-bold">{pv.powerMW} MW</span>
              <span className="text-slate-400">({pv.voltage}V, {pv.current}A)</span>
            </div>
          </div>

          <div className="h-[360px] w-full">
            <Line data={ivPvData} options={chartOptions} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 text-xs font-mono">
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Open Circuit Voc:</span>
              <span className="font-bold text-white text-sm">{pv.voc} V</span>
            </div>
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Short Circuit Isc:</span>
              <span className="font-bold text-cyan-400 text-sm">{pv.isc} A</span>
            </div>
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Cell Temp (NOCT):</span>
              <span className="font-bold text-amber-400 text-sm">{pv.cellTempC} °C</span>
            </div>
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Fill Factor (FF):</span>
              <span className="font-bold text-emerald-400 text-sm">
                {pv.voc > 0 && pv.isc > 0 ? ((pv.powerMW * 1e6) / (pv.voc * pv.isc) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Environmental & Partial Shading Controls */}
        <div className="space-y-6">
          
          {/* Environmental Sliders */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-heading font-bold text-sm">
              <Sliders className="w-4 h-4" />
              <span>Environmental Conditions</span>
            </div>

            {/* Irradiance G */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-300">Solar Irradiance (G):</span>
                <span className="text-amber-400 font-bold">{effectiveG} W/m²</span>
              </div>
              <input
                type="range"
                min="50"
                max="1200"
                step="10"
                disabled={isLiveSync}
                value={testIrradiance}
                onChange={(e) => setTestIrradiance(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="text-[10px] text-slate-500">Standard Test Condition (STC) = 1000 W/m²</span>
            </div>

            {/* Ambient Temperature Tamb */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-300">Ambient Temp (Tamb):</span>
                <span className="text-amber-400 font-bold">{effectiveT} °C</span>
              </div>
              <input
                type="range"
                min="-10"
                max="50"
                step="1"
                disabled={isLiveSync}
                value={testTemp}
                onChange={(e) => setTestTemp(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="text-[10px] text-slate-500">NOCT = 45°C → Cell Temp = {pv.cellTempC}°C</span>
            </div>
          </div>

          {/* Partial Shading & Bypass Diode Sandbox */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-heading font-bold text-sm">
                <Grid className="w-4 h-4" />
                <span>Partial Shading Sandbox</span>
              </div>
              <button
                onClick={() => setShadingPattern([1.0, 1.0, 1.0])}
                className="text-[10px] font-mono text-slate-400 hover:text-white underline"
              >
                Reset Uniform
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Simulate cloud shadows across substrings. Bypass diodes activate to prevent hot-spots, creating multi-peak P-V curves.
            </p>

            {/* Substring 1 */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Substring 1 Exposure:</span>
                <span className="text-cyan-400 font-bold">{(shadingPattern[0] * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={shadingPattern[0]}
                onChange={(e) => setShadingPattern([parseFloat(e.target.value), shadingPattern[1], shadingPattern[2]])}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Substring 2 */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Substring 2 Exposure:</span>
                <span className="text-cyan-400 font-bold">{(shadingPattern[1] * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={shadingPattern[1]}
                onChange={(e) => setShadingPattern([shadingPattern[0], parseFloat(e.target.value), shadingPattern[2]])}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Substring 3 */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Substring 3 Exposure:</span>
                <span className="text-cyan-400 font-bold">{(shadingPattern[2] * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={shadingPattern[2]}
                onChange={(e) => setShadingPattern([shadingPattern[0], shadingPattern[1], parseFloat(e.target.value)])}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Quick Shading Presets */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setShadingPattern([1.0, 0.4, 0.2])}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] font-mono text-cyan-300 border border-white/10"
              >
                Severe Shading
              </button>
              <button
                onClick={() => setShadingPattern([1.0, 0.7, 0.5])}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] font-mono text-cyan-300 border border-white/10"
              >
                Moderate Shading
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
