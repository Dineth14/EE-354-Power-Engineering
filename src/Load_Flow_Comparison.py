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
    # Note: PV buses have specified magnitudes
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
# Method 1: Newton-Raphson
# ==========================================

def newton_raphson(Y_bus, P_spec, Q_spec, V_init, bus_types, max_iter=20, tol=1e-4):
    V = np.array(V_init, copy=True)
    num_buses = len(V)
    
    slack_bus = np.where(bus_types == 0)[0][0]
    pq_buses = np.where(bus_types == 1)[0]
    pv_buses = np.where(bus_types == 2)[0]
    non_slack = np.sort(np.concatenate((pq_buses, pv_buses)))
    
    for it in range(max_iter):
        S_calc = V * np.conj(Y_bus @ V)
        P_calc = np.real(S_calc)
        Q_calc = np.imag(S_calc)
        
        dP = P_spec[non_slack] - P_calc[non_slack]
        dQ = Q_spec[pq_buses] - Q_calc[pq_buses]
        mismatch = np.concatenate((dP, dQ))
        
        if np.max(np.abs(mismatch)) < tol:
            return V, it + 1
            
        # Jacobian
        n_ns = len(non_slack)
        n_pq = len(pq_buses)
        J11 = np.zeros((n_ns, n_ns))
        J12 = np.zeros((n_ns, n_pq))
        J21 = np.zeros((n_pq, n_ns))
        J22 = np.zeros((n_pq, n_pq))
        
        # J11, J21 (Angle derivatives)
        for r, i in enumerate(non_slack):
            for c, k in enumerate(non_slack):
                if i == k:
                    J11[r, c] = -Q_calc[i] - np.imag(Y_bus[i, i]) * np.abs(V[i])**2
                else:
                    y_ik = Y_bus[i, k]
                    delta_ik = np.angle(V[i]) - np.angle(V[k])
                    J11[r, c] = np.abs(V[i]*V[k]) * (np.real(y_ik)*np.sin(delta_ik) - np.imag(y_ik)*np.cos(delta_ik))
        
        for r, i in enumerate(pq_buses):
            for c, k in enumerate(non_slack):
                if i == k:
                    J21[r, c] = P_calc[i] - np.real(Y_bus[i, i]) * np.abs(V[i])**2
                else:
                    y_ik = Y_bus[i, k]
                    delta_ik = np.angle(V[i]) - np.angle(V[k])
                    J21[r, c] = -np.abs(V[i]*V[k]) * (np.real(y_ik)*np.cos(delta_ik) + np.imag(y_ik)*np.sin(delta_ik))
                    
        # J12, J22 (Magnitude derivatives)
        for r, i in enumerate(non_slack):
            for c, k in enumerate(pq_buses):
                if i == k:
                    J12[r, c] = P_calc[i]/np.abs(V[i]) + np.real(Y_bus[i, i])*np.abs(V[i])
                else:
                    y_ik = Y_bus[i, k]
                    delta_ik = np.angle(V[i]) - np.angle(V[k])
                    J12[r, c] = np.abs(V[i]) * (np.real(y_ik)*np.cos(delta_ik) + np.imag(y_ik)*np.sin(delta_ik))
                    
        for r, i in enumerate(pq_buses):
            for c, k in enumerate(pq_buses):
                if i == k:
                    J22[r, c] = Q_calc[i]/np.abs(V[i]) - np.imag(Y_bus[i, i])*np.abs(V[i])
                else:
                    y_ik = Y_bus[i, k]
                    delta_ik = np.angle(V[i]) - np.angle(V[k])
                    J22[r, c] = np.abs(V[i]) * (np.real(y_ik)*np.sin(delta_ik) - np.imag(y_ik)*np.cos(delta_ik))
                    
        J = np.block([[J11, J12], [J21, J22]])
        dx = np.linalg.solve(J, mismatch)
        
        V_ang = np.angle(V)
        V_mag = np.abs(V)
        
        V_ang[non_slack] += dx[:n_ns]
        V_mag[pq_buses] += dx[n_ns:]
        
        V = V_mag * np.exp(1j * V_ang)
        
    return V, max_iter

# ==========================================
# Main Analysis
# ==========================================

if __name__ == "__main__":
    print("Newton-Raphson Load Flow Analysis")
    print("=================================")
    
    # 1. Setup Data
    num_buses, bus_types, P_spec, Q_spec, V_init, branch_data = get_ieee_9_bus_data()
    Y_bus = build_y_bus(num_buses, branch_data)
    
    # 2. Run Newton-Raphson
    start_time = time.time()
    V_nr, iter_nr = newton_raphson(Y_bus, P_spec, Q_spec, V_init, bus_types)
    time_nr = time.time() - start_time
    
    # 3. Results
    print(f"\nConverged in {iter_nr} iterations.")
    print(f"Time taken: {time_nr:.6f} seconds.")
    print("\nBus Voltages:")
    print(f"{'Bus':<5} | {'Magnitude (p.u.)':<18} | {'Angle (deg)':<12}")
    print("-" * 45)
    
    for i in range(num_buses):
        m_nr = np.abs(V_nr[i])
        a_nr = np.degrees(np.angle(V_nr[i]))
        print(f"{i+1:<5} | {m_nr:<18.4f} | {a_nr:<12.4f}")