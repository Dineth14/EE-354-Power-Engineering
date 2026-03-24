% auto_solver.m
disp('Starting auto_solver...');
try
    addpath(fullfile(pwd, 'Exercise1'));
    model_name = 'Exercise1_SyncGen';
    load_system(model_name);
    
    % Force single simulation output object
    set_param(model_name, 'ReturnWorkspaceOutputs', 'on');
    set_param(model_name, 'ReturnWorkspaceOutputsName', 'out');
    
    % Enable full logging
    set_param(model_name, 'SignalLogging', 'on');
    set_param(model_name, 'SignalLoggingName', 'logsout');
    set_param(model_name, 'SimscapeLogType', 'all');
    set_param(model_name, 'SimscapeLogName', 'simlog_out');
    
    % Run simulation
    disp('Simulating...');
    out = sim(model_name);
    disp('Simulation finished.');
    
    % Save output for inspection
    save('sim_results.mat', 'out');
    disp('Saved sim_results.mat successfully.');
catch ME
    disp(['ERROR: ' ME.message]);
end
exit;
