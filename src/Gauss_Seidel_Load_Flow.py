import numpy as np
import time

# ==========================================
# Data Section (IEEE 9-Bus System)
# ==========================================

def get_ieee_9_bus_data():
    num_buses = 9
    
    # Bus Types: 0=Slack, 1=PQ, 2=PV
    # Bus 1: Slack, Bus 2,3: PV, Others: PQ
    bus_types = np.array([0, 2, 2, 1, 1, 1, 1, 1, 1])
    
    # Specified P and Q (p.u.)
    P_specified = np.zeros(num_buses)
    Q_specified = np.zeros(num_buses)
    
    # Generators (Generation is positive)
    P_specified[1] = 1.63  # Bus 2
    P_specified[2] = 0.85  # Bus 3
    
    # Loads (Load is negative)
    P_specified[4] = -1.25 # Bus 5
    Q_specified[4] = -0.50
    P_specified[5] = -0.90 # Bus 6
    Q_specified[5] = -0.30
    P_specified[7] = -1.00 # Bus 8
    Q_specified[7] = -0.35
    
    # Initial Voltages (Flat Start)
    V_init = np.ones(num_buses, dtype=complex)
    V_init[0] = 1.04 + 0j  # Bus 1 (Slack)
    V_init[1] = 1.025 + 0j # Bus 2 (PV)
    V_init[2] = 1.025 + 0j # Bus 3 (PV)
    
    # Branch Data: (From, To, R, X, B)
    branch_data = [
        (4, 5, 0.0100, 0.0850, 0.1760),
        (4, 6, 0.0170, 0.0920, 0.1580),
        (5, 7, 0.0320, 0.1610, 0.3060),
        (6, 9, 0.0390, 0.1700, 0.3580),
        (7, 8, 0.0085, 0.0720, 0.1490),
        (8, 9, 0.0119, 0.1008, 0.2090),
        # Transformers (B=0)
        (1, 4, 0.0, 0.0576, 0.0),
        (2, 7, 0.0, 0.0625, 0.0),
        (3, 9, 0.0, 0.0586, 0.0)
    ]
    
    return num_buses, bus_types, P_specified, Q_specified, V_init, branch_data

def build_y_bus(num_buses, branch_data):
    Y_bus = np.zeros((num_buses, num_buses), dtype=complex)
    for branch in branch_data:
        f, t, r, x, b = branch
        i, j = int(f) - 1, int(t) - 1
        z = complex(r, x)
        y = 1 / z
        b_shunt = complex(0, b / 2)
        Y_bus[i, i] += y + b_shunt
        Y_bus[j, j] += y + b_shunt
        Y_bus[i, j] -= y
        Y_bus[j, i] -= y
    return Y_bus

# ==========================================
# Method: Gauss-Seidel
# ==========================================

def gauss_seidel(Y_bus, P_spec, Q_spec, V_init, bus_types, max_iter=1000, tol=1e-4):
    V = np.array(V_init, copy=True)
    num_buses = len(V)
    
    for it in range(max_iter):
        V_prev = np.copy(V)
        
        for i in range(num_buses):
            if bus_types[i] == 0: # Slack
                continue
            
            # Calculate sum of Yij * Vj
            sum_YV = 0
            for j in range(num_buses):
                if i != j:
                    sum_YV += Y_bus[i, j] * V[j]
            
            # Handle PV Buses
            if bus_types[i] == 2:
                # Estimate Q
                Q_calc = -np.imag(np.conj(V[i]) * (sum_YV + Y_bus[i, i] * V[i]))
                S_inj = P_spec[i] - 1j * Q_calc
            else:
                # PQ Bus
                S_inj = P_spec[i] - 1j * Q_spec[i]
            
            # Update Voltage
            V_new = (1 / Y_bus[i, i]) * ((S_inj / np.conj(V[i])) - sum_YV)
            
            # Enforce PV Bus Voltage Magnitude
            if bus_types[i] == 2:
                V_new = np.abs(V_init[i]) * np.exp(1j * np.angle(V_new))
            
            # Update V immediately (Gauss-Seidel)
            V[i] = V_new
        
        # Check convergence
        max_error = np.max(np.abs(V - V_prev))
        if max_error < tol:
            return V, it + 1
            
    return V, max_iter

if __name__ == "__main__":
    print("Gauss-Seidel Load Flow Analysis")
    print("===============================")
    
    # 1. Setup Data
    num_buses, bus_types, P_spec, Q_spec, V_init, branch_data = get_ieee_9_bus_data()
    Y_bus = build_y_bus(num_buses, branch_data)
    
    # 2. Run Gauss-Seidel
    start_time = time.time()
    V_gs, iter_gs = gauss_seidel(Y_bus, P_spec, Q_spec, V_init, bus_types)
    end_time = time.time()
    
    # 3. Results
    print(f"\nConverged in {iter_gs} iterations.")
    print(f"Time taken: {end_time - start_time:.6f} seconds.")
    
    print("\nBus Voltages:")
    print(f"{'Bus':<5} | {'Magnitude (p.u.)':<18} | {'Angle (deg)':<12}")
    print("-" * 45)
    
    for i in range(num_buses):
        mag = np.abs(V_gs[i])
        ang = np.degrees(np.angle(V_gs[i]))
        print(f"{i+1:<5} | {mag:<18.4f} | {ang:<12.4f}")