import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import {
  Sun,
  BatteryCharging,
  Zap,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  AlertTriangle,
  FolderOpen,
  Cpu,
  Clock
} from 'lucide-react';

export default function Header({ onOpenScenarioModal }) {
  const {
    scenario,
    timeHour,
    setTimeHour,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    activeDisturbance,
    clearDisturbance,
    telemetry
  } = useSimulation();

  const formattedTime = () => {
    const hours = Math.floor(timeHour);
    const minutes = Math.floor((timeHour - hours) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <header className="border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,13,20,0.85)] backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        
        {/* Project Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 p-[1.5px] flex items-center justify-center shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-[#0d121c] rounded-[10px] flex items-center justify-center">
              <Sun className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-lg font-bold text-white tracking-tight">
                Solar<span className="text-amber-400">PV</span> + <span className="text-emerald-400">BESS</span> EMS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                EE v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate max-w-[280px] sm:max-w-md">
              {scenario.name}
            </p>
          </div>
        </div>

        {/* Disturbance Alert Banner if active */}
        {activeDisturbance && (
          <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/40 px-3 py-1.5 rounded-lg text-xs font-mono text-red-300 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>FAULT: {activeDisturbance.name}</span>
            <button
              onClick={clearDisturbance}
              className="ml-2 text-[10px] uppercase bg-red-500/30 hover:bg-red-500/50 px-2 py-0.5 rounded text-white font-bold"
            >
              Clear
            </button>
          </div>
        )}

        {/* Center/Right Simulation Time & Speed Controls */}
        <div className="flex items-center flex-wrap gap-3">
          
          {/* Time Display & Slider */}
          <div className="flex items-center gap-3 bg-[#111622] border border-[rgba(255,255,255,0.08)] px-3 py-1.5 rounded-xl">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-sm font-bold text-white min-w-[70px]">
              {formattedTime()}
            </span>
            <input
              type="range"
              min="0"
              max="23.9"
              step="0.1"
              value={timeHour}
              onChange={(e) => setTimeHour(parseFloat(e.target.value))}
              className="w-24 sm:w-36 accent-amber-500 cursor-pointer"
              title="Drag solar time-of-day"
            />
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-1 bg-[#111622] border border-[rgba(255,255,255,0.08)] p-1 rounded-xl">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-2 rounded-lg transition-colors ${
                isPlaying ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/5 text-slate-400'
              }`}
              title={isPlaying ? 'Pause Simulation Clock' : 'Run Simulation Clock'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setTimeHour(12.0)}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
              title="Reset to Solar Noon (12:00 PM)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Speed multipliers */}
            {[1, 5, 15, 60].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 text-xs font-mono rounded-lg transition-colors ${
                  speed === s ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Scenario Selector Button */}
          <button
            onClick={onOpenScenarioModal}
            className="flex items-center gap-2 bg-[#1a2336] hover:bg-[#222e48] border border-[rgba(255,255,255,0.12)] px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md"
          >
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Plant Presets</span>
          </button>
        </div>

      </div>
    </header>
  );
}
