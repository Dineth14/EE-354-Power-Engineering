# Exercise 1: Single Synchronous Machine Analysis

## Task 1: Component Modeling and Base Operation

### Section 1: Synchronous Machine

The synchronous machine is the foundational element of modern power generation, relying on a static armature (stator) and a rotating magnetic field (rotor). The rotor contains the field winding, supplied by direct current to generate a constant magnetic flux. When driven by a prime mover, this rotating magnetic field induces a three-phase alternating voltage in the stator winding, creating a balanced electrical power output. 

From a mathematical perspective, modeling the machine in the three-phase $abc$ framework is complex due to the time-varying inductances caused by rotor saliency. To simplify this, the robust Park's Transformation is applied, projecting the stator variables onto a rotating $d-q$ (direct and quadrature) reference frame strictly tied to the rotor. In this configuration, the inductances remain constant, and steady-state sinusoidal variables become constant DC values, greatly simplifying the dynamic analysis.

The core $d-q$ axis equations representing the stator voltage dynamics are:

$v_d = R_a \cdot i_d + \frac{d\psi_d}{dt} - \omega_r \cdot \psi_q$
$v_q = R_a \cdot i_q + \frac{d\psi_q}{dt} + \omega_r \cdot \psi_d$

Where:
- $v_d, v_q$ = Direct and quadrature axis stator voltages (pu)
- $i_d, i_q$ = Direct and quadrature axis stator currents (pu)
- $R_a$ = Stator armature resistance (pu)
- $\psi_d, \psi_q$ = Direct and quadrature axis stator flux linkages (pu)
- $\omega_r$ = Rotor electrical speed (pu)

The flux linkages are coupled to the currents through the machine's inductances:

$\psi_d = L_d \cdot i_d + L_{md} \cdot i_{fd}$
$\psi_q = L_q \cdot i_q$

Where:
- $L_d, L_q$ = Direct and quadrature axis synchronous inductances (pu)
- $L_{md}$ = Direct axis mutual inductance (pu)
- $i_{fd}$ = Field winding current (pu)

Finally, the electromechanical conversion produces the electrical torque:

$T_e = \psi_d \cdot i_q - \psi_q \cdot i_d$

Where $T_e$ is the developed electrical torque (pu).

In the Simulink base model `SMControlExample`, the primary parameters defining this behavior are:
- **Rated Power:** 200 MVA
- **Rated Voltage:** 13.8 kV
- **Rated Frequency:** 60 Hz (Note: parameters show 60Hz default natively in library block often).
- **Armature Resistance ($R_a$):** 0.002 pu
- **Reactances ($X_d$, $X_q$, $X'_d$, $X'_q$):** Specified in the pu dialog defining transient and steady-state impedance. 
- **Inertia Constant ($H$):** Standard value driving swing characteristics (e.g., 3.2 s).

This block seamlessly interfaces with the broader electrical network through its electrical terminals (`A, B, C`), while mechanical and field input ports integrate natively with the control subsystems. 

---

### Section 2: AVR and Exciter

Voltage regulation is a strict necessity in a synchronous generator, compensating for internal voltage drops during loading to maintain standard grid voltage profiles. The Automatic Voltage Regulator (AVR) achieves this by adjusting the field voltage ($E_{fd}$) supplied by the exciter to the rotor, effectively modulating the internal induced EMF.

The model implements an IEEE Type 1 exciter, a widely accepted representation of a DC commutator exciter scheme. The system employs a closed-loop negative feedback architecture which continuously compares the measured terminal voltage ($V_t$) to a reference setpoint ($V_{ref}$).

The transfer function describing the regulator amplifier dynamics is:

$E_{fd} = K_A \cdot \frac{V_{ref} - V_t - V_s}{1 + sT_A}$

With the ceiling function boundary:
$E_{fdMIN} \le E_{fd} \le E_{fdMAX}$

Where:
- $E_{fd}$ = Exciter output field voltage (pu)
- $K_A$ = Amplifier voltage gain (pu/pu)
- $T_A$ = Amplifier time constant (s)
- $V_{ref}$ = Reference terminal voltage (pu)
- $V_t$ = Measured terminal voltage (pu)
- $V_s$ = Power System Stabilizer (PSS) supplementary signal (pu) (if applied)
- $E_{fdMIN}, E_{fdMAX}$ = Minimum and maximum field voltage limits (pu)

At system initialization ($t=0$), the AVR is initialized in a steady state where $V_t$ perfectly matches $V_{ref}$, resulting in a constant baseline $E_{fd}$. During a disturbance—such as a sudden load increase that drops $V_t$—the error ($V_{ref} - V_t$) becomes positive. This positive error is amplified by $K_A$, immediately pushing $E_{fd}$ higher. The ceiling function ensures that the forcing voltage does not aggressively exceed the physical limitations of the field circuit isolation. The increased $E_{fd}$ boosts rotor flux, driving $V_t$ back to its nominal level. The model utilizes parameters typical of this system, such as $K_A = 200$ and $T_A = 0.02$ s.

---

### Section 3: Governor and Prime Mover

While the AVR handles voltage, the mechanical speed governor and prime mover subsystem acts as the mechanism for strict frequency regulation. For the generator to supply active power without losing synchronism, its mechanical torque input ($T_m$) must precisely match the electrical torque demand ($T_e$). 

When grid load increases, the immediate energy is extracted from the spinning mass of the machine, dropping its rotational speed (and hence, grid frequency). The governor identifies this speed error and instructs the prime mover's valve or gate opening to increase primary fuel or energy flow to the turbine.

The relationship linking frequency drop to load pickup is defined by the droop (speed regulation) characteristic:

$R = \frac{\omega_{NL} - \omega_{FL}}{\omega_{rated}}$  (in pu)

And the resultant change in mechanical power output:
$\Delta P_m = -\frac{1}{R} \cdot \Delta\omega$

Where:
- $R$ = Speed droop regulation constant (pu)
- $\omega_{NL}, \omega_{FL}$ = No-load and full-load speeds (pu)
- $\Delta P_m$ = Change in mechanical power (pu)
- $\Delta\omega$ = Frequency or speed deviation (pu)

The transfer function of the governor-turbine system essentially behaves as a low-pass filter with time delays, representing the hydraulic/steam limitations (e.g., servo time constant $T_g$, turbine time constant $T_{ch}$). In the transient state following a disturbance, mechanical response deliberately lags electrical response due to physical fluid flows. In the steady-state, $\Delta P_m$ settles precisely to support the new electrical load at the slightly offset droop frequency, restoring continuous torque equilibrium.

---

### Section 4: Machine Inertia

The dynamic balancing act between mechanical power input, electrical power output, and system frequency is definitively governed by the machine's inertial characteristics. This principle is comprehensively summarized by the Swing Equation:

$\frac{2H}{\omega_s} \cdot \frac{d\omega}{dt} = T_m - T_e - D\cdot\Delta\omega$

Where:
- $H$ = Inertia constant (MW-s/MVA or purely seconds)
- $\omega_s$ = Synchronous base speed (rad/s or pu)
- $\omega$ = Actual rotor speed (pu)
- $T_m$ = Mechanical torque supplied by prime mover (pu)
- $T_e$ = Electrical electromagnetic resisting torque (pu)
- $D$ = Damping coefficient representing asynchronous torque components (pu torque / pu speed)

The Inertia Constant $H$ is a pivotal metric; it quantifies the theoretically available stored kinetic energy within the rotating mass at synchronous speed, normalized to the machine's MVA rating. Physically, it dictates how rapidly speed departs from synchronism during an imbalance. 

A high $H$ value means the transient speed decay will be slow, allowing the comparatively sluggish mechanical governor ample time to respond and adjust the prime mover output without frequency dropping below critical trip thresholds. Thus, machine inertia provides the foremost instantaneous defense against frequency instability in the critical seconds before primary control activates.

---

## Task 2: Load Variation Analysis

### Active Power and Frequency Relationship

The intrinsic relationship between active power output and system frequency is primarily an expression of the machine's inertial and governing response to torque imbalances. Referring to the simulation execution—specifically Figure 3 (Active Power) and Figure 5 (Frequency/Rotor Speed)—the sequence following the application of the load step can be dissected.

When the breaker opens/closes to switch the active load block at $t = 3.0$ seconds, the electrical power output $P$ (and correspondingly $T_e$) jumps virtually instantaneously. Since the mechanical prime mover input $T_m$ cannot physically change in zero time due to mechanical inertia, an instantaneous torque deficit exists ($T_e > T_m$).

According to the swing equation, this deficit results in negative $d\omega/dt$, causing an immediate frequency drop. This is the **inertia response** phase, where the load deficit is entirely supplied by the extraction of stored kinetic energy from the rotor.

As the speed drops, the governor detects the negative speed error ($-\Delta\omega$). The governor translates this error through its control architecture to physically open the steam valve or hydro gate. This leads to the prime mover gradually increasing $T_m$ to match and eventually overcome the $T_e$ deficit.

Eventually, the system achieves a new steady-state equilibrium at a lower frequency dictated by the droop relationship. The final steady-state frequency deviation is defined by:

$\Delta f_{ss} = \frac{-\Delta P_L}{D + \frac{1}{R}}$

Where:
- $\Delta f_{ss}$ = Steady-state frequency deviation (pu)
- $\Delta P_L$ = Magnitude of the load step change (pu)
- $D$ = Damping coefficient (pu)
- $R$ = Governor droop (pu)

The presence of droop guarantees stable load sharing in multi-machine environments but enforces that the final frequency rests slightly below the pre-disturbance value until secondary control intervention occurs.

### Reactive Power and Voltage Relationship

The relationship between reactive power and terminal voltage is inextricably tied to the internal excitation mechanism and the reactive impedance path. Observing Figure 2 (Terminal Voltage) alongside Figure 4 (Reactive Power), the reactive dynamics differ fundamentally from the active power mechanics.

The theoretical delivery of reactive power $Q$ from a synchronous generator is approximated by:

$Q = \frac{E \cdot V \cdot \cos\delta - V^2}{X_s}$

Where:
- $Q$ = Reactive power (pu)
- $E$ = Internal generated voltage or EMF (pu)
- $V$ = Terminal voltage (pu)
- $\delta$ = Load angle or torque angle (deg/rad)
- $X_s$ = Synchronous reactance (pu)

Upon the load step application, the increased current flow through the machine's internal synchronous reactance ($X_s$) causes a sudden internal voltage drop, abruptly collapsing the measured terminal voltage $V_t$. 

The sudden drop in $V_t$ is recorded by the AVR feedback transducer. Subtracted from the fixed reference voltage $V_{ref}$, this produces a substantial, sudden positive error signal. This error drives the exciter to force the field voltage $E_{fd}$ towards its ceiling limit. The resulting boost in rotor field current strengthens the internal flux (increasing $E$), essentially pushing more reactive power out to the system. 

The increased $E$ in the equation above directly offsets the $V^2/X_s$ penalty, restoring $V$ back precisely to nominal values in the steady-state. Because the exciter dynamics (magnetic flux changes) are typically much faster than mechanical turbine fluid dynamics, the voltage recovers and $Q$ settles much more rapidly than the corresponding $P$ and frequency stabilization.
