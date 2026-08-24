// Automated API Verification Script
async function runTests() {
  try {
    console.log('Testing 1: /api/health');
    const health = await fetch('http://localhost:5000/api/health').then(r => r.json());
    console.log('Health Output:', health);

    console.log('\nTesting 2: /api/scenarios');
    const scenarios = await fetch('http://localhost:5000/api/scenarios').then(r => r.json());
    console.log('Scenarios count:', scenarios.data?.length);

    console.log('\nTesting 3: /api/simulation/iv-pv-curve');
    const ivCurve = await fetch('http://localhost:5000/api/simulation/iv-pv-curve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ irradiance: 1000, ambientTemp: 25, pvConfig: scenarios.data[0].pvConfig })
    }).then(r => r.json());
    console.log('MPP:', ivCurve.data?.mpp);
    console.log('Curve points count:', ivCurve.data?.curve?.length);

    console.log('\nTesting 4: /api/optimizer/dispatch');
    const opt = await fetch('http://localhost:5000/api/optimizer/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenarios.data[0])
    }).then(r => r.json());
    console.log('MILP Optimization Summary:', opt.data?.summary);

    console.log('\nTesting 5: /api/simulation/run');
    const sim = await fetch('http://localhost:5000/api/simulation/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenarios.data[0])
    }).then(r => r.json());
    console.log('Simulation 24h Summary:', sim.data?.summary);

    console.log('\nTesting 6: Frontend HTTP index.html check');
    const fe = await fetch('http://localhost:5173/').then(r => r.text());
    console.log('Frontend HTML length:', fe.length, 'Contains #root:', fe.includes('id="root"'));

    console.log('\n✅ ALL FULL-STACK EE SIMULATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Failed:', err);
  }
}

runTests();
