import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { saveScenario, deleteScenario } from '../../services/api';
import {
  FolderOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  X,
  Sun,
  Battery,
  Zap,
  Building,
  Home,
  Hospital
} from 'lucide-react';

export default function ScenarioManager({ isOpen, onClose }) {
  const { scenario, scenariosList, setScenariosList, loadScenarioById, setScenario } = useSimulation();
  const [newScenarioName, setNewScenarioName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveCurrentAsCustom = async () => {
    if (!newScenarioName.trim()) return;
    setIsSaving(true);
    try {
      const customPayload = {
        ...scenario,
        name: newScenarioName,
        isPreset: false,
        category: 'Custom'
      };
      delete customPayload._id;

      const res = await saveScenario(customPayload);
      if (res.success && res.data) {
        setScenariosList(prev => [...prev, res.data]);
        setScenario(res.data);
        setNewScenarioName('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await deleteScenario(id);
      if (res.success) {
        setScenariosList(prev => prev.filter(s => s._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Utility-Scale': return Sun;
      case 'Commercial & Industrial': return Building;
      case 'Microgrid': return Hospital;
      case 'Residential': return Home;
      default: return Layers;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto border-white/20 shadow-2xl">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-white">
                Power Plant Scenario & Preset Manager
              </h3>
              <p className="text-xs text-slate-400">
                Load certified utility-scale benchmarks or save customized configurations to MongoDB.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenarios Grid */}
        <div className="space-y-3">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Available Scenarios ({scenariosList.length})
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scenariosList.map((s) => {
              const isSelected = scenario._id === s._id;
              const Icon = getCategoryIcon(s.category);
              return (
                <div
                  key={s._id}
                  onClick={() => {
                    loadScenarioById(s._id);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/60 shadow-md shadow-amber-500/10'
                      : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-amber-300 font-bold">
                          {s.category || 'Preset'}
                        </span>
                      </div>
                      {isSelected ? (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                        </span>
                      ) : !s.isPreset && (
                        <button
                          onClick={(e) => handleDelete(s._id, e)}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title="Delete Custom Scenario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <h4 className="font-heading font-bold text-white text-sm mb-1">
                      {s.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {s.description || 'Custom plant configuration with tuned PV, BESS, and Inverter sizing.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5 text-[10px] font-mono text-slate-300">
                    <div>PV: {s.pvConfig?.pNominalMW || 100} MW</div>
                    <div>BESS: {s.bessConfig?.capacityMWh || 200} MWh</div>
                    <div>V_dc: {s.boostConfig?.vDcTarget || 800} V</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Current Configuration as New Scenario */}
        <div className="glass-panel p-4 bg-black/40 border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold">
            <Plus className="w-4 h-4" />
            <span>Save Current Settings as Custom Scenario (MongoDB)</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="e.g. 50 MW Texas Solar + 100 MWh Storage"
              value={newScenarioName}
              onChange={(e) => setNewScenarioName(e.target.value)}
              className="glass-input flex-1 text-xs"
            />
            <button
              onClick={handleSaveCurrentAsCustom}
              disabled={isSaving || !newScenarioName.trim()}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save to Database'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
