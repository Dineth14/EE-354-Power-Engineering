% Exercise 1: Plotting
disp('--- STEP 5: PLOTTING ---');

% Define the output folder for plots
plot_dir = fullfile(pwd, 'Exercise1', 'Plots');
if ~exist(plot_dir, 'dir')
    mkdir(plot_dir);
end

% Pre-allocate empty variables
speed_ts = []; voltage_ts = []; p_ts = []; q_ts = []; f_ts = [];

% Extract variables safely
try
    if exist('out', 'var')
        disp('Extracting data from "out" variable...');
        if isprop(out, 'wr_pu'), speed_ts = out.wr_pu; end
        if isprop(out, 'Vt_pu'), voltage_ts = out.Vt_pu; end
        if isprop(out, 'P_out'), p_ts = out.P_out; end
        if isprop(out, 'Q_out'), q_ts = out.Q_out; end
        if isprop(out, 'f_hz'), f_ts = out.f_hz; end
    else
        disp('Extracting data from base workspace...');
        if evalin('base', 'exist(''wr_pu'', ''var'')'), speed_ts = evalin('base', 'wr_pu'); end
        if evalin('base', 'exist(''Vt_pu'', ''var'')'), voltage_ts = evalin('base', 'Vt_pu'); end
        if evalin('base', 'exist(''P_out'', ''var'')'), p_ts = evalin('base', 'P_out'); end
        if evalin('base', 'exist(''Q_out'', ''var'')'), q_ts = evalin('base', 'Q_out'); end
        if evalin('base', 'exist(''f_hz'', ''var'')'), f_ts = evalin('base', 'f_hz'); end
    end
catch ME
    error('Failed to extract variables: %s', ME.message);
end

if isempty(speed_ts) || isempty(voltage_ts) || isempty(p_ts) || isempty(q_ts) || isempty(f_ts)
    error('One or more timeseries variables are missing. Please ensure To Workspace blocks are correctly named: wr_pu, Vt_pu, P_out, Q_out, f_hz and formatting is Timeseries.');
end

disp('Data successfully retrieved. Generating plots...');

% Common Plot Settings
load_step_1 = 3.0; % "Step off" event based on model structure

% Figure 1
fig1 = figure('Name', 'Rotor Speed', 'Position', [100 100 1200 800]);
plot(speed_ts.Time, speed_ts.Data, 'b', 'LineWidth', 2, 'DisplayName', 'Rotor Speed');
xline(load_step_1, '--r', 'Load Step Applied', 'LineWidth', 1.5, 'LabelHorizontalAlignment', 'left', 'LabelOrientation', 'horizontal', 'HandleVisibility', 'off');
xlabel('Time (s)', 'FontSize', 12); ylabel('Speed (pu)', 'FontSize', 12);
title('Synchronous Generator Rotor Speed Response to Load Variation', 'FontSize', 14);
grid on; legend('show');
saveas(fig1, fullfile(plot_dir, 'Ex1_Task2_Speed.png'));

% Figure 2
fig2 = figure('Name', 'Terminal Voltage', 'Position', [100 100 1200 800]);
plot(voltage_ts.Time, voltage_ts.Data, 'm', 'LineWidth', 2, 'DisplayName', 'Terminal Voltage');
xline(load_step_1, '--r', 'Load Step Applied', 'LineWidth', 1.5, 'LabelHorizontalAlignment', 'left', 'LabelOrientation', 'horizontal', 'HandleVisibility', 'off');
xlabel('Time (s)', 'FontSize', 12); ylabel('Voltage (pu)', 'FontSize', 12);
title('Synchronous Generator Terminal Voltage Response to Load Variation', 'FontSize', 14);
grid on; legend('show');
saveas(fig2, fullfile(plot_dir, 'Ex1_Task2_Voltage.png'));

% Figure 3
fig3 = figure('Name', 'Active Power', 'Position', [100 100 1200 800]);
plot(p_ts.Time, p_ts.Data, 'g', 'LineWidth', 2, 'DisplayName', 'Active Power');
xline(load_step_1, '--r', 'Load Step Applied', 'LineWidth', 1.5, 'LabelHorizontalAlignment', 'left', 'LabelOrientation', 'horizontal', 'HandleVisibility', 'off');
xlabel('Time (s)', 'FontSize', 12); ylabel('Active Power (pu or W)', 'FontSize', 12);
title('Synchronous Generator Active Power Response to Load Variation', 'FontSize', 14);
grid on; legend('show');
saveas(fig3, fullfile(plot_dir, 'Ex1_Task2_ActivePower.png'));

% Figure 4
fig4 = figure('Name', 'Reactive Power', 'Position', [100 100 1200 800]);
plot(q_ts.Time, q_ts.Data, 'c', 'LineWidth', 2, 'DisplayName', 'Reactive Power');
xline(load_step_1, '--r', 'Load Step Applied', 'LineWidth', 1.5, 'LabelHorizontalAlignment', 'left', 'LabelOrientation', 'horizontal', 'HandleVisibility', 'off');
xlabel('Time (s)', 'FontSize', 12); ylabel('Reactive Power (pu or VAR)', 'FontSize', 12);
title('Synchronous Generator Reactive Power Response to Load Variation', 'FontSize', 14);
grid on; legend('show');
saveas(fig4, fullfile(plot_dir, 'Ex1_Task2_ReactivePower.png'));

% Figure 5
fig5 = figure('Name', 'Frequency', 'Position', [100 100 1200 800]);
plot(f_ts.Time, f_ts.Data, 'k', 'LineWidth', 2, 'DisplayName', 'Frequency');
xline(load_step_1, '--r', 'Load Step Applied', 'LineWidth', 1.5, 'LabelHorizontalAlignment', 'left', 'LabelOrientation', 'horizontal', 'HandleVisibility', 'off');
xlabel('Time (s)', 'FontSize', 12); ylabel('Frequency (Hz)', 'FontSize', 12);
title('Synchronous Generator Frequency Response to Load Variation', 'FontSize', 14);
grid on; legend('show');
saveas(fig5, fullfile(plot_dir, 'Ex1_Task2_Frequency.png'));

% Figure 6: Combined Subplot
fig6 = figure('Name', 'Combined Responses', 'Position', [50 50 1200 800]);

subplot(2,3,1);
plot(speed_ts.Time, speed_ts.Data, 'b', 'LineWidth', 2); 
xline(load_step_1, '--r', 'LineWidth', 1.5);
title('Speed Response', 'FontSize', 12); grid on; xlabel('Time (s)', 'FontSize', 10); ylabel('Speed (pu)', 'FontSize', 10);

subplot(2,3,2);
plot(voltage_ts.Time, voltage_ts.Data, 'm', 'LineWidth', 2); 
xline(load_step_1, '--r', 'LineWidth', 1.5);
title('Voltage Response', 'FontSize', 12); grid on; xlabel('Time (s)', 'FontSize', 10); ylabel('Voltage (pu)', 'FontSize', 10);

subplot(2,3,3);
plot(p_ts.Time, p_ts.Data, 'g', 'LineWidth', 2); 
xline(load_step_1, '--r', 'LineWidth', 1.5);
title('Active Power Response', 'FontSize', 12); grid on; xlabel('Time (s)', 'FontSize', 10); ylabel('Active Power', 'FontSize', 10);

subplot(2,3,4);
plot(q_ts.Time, q_ts.Data, 'c', 'LineWidth', 2); 
xline(load_step_1, '--r', 'LineWidth', 1.5);
title('Reactive Power Response', 'FontSize', 12); grid on; xlabel('Time (s)', 'FontSize', 10); ylabel('Reactive Power', 'FontSize', 10);

subplot(2,3,5);
plot(f_ts.Time, f_ts.Data, 'k', 'LineWidth', 2); 
xline(load_step_1, '--r', 'LineWidth', 1.5);
title('Frequency Response', 'FontSize', 12); grid on; xlabel('Time (s)', 'FontSize', 10); ylabel('Frequency (Hz)', 'FontSize', 10);

saveas(fig6, fullfile(plot_dir, 'Ex1_Task2_Combined.png'));

disp('[OK] All figures generated and saved in Exercise1/Plots directory.');
disp('--- STEP 5 COMPLETE ---');
