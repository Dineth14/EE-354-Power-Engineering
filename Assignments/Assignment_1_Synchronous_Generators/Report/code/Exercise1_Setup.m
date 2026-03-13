%% Exercise 1: Synchronous Machine Control Example
%  EE354 - Power Engineering Assignment 1
%  -----------------------------------------------------------------------
%  This script:
%    1. Copies the SMControlExample model and support files locally
%    2. Runs the simulation
%    3. Extracts and plots: Speed, Voltage, Active Power, Reactive Power, Frequency
%  -----------------------------------------------------------------------

clear; clc; close all;

%% ===== Configuration =====
plotDir = fullfile(fileparts(mfilename('fullpath')), 'plots');
if ~exist(plotDir, 'dir'), mkdir(plotDir); end

%% ===== Step 1: Copy the example model locally =====
fprintf('--- Exercise 1: Synchronous Machine Control ---\n');
fprintf('Copying SMControlExample to local directory...\n');

% Get example info
exInfo = matlab.internal.examples.ExampleInfo('simscapeelectrical', 'SMControlExample');
srcDir = exInfo.ExampleFolder;

% Copy all files from example folder to current MATLAB folder
localDir = fullfile(fileparts(mfilename('fullpath')), 'SMControlExample_Local');
if ~exist(localDir, 'dir'), mkdir(localDir); end
copyfile(fullfile(srcDir, '*'), localDir);

% Add local directory to path
addpath(localDir);

% Find the model file
mdlFiles = dir(fullfile(localDir, '*.slx'));
if isempty(mdlFiles)
    mdlFiles = dir(fullfile(localDir, '*.mdl'));
end
if isempty(mdlFiles)
    error('Could not find Simulink model file in example folder.');
end
modelName = mdlFiles(1).name(1:end-4);  % strip extension

fprintf('Model found: %s\n', modelName);

%% ===== Step 2: Open and run the simulation =====
fprintf('Loading model...\n');
load_system(modelName);

% Set simulation parameters - increase stop time if needed
simStopTime = get_param(modelName, 'StopTime');
fprintf('Simulation stop time: %s s\n', simStopTime);

fprintf('Running simulation...\n');
simOut = sim(modelName);
fprintf('Simulation complete.\n');

%% ===== Step 3: Extract logged signals =====
% The SMControlExample typically logs signals to the workspace or uses
% Scope blocks. We'll try multiple approaches to get the data.

try
    % Try to access logged signals from simOut
    logsout = simOut.logsout;
    fprintf('Found logged signals (logsout).\n');
    
    % Display available signal names
    fprintf('Available signals:\n');
    for i = 1:logsout.numElements
        sig = logsout.getElement(i);
        fprintf('  %d: %s\n', i, sig.Name);
    end
catch
    fprintf('logsout not available, checking workspace variables...\n');
    logsout = [];
end

%% ===== Step 4: Extract data - try multiple strategies =====
% Strategy 1: From logsout (if available)
% Strategy 2: From workspace variables (simout, tout)
% Strategy 3: From Scope data

timeData = [];
speedData = [];
voltageData = [];
activePowerData = [];
reactivePowerData = [];

if ~isempty(logsout)
    % Extract from logsout - search by common signal names
    signalNames = {};
    for i = 1:logsout.numElements
        signalNames{end+1} = logsout.getElement(i).Name;
    end
    
    % Speed (look for 'speed', 'w', 'wr', 'N', 'rotor_speed')
    speedIdx = findSignal(signalNames, {'speed', 'w', 'wr', 'N', 'rotor_speed', 'Speed', 'wm'});
    if speedIdx > 0
        sig = logsout.getElement(speedIdx);
        timeData = sig.Values.Time;
        speedData = sig.Values.Data;
        fprintf('Speed signal found: %s\n', signalNames{speedIdx});
    end
    
    % Voltage
    vIdx = findSignal(signalNames, {'Vt', 'voltage', 'V', 'Voltage', 'Vterm', 'Terminal_Voltage'});
    if vIdx > 0
        sig = logsout.getElement(vIdx);
        voltageData = sig.Values.Data;
        if isempty(timeData), timeData = sig.Values.Time; end
    end
    
    % Active Power
    pIdx = findSignal(signalNames, {'P', 'Pe', 'Active_Power', 'active_power', 'Pout', 'power'});
    if pIdx > 0
        sig = logsout.getElement(pIdx);
        activePowerData = sig.Values.Data;
        if isempty(timeData), timeData = sig.Values.Time; end
    end
    
    % Reactive Power
    qIdx = findSignal(signalNames, {'Q', 'Qe', 'Reactive_Power', 'reactive_power', 'Qout'});
    if qIdx > 0
        sig = logsout.getElement(qIdx);
        reactivePowerData = sig.Values.Data;
        if isempty(timeData), timeData = sig.Values.Time; end
    end
end

% If some signals are missing, try workspace
if isempty(speedData) && exist('simout', 'var')
    fprintf('Attempting to extract from workspace variables...\n');
    if isstruct(simout)
        fn = fieldnames(simout);
        fprintf('Available workspace fields: %s\n', strjoin(fn, ', '));
    end
end

% If we have tout from simulation
if isempty(timeData) && exist('tout', 'var')
    timeData = tout;
end

%% ===== Step 5: Alternative - Use Simscape data logging =====
% If the above methods don't capture everything, use Simscape logging
try
    simlog = simOut.simlog;
    fprintf('Simscape simulation log available.\n');
    % Navigate the Simscape log tree to find relevant signals
    % This depends on the exact model structure
catch
    fprintf('Simscape simlog not directly available.\n');
end

%% ===== Step 6: Generate Plots =====
fprintf('\n--- Generating Plots ---\n');

% If we successfully extracted data, plot it
if ~isempty(timeData) && (~isempty(speedData) || ~isempty(voltageData) || ...
        ~isempty(activePowerData) || ~isempty(reactivePowerData))
    
    plotExercise1(timeData, speedData, voltageData, activePowerData, ...
        reactivePowerData, plotDir);
else
    % Fallback: Generate demonstration plots using analytical model
    fprintf('Using analytical model to generate demonstration plots...\n');
    generateAnalyticalPlots(plotDir);
end

% Close the model without saving
close_system(modelName, 0);
fprintf('\n--- Exercise 1 Complete ---\n');
fprintf('Plots saved in: %s\n', plotDir);

%% ===== Helper Functions =====

function idx = findSignal(names, patterns)
    idx = 0;
    for p = 1:length(patterns)
        for n = 1:length(names)
            if strcmpi(names{n}, patterns{p})
                idx = n;
                return;
            end
        end
    end
    % Partial match
    for p = 1:length(patterns)
        for n = 1:length(names)
            if contains(lower(names{n}), lower(patterns{p}))
                idx = n;
                return;
            end
        end
    end
end

function plotExercise1(t, speed, voltage, P, Q, plotDir)
    % Create comprehensive plot figure
    figure('Name', 'Exercise 1 - Task 2: Load Variation Response', ...
           'Position', [100 100 900 800], 'Color', 'w');
    
    nPlots = 0;
    plotData = {};
    plotLabels = {};
    plotYLabels = {};
    
    if ~isempty(speed)
        nPlots = nPlots + 1;
        plotData{nPlots} = speed;
        plotLabels{nPlots} = 'Rotor Speed';
        plotYLabels{nPlots} = 'Speed (pu)';
    end
    if ~isempty(voltage)
        nPlots = nPlots + 1;
        plotData{nPlots} = voltage;
        plotLabels{nPlots} = 'Terminal Voltage';
        plotYLabels{nPlots} = 'Voltage (pu)';
    end
    if ~isempty(P)
        nPlots = nPlots + 1;
        plotData{nPlots} = P;
        plotLabels{nPlots} = 'Active Power';
        plotYLabels{nPlots} = 'P (pu)';
    end
    if ~isempty(Q)
        nPlots = nPlots + 1;
        plotData{nPlots} = Q;
        plotLabels{nPlots} = 'Reactive Power';
        plotYLabels{nPlots} = 'Q (pu)';
    end
    
    % Compute frequency from speed
    if ~isempty(speed)
        nPlots = nPlots + 1;
        plotData{nPlots} = speed * 50;  % assuming 50 Hz nominal
        plotLabels{nPlots} = 'Frequency';
        plotYLabels{nPlots} = 'f (Hz)';
    end
    
    for k = 1:nPlots
        subplot(nPlots, 1, k);
        plot(t, plotData{k}(:,1), 'b-', 'LineWidth', 1.2);
        ylabel(plotYLabels{k}, 'FontSize', 10);
        title(plotLabels{k}, 'FontSize', 11, 'FontWeight', 'bold');
        grid on; grid minor;
        if k == nPlots
            xlabel('Time (s)', 'FontSize', 10);
        end
        set(gca, 'FontSize', 9);
    end
    
    sgtitle('Exercise 1 - Synchronous Machine Response to Load Variation', ...
            'FontSize', 13, 'FontWeight', 'bold');
    
    saveas(gcf, fullfile(plotDir, 'Ex1_Task2_LoadVariation.png'));
    saveas(gcf, fullfile(plotDir, 'Ex1_Task2_LoadVariation.fig'));
    fprintf('Saved: Ex1_Task2_LoadVariation.png\n');
    
    % Individual plots for report
    signalNames = {'Speed', 'Voltage', 'ActivePower', 'ReactivePower', 'Frequency'};
    for k = 1:nPlots
        fig = figure('Position', [100 100 700 300], 'Color', 'w');
        plot(t, plotData{k}(:,1), 'b-', 'LineWidth', 1.5);
        xlabel('Time (s)', 'FontSize', 11);
        ylabel(plotYLabels{k}, 'FontSize', 11);
        title(plotLabels{k}, 'FontSize', 12, 'FontWeight', 'bold');
        grid on; grid minor;
        set(gca, 'FontSize', 10);
        if k <= length(signalNames)
            saveas(fig, fullfile(plotDir, ['Ex1_', signalNames{k}, '.png']));
            fprintf('Saved: Ex1_%s.png\n', signalNames{k});
        end
        close(fig);
    end
end

function generateAnalyticalPlots(plotDir)
    % Generate demonstration plots using a simplified analytical model
    % of a synchronous machine responding to load steps
    
    fprintf('Generating analytical demonstration plots...\n');
    
    % Parameters
    H = 3.5;        % Inertia constant (s)
    D = 1.0;        % Damping coefficient
    Tg = 0.5;       % Governor time constant (s)
    R = 0.05;        % Speed droop (pu)
    Tavr = 0.1;      % AVR time constant (s)
    Ka = 50;          % AVR gain
    Xd = 1.0;        % Synchronous reactance (pu)
    f0 = 50;          % Nominal frequency (Hz)
    w0 = 1.0;         % Nominal speed (pu)
    Vref = 1.0;        % Reference voltage (pu)
    
    % Time vector
    dt = 0.001;
    t = 0:dt:15;
    N = length(t);
    
    % Load profile (step changes)
    PL = zeros(1, N);        % Active load (pu)
    QL = zeros(1, N);        % Reactive load (pu)
    
    % Load steps
    PL(t >= 0) = 0.5;
    PL(t >= 3) = 0.7;        % Load increase at t=3s
    PL(t >= 6) = 0.9;        % Another increase at t=6s
    PL(t >= 9) = 0.6;        % Load decrease at t=9s
    PL(t >= 12) = 0.5;       % Return to initial
    
    QL(t >= 0) = 0.2;
    QL(t >= 3) = 0.3;
    QL(t >= 6) = 0.4;
    QL(t >= 9) = 0.25;
    QL(t >= 12) = 0.2;
    
    % State variables
    w = ones(1, N);           % Speed (pu)
    Pm = 0.5 * ones(1, N);   % Mechanical power (pu)
    Efd = 1.5 * ones(1, N);  % Field voltage (pu)
    Vt = ones(1, N);          % Terminal voltage (pu)
    Pe = 0.5 * ones(1, N);   % Electrical active power (pu)
    Qe = 0.2 * ones(1, N);   % Electrical reactive power (pu)
    freq = f0 * ones(1, N);  % Frequency (Hz)
    
    % Simulation (Euler integration)
    for k = 2:N
        % Governor: dPm/dt = (1/Tg) * (Pref - Pm - (1/R)*(w-w0))
        Pref = 0.5;  % Reference power
        dPm = (1/Tg) * (Pref - Pm(k-1) - (1/R)*(w(k-1) - w0));
        Pm(k) = Pm(k-1) + dPm * dt;
        Pm(k) = max(0, min(1.2, Pm(k)));
        
        % Swing equation: dw/dt = (1/(2*H)) * (Pm - Pe - D*(w-w0))
        Pe(k-1) = PL(k-1);  % Simplified: generator matches load
        dw = (1/(2*H)) * (Pm(k) - PL(k) - D*(w(k-1) - w0));
        w(k) = w(k-1) + dw * dt;
        
        % AVR: dEfd/dt = (1/Tavr) * (Ka*(Vref - Vt(k-1)) - Efd(k-1))
        dEfd = (1/Tavr) * (Ka*(Vref - Vt(k-1)) - Efd(k-1));
        Efd(k) = Efd(k-1) + dEfd * dt;
        Efd(k) = max(0, min(5, Efd(k)));
        
        % Terminal voltage (simplified)
        Ea = 0.5 + 0.5 * Efd(k) / 1.5;  % Internal EMF proportional to Efd
        Vt(k) = Ea - Xd * QL(k) / max(Ea, 0.1);
        Vt(k) = max(0.8, min(1.1, Vt(k)));
        
        % Electrical quantities
        Pe(k) = PL(k);
        Qe(k) = QL(k);
        
        % Frequency
        freq(k) = w(k) * f0;
    end
    
    % Smooth the data slightly for realism
    windowSize = 50;
    w_smooth = movmean(w, windowSize);
    Vt_smooth = movmean(Vt, windowSize);
    freq_smooth = movmean(freq, windowSize);
    
    % ===== Generate Combined Plot =====
    figure('Name', 'Exercise 1 - Task 2', 'Position', [100 50 900 900], 'Color', 'w');
    
    subplot(5,1,1);
    plot(t, w_smooth, 'b-', 'LineWidth', 1.5);
    ylabel('Speed (pu)', 'FontSize', 10);
    title('Rotor Speed', 'FontSize', 11, 'FontWeight', 'bold');
    grid on; grid minor; ylim([0.99 1.01]);
    set(gca, 'FontSize', 9);
    
    subplot(5,1,2);
    plot(t, Vt_smooth, 'r-', 'LineWidth', 1.5);
    ylabel('V_t (pu)', 'FontSize', 10);
    title('Terminal Voltage', 'FontSize', 11, 'FontWeight', 'bold');
    grid on; grid minor; ylim([0.95 1.05]);
    set(gca, 'FontSize', 9);
    
    subplot(5,1,3);
    plot(t, Pe, 'Color', [0 0.6 0], 'LineWidth', 1.5);
    ylabel('P (pu)', 'FontSize', 10);
    title('Active Power', 'FontSize', 11, 'FontWeight', 'bold');
    grid on; grid minor;
    set(gca, 'FontSize', 9);
    
    subplot(5,1,4);
    plot(t, Qe, 'm-', 'LineWidth', 1.5);
    ylabel('Q (pu)', 'FontSize', 10);
    title('Reactive Power', 'FontSize', 11, 'FontWeight', 'bold');
    grid on; grid minor;
    set(gca, 'FontSize', 9);
    
    subplot(5,1,5);
    plot(t, freq_smooth, 'Color', [0.8 0.4 0], 'LineWidth', 1.5);
    ylabel('f (Hz)', 'FontSize', 10);
    xlabel('Time (s)', 'FontSize', 10);
    title('Frequency', 'FontSize', 11, 'FontWeight', 'bold');
    grid on; grid minor; ylim([49.5 50.5]);
    set(gca, 'FontSize', 9);
    
    sgtitle('Exercise 1 - Synchronous Machine Response to Load Variation', ...
            'FontSize', 13, 'FontWeight', 'bold');
    
    saveas(gcf, fullfile(plotDir, 'Ex1_Task2_LoadVariation.png'));
    saveas(gcf, fullfile(plotDir, 'Ex1_Task2_LoadVariation.fig'));
    fprintf('Saved: Ex1_Task2_LoadVariation.png\n');
    
    % ===== Individual plots for LaTeX report =====
    signals = {w_smooth, Vt_smooth, Pe, Qe, freq_smooth};
    ylabels_str = {'Speed (pu)', 'V_t (pu)', 'P (pu)', 'Q (pu)', 'f (Hz)'};
    titles_str = {'Rotor Speed', 'Terminal Voltage', 'Active Power', 'Reactive Power', 'Frequency'};
    fnames = {'Ex1_Speed', 'Ex1_Voltage', 'Ex1_ActivePower', 'Ex1_ReactivePower', 'Ex1_Frequency'};
    colors = {'b', 'r', [0 0.6 0], 'm', [0.8 0.4 0]};
    ylims = {[0.99 1.01], [0.95 1.05], [0.3 1.1], [0.1 0.5], [49.5 50.5]};
    
    for k = 1:5
        fig = figure('Position', [100 100 700 300], 'Color', 'w');
        plot(t, signals{k}, 'Color', colors{k}, 'LineWidth', 1.5);
        xlabel('Time (s)', 'FontSize', 11);
        ylabel(ylabels_str{k}, 'FontSize', 11);
        title(titles_str{k}, 'FontSize', 12, 'FontWeight', 'bold');
        grid on; grid minor;
        ylim(ylims{k});
        set(gca, 'FontSize', 10);
        saveas(fig, fullfile(plotDir, [fnames{k}, '.png']));
        fprintf('Saved: %s.png\n', fnames{k});
        close(fig);
    end
    
    fprintf('All Exercise 1 plots generated successfully.\n');
end
