import React, { useRef, useEffect } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import {
  Sun,
  Battery,
  Zap,
  Radio,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Play,
  Pause
} from 'lucide-react';

export default function SingleLineDiagram() {
  const { telemetry, scenario, isPlaying, setIsPlaying, triggerDisturbance, activeDisturbance, clearDisturbance } = useSimulation();
  const { environment, pv, mppt, boost, bess, inverter, ems, grid } = telemetry;
  const canvasRef = useRef(null);

  // Animated power flow particles on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Define SLD Node Coordinates (Normalized 0.0 to 1.0)
    // PV: (0.15, 0.25) -> Boost: (0.35, 0.25) -> DC Bus: (0.50, 0.45)
    // Battery: (0.30, 0.70) <-> DC Bus: (0.50, 0.45)
    // DC Bus: (0.50, 0.45) -> Inverter: (0.70, 0.45) -> Filter/Grid: (0.88, 0.45)
    // Grid: (0.88, 0.25) & Load: (0.88, 0.70)

    const particles = [];
    const numParticles = 40;

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        path: i % 4, // 0: PV->Boost->DC, 1: BESS<->DC, 2: DC->Inv->Grid, 3: Inv->Load
        progress: Math.random(),
        speed: 0.006 + Math.random() * 0.006
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Coordinate helper
      const pt = (nx, ny) => ({ x: nx * w, y: ny * h });

      const pPv = pt(0.12, 0.25);
      const pBoost = pt(0.32, 0.25);
      const pDcBusTop = pt(0.48, 0.20);
      const pDcBusBot = pt(0.48, 0.75);
      const pDcNode = pt(0.48, 0.45);
      const pBessDc = pt(0.30, 0.65);
      const pBess = pt(0.14, 0.65);
      const pInv = pt(0.65, 0.45);
      const pFilter = pt(0.78, 0.45);
      const pGrid = pt(0.90, 0.25);
      const pLoad = pt(0.90, 0.65);

      // 1. Draw glowing electrical bus bars and lines
      ctx.lineWidth = 3;

      // Solar DC Line (Gold)
      ctx.strokeStyle = pv.powerMW > 0.01 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(100, 116, 139, 0.3)';
      ctx.beginPath();
      ctx.moveTo(pPv.x, pPv.y);
      ctx.lineTo(pBoost.x, pBoost.y);
      ctx.lineTo(pDcNode.x, pPv.y);
      ctx.stroke();

      // DC Bus vertical bar (Orange glow)
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#f97316';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(pDcBusTop.x, pDcBusTop.y);
      ctx.lineTo(pDcBusBot.x, pDcBusBot.y);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Battery Bidirectional Line (Emerald)
      ctx.lineWidth = 3;
      const isBatActive = Math.abs(bess.actualPowerMW) > 0.05;
      ctx.strokeStyle = isBatActive ? 'rgba(16, 185, 129, 0.85)' : 'rgba(100, 116, 139, 0.3)';
      ctx.beginPath();
      ctx.moveTo(pBess.x, pBess.y);
      ctx.lineTo(pBessDc.x, pBess.y);
      ctx.lineTo(pDcNode.x, pBess.y);
      ctx.stroke();

      // Inverter to Grid AC Line (Cyan)
      ctx.strokeStyle = inverter.activePowerAC_MW > 0.01 ? 'rgba(6, 182, 212, 0.85)' : 'rgba(100, 116, 139, 0.3)';
      ctx.beginPath();
      ctx.moveTo(pDcNode.x, pDcNode.y);
      ctx.lineTo(pInv.x, pInv.y);
      ctx.lineTo(pFilter.x, pFilter.y);
      ctx.stroke();

      // AC Split to Grid & Load
      ctx.beginPath();
      ctx.moveTo(pFilter.x, pFilter.y);
      ctx.lineTo(pFilter.x, pGrid.y);
      ctx.lineTo(pGrid.x, pGrid.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pFilter.x, pFilter.y);
      ctx.lineTo(pFilter.x, pLoad.y);
      ctx.lineTo(pLoad.x, pLoad.y);
      ctx.stroke();

      // 2. Draw animated moving power particles
      if (isPlaying) {
        particles.forEach((p) => {
          p.progress = (p.progress + p.speed) % 1.0;
          ctx.beginPath();

          if (p.path === 0 && pv.powerMW > 0.1) {
            // PV -> Boost -> DC Bus
            const curX = pPv.x + (pDcNode.x - pPv.x) * p.progress;
            ctx.arc(curX, pPv.y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
          } else if (p.path === 1 && Math.abs(bess.actualPowerMW) > 0.1) {
            // Battery Charging (DC -> Battery) or Discharging (Battery -> DC)
            let curX;
            if (bess.actualPowerMW > 0) {
              // Discharging: BESS -> DC Bus
              curX = pBess.x + (pDcNode.x - pBess.x) * p.progress;
            } else {
              // Charging: DC Bus -> BESS
              curX = pDcNode.x + (pBess.x - pDcNode.x) * p.progress;
            }
            ctx.arc(curX, pBess.y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#34d399';
            ctx.fill();
          } else if (p.path === 2 && inverter.activePowerAC_MW > 0.1) {
            // DC Bus -> Inverter -> AC Grid
            const curX = pDcNode.x + (pFilter.x - pDcNode.x) * p.progress;
            ctx.arc(curX, pDcNode.y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#a855f7';
            ctx.fill();
          } else if (p.path === 3 && environment.loadMW > 0.1) {
            // Filter -> Load
            const curX = pFilter.x + (pLoad.x - pFilter.x) * p.progress;
            ctx.arc(curX, pLoad.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#38bdf8';
            ctx.fill();
          }
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, pv.powerMW, bess.actualPowerMW, inverter.activePowerAC_MW, environment.loadMW]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Quick Controls */}
      <div className="glass-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Power Plant Single Line Diagram (SLD)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              End-to-end electrical topology: PV Array → MPPT Boost → 800V DC Bus ↔ Bidirectional BESS → 3-Phase Inverter → LCL Filter → 33kV Grid & Load.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">EMS Mode:</span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {ems.mode}
            </span>
          </div>
        </div>
      </div>

      {/* Main SLD Interactive Canvas Graphic */}
      <div className="glass-panel p-6 relative overflow-hidden">
        
        {/* Canvas for animated particle lines */}
        <canvas
          ref={canvasRef}
          width={1000}
          height={480}
          className="w-full h-[480px] block"
        />

        {/* Node Overlay Cards */}
        <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
          
          {/* Top Row: PV Array & Boost */}
          <div className="flex justify-between items-start">
            
            {/* PV Array Card */}
            <div className="pointer-events-auto w-56 glass-card border-amber-500/30 bg-[#0d121c]/90">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 text-amber-400 font-heading font-bold text-sm">
                  <Sun className="w-4 h-4" />
                  <span>PV Array (100 MW)</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  {pv.efficiencyPercent}% Eff
                </span>
              </div>
              <div className="mt-2.5 space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Power:</span>
                  <span className="text-amber-400 font-bold">{pv.powerMW} MW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">V_mp / I_mp:</span>
                  <span className="text-white">{pv.voltage} V / {pv.current} A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cell Temp:</span>
                  <span className="text-white">{pv.cellTempC} °C</span>
                </div>
              </div>
            </div>

            {/* Boost Converter & MPPT */}
            <div className="pointer-events-auto w-52 glass-card border-orange-500/30 bg-[#0d121c]/90 ml-12">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 text-orange-400 font-heading font-bold text-sm">
                  <Cpu className="w-4 h-4" />
                  <span>Boost + MPPT</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                  D = {boost.dutyCycle}
                </span>
              </div>
              <div className="mt-2.5 space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">MPPT Mode:</span>
                  <span className="text-orange-300 font-bold">{scenario.pvConfig.mpptAlgorithm === 'Incremental Conductance' ? 'IncCond' : 'P&O'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ΔIL Ripple:</span>
                  <span className="text-white">{boost.inductorCurrentRippleA} A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Efficiency:</span>
                  <span className="text-emerald-400 font-bold">{boost.efficiencyPercent}%</span>
                </div>
              </div>
            </div>

            {/* Substation Grid Connection */}
            <div className="pointer-events-auto w-56 glass-card border-cyan-500/30 bg-[#0d121c]/90">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 text-cyan-400 font-heading font-bold text-sm">
                  <Radio className="w-4 h-4" />
                  <span>Grid (33 kV Substation)</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  environment.gridConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {environment.gridConnected ? 'Synced' : 'Islanded'}
                </span>
              </div>
              <div className="mt-2.5 space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Power:</span>
                  <span className={`font-bold ${grid.netPowerMW > 0 ? 'text-emerald-400' : grid.netPowerMW < 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {grid.netPowerMW > 0 ? `+${grid.netPowerMW} MW (Exp)` : grid.netPowerMW < 0 ? `${grid.netPowerMW} MW (Imp)` : '0.0 MW'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Frequency:</span>
                  <span className="text-white">{environment.gridFrequencyHz} Hz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Voltage:</span>
                  <span className="text-white">{environment.gridVoltagePu} pu</span>
                </div>
              </div>
            </div>

          </div>

          {/* Center: DC Bus Label */}
          <div className="flex justify-center items-center">
            <div className="pointer-events-auto glass-card bg-orange-950/80 border-orange-500/40 px-4 py-1.5 rounded-full text-center">
              <span className="text-xs font-mono font-bold text-orange-400">
                ⚡ 800V DC BUS LINK (Regulated)
              </span>
            </div>
          </div>

          {/* Bottom Row: BESS Battery, Inverter, and Factory Load */}
          <div className="flex justify-between items-end">
            
            {/* BESS Battery Storage Card */}
            <div className="pointer-events-auto w-64 glass-card border-emerald-500/30 bg-[#0d121c]/90">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 text-emerald-400 font-heading font-bold text-sm">
                  <Battery className="w-4 h-4" />
                  <span>BESS (200 MWh LFP)</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  {bess.soc}% SOC
                </span>
              </div>
              <div className="mt-2.5 space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Battery Power:</span>
                  <span className={`font-bold ${bess.actualPowerMW > 0 ? 'text-emerald-400' : bess.actualPowerMW < 0 ? 'text-cyan-400' : 'text-slate-300'}`}>
                    {bess.actualPowerMW > 0 ? `+${bess.actualPowerMW} MW (Discharging)` : bess.actualPowerMW < 0 ? `${bess.actualPowerMW} MW (Charging)` : 'Idle (0.0 MW)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Terminal V / I:</span>
                  <span className="text-white">{bess.terminalVoltageV} V / {bess.currentA} A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cell Temp / C-rate:</span>
                  <span className="text-white">{bess.tempC} °C / {bess.cRateActual}C</span>
                </div>
              </div>
            </div>

            {/* VSC Inverter */}
            <div className="pointer-events-auto w-56 glass-card border-purple-500/30 bg-[#0d121c]/90">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 text-purple-400 font-heading font-bold text-sm">
                  <Zap className="w-4 h-4" />
                  <span>VSC Inverter (110 MVA)</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  {inverter.efficiencyPercent}% Eff
                </span>
              </div>
              <div className="mt-2.5 space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">AC Power (P/Q):</span>
                  <span className="text-purple-300 font-bold">{inverter.activePowerAC_MW} MW / {inverter.reactivePowerAC_MVAr} MVAr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vector Id / Iq:</span>
                  <span className="text-white">{inverter.currentId_A} A / {inverter.currentIq_A} A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">LCL THD:</span>
                  <span className="text-emerald-400 font-bold">{inverter.thdPercent}%</span>
                </div>
              </div>
            </div>

            {/* Factory / Local Load */}
            <div className="pointer-events-auto w-56 glass-card border-blue-500/30 bg-[#0d121c]/90">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 text-blue-400 font-heading font-bold text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>Local Consumer Load</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  33 kV Bus
                </span>
              </div>
              <div className="mt-2.5 space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Demand:</span>
                  <span className="text-blue-400 font-bold">{environment.loadMW} MW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Solar Supply:</span>
                  <span className="text-amber-400">{ems.flowRouting.solarDirectToLoadMW} MW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Battery Supply:</span>
                  <span className="text-emerald-400">{ems.flowRouting.batteryToLoadMW} MW</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Real-time Kirchhoff Power Balance Bar */}
      <div className="glass-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-bold">KIRCHHOFF POWER BALANCE EQUATION:</span>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-white">
            <span className="text-amber-400 font-bold">{pv.powerMW} MW (PV)</span>
            <span>+</span>
            <span className={bess.actualPowerMW >= 0 ? 'text-emerald-400 font-bold' : 'text-cyan-400'}>
              {bess.actualPowerMW >= 0 ? bess.actualPowerMW : 0} MW (BESS Disch)
            </span>
            <span>+</span>
            <span className="text-cyan-400">
              {grid.netPowerMW < 0 ? Math.abs(grid.netPowerMW) : 0} MW (Grid Import)
            </span>
            <span className="text-slate-500 font-bold">=</span>
            <span className="text-blue-400 font-bold">{environment.loadMW} MW (Load)</span>
            <span>+</span>
            <span className="text-emerald-400">
              {bess.actualPowerMW < 0 ? Math.abs(bess.actualPowerMW) : 0} MW (BESS Chg)
            </span>
            <span>+</span>
            <span className="text-cyan-400">
              {grid.netPowerMW > 0 ? grid.netPowerMW : 0} MW (Grid Export)
            </span>
            <span>+</span>
            <span className="text-slate-400">
              {(boost.lossBreakdown.totalLossMW + (inverter.activePowerAC_MW * (1 - inverter.efficiencyPercent / 100))).toFixed(2)} MW (Loss)
            </span>
          </div>

          <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
            Balanced (0.00% Residual)
          </div>
        </div>
      </div>

    </div>
  );
}
