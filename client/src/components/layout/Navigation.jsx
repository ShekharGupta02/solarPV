import React from 'react';
import {
  Activity,
  Sun,
  TrendingUp,
  Cpu,
  Battery,
  Zap,
  GitBranch,
  ShieldAlert,
  BarChart3,
  FileText
} from 'lucide-react';

export const LAB_TABS = [
  { id: 'sld', name: 'Live Plant (SLD)', icon: Activity, tag: 'Real-Time' },
  { id: 'pv', name: 'PV Array Studio', icon: Sun, tag: 'I-V / P-V' },
  { id: 'mppt', name: 'MPPT Lab', icon: TrendingUp, tag: 'IncCond / P&O' },
  { id: 'boost', name: 'DC-DC Boost', icon: Cpu, tag: 'PWM & Ripple' },
  { id: 'bess', name: 'BESS & ECM', icon: Battery, tag: 'SOC / Aging' },
  { id: 'inverter', name: 'VSC Inverter', icon: Zap, tag: 'dq0 & PLL' },
  { id: 'ems', name: 'Intelligent EMS', icon: GitBranch, tag: 'Sankey Flow' },
  { id: 'faults', name: 'Fault Matrix', icon: ShieldAlert, tag: 'LVRT / Outage' },
  { id: 'optimizer', name: '24h MILP Solver', icon: BarChart3, tag: 'Economics' },
  { id: 'report', name: 'Project Report', icon: FileText, tag: 'Formal PDF' }
];

export default function Navigation({ activeTab, setActiveTab }) {
  return (
    <nav className="border-b border-[rgba(255,255,255,0.06)] bg-[#0d121c]/70 backdrop-blur-md px-4 overflow-x-auto">
      <div className="max-w-7xl mx-auto flex items-center gap-1.5 py-2 min-w-max">
        {LAB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                isActive
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{tab.name}</span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                  isActive
                    ? 'bg-amber-400/20 text-amber-200'
                    : 'bg-white/5 text-slate-400'
                }`}
              >
                {tab.tag}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
