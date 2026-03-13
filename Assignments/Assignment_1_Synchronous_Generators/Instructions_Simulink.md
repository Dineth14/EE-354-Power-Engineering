# Assignment 1: Synchronous Generators - Simulink Instructions

This guide provides step-by-step instructions to complete the "Synchronous Generators" assignment using MATLAB Simulink.

## Exercise 1: Synchronous Machine Control

### 1. Load the Example Model
Open MATLAB and run the following command in the Command Window:
```matlab
openExample('simscapeelectrical/SMControlExample')
```
**Important:** Do not edit the original example. Save a copy of the model and all support files to your working directory: `Assignments/Assignment_1_Synchronous_Generators/`.

### 2. Task 1: Component Analysis
Identify and analyze the following components in the model:
- **Synchronous Machine**: The core generator block. Check its parameters (Power, Voltage, Frequency).
- **AVR and Exciter**: Controls the terminal voltage by adjusting the field current. Look for the feedback loop from terminal voltage.
- **Governor and Prime Mover**: Controls the speed/frequency by adjusting mechanical power input. Look for the feedback loop from rotor speed.
- **Machine Inertia**: Represents the rotating mass. Affects how fast the machine accelerates/decelerates.

### 3. Task 2: Load Variation Simulation
- Run the simulation. The example is pre-configured with load steps.
- Open the Scope or Data Inspector to view the results.
- **Required Plots**: Speed, Voltage ($V_t$), Reactive Power ($Q$), Active Power ($P$), Frequency ($f$).
- **Observation**: Note how $f$ drops when $P$ increases (droop characteristic) and how $V_t$ is maintained by the AVR.

---

## Exercise 2: Parallel Operation of Two Generators

### 1. Model Modification
- Save the model as `Two_Generators.slx`.
- Duplicate the generator block and its controls (AVR, Governor, Prime Mover) to create **Gen B**.
- **Gen A** remains connected to the fixed load.
- Connect **Gen B** to the same bus via a **Circuit Breaker** (Switch).

### 2. Task 3: Synchronization (Gen B Frequency < Gen A)
- set Gen B's reference speed slightly **lower** than Gen A (e.g., 0.998 p.u. vs 1.0 p.u.).
- Start the simulation with the breaker **OPEN**.
- Close the breaker at a specific time (e.g., $t=5s$).
- **Plot**: $P, Q, V, f$ for both generators.
- **Analyze**: What happens to power flow? Does Gen B act as a motor?

### 3. Task 4: Synchronization (Gen B Frequency > Gen A)
- Set Gen B's reference speed slightly **higher** than Gen A (e.g., 1.002 p.u.).
- Repeat the synchronization process.
- **Analyze**: Does Gen B pick up load immediately?

---

## Exercise 3: Parallel Operation with Infinite Bus

### 1. Model Modification
- Save the model as `Grid_Connected.slx`.
- Replace **Gen A** with a **Three-Phase Source** block (this represents the Infinite Bus/Grid).
    - Set its internal impedance to a low value.
    - Set voltage and frequency to nominal (1.0 p.u.).
- Keep **Gen B** and its connecting breaker.

### 2. Task 5 & 6: Synchronization with Grid
- Repeat the experiments from Exercise 2 (Under and Over frequency synchronization).
- **Comparison**: Compare how the interactions differ when connecting to a stiff grid (constant $V$ and $f$) versus another generator.
