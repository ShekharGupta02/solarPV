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
  Cpu,
  Zap,
  Activity,
  Sliders,
  Flame,
  CheckCircle2,
  Layers
} from 'lucide-react';

export default function BoostLab() {
  const { scenario, setScenario, telemetry } = useSimulation();
  const { boost, pv } = telemetry;

  const [inductanceMh, setInductanceMh] = useState((scenario.boostConfig.inductanceH || 1.5e-3) * 1000);
  const [capacitanceUf, setCapacitanceUf] = useState((scenario.boostConfig.capacitanceF || 4700e-6) * 1e6);
  const [switchingFreqKhz, setSwitchingFreqKhz] = useState((scenario.boostConfig.switchingFreqHz || 5000) / 1000);
  const [vDcTarget, setVDcTarget] = useState(scenario.boostConfig.vDcTarget || 800);

  const handleConfigChange = (param, value) => {
    let updated = { ...scenario.boostConfig };
    if (param === 'L') {
      setInductanceMh(value);
      updated.inductanceH = value / 1000;
    } else if (param === 'C') {
      setCapacitanceUf(value);
      updated.capacitanceF = value / 1e6;
    } else if (param === 'F') {
      setSwitchingFreqKhz(value);
      updated.switchingFreqHz = value * 1000;
    } else if (param === 'V') {
      setVDcTarget(value);
      updated.vDcTarget = value;
    }
    setScenario(prev => ({ ...prev, boostConfig: updated }));
  };

  const waveforms = boost.waveforms || { timeMicroSec: [], iInductor: [], vSwitch: [], iDiode: [] };

  const waveformChartData = {
    labels: waveforms.timeMicroSec.map(t => `${t}µs`),
    datasets: [
      {
        label: 'Inductor Current i_L(t) [Amperes]',
        data: waveforms.iInductor,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        yAxisID: 'yCurrent',
        borderWidth: 2.5,
        tension: 0.1,
        pointRadius: 0
      },
      {
        label: 'Switch Voltage v_sw(t) [Volts]',
        data: waveforms.vSwitch,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.05)',
        yAxisID: 'yVoltage',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 0
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
        title: { display: true, text: 'Time (Microseconds)', color: '#94a3b8' },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono' }, maxTicksLimit: 10 }
      },
      yCurrent: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Inductor Current (A)', color: '#f59e0b' },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: { color: '#f59e0b', font: { family: 'JetBrains Mono' } }
      },
      yVoltage: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Switch Voltage (V)', color: '#06b6d4' },
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
              <Cpu className="w-5 h-5 text-orange-400" />
              DC-DC Boost Converter & Power Electronics Studio
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Continuous Conduction Mode (CCM), high-frequency PWM switching waveforms, ripple calculations, and semiconductor loss modeling.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Operation Mode:</span>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-mono font-bold">
              {boost.isCCM ? 'Continuous Conduction (CCM)' : 'Discontinuous Conduction (DCM)'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Waveform Scope & Converter Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Switched Waveform Oscilloscope */}
        <div className="lg:col-span-2 glass-panel p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              <h3 className="font-heading font-bold text-white text-sm">
                Switched-Mode Inductor & Switch Waveforms (2 Complete PWM Cycles)
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Duty Cycle D:</span>
              <span className="text-orange-400 font-bold">{boost.dutyCycle}</span>
            </div>
          </div>

          <div className="h-[340px] w-full">
            {waveforms.timeMicroSec?.length > 0 ? (
              <Line data={waveformChartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                Converter in Standby (Zero Solar Input)
              </div>
            )}
          </div>

          {/* Telemetry Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 text-xs font-mono">
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Mean Inductor Current:</span>
              <span className="font-bold text-amber-400 text-sm">{boost.inductorCurrentMeanA} A</span>
            </div>
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Inductor Ripple ΔIL:</span>
              <span className="font-bold text-orange-400 text-sm">±{boost.inductorCurrentRippleA} A</span>
            </div>
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Cap Voltage Ripple ΔVc:</span>
              <span className="font-bold text-cyan-400 text-sm">{boost.capVoltageRippleV} V ({boost.capVoltageRipplePercent}%)</span>
            </div>
            <div className="glass-card">
              <span className="text-slate-400 text-[10px] block">Converter Efficiency:</span>
              <span className="font-bold text-emerald-400 text-sm">{boost.efficiencyPercent}%</span>
            </div>
          </div>
        </div>

        {/* Converter Hardware Sizing & Loss Breakdown */}
        <div className="space-y-6">
          
          {/* Circuit Parameter Sizing */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center gap-2 text-orange-400 font-heading font-bold text-sm">
              <Sliders className="w-4 h-4" />
              <span>Circuit Hardware Sizing</span>
            </div>

            {/* Inductor L */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Boost Inductor (L):</span>
                <span className="text-orange-400 font-bold">{inductanceMh} mH</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={inductanceMh}
                onChange={(e) => handleConfigChange('L', parseFloat(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>

            {/* Capacitor C */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">DC Bus Capacitor (C):</span>
                <span className="text-orange-400 font-bold">{capacitanceUf} µF</span>
              </div>
              <input
                type="range"
                min="1000"
                max="10000"
                step="200"
                value={capacitanceUf}
                onChange={(e) => handleConfigChange('C', parseFloat(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>

            {/* Switching Frequency f_sw */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">PWM Switching Freq (f_sw):</span>
                <span className="text-orange-400 font-bold">{switchingFreqKhz} kHz</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="20.0"
                step="0.5"
                value={switchingFreqKhz}
                onChange={(e) => handleConfigChange('F', parseFloat(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>

            {/* DC Bus Target Voltage */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">DC Bus Regulated Target (V_dc):</span>
                <span className="text-orange-400 font-bold">{vDcTarget} V</span>
              </div>
              <input
                type="range"
                min="600"
                max="1200"
                step="25"
                value={vDcTarget}
                onChange={(e) => handleConfigChange('V', parseFloat(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>
          </div>

          {/* Loss Breakdown Card */}
          <div className="glass-panel p-5 space-y-3">
            <div className="flex items-center gap-2 text-red-400 font-heading font-bold text-sm">
              <Flame className="w-4 h-4" />
              <span>Thermal Loss Breakdown (Total: {boost.lossBreakdown.totalLossMW} MW)</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center p-2 rounded bg-white/5">
                <span className="text-slate-400">MOSFET Conduction Loss (I²·R_on·D):</span>
                <span className="text-white font-bold">{boost.lossBreakdown.conductionLossMW} MW</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-white/5">
                <span className="text-slate-400">Semiconductor Switching Loss (P_sw):</span>
                <span className="text-white font-bold">{boost.lossBreakdown.switchingLossMW} MW</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-white/5">
                <span className="text-slate-400">Inductor Core & Copper Loss (I²·R_L):</span>
                <span className="text-white font-bold">{boost.lossBreakdown.inductorLossMW} MW</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
