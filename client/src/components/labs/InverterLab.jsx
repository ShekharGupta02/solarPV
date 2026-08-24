import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  Zap,
  Activity,
  Sliders,
  Radio,
  Layers,
  Compass,
  CheckCircle2
} from 'lucide-react';

export default function InverterLab() {
  const { scenario, setScenario, telemetry } = useSimulation();
  const { inverter, environment } = telemetry;

  const [targetPF, setTargetPF] = useState(scenario.inverterConfig.targetPowerFactor || 1.0);
  const [reactiveDemandMVAr, setReactiveDemandMVAr] = useState(0);

  // 3-Phase AC Waveform chart
  const waveforms = inverter.threePhaseWaveforms || [];
  const waveformChartData = {
    labels: waveforms.map(w => `${w.angleDeg}°`),
    datasets: [
      {
        label: 'Phase A Voltage v_a(t)',
        data: waveforms.map(w => w.phaseA),
        borderColor: '#ef4444',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0
      },
      {
        label: 'Phase B Voltage v_b(t)',
        data: waveforms.map(w => w.phaseB),
        borderColor: '#f59e0b',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0
      },
      {
        label: 'Phase C Voltage v_c(t)',
        data: waveforms.map(w => w.phaseC),
        borderColor: '#3b82f6',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0
      },
      {
        label: 'Phase A Current i_a(t)',
        data: waveforms.map(w => w.currentA),
        borderColor: '#10b981',
        borderWidth: 2.5,
        borderDash: [4, 4],
        tension: 0.3,
        pointRadius: 0
      }
    ]
  };

  // FFT Harmonic Spectrum Chart
  const harmonicSpectrum = inverter.harmonicSpectrum || [];
  const harmonicChartData = {
    labels: harmonicSpectrum.map(h => h.harmonic),
    datasets: [
      {
        label: 'Harmonic Amplitude (% of Fundamental)',
        data: harmonicSpectrum.map(h => h.amplitudePercent),
        backgroundColor: harmonicSpectrum.map((h, i) => i === 0 ? 'rgba(139, 92, 246, 0.8)' : 'rgba(6, 182, 212, 0.6)'),
        borderColor: '#8b5cf6',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              Grid-Connected VSC Inverter & dq0 Vector Control Studio
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Synchronous Reference Frame dq-current control (Id for active power P, Iq for reactive power Q), SRF-PLL synchronization, and LCL harmonic filtering.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">PLL Status:</span>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              LOCKED ({inverter.pllFrequencyHz} Hz)
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 3-Phase Waveforms & Vector Control / FFT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 3-Phase AC Sinusoidal Waveforms */}
        <div className="lg:col-span-2 glass-panel p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <h3 className="font-heading font-bold text-white text-sm">
                3-Phase AC Grid Voltage & Phase-A Current Waveforms
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Power Factor:</span>
              <span className="text-purple-300 font-bold">{inverter.powerFactor} ({inverter.pfType})</span>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <Line
              data={waveformChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#cbd5e1', font: { family: 'Plus Jakarta Sans', size: 11 } } } },
                scales: {
                  x: { grid: { color: 'rgba(255, 255, 255, 0.06)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono' } } },
                  y: { grid: { color: 'rgba(255, 255, 255, 0.06)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono' } } }
                }
              }}
            />
          </div>

          {/* Telemetry Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 text-xs font-mono">
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">d-axis Active Current Id:</span>
              <span className="font-bold text-purple-400 text-sm">{inverter.currentId_A} A</span>
            </div>
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">q-axis Reactive Current Iq:</span>
              <span className="font-bold text-cyan-400 text-sm">{inverter.currentIq_A} A</span>
            </div>
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Apparent Power (S):</span>
              <span className="font-bold text-white text-sm">{inverter.apparentPowerMVA} MVA</span>
            </div>
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Total Harmonic Distortion:</span>
              <span className="font-bold text-emerald-400 text-sm">{inverter.thdPercent}% (IEEE 519 Pass)</span>
            </div>
          </div>
        </div>

        {/* Phasor Diagram & Vector Controls */}
        <div className="space-y-6">
          
          {/* Vector Phasor Representation */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center gap-2 text-purple-400 font-heading font-bold text-sm">
              <Compass className="w-4 h-4" />
              <span>dq0 Synchronous Phasor Diagram</span>
            </div>

            {/* Visual SVG Phasor Dial */}
            <div className="flex justify-center items-center py-2">
              <svg width="200" height="200" viewBox="-100 -100 200 200" className="bg-black/50 rounded-full border border-white/10">
                {/* Axes */}
                <line x1="-90" y1="0" x2="90" y2="0" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <line x1="0" y1="-90" x2="0" y2="90" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <text x="80" y="-5" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">d-axis</text>
                <text x="5" y="-80" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">q-axis</text>

                {/* Voltage Phasor V (along d-axis) */}
                <line x1="0" y1="0" x2="70" y2="0" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#arrow-gold)" />
                <circle cx="70" cy="0" r="4" fill="#f59e0b" />
                <text x="75" y="15" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">V_grid</text>

                {/* Current Phasor I (shifted by power factor angle) */}
                {(() => {
                  const angleRad = (inverter.phasorDiagram?.currentAngleDeg || 0) * (Math.PI / 180);
                  const ix = 65 * Math.cos(angleRad);
                  const iy = -65 * Math.sin(angleRad);
                  return (
                    <>
                      <line x1="0" y1="0" x2={ix} y2={iy} stroke="#10b981" strokeWidth="3" />
                      <circle cx={ix} cy={iy} r="4" fill="#10b981" />
                      <text x={ix + 8} y={iy} fill="#10b981" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">I_inj</text>
                    </>
                  );
                })()}
              </svg>
            </div>

            <div className="text-[11px] font-mono text-slate-300 space-y-1 bg-white/5 p-2.5 rounded-lg">
              <div className="flex justify-between">
                <span className="text-slate-400">P = 3/2 · Vd · Id:</span>
                <span className="text-purple-400 font-bold">{inverter.activePowerAC_MW} MW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Q = -3/2 · Vd · Iq:</span>
                <span className="text-cyan-400 font-bold">{inverter.reactivePowerAC_MVAr} MVAr</span>
              </div>
            </div>
          </div>

          {/* LCL Filter Harmonic Spectrum FFT */}
          <div className="glass-panel p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-heading font-bold text-sm">
                <Layers className="w-4 h-4" />
                <span>LCL Harmonic Filter FFT</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                f_res = {inverter.lclResonantFreqHz} Hz
              </span>
            </div>

            <div className="h-[140px] w-full">
              <Bar
                data={harmonicChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } }
                  }
                }}
              />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
