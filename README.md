# ☀️ Grid-Connected Solar PV Power Plant with BESS & Intelligent EMS

An advanced, interactive engineering simulation and optimization suite for a **Grid-Connected Solar Photovoltaic (PV) Power Plant** integrated with **Battery Energy Storage System (BESS)** and an **Intelligent Energy Management System (EMS)**.

Built with modern MERN architecture (React + Vite frontend, Node.js + Express + MongoDB backend).

---

## 🌟 Key Features

### 1. 🔬 Solar PV Array Modeling & Studio
* **Physics-Based Diode Models:** Single-diode equivalent circuit model accounting for irradiance, cell temperature, series ($R_s$) and shunt ($R_{sh}$) resistances.
* **Dynamic I-V & P-V Curves:** Real-time characteristic curves calculation across varying environmental conditions ($G \in [100, 1200] \text{ W/m}^2$, $T \in [-10, 75] ^\circ\text{C}$).
* **Array Sizing & String Configuration:** Automated string and module configuration sizing based on inverter DC voltage windows and plant capacity.

### 2. ⚡ Advanced MPPT Controller Lab
* **Algorithms Implemented:**
  * Perturb and Observe (P&O) with adaptive step sizing.
  * Incremental Conductance (IncCond) tracking.
  * Fractional Open-Circuit Voltage ($V_{oc}$) & Short-Circuit Current ($I_{sc}$) heuristics.
* **Tracking Dynamics:** Dynamic tracking efficiency under rapid irradiance ramp rates.

### 3. 🔌 DC-DC Boost Converter Simulation
* **Continuous & Discontinuous Conduction Modes (CCM / DCM).**
* **Real-Time Component Calculations:** Inductor ripple current ($\Delta I_L$), capacitor voltage ripple ($\Delta V_c$), switching losses, and conversion efficiency.
* **Duty Cycle Dynamics:** Closed-loop MPPT duty cycle modulation.

### 4. 🔋 Battery Energy Storage System (BESS) Lab
* **Electro-Chemical Equivalent Circuit Model (ECM):** State of Charge (SOC), Depth of Discharge (DOD), and open-circuit voltage ($V_{oc}$) vs. SOC curves.
* **Degradation & Thermal Modeling:** Arrhenius temperature dependency and cycle-life degradation estimations.
* **Operational Limits:** Charge/discharge C-rate limits, cell balancing, and over-charge/over-discharge safety cutoffs.

### 5. 🔄 Grid-Tied Inverter & Power Quality
* **Vector Control ($d$-$q$ frame):** Decoupled active ($P$) and reactive ($Q$) power regulation.
* **Phase-Locked Loop (PLL):** Grid synchronization and frequency locking.
* **Grid Code Compliance:** Total Harmonic Distortion (THD) monitoring, Low-Voltage Ride-Through (LVRT), and Anti-Islanding protection.

### 6. 🧠 Intelligent Energy Management System (EMS) & MILP Optimizer
* **Rule-Based & Heuristic EMS:** Peak shaving, load leveling, and self-consumption maximization.
* **Time-of-Use (TOU) Arbitrage:** Economic dispatch optimizing battery charge/discharge against multi-tariff electricity schedules.
* **Mixed-Integer Linear Programming (MILP):** 24-hour ahead cost-minimizing unit commitment and schedule optimization.

### 7. 🗺️ Interactive Single-Line Diagram (SLD) & Fault Simulation
* **Live Animated SLD:** Dynamic power flow visualization across PV strings, DC bus, BESS, Inverter, Step-up Transformer, and AC Grid.
* **Fault Lab:** Simulates symmetric/asymmetric grid faults, partial shading events, inverter trip scenarios, and BESS thermal faults.

### 8. 📄 Engineering Report & Scenario Manager
* **Automated Engineering Reports:** Generates executive summaries, loss breakdown waterfalls, performance ratios ($PR$), and key KPIs.
* **Scenario Management:** Save, load, and compare different environmental, economic, and operational scenarios via REST API and MongoDB.

---

## 🏗️ Architecture & Tech Stack

```
solarPV/
├── client/                 # React + Vite Frontend
│   ├── src/
│   │   ├── components/     # UI Labs, SLD, Scenarios, Reports
│   │   ├── context/        # Simulation State Management
│   │   ├── services/       # REST API client
│   │   └── simulation/     # Client-side numerical physics engines
│   └── ...
├── server/                 # Node.js + Express Backend
│   ├── config/             # MongoDB database connection
│   ├── controllers/        # REST route controllers
│   ├── engine/             # Backend simulation & optimization engines
│   ├── models/             # Mongoose schemas (Scenarios, Simulation Results)
│   └── routes/             # API routes
└── package.json            # Root orchestrator with Concurrently
```

* **Frontend:** React 18, Vite, Lucide Icons, Chart.js / Recharts, Vanilla CSS Design System.
* **Backend:** Node.js, Express.js, Mongoose (MongoDB ODM).
* **Numerical Computing:** Custom JS physics engines for PV diode equations, MPPT tracking, battery ECM, and MILP simplex solver.

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [npm](https://www.npmjs.com/) (v9 or higher)
* [MongoDB](https://www.mongodb.com/) (Local or MongoDB Atlas connection string)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ShekharGupta02/solarPV.git
   cd solarPV
   ```

2. **Install all dependencies (Root, Server, and Client):**
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the `server` directory (optional, defaults to local MongoDB on port 5000):
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/solar_pv_db
   ```

### Running the Application

Run both frontend and backend concurrently from the root directory:
```bash
npm start
```

* **Client App:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:5000](http://localhost:5000)

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
