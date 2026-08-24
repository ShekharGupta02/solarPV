import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { calculatePvOperatingPoint } from '../simulation/pvModel';
import { MpptTracker } from '../simulation/mpptController';
import { calculateBoostState } from '../simulation/boostConverter';
import { BessSimulator } from '../simulation/bessModel';
import { InverterSimulator } from '../simulation/inverterModel';
import { executeEmsDispatch } from '../simulation/emsEngine';
import { DISTURBANCE_PRESETS } from '../simulation/faultSimulator';
import { fetchScenarios, saveScenario } from '../services/api';

const SimulationContext = createContext(null);

const DEFAULT_SCENARIO = {
  _id: 'preset-100mw-utility',
  name: '100 MW Utility-Scale PV + 200 MWh BESS (Nevada Grid)',
  description: 'High-voltage transmission grid connected plant with 2-hour storage, incremental conductance MPPT, and Time-of-Use price arbitrage dispatch.',
  category: 'Utility-Scale',
  isPreset: true,
  pvConfig: {
    pNominalMW: 100,
    vMp: 41.5,
    iMp: 13.25,
    vOc: 49.8,
    iSc: 14.1,
    tempCoeffVoc: -0.28,
    tempCoeffIsc: 0.048,
    modulesSeries: 24,
    stringsParallel: 7500,
    noct: 45,
    mpptAlgorithm: 'Incremental Conductance',
    mpptStepSize: 0.005
  },
  boostConfig: {
    inductanceH: 1.5e-3,
    capacitanceF: 4700e-6,
    switchingFreqHz: 5000,
    vDcTarget: 800
  },
  bessConfig: {
    capacityMWh: 200,
    maxChargePowerMW: 50,
    maxDischargePowerMW: 50,
    initialSoc: 50,
    socMin: 15,
    socMax: 95,
    efficiencyRoundTrip: 92,
    cRate: 0.5,
    cellChemistry: 'LFP (Lithium Iron Phosphate)'
  },
  inverterConfig: {
    ratedPowerMVA: 110,
    vGridLineRMS: 33000,
    gridFrequencyHz: 50,
    targetPowerFactor: 1.0,
    lcl_L1_H: 0.15e-3,
    lcl_L2_H: 0.08e-3,
    lcl_C_F: 120e-6
  },
  emsConfig: {
    mode: 'Time-of-Use Arbitrage',
    gridExportLimitMW: 70,
    gridImportLimitMW: 100,
    peakShavingThresholdMW: 60,
    tariffSchedule: [
      { hour: 0, buyPrice: 45, sellPrice: 32 },
      { hour: 1, buyPrice: 40, sellPrice: 28 },
      { hour: 2, buyPrice: 38, sellPrice: 25 },
      { hour: 3, buyPrice: 38, sellPrice: 25 },
      { hour: 4, buyPrice: 42, sellPrice: 30 },
      { hour: 5, buyPrice: 55, sellPrice: 38 },
      { hour: 6, buyPrice: 75, sellPrice: 52 },
      { hour: 7, buyPrice: 85, sellPrice: 60 },
      { hour: 8, buyPrice: 90, sellPrice: 65 },
      { hour: 9, buyPrice: 80, sellPrice: 55 },
      { hour: 10, buyPrice: 70, sellPrice: 45 },
      { hour: 11, buyPrice: 65, sellPrice: 40 },
      { hour: 12, buyPrice: 60, sellPrice: 38 },
      { hour: 13, buyPrice: 60, sellPrice: 38 },
      { hour: 14, buyPrice: 65, sellPrice: 42 },
      { hour: 15, buyPrice: 80, sellPrice: 55 },
      { hour: 16, buyPrice: 110, sellPrice: 80 },
      { hour: 17, buyPrice: 165, sellPrice: 125 },
      { hour: 18, buyPrice: 195, sellPrice: 150 },
      { hour: 19, buyPrice: 210, sellPrice: 165 },
      { hour: 20, buyPrice: 180, sellPrice: 140 },
      { hour: 21, buyPrice: 140, sellPrice: 105 },
      { hour: 22, buyPrice: 85, sellPrice: 60 },
      { hour: 23, buyPrice: 60, sellPrice: 42 }
    ]
  },
  environment: {
    irradianceProfile: [0, 0, 0, 0, 0, 45, 180, 420, 680, 890, 990, 1020, 980, 870, 690, 460, 220, 60, 0, 0, 0, 0, 0, 0],
    ambientTempProfile: [18, 17, 16, 16, 17, 19, 22, 25, 28, 31, 33, 34, 34, 33, 31, 29, 27, 24, 22, 20, 19, 19, 18, 18],
    loadProfile: [30, 28, 26, 26, 28, 35, 48, 62, 70, 75, 78, 80, 78, 76, 74, 72, 75, 82, 88, 85, 75, 60, 45, 35]
  }
};

export function SimulationProvider({ children }) {
  const [scenario, setScenario] = useState(DEFAULT_SCENARIO);
  const [scenariosList, setScenariosList] = useState([DEFAULT_SCENARIO]);
  const [timeHour, setTimeHour] = useState(12.0); // 12:00 PM default noon
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1); // 1x, 5x, 15x, 60x
  const [activeDisturbance, setActiveDisturbance] = useState(null);
  const [disturbanceTimer, setDisturbanceTimer] = useState(0);
  const [shadingPattern, setShadingPattern] = useState([1.0, 1.0, 1.0]); // 3 substrings

  // Instantiate physical simulation objects
  const mpptTrackerRef = useRef(new MpptTracker('Incremental Conductance', 0.005));
  const bessSimulatorRef = useRef(new BessSimulator(DEFAULT_SCENARIO.bessConfig));
  const inverterSimulatorRef = useRef(new InverterSimulator(DEFAULT_SCENARIO.inverterConfig));

  // Rolling telemetry buffer for real-time oscilloscope graphs
  const [historyBuffer, setHistoryBuffer] = useState([]);

  // Fetch scenarios from API on load
  useEffect(() => {
    fetchScenarios()
      .then(res => {
        if (res.success && res.data?.length) {
          setScenariosList(res.data);
        }
      })
      .catch(err => console.log('Using local presets fallback:', err.message));
  }, []);

  // Update simulator instances when scenario changes
  useEffect(() => {
    mpptTrackerRef.current = new MpptTracker(
      scenario.pvConfig.mpptAlgorithm || 'Incremental Conductance',
      scenario.pvConfig.mpptStepSize || 0.005
    );
    bessSimulatorRef.current = new BessSimulator(scenario.bessConfig);
    inverterSimulatorRef.current = new InverterSimulator(scenario.inverterConfig);
  }, [scenario]);

  // Compute interpolated environment inputs based on fractional hour
  const hFloor = Math.floor(timeHour) % 24;
  const hCeil = (hFloor + 1) % 24;
  const hFrac = timeHour - Math.floor(timeHour);

  const irradArr = scenario.environment.irradianceProfile || DEFAULT_SCENARIO.environment.irradianceProfile;
  const tempArr = scenario.environment.ambientTempProfile || DEFAULT_SCENARIO.environment.ambientTempProfile;
  const loadArr = scenario.environment.loadProfile || DEFAULT_SCENARIO.environment.loadProfile;

  let baseIrradiance = irradArr[hFloor] + (irradArr[hCeil] - irradArr[hFloor]) * hFrac;
  let baseTemp = tempArr[hFloor] + (tempArr[hCeil] - tempArr[hFloor]) * hFrac;
  let baseLoad = loadArr[hFloor] + (loadArr[hCeil] - loadArr[hFloor]) * hFrac;

  // Apply active disturbance modifications
  let effectiveIrradiance = baseIrradiance;
  let effectiveGridVoltagePu = 1.0;
  let effectiveGridFreqHz = 50.0;
  let effectiveGridConnected = true;
  let effectiveLoadMW = baseLoad;

  if (activeDisturbance) {
    if (activeDisturbance.targetIrradiance !== undefined) effectiveIrradiance = activeDisturbance.targetIrradiance;
    if (activeDisturbance.gridVoltagePu !== undefined) effectiveGridVoltagePu = activeDisturbance.gridVoltagePu;
    if (activeDisturbance.gridFrequencyHz !== undefined) effectiveGridFreqHz = activeDisturbance.gridFrequencyHz;
    if (activeDisturbance.gridConnected !== undefined) effectiveGridConnected = activeDisturbance.gridConnected;
    if (activeDisturbance.loadMultiplier !== undefined) effectiveLoadMW = baseLoad * activeDisturbance.loadMultiplier;
  }

  // 1. PV Physical Operating Point
  const pvPoint = useMemo(() => {
    return calculatePvOperatingPoint(effectiveIrradiance, baseTemp, scenario.pvConfig, shadingPattern);
  }, [effectiveIrradiance, baseTemp, scenario.pvConfig, shadingPattern]);

  // 2. MPPT Tracking Step
  const mpptStep = useMemo(() => {
    return mpptTrackerRef.current.step(pvPoint.voltage, pvPoint.current, pvPoint.pmpMW);
  }, [pvPoint]);

  // 3. DC-DC Boost Converter
  const boostState = useMemo(() => {
    return calculateBoostState(mpptStep.voltage, mpptStep.powerMW, scenario.boostConfig);
  }, [mpptStep, scenario.boostConfig]);

  const pvDcPowerMW = mpptStep.powerMW * boostState.efficiencyPercent / 100;

  // 4. EMS Real-Time Rule Dispatch
  const tariffHour = scenario.emsConfig.tariffSchedule?.[hFloor] || { buyPrice: 85, sellPrice: 60 };
  const emsDispatch = useMemo(() => {
    return executeEmsDispatch({
      pvDcPowerMW,
      loadPowerMW: effectiveLoadMW,
      currentSoc: bessSimulatorRef.current.soc,
      currentHour: timeHour,
      emsConfig: scenario.emsConfig,
      bessConfig: scenario.bessConfig,
      inverterConfig: scenario.inverterConfig,
      tariff: tariffHour,
      gridConnected: effectiveGridConnected,
      gridVoltagePu: effectiveGridVoltagePu,
      gridFrequencyHz: effectiveGridFreqHz
    });
  }, [pvDcPowerMW, effectiveLoadMW, timeHour, scenario.emsConfig, scenario.bessConfig, scenario.inverterConfig, tariffHour, effectiveGridConnected, effectiveGridVoltagePu, effectiveGridFreqHz]);

  // 5. BESS Physical Step
  const bessState = useMemo(() => {
    return bessSimulatorRef.current.step(emsDispatch.bessTargetPowerMW, 1.0, boostState.vDcBus);
  }, [emsDispatch.bessTargetPowerMW, boostState.vDcBus]);

  // 6. Inverter (VSC) & AC Output
  const netDCPowerMW = Math.max(0, pvDcPowerMW + bessState.actualPowerMW);
  const inverterState = useMemo(() => {
    return inverterSimulatorRef.current.step(
      netDCPowerMW,
      emsDispatch.reactiveDemandMVAr,
      effectiveGridVoltagePu,
      effectiveGridFreqHz
    );
  }, [netDCPowerMW, emsDispatch.reactiveDemandMVAr, effectiveGridVoltagePu, effectiveGridFreqHz]);

  // 7. Grid Exchange and Financials
  const netGridPowerMW = effectiveGridConnected ? inverterState.activePowerAC_MW - effectiveLoadMW : 0;
  const isExporting = netGridPowerMW > 0;
  const hourlyRevenueRateUSD = isExporting
    ? netGridPowerMW * tariffHour.sellPrice
    : -Math.abs(netGridPowerMW) * tariffHour.buyPrice;

  // Real-time animation clock tick
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTimeHour(prev => {
        const next = (prev + (0.015 * speed)) % 24;
        return Number(next.toFixed(3));
      });

      // Handle disturbance timer
      if (activeDisturbance) {
        setDisturbanceTimer(prev => {
          if (prev <= 1) {
            setActiveDisturbance(null);
            return 0;
          }
          return prev - 1;
        });
      }

      // Record rolling history
      setHistoryBuffer(prev => {
        const entry = {
          time: new Date().toLocaleTimeString(),
          hour: Number(timeHour.toFixed(2)),
          irradiance: Number(effectiveIrradiance.toFixed(0)),
          pvPowerMW: Number(pvPoint.powerMW.toFixed(2)),
          bessPowerMW: Number(bessState.actualPowerMW.toFixed(2)),
          bessSoc: Number(bessState.soc.toFixed(1)),
          invPowerMW: Number(inverterState.activePowerAC_MW.toFixed(2)),
          gridPowerMW: Number(netGridPowerMW.toFixed(2)),
          loadPowerMW: Number(effectiveLoadMW.toFixed(2)),
          vDcBus: Number(boostState.vDcBus.toFixed(0))
        };
        const updated = [...prev, entry];
        if (updated.length > 40) updated.shift();
        return updated;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, speed, activeDisturbance, timeHour, effectiveIrradiance, pvPoint, bessState, inverterState, netGridPowerMW, effectiveLoadMW, boostState]);

  // Disturbance Trigger function
  const triggerDisturbance = (key) => {
    const preset = DISTURBANCE_PRESETS[key];
    if (preset) {
      setActiveDisturbance(preset);
      setDisturbanceTimer(preset.durationSeconds);
    }
  };

  const clearDisturbance = () => {
    setActiveDisturbance(null);
    setDisturbanceTimer(0);
  };

  const loadScenarioById = (id) => {
    const found = scenariosList.find(s => s._id === id);
    if (found) {
      setScenario(found);
      bessSimulatorRef.current.reset(found.bessConfig?.initialSoc || 50);
    }
  };

  return (
    <SimulationContext.Provider
      value={{
        scenario,
        setScenario,
        scenariosList,
        setScenariosList,
        loadScenarioById,
        timeHour,
        setTimeHour,
        isPlaying,
        setIsPlaying,
        speed,
        setSpeed,
        shadingPattern,
        setShadingPattern,
        activeDisturbance,
        disturbanceTimer,
        triggerDisturbance,
        clearDisturbance,
        // Live Telemetry States
        telemetry: {
          environment: {
            irradiance: Number(effectiveIrradiance.toFixed(1)),
            ambientTemp: Number(baseTemp.toFixed(1)),
            loadMW: Number(effectiveLoadMW.toFixed(2)),
            tariff: tariffHour,
            gridVoltagePu: Number(effectiveGridVoltagePu.toFixed(2)),
            gridFrequencyHz: Number(effectiveGridFreqHz.toFixed(2)),
            gridConnected: effectiveGridConnected
          },
          pv: pvPoint,
          mppt: mpptStep,
          boost: boostState,
          bess: bessState,
          inverter: inverterState,
          ems: emsDispatch,
          grid: {
            netPowerMW: Number(netGridPowerMW.toFixed(2)),
            isExporting,
            hourlyRevenueRateUSD: Number(hourlyRevenueRateUSD.toFixed(2))
          }
        },
        historyBuffer
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used within a SimulationProvider');
  return context;
}
