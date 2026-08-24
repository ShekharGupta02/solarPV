import React, { useState } from 'react';
import { SimulationProvider } from './context/SimulationContext';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import LiveStatusBar from './components/layout/LiveStatusBar';
import SingleLineDiagram from './components/sld/SingleLineDiagram';
import PvStudio from './components/labs/PvStudio';
import MpptLab from './components/labs/MpptLab';
import BoostLab from './components/labs/BoostLab';
import BessLab from './components/labs/BessLab';
import InverterLab from './components/labs/InverterLab';
import EmsLab from './components/labs/EmsLab';
import FaultLab from './components/labs/FaultLab';
import OptimizerLab from './components/labs/OptimizerLab';
import EngineeringReport from './components/report/EngineeringReport';
import ScenarioManager from './components/scenarios/ScenarioManager';

function AppContent() {
  const [activeTab, setActiveTab] = useState('sld');
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);

  const renderActiveLab = () => {
    switch (activeTab) {
      case 'sld': return <SingleLineDiagram />;
      case 'pv': return <PvStudio />;
      case 'mppt': return <MpptLab />;
      case 'boost': return <BoostLab />;
      case 'bess': return <BessLab />;
      case 'inverter': return <InverterLab />;
      case 'ems': return <EmsLab />;
      case 'faults': return <FaultLab />;
      case 'optimizer': return <OptimizerLab />;
      case 'report': return <EngineeringReport />;
      default: return <SingleLineDiagram />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-[#0a0d14] text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Application Header */}
      <Header onOpenScenarioModal={() => setIsScenarioModalOpen(true)} />

      {/* Engineering Navigation Tabs */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Dynamic Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {renderActiveLab()}
      </main>

      {/* Persistent Bottom Telemetry Ribbon */}
      <LiveStatusBar />

      {/* Scenario Manager Modal */}
      <ScenarioManager
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <SimulationProvider>
      <AppContent />
    </SimulationProvider>
  );
}
