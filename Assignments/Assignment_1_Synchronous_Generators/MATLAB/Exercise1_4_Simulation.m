% Exercise 1: Running the Simulation
disp('--- STEP 4: RUNNING THE SIMULATION ---');
model_name = 'Exercise1_SyncGen';

% Check if the model is open
if ~bdIsLoaded(model_name)
    open_system(model_name);
end

disp('a) Setting solver and step sizes...');
try
    set_param(model_name, 'Solver', 'ode23tb');
    set_param(model_name, 'MaxStep', '1e-4');
    disp('[OK] Solver set to ode23tb with MaxStep 1e-4.');
catch ME
    disp(['[WARN] Could not set solver/step: ', ME.message]);
    disp('Fix: Ensure model is open and unlocked.');
end

disp('b) Setting simulation stop time...');
try
    % For transient stability, 20 seconds is typically sufficient
    set_param(model_name, 'StopTime', '20');
    disp('[OK] StopTime set to 20 seconds.');
catch ME
    disp(['[WARN] Could not set stop time: ', ME.message]);
end

disp('c) Running simulation (this may take a moment)...');
try
    out = sim(model_name);
    disp('d) [OK] Simulation completed successfully!');
catch ME
    disp('d) [ERROR] Simulation failed!');
    disp(['Error Message: ', ME.message]);
    
    % Error Handling Suggestions
    disp('--- TROUBLESHOOTING ---');
    disp('Fix 1 (Simulation diverges/NaN): Check if solver is stiff (ode23tb or ode15s). Lower MaxStep if needed.');
    disp('Fix 2 (Algebraic loops): Add a slight delay (1/z block) or check algebraic loop settings in Model Configuration Parameters.');
    disp('Fix 3 (Initial conditions): Double click the Synchronous Machine block -> Load Flow tab to initialize correctly.');
end

disp('--- STEP 4 COMPLETE ---');
