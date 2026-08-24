/**
 * Maximum Power Point Tracking (MPPT) Algorithms Simulator
 * Compares: Incremental Conductance (IncCond) vs Perturb & Observe (P&O)
 */

export class MpptTracker {
  constructor(algorithm = 'Incremental Conductance', stepSize = 0.005, initialDuty = 0.45) {
    this.algorithm = algorithm;
    this.stepSize = stepSize;
    this.dutyCycle = initialDuty;
    this.prevV = 0;
    this.prevI = 0;
    this.prevP = 0;
    this.deltaDirection = 1;
    this.history = [];
  }

  reset(initialDuty = 0.45) {
    this.dutyCycle = initialDuty;
    this.prevV = 0;
    this.prevI = 0;
    this.prevP = 0;
    this.deltaDirection = 1;
    this.history = [];
  }

  /**
   * Execute one discrete sampling step of the MPPT control loop
   * @param {number} currentV - PV Array Voltage (V)
   * @param {number} currentI - PV Array Current (A)
   * @param {number} pMppTrue - Actual Theoretical Maximum Power (MW)
   * @returns {object} updated operating state
   */
  step(currentV, currentI, pMppTrue) {
    const currentP = (currentV * currentI) / 1e6; // MW
    const dV = currentV - this.prevV;
    const dI = currentI - this.prevI;
    const dP = currentP - this.prevP;

    let deltaD = 0;
    let statusText = 'Tracking';

    if (this.algorithm === 'Incremental Conductance') {
      if (Math.abs(dV) < 0.05) {
        if (Math.abs(dI) < 0.05) {
          deltaD = 0;
          statusText = 'At MPP (dI=0, dV=0)';
        } else {
          deltaD = dI > 0 ? -this.stepSize : this.stepSize;
          statusText = dI > 0 ? 'Surge Adjust (-D)' : 'Drop Adjust (+D)';
        }
      } else {
        const incCond = dI / dV;
        const instCond = -currentI / Math.max(1, currentV);
        const error = incCond - instCond;

        if (Math.abs(error) < 0.0008) {
          deltaD = 0;
          statusText = 'At MPP (dI/dV = -I/V)';
        } else if (error > 0) {
          // Left of MPP: need to increase Vpv -> decrease Duty Cycle D
          deltaD = -this.stepSize;
          statusText = 'Left of MPP (dI/dV > -I/V)';
        } else {
          // Right of MPP: need to decrease Vpv -> increase Duty Cycle D
          deltaD = this.stepSize;
          statusText = 'Right of MPP (dI/dV < -I/V)';
        }
      }
    } else {
      // Perturb & Observe (P&O)
      if (Math.abs(dP) < 0.001) {
        deltaD = 0;
        statusText = 'Steady Oscillation (dP ≈ 0)';
      } else {
        if (dP > 0) {
          // Power increased: continue same perturbation
          deltaD = this.deltaDirection * this.stepSize;
          statusText = 'Power Increased (Continue ΔD)';
        } else {
          // Power decreased: reverse direction
          this.deltaDirection = -this.deltaDirection;
          deltaD = this.deltaDirection * this.stepSize;
          statusText = 'Power Dropped (Reverse ΔD)';
        }
      }
    }

    // Apply and clamp duty cycle [0.05, 0.90]
    this.dutyCycle = Math.max(0.05, Math.min(0.90, this.dutyCycle + deltaD));

    // Save previous states
    this.prevV = currentV;
    this.prevI = currentI;
    this.prevP = currentP;

    const trackingEfficiency = pMppTrue > 0 ? Math.min(100, (currentP / pMppTrue) * 100) : 100;

    const stepResult = {
      dutyCycle: Number(this.dutyCycle.toFixed(4)),
      voltage: Number(currentV.toFixed(1)),
      current: Number(currentI.toFixed(1)),
      powerMW: Number(currentP.toFixed(3)),
      pMppTrue: Number(pMppTrue.toFixed(3)),
      trackingEfficiency: Number(trackingEfficiency.toFixed(2)),
      deltaD: Number(deltaD.toFixed(4)),
      statusText
    };

    this.history.push(stepResult);
    if (this.history.length > 50) this.history.shift();

    return stepResult;
  }
}
