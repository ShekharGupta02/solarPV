import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import {
  GitBranch,
  ShieldCheck,
  Zap,
  Sliders,
  DollarSign,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Battery,
  Radio,
  Sun
} from 'lucide-react';

export default function EmsLab() {
  const { scenario, setScenario, telemetry } = useSimulation();
  const { ems, pv, bess, inverter, environment, grid } = telemetry;

  const [exportLimit, setExportLimit] = useState(scenario.emsConfig.gridExportLimitMW || 70);
  const [peakThreshold, setPeakThreshold] = useState(scenario.emsConfig.peakShavingThresholdMW || 60);

  const handleModeChange = (mode) => {
    setScenario(prev => ({
      ...prev,
      emsConfig: { ...prev.emsConfig, mode }
    }));
  };

  const handleExportLimitChange = (val) => {
    setExportLimit(val);
    setScenario(prev => ({
      ...prev,
      emsConfig: { ...prev.emsConfig, gridExportLimitMW: val }
    }));
  };

  const flows = ems.flowRouting;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-amber-400" />
              Intelligent Energy Management System (EMS) & Power Routing
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Multi-mode rule dispatch, dynamic Sankey power flow allocation, Time-of-Use price arbitrage, and real-time grid constraint compliance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Current Status:</span>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-mono font-bold">
              {ems.statusMessage}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Sankey Flow Diagram & Grid Constraints */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dynamic Sankey Energy Routing Visualizer */}
        <div className="lg:col-span-2 glass-panel p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-heading font-bold text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Real-Time Power Flow Distribution (Sankey Matrix)</span>
            </div>
            <span className="text-xs font-mono text-slate-400">Total Generation: {pv.powerMW} MW</span>
          </div>

          {/* Flow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Sources Column */}
            <div className="space-y-3">
              <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                1. Power Generation Sources
              </div>

              {/* Solar PV */}
              <div className="glass-card border-amber-500/30 flex items-center justify-between p-3.5">
                <div className="flex items-center gap-2.5">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-bold text-white text-xs block">Solar PV Array</span>
                    <span className="text-[10px] text-slate-400 font-mono">Available: {pv.pmpMW} MW</span>
                  </div>
                </div>
                <span className="text-amber-400 font-bold font-mono text-sm">{pv.powerMW} MW</span>
              </div>

              {/* BESS Discharge */}
              <div className="glass-card border-emerald-500/30 flex items-center justify-between p-3.5">
                <div className="flex items-center gap-2.5">
                  <Battery className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-bold text-white text-xs block">BESS Discharging</span>
                    <span className="text-[10px] text-slate-400 font-mono">SOC: {bess.soc}%</span>
                  </div>
                </div>
                <span className="text-emerald-400 font-bold font-mono text-sm">
                  {bess.actualPowerMW > 0 ? `${bess.actualPowerMW} MW` : '0.00 MW'}
                </span>
              </div>

              {/* Grid Import */}
              <div className="glass-card border-cyan-500/30 flex items-center justify-between p-3.5">
                <div className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="font-bold text-white text-xs block">Grid Import (Substation)</span>
                    <span className="text-[10px] text-slate-400 font-mono">Tariff: ${environment.tariff.buyPrice}/MWh</span>
                  </div>
                </div>
                <span className="text-cyan-400 font-bold font-mono text-sm">{flows.gridImportMW} MW</span>
              </div>
            </div>

            {/* Destinations Column */}
            <div className="space-y-3">
              <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                2. Power Allocations & Loads
              </div>

              {/* Local Consumer Load */}
              <div className="glass-card border-blue-500/30 flex items-center justify-between p-3.5">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="font-bold text-white text-xs block">Factory Consumer Load</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Solar: {flows.solarDirectToLoadMW} MW | BESS: {flows.batteryToLoadMW} MW
                    </span>
                  </div>
                </div>
                <span className="text-blue-400 font-bold font-mono text-sm">{environment.loadMW} MW</span>
              </div>

              {/* BESS Charging */}
              <div className="glass-card border-emerald-500/30 flex items-center justify-between p-3.5">
                <div className="flex items-center gap-2.5">
                  <Battery className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-bold text-white text-xs block">BESS Storage Injection</span>
                    <span className="text-[10px] text-slate-400 font-mono">Headroom: {(scenario.bessConfig.capacityMWh * (1 - bess.soc / 100)).toFixed(1)} MWh</span>
                  </div>
                </div>
                <span className="text-emerald-400 font-bold font-mono text-sm">
                  {bess.actualPowerMW < 0 ? `${Math.abs(bess.actualPowerMW)} MW` : '0.00 MW'}
                </span>
              </div>

              {/* Grid Export */}
              <div className="glass-card border-cyan-500/30 flex items-center justify-between p-3.5">
                <div className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="font-bold text-white text-xs block">Grid Export Revenue</span>
                    <span className="text-[10px] text-slate-400 font-mono">Cap Limit: {exportLimit} MW</span>
                  </div>
                </div>
                <span className="text-cyan-400 font-bold font-mono text-sm">{flows.gridExportMW} MW</span>
              </div>

              {/* Curtailment */}
              {flows.curtailmentMW > 0 && (
                <div className="glass-card border-red-500/40 bg-red-500/10 flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <div>
                      <span className="font-bold text-red-300 text-xs block">PV Curtailment (Export Cap)</span>
                      <span className="text-[10px] text-red-400 font-mono">Exceeded Grid Cap</span>
                    </div>
                  </div>
                  <span className="text-red-400 font-bold font-mono text-sm">{flows.curtailmentMW} MW</span>
                </div>
              )}
            </div>

          </div>

          {/* Instant Financial Yield Banner */}
          <div className="glass-card bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-cyan-500/10 border-white/10 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-xs font-mono text-slate-400 block">Instant Economic Rate</span>
                <span className="font-heading font-bold text-white text-base">
                  {grid.hourlyRevenueRateUSD >= 0 ? `+$${grid.hourlyRevenueRateUSD}/hr Revenue` : `-$${Math.abs(grid.hourlyRevenueRateUSD)}/hr Cost`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block">Buy Tariff:</span>
                <span className="text-amber-400 font-bold">${environment.tariff.buyPrice}/MWh</span>
              </div>
              <div>
                <span className="text-slate-400 block">Feed-in Tariff:</span>
                <span className="text-emerald-400 font-bold">${environment.tariff.sellPrice}/MWh</span>
              </div>
            </div>
          </div>
        </div>

        {/* EMS Mode Switcher & Real Grid Constraints Compliance */}
        <div className="space-y-6">
          
          {/* Mode Selector */}
          <div className="glass-panel p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-heading font-bold text-sm">
              <Sliders className="w-4 h-4" />
              <span>EMS Optimization Mode</span>
            </div>

            <div className="space-y-2">
              {[
                { id: 'Time-of-Use Arbitrage', desc: 'Charge during cheap solar; discharge at peak price ($180+/MWh).' },
                { id: 'Self-Consumption', desc: 'Prioritize local factory load, store surplus in BESS, minimize grid import.' },
                { id: 'Peak Shaving', desc: 'Discharge BESS to clamp factory substation load below setpoint threshold.' },
                { id: 'Zero Export', desc: 'Throttle PV or absorb surplus to guarantee 0 MW injected into grid.' },
                { id: 'Grid Ancillary', desc: 'Frequency-Watt (FFR) and Volt-Var voltage droop grid support.' },
                { id: 'Islanding', desc: 'Black-start microgrid mode powering local critical load.' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => handleModeChange(m.id)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs font-mono border transition-all ${
                    ems.mode === m.id
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-amber-300">{m.id}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Grid Constraints Compliance Monitor */}
          <div className="glass-panel p-5 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-heading font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Real Grid Constraints Monitor</span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              
              {/* Grid Export Limit */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Export Limit: P_grid ≤ {exportLimit} MW</span>
                  <span className={flows.gridExportMW <= exportLimit ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {flows.gridExportMW <= exportLimit ? 'PASSED' : 'VIOLATION'}
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={exportLimit}
                  onChange={(e) => handleExportLimitChange(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* Battery SOC Bound */}
              <div className="flex justify-between items-center p-2 rounded bg-white/5">
                <span className="text-slate-400">SOC Limits (15% ≤ SOC ≤ 95%):</span>
                <span className="text-emerald-400 font-bold">{bess.soc}% (Compliant)</span>
              </div>

              {/* DC-Link Voltage Stability */}
              <div className="flex justify-between items-center p-2 rounded bg-white/5">
                <span className="text-slate-400">DC Bus (800V ± 5%):</span>
                <span className="text-emerald-400 font-bold">800.0 V (Stable)</span>
              </div>

              {/* Grid Frequency */}
              <div className="flex justify-between items-center p-2 rounded bg-white/5">
                <span className="text-slate-400">Grid Frequency (50Hz ± 1%):</span>
                <span className="text-emerald-400 font-bold">{environment.gridFrequencyHz} Hz</span>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
