% Exercise 1: Signal Extraction Setup
disp('--- STEP 3: SIGNAL EXTRACTION SETUP ---');

disp('INSTRUCTIONS FOR SIGNAL EXTRACTION:');
disp('If the necessary output signals (w, P, Q, V, f) are not already exported to the workspace, you must add "To Workspace" blocks manually.');
disp('');
disp('1. Open Simulink Library Browser.');
disp('2. Navigate to: Simulink > Sinks > To Workspace');
disp('3. Drag 5 "To Workspace" blocks into the model to capture:');
disp('   - Rotor speed (Variable name: wr_pu)');
disp('   - Terminal voltage (Variable name: Vt_pu)');
disp('   - Active power (Variable name: P_out)');
disp('   - Reactive power (Variable name: Q_out)');
disp('   - Electrical frequency (Variable name: f_hz)');
disp('4. For EACH block, double-click and set exactly:');
disp('   - Variable name: [as specified above]');
disp('   - Save format: "Timeseries"');
disp('   - Sample time: "-1"');
disp('5. Connect them to the appropriate measurement outputs from the Synchronous Machine (usually demuxed from the "m" port) or load measurement blocks.');
disp('');

disp('Attempting basic auto-configuration of logging...');
model_name = 'Exercise1_SyncGen';

% Check if model is open
if ~bdIsLoaded(model_name)
    open_system(model_name);
end

try
    % Automatically configure the model to save signals
    set_param(model_name, 'SignalLogging', 'on');
    set_param(model_name, 'SignalLoggingName', 'logsout');
    set_param(model_name, 'SaveFormat', 'Dataset');
    disp('[OK] Basic logging configured.');
catch ME
    disp(['[WARN] Auto-config warning: ', ME.message]);
end

disp('--- STEP 3 COMPLETE ---');
