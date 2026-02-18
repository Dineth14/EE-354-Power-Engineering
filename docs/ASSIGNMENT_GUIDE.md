# Assignment Guide: Load Flow Analysis

This guide explains how to use the Python scripts provided in the `src/` directory for performing load flow analysis using different numerical methods.

## Prerequisites

Ensure you have Python installed and the required dependencies:

```bash
pip install -r requirements.txt
```

## Available Scripts

The `src/` directory contains the following key scripts:

1.  **`Newton_Raphson_Method.py`**: Implements the Newton-Raphson method for load flow analysis.
2.  **`Gauss_Seidel_Load_Flow.py`**: Implements the Gauss-Seidel method.
3.  **`Fast_Decoupled_Method.py`**: Implements the Fast Decoupled Load Flow method.
4.  **`Load_Flow_Comparison.py`**: A utility to compare results from different methods (currently set up for Newton-Raphson validation on IEEE 9-bus system).

## Running the Scripts

You can run any script from the root directory of the repository.

### Example: Running Newton-Raphson Analysis

```bash
python src/Newton_Raphson_Method.py
```

### Example: Comparing Load Flow Methods

To see a comparison or validation of the load flow results:

```bash
python src/Load_Flow_Comparison.py
```

## Understanding the Output

- **Bus Voltages**: The scripts typically output the magnitude (in per unit) and angle (in degrees) of the voltage at each bus.
- **Convergence**: The number of iterations required for the solution to converge to the specified tolerance.
- **Time**: The computation time taken by the algorithm.

## Modifying Data

The scripts currently contain hardcoded data for standard test systems (like the IEEE 9-bus system). To analyze a different power system, you will need to modify the data sections within the Python scripts. Look for variables like `bus_data`, `line_data`, or similar structures at the beginning of the files.

## Troubleshooting

- **Import Errors**: If you encounter `ModuleNotFoundError`, ensure you are running the scripts from the repository root, or adjust your `PYTHONPATH`.
- **Convergence Issues**: If the solution does not converge, check your input data for feasibility or try increasing the maximum number of iterations.
