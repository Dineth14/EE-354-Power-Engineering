% =========================================================================
% MASTER SCRIPT FOR EXERCISE 1
% This single script handles checking the model, copying it, setting it up, 
% adding output blocks, simulating, and plotting automatically.
% =========================================================================

disp('======================================================');
disp('   Exercise 1: Single-Click Setup & Execution');
disp('======================================================');

%% 1. Setup Model
disp('1. Setting up model...');
orig_dir = pwd;
target_dir = fullfile(orig_dir, 'Exercise1');
model_name = 'Exercise1_SyncGen';

if ~exist(target_dir, 'dir')
    mkdir(target_dir);
    openExample('simscapeelectrical/SMControlExample');
    pause(4); % wait for extraction
    example_dir = pwd;
    slx_files = dir(fullfile(example_dir, '*.slx'));
    orig_model = slx_files(1).name;
    [~, orig_model_name, ~] = fileparts(orig_model);
    close_system(orig_model_name, 0);
    copyfile(fullfile(example_dir, '*'), target_dir);
    cd(orig_dir);
    movefile(fullfile(target_dir, orig_model), fullfile(target_dir, [model_name '.slx']));
end

addpath(target_dir);
if ~bdIsLoaded(model_name)
    open_system(model_name);
end
disp('[OK] Model Exercise1_SyncGen is perfectly set up and open.');

%% 2. Add To Workspace Blocks
disp('2. Preparing Output Measurement Ports...');
signals = {'wr_pu', 'Vt_pu', 'P_out', 'Q_out', 'f_hz'};
y_pos = 100;
for i = 1:length(signals)
    bname = [model_name '/' signals{i}];
    try
        add_block('simulink/Sinks/To Workspace', bname, ...
            'Position', [900, y_pos, 970, y_pos+30], ...
            'VariableName', signals{i}, ...
            'SaveFormat', 'Timeseries', ...
            'SampleTime', '-1');
    catch
        % If block is already there, ignore error
    end
    y_pos = y_pos + 50;
end
disp('[OK] 5 "To Workspace" blocks created on the far right side of the model.');

%% 3. Apply Simulation Parameters
disp('3. Configuring simulation solver...');
set_param(model_name, 'Solver', 'ode23tb');
set_param(model_name, 'MaxStep', '1e-4');
set_param(model_name, 'StopTime', '20');
disp('[OK] Limits applied (ode23tb, MaxStep: 1e-4, 20s stop time).');

%% 4. User Wiring Step
disp('======================================================');
disp('!!! ACTION REQUIRED IN SIMULINK !!!');
disp('Look at the Simulink window. On the far right, I have automatically');
disp('added the 5 blocks: wr_pu, Vt_pu, P_out, Q_out, f_hz.');
disp(' ');
disp('Simply draw a line from the measurement tools to these 5 blocks.');
disp('Once connected, save the model and click OK on the popup box.');
disp('======================================================');

f = msgbox({'Action Required in Simulink:', '', '1. I have placed 5 blocks on the far right of the model.', '2. Please wire them to the measurement outputs of the generator.', '3. Click OK here to auto-simulate and create all plots.'}, 'Wire Blocks', 'help');
uiwait(f);

%% 5. Simulation Execution
disp('4. Running simulation (this may take 10-30 seconds)...');
save_system(model_name);
try
    out = sim(model_name);
    disp('[OK] Simulation finished successfully!');
catch ME
    error('Simulation failed. Did you connect all the lines correctly? Error: %s', ME.message);
end

%% 6. Data Extraction and Plotting
disp('5. Generating Plots...');
plot_dir = fullfile(target_dir, 'Plots');
if ~exist(plot_dir, 'dir'), mkdir(plot_dir); end

% Extract variables safely
try
    if exist('out', 'var') && isprop(out, 'wr_pu')
        speed_ts = out.wr_pu; voltage_ts = out.Vt_pu; p_ts = out.P_out; q_ts = out.Q_out; f_ts = out.f_hz;
    else
        speed_ts = evalin('base', 'wr_pu'); voltage_ts = evalin('base', 'Vt_pu');
        p_ts = evalin('base', 'P_out'); q_ts = evalin('base', 'Q_out'); f_ts = evalin('base', 'f_hz');
    end
catch ME
    error('Could not find data in workspace. Please ensure the 5 blocks are correctly wired. Error: %s', ME.message);
end

% Plot Config
load_step_1 = 3.0;

% Figure 1
fig1 = figure('Name', 'Rotor Speed', 'Position', [100 100 1200 800], 'Visible', 'off');
plot(speed_ts.Time, speed_ts.Data, 'b', 'LineWidth', 2); hold on;
xline(load_step_1, '--r', 'Load Step Applied', 'LineWidth', 1.5, 'LabelHorizontalAlignment', 'left', 'LabelOrientation', 'horizontal');
xlabel('Time (s)', 'FontSize', 12); ylabel('Speed (pu)', 'FontSize', 12);
title('Synchronous Generator Rotor Speed Response to Load Variation', 'FontSize', 14);
grid on; saveas(fig1, fullfile(plot_dir, 'Ex1_Task2_Speed.png')); close(fig1);

% Figure 2
fig2 = figure('Name', 'Terminal Voltage', 'Position', [100 100 1200 800], 'Visible', 'off');
plot(voltage_ts.Time, voltage_ts.Data, 'm', 'LineWidth', 2); hold on;
xline(load_step_1, '--r', 'Load Step Applied', 'LineWidth', 1.5, 'LabelHorizontalAlignment', 'left', 'LabelOrientation', 'horizontal');
xlabel('Time (s)', 'FontSize', 12); ylabel('Voltage (pu)', 'FontSize', 12);
title('Synchronous Generator Terminal Voltage Response to Load Variation', 'FontSize', 14);
grid on; saveas(fig2, fullfile(plot_dir, 'Ex1_Task2_Voltage.png')); close(fig2);

% Figure 3
fig3 = figure('Name', 'Active Power', 'Position', [100 100 1200 800], 'Visible', 'off');
plot(p_ts.Time, p_ts.Data, 'g', 'LineWidth', 2); hold on;
xline(load_step_1, '--r', 'Load Step Applied', 'LineWidth', 1.5, 'LabelHorizontalAlignment', 'left', 'LabelOrientation', 'horizontal');
xlabel('Time (s)', 'FontSize', 12); ylabel('Active Power (W or pu)', 'FontSize', 12);
title('Synchronous Generator Active Power Response to Load Variation', 'FontSize', 14);
grid on; saveas(fig3, fullfile(plot_dir, 'Ex1_Task2_ActivePower.png')); close(fig3);

% Figure 4
fig4 = figure('Name', 'Reactive Power', 'Position', [100 100 1200 800], 'Visible', 'off');
plot(q_ts.Time, q_ts.Data, 'c', 'LineWidth', 2); hold on;
xline(load_step_1, '--r', 'Load Step Applied', 'LineWidth', 1.5, 'LabelHorizontalAlignment', 'left', 'LabelOrientation', 'horizontal');
xlabel('Time (s)', 'FontSize', 12); ylabel('Reactive Power (VAR or pu)', 'FontSize', 12);
title('Synchronous Generator Reactive Power Response to Load Variation', 'FontSize', 14);
grid on; saveas(fig4, fullfile(plot_dir, 'Ex1_Task2_ReactivePower.png')); close(fig4);

% Figure 5
fig5 = figure('Name', 'Frequency', 'Position', [100 100 1200 800], 'Visible', 'off');
plot(f_ts.Time, f_ts.Data, 'k', 'LineWidth', 2); hold on;
xline(load_step_1, '--r', 'Load Step Applied', 'LineWidth', 1.5, 'LabelHorizontalAlignment', 'left', 'LabelOrientation', 'horizontal');
xlabel('Time (s)', 'FontSize', 12); ylabel('Frequency (Hz)', 'FontSize', 12);
title('Synchronous Generator Frequency Response to Load Variation', 'FontSize', 14);
grid on; saveas(fig5, fullfile(plot_dir, 'Ex1_Task2_Frequency.png')); close(fig5);

% Figure 6
fig6 = figure('Name', 'Combined Responses', 'Position', [50 50 1200 800], 'Visible', 'off');
subplot(2,3,1); plot(speed_ts.Time, speed_ts.Data, 'b', 'LineWidth', 2); xline(load_step_1, '--r', 'LineWidth', 1.5); title('Speed', 'FontSize', 12); grid on;
subplot(2,3,2); plot(voltage_ts.Time, voltage_ts.Data, 'm', 'LineWidth', 2); xline(load_step_1, '--r', 'LineWidth', 1.5); title('Voltage', 'FontSize', 12); grid on;
subplot(2,3,3); plot(p_ts.Time, p_ts.Data, 'g', 'LineWidth', 2); xline(load_step_1, '--r', 'LineWidth', 1.5); title('Active Power', 'FontSize', 12); grid on;
subplot(2,3,4); plot(q_ts.Time, q_ts.Data, 'c', 'LineWidth', 2); xline(load_step_1, '--r', 'LineWidth', 1.5); title('Reactive Power', 'FontSize', 12); grid on;
subplot(2,3,5); plot(f_ts.Time, f_ts.Data, 'k', 'LineWidth', 2); xline(load_step_1, '--r', 'LineWidth', 1.5); title('Frequency (Hz)', 'FontSize', 12); grid on;
saveas(fig6, fullfile(plot_dir, 'Ex1_Task2_Combined.png')); close(fig6);

disp('======================================================');
disp('   ALL PLOTS SAVED AND EXERCISE 1 IS COMPLETE!        ');
disp('   Plots are located in: Exercise1/Plots/             ');
disp('======================================================');
