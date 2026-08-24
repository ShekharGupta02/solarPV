import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import {
  Sun,
  Battery,
  Zap,
  Radio,
  DollarSign,
  TrendingUp,
  Flame,
  CheckCircle2
} from 'lucide-react';

export default function LiveStatusBar() {
  const { telemetry } = useSimulation();
  const { environment, pv, bess, inverter, grid } = telemetry;

  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t border-[rgba(255,255,255,0.08)] bg-[#0a0d14]/90 backdrop-blur-lg z-40 px-4 py-2 text-xs font-mono">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Status Pills */}
        <div className="flex items-center flex-wrap gap-4">
          
          {/* Irradiance */}
          <div className="flex items-center gap-1.5 text-amber-400">
            <Sun className="w-3.5 h-3.5" />
            <span className="text-slate-400">G:</span>
            <span className="font-bold text-white">{environment.irradiance} W/m²</span>
            <span className="text-[10px] text-amber-500/80">({pv.cellTempC}°C)</span>
          </div>

          {/* PV Output */}
          <div className="flex items-center gap-1.5 text-amber-300">
            <span className="text-slate-400">P_pv:</span>
            <span className="font-bold text-amber-400">{pv.powerMW} MW</span>
          </div>

          {/* DC Bus */}
          <div className="flex items-center gap-1.5 text-orange-400">
            <span className="text-slate-400">V_dc:</span>
            <span className="font-bold text-white">800 V</span>
          </div>

          {/* Battery Status */}
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Battery className="w-3.5 h-3.5" />
            <span className="text-slate-400">BESS:</span>
            <span className={`font-bold ${bess.actualPowerMW < 0 ? 'text-cyan-400' : bess.actualPowerMW > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {bess.actualPowerMW > 0 ? `+${bess.actualPowerMW} MW (Disch)` : bess.actualPowerMW < 0 ? `${bess.actualPowerMW} MW (Chg)` : '0.0 MW'}
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded text-[10px]">
              {bess.soc}% SOC
            </span>
          </div>

          {/* Inverter AC */}
          <div className="flex items-center gap-1.5 text-purple-400">
            <Zap className="w-3.5 h-3.5" />
            <span className="text-slate-400">P_inv:</span>
            <span className="font-bold text-white">{inverter.activePowerAC_MW} MW</span>
            <span className="text-[10px] text-purple-300/80">PF {inverter.powerFactor}</span>
          </div>

          {/* Grid Net Exchange */}
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Radio className="w-3.5 h-3.5" />
            <span className="text-slate-400">Grid:</span>
            <span className={`font-bold ${grid.netPowerMW > 0 ? 'text-emerald-400' : grid.netPowerMW < 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {grid.netPowerMW > 0 ? `+${grid.netPowerMW} MW (Exp)` : grid.netPowerMW < 0 ? `${grid.netPowerMW} MW (Imp)` : '0.0 MW'}
            </span>
          </div>

          {/* Load */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-400">Load:</span>
            <span className="font-bold text-white">{environment.loadMW} MW</span>
          </div>

        </div>

        {/* Financial Flow */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Tariff:</span>
            <span className="text-amber-300 font-bold">${environment.tariff.buyPrice}/MWh</span>
          </div>
          <div className={`px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1 ${
            grid.hourlyRevenueRateUSD >= 0
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            <DollarSign className="w-3 h-3" />
            <span>{Math.abs(grid.hourlyRevenueRateUSD)}/hr {grid.hourlyRevenueRateUSD >= 0 ? 'Gain' : 'Cost'}</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
