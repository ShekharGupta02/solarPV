/**
 * Intelligent Energy Management System (EMS) Real-Time Rule Engine
 * Dispatches Solar, BESS, Inverter, and Grid power with full Kirchhoff Balance
 */

export function executeEmsDispatch(inputs) {
  const {
    pvDcPowerMW = 0,
    loadPowerMW = 0,
    currentSoc = 50,
    currentHour = 12,
    emsConfig = {},
    bessConfig = {},
    inverterConfig = {},
    tariff = { buyPrice: 100, sellPrice: 70 },
    gridConnected = true,
    gridVoltagePu = 1.0,
    gridFrequencyHz = 50.0
  } = inputs;

  const mode = emsConfig.mode || 'Time-of-Use Arbitrage';
  const gridExportLimit = emsConfig.gridExportLimitMW || 70;
  const gridImportLimit = emsConfig.gridImportLimitMW || 100;
  const peakShaveThreshold = emsConfig.peakShavingThresholdMW || 60;

  const maxChargeMW = bessConfig.maxChargePowerMW || 50;
  const maxDischargeMW = bessConfig.maxDischargePowerMW || 50;
  const socMin = bessConfig.socMin !== undefined ? bessConfig.socMin : 15;
  const socMax = bessConfig.socMax !== undefined ? bessConfig.socMax : 95;

  let bessDemandMW = 0; // positive = discharge, negative = charge
  let reactiveDemandMVAr = 0;
  let statusMessage = '';

  if (!gridConnected || mode === 'Islanding') {
    // Microgrid Islanding Mode: BESS forms the grid reference and balances load
    const netDeficit = loadPowerMW - pvDcPowerMW;
    if (netDeficit > 0) {
      bessDemandMW = Math.min(maxDischargeMW, netDeficit);
      statusMessage = 'Microgrid Islanding: BESS Discharging to Support Critical Load';
    } else {
      bessDemandMW = -Math.min(maxChargeMW, Math.abs(netDeficit));
      statusMessage = 'Microgrid Islanding: BESS Absorbing Excess Solar Generation';
    }
  } else if (mode === 'Self-Consumption') {
    const netSolar = pvDcPowerMW - loadPowerMW;
    if (netSolar > 0) {
      bessDemandMW = -Math.min(maxChargeMW, netSolar);
      statusMessage = 'Self-Consumption: Storing Solar Surplus in BESS';
    } else {
      bessDemandMW = Math.min(maxDischargeMW, Math.abs(netSolar));
      statusMessage = 'Self-Consumption: Discharging BESS to Offset Grid Import';
    }
  } else if (mode === 'Time-of-Use Arbitrage') {
    const isPeakTariff = tariff.buyPrice >= 120;
    const isSolarPeak = pvDcPowerMW > loadPowerMW;

    if (isPeakTariff && currentSoc > socMin + 5) {
      bessDemandMW = maxDischargeMW;
      statusMessage = 'ToU Arbitrage: High Tariff Peak ($' + tariff.buyPrice + '/MWh) - Max BESS Export';
    } else if (isSolarPeak && currentSoc < socMax - 2) {
      const surplus = pvDcPowerMW - loadPowerMW;
      bessDemandMW = -Math.min(maxChargeMW, surplus);
      statusMessage = 'ToU Arbitrage: Cheap Solar Window - Charging BESS';
    } else {
      const net = pvDcPowerMW - loadPowerMW;
      if (net < 0 && currentSoc > socMin + 15) {
        bessDemandMW = Math.min(maxDischargeMW * 0.4, Math.abs(net));
        statusMessage = 'ToU Arbitrage: Shoulder Period - Partial Load Support';
      } else {
        bessDemandMW = 0;
        statusMessage = 'ToU Arbitrage: Holding BESS Capacity for Peak Price Windows';
      }
    }
  } else if (mode === 'Peak Shaving') {
    if (loadPowerMW > peakShaveThreshold) {
      const shaveNeeded = loadPowerMW - peakShaveThreshold;
      const deficit = shaveNeeded - pvDcPowerMW;
      bessDemandMW = Math.max(0, Math.min(maxDischargeMW, deficit > 0 ? deficit : 0));
      statusMessage = 'Peak Shaving: Clamping Demand Below ' + peakShaveThreshold + ' MW';
    } else if (pvDcPowerMW > loadPowerMW && currentSoc < socMax - 5) {
      bessDemandMW = -Math.min(maxChargeMW, pvDcPowerMW - loadPowerMW);
      statusMessage = 'Peak Shaving: Storing Solar Surplus for Next Demand Peak';
    } else {
      bessDemandMW = 0;
      statusMessage = 'Peak Shaving: Grid Load Within Normal Band';
    }
  } else if (mode === 'Zero Export') {
    const surplus = pvDcPowerMW - loadPowerMW;
    if (surplus > 0) {
      bessDemandMW = -Math.min(maxChargeMW, surplus);
      statusMessage = 'Zero-Export: Directing All Solar Surplus to BESS';
    } else {
      bessDemandMW = Math.min(maxDischargeMW, Math.abs(surplus));
      statusMessage = 'Zero-Export: Discharging BESS to Minimize Import';
    }
  } else if (mode === 'Grid Ancillary') {
    // Frequency-Watt Droop: 4% droop
    const deltaF = gridFrequencyHz - 50.0;
    if (deltaF < -0.1) {
      // Under-frequency -> Fast discharge
      bessDemandMW = Math.min(maxDischargeMW, Math.abs(deltaF) * 50);
      statusMessage = 'Grid Ancillary: Under-Frequency (' + gridFrequencyHz.toFixed(2) + 'Hz) - FFR Injection';
    } else if (deltaF > 0.1) {
      // Over-frequency -> Fast charging
      bessDemandMW = -Math.min(maxChargeMW, deltaF * 50);
      statusMessage = 'Grid Ancillary: Over-Frequency (' + gridFrequencyHz.toFixed(2) + 'Hz) - Fast Charging';
    }

    // Volt-VAr Droop: Reactive power support
    const deltaV = 1.0 - gridVoltagePu;
    if (Math.abs(deltaV) > 0.03) {
      reactiveDemandMVAr = deltaV * 35; // inject capacitive reactive power if voltage sags
    }
  }

  // Sankey Energy Flow Routing breakdown
  const solarDirectToLoad = Math.min(pvDcPowerMW, loadPowerMW);
  const solarToBattery = bessDemandMW < 0 ? Math.min(pvDcPowerMW - solarDirectToLoad, Math.abs(bessDemandMW)) : 0;
  const solarToGrid = Math.max(0, pvDcPowerMW - solarDirectToLoad - solarToBattery);

  let gridExportActual = solarToGrid + (bessDemandMW > 0 ? bessDemandMW : 0);
  let curtailmentMW = 0;

  if (mode === 'Zero Export') {
    curtailmentMW = gridExportActual;
    gridExportActual = 0;
  } else if (gridExportActual > gridExportLimit) {
    curtailmentMW = gridExportActual - gridExportLimit;
    gridExportActual = gridExportLimit;
  }

  const netGridMW = gridConnected ? gridExportActual - Math.max(0, loadPowerMW - solarDirectToLoad - (bessDemandMW > 0 ? bessDemandMW : 0)) : 0;

  return {
    mode,
    bessTargetPowerMW: Number(bessDemandMW.toFixed(3)),
    reactiveDemandMVAr: Number(reactiveDemandMVAr.toFixed(2)),
    statusMessage,
    flowRouting: {
      solarDirectToLoadMW: Number(solarDirectToLoad.toFixed(2)),
      solarToBatteryMW: Number(solarToBattery.toFixed(2)),
      solarToGridMW: Number(solarToGrid.toFixed(2)),
      batteryToLoadMW: bessDemandMW > 0 ? Number(Math.min(bessDemandMW, Math.max(0, loadPowerMW - solarDirectToLoad)).toFixed(2)) : 0,
      batteryToGridMW: bessDemandMW > 0 ? Number(Math.max(0, bessDemandMW - Math.max(0, loadPowerMW - solarDirectToLoad)).toFixed(2)) : 0,
      gridExportMW: Number(Math.max(0, netGridMW).toFixed(2)),
      gridImportMW: Number(Math.max(0, -netGridMW).toFixed(2)),
      curtailmentMW: Number(curtailmentMW.toFixed(2))
    }
  };
}
