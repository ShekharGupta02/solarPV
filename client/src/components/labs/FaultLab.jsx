import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { DISTURBANCE_PRESETS } from '../../simulation/faultSimulator';
import {
  ShieldAlert,
  CloudRain,
  ZapOff,
  TrendingDown,
  Activity,
  AlertTriangle,
  Play,
  CheckCircle2,
  Radio,
  Flame
} from 'lucide-react';

export default function FaultLab() {
  const { activeDisturbance, disturbanceTimer, triggerDisturbance, clearDisturbance, telemetry } = useSimulation();
  const { environment, pv, bess, inverter, grid } = telemetry;

  const presets = Object.values(DISTURBANCE_PRESETS);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Faults, Disturbances & Grid Code Compliance Matrix
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Inject dynamic physical disturbances: Cloud passage ramps, Low-Voltage Ride-Through (LVRT), Islanding blackout, and sudden motor load steps.
            </p>
          </div>

          {activeDisturbance ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/50 px-4 py-2 rounded-xl text-xs font-mono text-red-300 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="font-bold">TEST ACTIVE: {activeDisturbance.name} ({disturbanceTimer}s left)</span>
              </div>
              <button
                onClick={clearDisturbance}
                className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-mono font-bold transition-all"
              >
                End Test
              </button>
            </div>
          ) : (
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-mono font-bold">
              Grid State: Normal Steady-State
            </span>
          )}
        </div>
      </div>

      {/* Grid: Disturbance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {presets.map((p) => {
          const isActive = activeDisturbance?.id === p.id;
          return (
            <div
              key={p.id}
              className={`glass-panel p-5 flex flex-col justify-between transition-all border ${
                isActive
                  ? 'border-red-500 bg-red-950/30 shadow-lg shadow-red-500/20'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-red-400 font-heading font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{p.name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                    {p.durationSeconds}s Test
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-3">
                  {p.description}
                </p>

                <div className="bg-black/40 p-2.5 rounded-lg text-[11px] font-mono text-slate-400 space-y-1 mb-4 border border-white/5">
                  <span className="text-amber-300 font-bold block">Expected Engineering Response:</span>
                  <div>{p.expectedBehavior}</div>
                </div>
              </div>

              <button
                onClick={() => isActive ? clearDisturbance() : triggerDisturbance(p.id.toUpperCase())}
                className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isActive
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                    : 'bg-gradient-to-r from-red-500/20 to-orange-500/20 hover:from-red-500/30 hover:to-orange-500/30 text-red-300 border border-red-500/40'
                }`}
              >
                {isActive ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Test In Progress ({disturbanceTimer}s)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Inject Disturbance</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Live Disturbance Response Analysis Panel */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 text-white font-heading font-bold text-sm">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Real-Time Plant Dynamic Response Telemetry</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="glass-card">
            <span className="text-slate-400 text-[10px] block">Solar Irradiance G(t):</span>
            <span className={`font-bold text-base ${activeDisturbance?.id === 'cloud_passage' ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
              {environment.irradiance} W/m²
            </span>
          </div>

          <div className="glass-card">
            <span className="text-slate-400 text-[10px] block">BESS Active Power:</span>
            <span className={`font-bold text-base ${bess.actualPowerMW > 0 ? 'text-emerald-400' : bess.actualPowerMW < 0 ? 'text-cyan-400' : 'text-slate-300'}`}>
              {bess.actualPowerMW > 0 ? `+${bess.actualPowerMW} MW (Discharging)` : bess.actualPowerMW < 0 ? `${bess.actualPowerMW} MW (Charging)` : '0.00 MW'}
            </span>
          </div>

          <div className="glass-card">
            <span className="text-slate-400 text-[10px] block">Grid Voltage / Freq:</span>
            <span className={`font-bold text-base ${environment.gridVoltagePu < 0.9 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
              {environment.gridVoltagePu} pu / {environment.gridFrequencyHz} Hz
            </span>
          </div>

          <div className="glass-card">
            <span className="text-slate-400 text-[10px] block">Inverter Reactive Iq:</span>
            <span className={`font-bold text-base ${Math.abs(inverter.currentIq_A) > 10 ? 'text-purple-400' : 'text-slate-300'}`}>
              {inverter.currentIq_A} A ({inverter.reactivePowerAC_MVAr} MVAr)
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
