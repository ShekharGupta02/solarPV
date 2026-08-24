import React, { useState, useEffect } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { fetchBatteryDegradation } from '../../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  Battery,
  BatteryCharging,
  Zap,
  Activity,
  Sliders,
  Thermometer,
  ShieldCheck,
  TrendingDown,
  RefreshCw
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function BessLab() {
  const { scenario, setScenario, telemetry } = useSimulation();
  const { bess } = telemetry;

  const [chemistry, setChemistry] = useState(scenario.bessConfig.cellChemistry || 'LFP (Lithium Iron Phosphate)');
  const [capacityMWh, setCapacityMWh] = useState(scenario.bessConfig.capacityMWh || 200);
  const [maxPowerMW, setMaxPowerMW] = useState(scenario.bessConfig.maxDischargePowerMW || 50);
  const [degradationData, setDegradationData] = useState([]);

  // Fetch or calculate 10-year degradation projection
  useEffect(() => {
    fetchBatteryDegradation({
      capacityMWh,
      chemistry,
      cyclesPerDay: 1.2,
      averageDoD: 75,
      averageCellTempC: bess.tempC || 28
    })
      .then(res => {
        if (res.success && res.data?.projection) {
          setDegradationData(res.data.projection);
        }
      })
      .catch(err => {
        // Fallback local projection calculation
        const localData = [];
        for (let y = 0; y <= 15; y++) {
          const soh = Math.max(60, 100 - (0.85 * Math.sqrt(y) * 1.1 + 0.0028 * Math.pow(y * 438, 0.55) * 15));
          localData.push({
            year: y,
            stateOfHealthPercent: Number(soh.toFixed(1)),
            effectiveCapacityMWh: Number((capacityMWh * (soh / 100)).toFixed(1)),
            internalResistanceMOhms: Number((15 * (1 + (100 - soh) * 0.015)).toFixed(2))
          });
        }
        setDegradationData(localData);
      });
  }, [capacityMWh, chemistry, bess.tempC]);

  const handleChemistryChange = (chem) => {
    setChemistry(chem);
    setScenario(prev => ({
      ...prev,
      bessConfig: { ...prev.bessConfig, cellChemistry: chem }
    }));
  };

  const handleCapacityChange = (cap) => {
    setCapacityMWh(cap);
    setScenario(prev => ({
      ...prev,
      bessConfig: { ...prev.bessConfig, capacityMWh: cap }
    }));
  };

  // Degradation Chart Data
  const degradationChartData = {
    labels: degradationData.map(d => `Yr ${d.year}`),
    datasets: [
      {
        label: 'State of Health SOH (%)',
        data: degradationData.map(d => d.stateOfHealthPercent),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        yAxisID: 'ySoh',
        borderWidth: 3,
        fill: true,
        tension: 0.3
      },
      {
        label: 'Effective Capacity (MWh)',
        data: degradationData.map(d => d.effectiveCapacityMWh),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.05)',
        yAxisID: 'yCap',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.3
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#cbd5e1', font: { family: 'Plus Jakarta Sans', size: 12 } } },
      tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)' }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono' } }
      },
      ySoh: {
        type: 'linear',
        position: 'left',
        min: 50,
        max: 105,
        title: { display: true, text: 'State of Health (%)', color: '#10b981' },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: { color: '#10b981', font: { family: 'JetBrains Mono' } }
      },
      yCap: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Capacity (MWh)', color: '#06b6d4' },
        grid: { drawOnChartArea: false },
        ticks: { color: '#06b6d4', font: { family: 'JetBrains Mono' } }
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
              <Battery className="w-5 h-5 text-emerald-400" />
              Battery Energy Storage System (BESS) & Health Studio
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Thevenin Equivalent Circuit Model (ECM), transient polarization dynamics, Coulomb-counting SOC, thermal dissipation, and 15-year lifecycle degradation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono">Converter State:</span>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-mono font-bold">
              {bess.converterMode}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Thevenin ECM Circuit Visualizer & Degradation Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Thevenin ECM Equivalent Circuit Card */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-heading font-bold text-sm">
              <Activity className="w-4 h-4" />
              <span>Thevenin ECM Model</span>
            </div>
            <span className="text-xs font-mono text-emerald-300 font-bold">
              SOC: {bess.soc}%
            </span>
          </div>

          {/* Schematic Diagram representation */}
          <div className="bg-black/40 border border-white/10 p-4 rounded-xl space-y-3 font-mono text-xs text-slate-300">
            <div className="flex justify-between items-center py-1 border-b border-white/10">
              <span className="text-slate-400">Open-Circuit Voltage Voc(SOC):</span>
              <span className="text-emerald-400 font-bold">{bess.openCircuitVoltageV} V</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/10">
              <span className="text-slate-400">Ohmic Resistance (R0 = 12mΩ):</span>
              <span className="text-white font-bold">{((bess.currentA * 0.012)).toFixed(1)} V Drop</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/10">
              <span className="text-slate-400">RC Polarization Voltage (V_RC):</span>
              <span className="text-cyan-400 font-bold">{bess.vPolarizationV} V (τ = 45s)</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/10">
              <span className="text-slate-400">Terminal Voltage V_term:</span>
              <span className="text-amber-400 font-bold text-sm">{bess.terminalVoltageV} V</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Battery Current I_bat:</span>
              <span className="text-white font-bold">{bess.currentA} A</span>
            </div>
          </div>

          {/* Thermal & C-rate meters */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="glass-card">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span>Cell Temperature:</span>
              </div>
              <span className="font-bold text-white text-base mt-1 block">{bess.tempC} °C</span>
              <span className="text-[10px] text-slate-500">Cooling Active (4.8 kW/K)</span>
            </div>

            <div className="glass-card">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Active C-Rate:</span>
              </div>
              <span className="font-bold text-cyan-400 text-base mt-1 block">{bess.cRateActual} C</span>
              <span className="text-[10px] text-slate-500">Max Limit 1.0 C</span>
            </div>
          </div>
        </div>

        {/* 15-Year Lifecycle Degradation Projection */}
        <div className="lg:col-span-2 glass-panel p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <h3 className="font-heading font-bold text-white text-sm">
                15-Year Capacity Fade & Degradation Profile ({chemistry})
              </h3>
            </div>

            <span className="text-xs font-mono text-slate-400">
              Warranty Threshold: 80% SOH
            </span>
          </div>

          <div className="h-[300px] w-full">
            {degradationData.length > 0 ? (
              <Line data={degradationChartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                Calculating degradation model...
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10 text-xs font-mono">
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Projected 10-Yr SOH:</span>
              <span className="font-bold text-emerald-400 text-sm">
                {degradationData[10]?.stateOfHealthPercent || 82.5}%
              </span>
            </div>
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Cumulative Throughput:</span>
              <span className="font-bold text-white text-sm">{bess.cumulativeThroughputMWh} MWh</span>
            </div>
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">End of Warranty (80%):</span>
              <span className="font-bold text-cyan-400 text-sm">
                Year {degradationData.find(d => d.stateOfHealthPercent < 80)?.year || '>15'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Sizing & Chemistry Configuration Controls */}
      <div className="glass-panel p-5">
        <div className="flex items-center gap-2 text-emerald-400 font-heading font-bold text-sm mb-4">
          <Sliders className="w-4 h-4" />
          <span>Battery Pack Sizing & Chemistry Architecture</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Chemistry Selection */}
          <div>
            <label className="text-xs text-slate-300 font-mono block mb-2">Cell Chemistry:</label>
            <div className="space-y-2">
              {[
                { id: 'LFP (Lithium Iron Phosphate)', name: 'LFP (LiFePO4)', desc: 'High thermal stability, 6000 cycles, safe & long lifespan.' },
                { id: 'NMC (Nickel Manganese Cobalt)', name: 'NMC (LiNiMnCoO2)', desc: 'High energy density, higher C-rate, 3500 cycles.' }
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => handleChemistryChange(c.id)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs font-mono border transition-all ${
                    chemistry === c.id
                      ? 'bg-emerald-500/20 border-emerald-500 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-emerald-300">{c.name}</div>
                  <div className="text-[10px] text-slate-400">{c.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Pack Storage Capacity */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-300">Pack Capacity:</span>
              <span className="text-emerald-400 font-bold">{capacityMWh} MWh</span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={capacityMWh}
              onChange={(e) => handleCapacityChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>10 MWh (Small)</span>
              <span>500 MWh (Giga-BESS)</span>
            </div>
          </div>

          {/* Maximum Inverter Charge/Discharge Power */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-300">Bi-directional Power Rating:</span>
              <span className="text-emerald-400 font-bold">±{maxPowerMW} MW</span>
            </div>
            <input
              type="range"
              min="5"
              max="150"
              step="5"
              value={maxPowerMW}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setMaxPowerMW(val);
                setScenario(prev => ({
                  ...prev,
                  bessConfig: { ...prev.bessConfig, maxChargePowerMW: val, maxDischargePowerMW: val }
                }));
              }}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>5 MW (0.1C)</span>
              <span>150 MW (High Power)</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
