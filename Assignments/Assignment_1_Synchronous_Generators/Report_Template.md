# Assignment 1: Synchronous Generators Report

**Name:** [Your Name]
**Date:** [Date]

---

## Exercise 1: Synchronous Machine Control

### Task 1: Component Analysis

| Component | Functionality and Properties |
|-----------|------------------------------|
| **Synchronous Machine** | Converts mechanical energy into electrical energy. In Simulink, this block models the dynamics of the stator, rotor, and field windings. Key parameters include proper rating (MVA), voltage (kV), and frequency (50/60 Hz). |
| **AVR and Exciter** | **Automatic Voltage Regulator (AVR)** maintains the terminal voltage ($V_t$) at a setpoint. It senses $V_t$, compares it to $V_{ref}$, and adjusts the field voltage/current ($E_{fd}$) provided by the **Exciter**. $\Delta V \rightarrow \Delta E_{fd} \rightarrow \Delta Q$. |
| **Governor & Prime Mover** | Controls the rotor speed ($N_r$) and frequency ($f$). It senses speed, compares it to $\omega_{ref}$, and adjusts the mechanical torque ($T_m$) from the **Prime Mover** (turbine/engine). $\Delta \omega \rightarrow \Delta T_m \rightarrow \Delta P$. |
| **Machine Inertia** | Represented by the inertia constant $H$. It determines the stored kinetic energy ($KE = \frac{1}{2}J\omega^2$). Higher inertia means the machine resists speed changes more effectively during load transients. |

### Task 2: Load Variation Analysis

**Plots:**
*Insert plots of Speed, Voltage, Active Power, Reactive Power, and Frequency here.*

**Discussion:**

- **Active Power vs. Frequency:**
  - Relationship: As active load ($P$) increases, the electrical torque increases ($T_e$). If $T_m$ is constant, the rotor slows down ($T_m - T_e = J\frac{d\omega}{dt}$), causing frequency to drop.
  - The Governor responds to this drop by increasing fuel/steam to increase $T_m$, stabilizing the speed at a slightly lower value (droop control).
  
- **Reactive Power vs. Voltage:**
  - Relationship: Increasing reactive load ($Q$) causes a larger voltage drop across the synchronous reactance ($X_s$), reducing terminal voltage ($V_t$).
  - The AVR responds by increasing the field current, which increases the internal generated voltage ($E_a$) to restore $V_t$.

---

## Exercise 2: Parallel Operation of Two Generators

### Task 3: Synchronization (Gen B Freq < Gen A)

**Plots:**
*Insert plots for Gen A and Gen B (P, Q, V, f).*

**Discussion:**
- When Gen B is connected with $f_B < f_A$, its separation angle $\delta$ tends to become negative relative to the bus.
- **Power Flow:** It may momentarily act as a motor (drawing Active Power $P$) until it accelerates to the system frequency.
- **System Behavior:** The system frequency will settle at an intermediate value determined by the droop characteristics of both units.

### Task 4: Synchronization (Gen B Freq > Gen A)

**Plots:**
*Insert plots for Gen A and Gen B.*

**Discussion:**
- When Gen B is connected with $f_B > f_A$.
- **Power Flow:** It immediately starts supplying Active Power ($P$) to the load/Gen A.
- **System Behavior:** This is the preferred method for synchronization as it prevents the generator from motoring.

---

## Exercise 3: Parallel Operation with Infinite Bus

### Task 5: Synchronization (Gen B < Grid Freq)

**Plots:**
*Insert plots.*

**Discussion:**
- **Infinite Bus Difference:** The grid frequency and voltage **do not change** regardless of Gen B's actions.
- **Result:** Gen B will act as a motor and will likely stay as a motor or trip if the reverse power is significant, as the grid is infinitely strong and pulls Gen B into step.

### Task 6: Synchronization (Gen B > Grid Freq)

**Plots:**
*Insert plots.*

**Discussion:**
- **Result:** Gen B immediately delivers power to the grid.
- **Control:** To increase power delivery further, you must increase the governor setpoint. Changing excitation only changes Reactive Power ($Q$) and power factor, not Active Power ($P$).

---
