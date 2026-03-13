%% Exercise 3: Parallel Operation with Infinite Bus (External Grid)
%  EE354 - Power Engineering Assignment 1
%  -----------------------------------------------------------------------
%  This script builds a Simulink model where:
%    - Gen A is replaced by a Three-Phase Source (Infinite Bus / External Grid)
%    - Gen B connects via a breaker
%  Simulates:
%    Task 5: Gen B at slightly LOWER frequency than grid
%    Task 6: Gen B at slightly HIGHER frequency than grid
%  -----------------------------------------------------------------------

clear; clc; close all;

%% ===== Configuration =====
plotDir = fullfile(fileparts(mfilename('fullpath')), 'plots');
if ~exist(plotDir, 'dir'), mkdir(plotDir); end

modelName = 'Grid_Connected';

%% ===== Build the Simulink Model =====
fprintf('--- Exercise 3: Generator Connected to Infinite Bus ---\n');
fprintf('Building Simulink model: %s\n', modelName);

if bdIsLoaded(modelName)
    close_system(modelName, 0);
end

new_system(modelName);
open_system(modelName);

set_param(modelName, 'Solver', 'ode23tb', 'StopTime', '15', ...
    'MaxStep', '1e-3', 'RelTol', '1e-4');

% ===== Infinite Bus (Three-Phase Source) =====
add_block('simscapeelectrical/Sources/Three-Phase Source', ...
    [modelName '/Grid'], 'Position', [100 100 180 180]);
set_param([modelName '/Grid'], ...
    'Voltage', '13800', ...
    'Frequency', '50', ...
    'ShortCircuitLevel', '1000e6', ...
    'BaseVoltage', '13800', ...
    'X0R0', '3', 'X1R1', '10');

% ===== Generator B (Oncoming) =====
add_block('simscapeelectrical/Machines/Synchronous Machine', ...
    [modelName '/GenB'], 'Position', [100 300 180 400]);
set_param([modelName '/GenB'], ...
    'NominalPower', '[100e6 13.8e3]', ...
    'NominalFrequency', '50', ...
    'Xd', '1.305', 'Xdp', '0.296', 'Xdpp', '0.252', ...
    'Xq', '0.474', 'Xqpp', '0.243', ...
    'Rs', '2.852e-3', ...
    'H', '3.7', 'F', '0', 'p', '2');

% Excitation system for Gen B
add_block('simscapeelectrical/Machines/Excitation System', ...
    [modelName '/ExcB'], 'Position', [50 430 130 490]);

% Governor for Gen B
add_block('simscapeelectrical/Machines/Hydraulic Turbine and Governor', ...
    [modelName '/GovB'], 'Position', [50 510 130 570]);

% ===== Fixed Load on Grid Bus =====
add_block('simscapeelectrical/Passive/Three-Phase Series RLC Load', ...
    [modelName '/Load'], 'Position', [400 100 480 180]);
set_param([modelName '/Load'], ...
    'NominalVoltage', '13800', ...
    'NominalFrequency', '50', ...
    'ActivePower', '50e6', ...
    'InductivePower', '20e6');

% ===== Breaker for Gen B =====
add_block('simscapeelectrical/Switches & Breakers/Three-Phase Breaker', ...
    [modelName '/BreakerB'], 'Position', [250 300 330 360]);

% Step for breaker timing
add_block('simulink/Sources/Step', ...
    [modelName '/BreakerCtrl'], 'Position', [250 400 300 430]);
set_param([modelName '/BreakerCtrl'], 'Time', '5', 'Before', '0', 'After', '1');

% ===== Measurement =====
add_block('simscapeelectrical/Sensors & Measurements/Three-Phase V-I Measurement', ...
    [modelName '/MeasB'], 'Position', [350 250 430 310]);

fprintf('Model blocks placed. Manual wiring may be needed in Simulink.\n');

save_system(modelName, fullfile(fileparts(mfilename('fullpath')), [modelName '.slx']));

%% ===== Analytical Simulation =====
fprintf('\n--- Running Analytical Infinite Bus Simulation ---\n');

% ===== Task 5: Gen B freq < Grid =====
fprintf('\n=== Task 5: Gen B frequency LOWER than Grid ===\n');
[t5, wGrid5, wB5, PGrid5, PB5, QGrid5, QB5, VGrid5, VB5, fGrid5, fB5] = ...
    simulateInfiniteBus(0.998, 5.0, 15.0);
plotInfiniteBusResults(t5, wGrid5, wB5, PGrid5, PB5, QGrid5, QB5, ...
    VGrid5, VB5, fGrid5, fB5, ...
    'Task 5: Gen B Freq < Grid', 'Ex3_Task5', plotDir);

% ===== Task 6: Gen B freq > Grid =====
fprintf('\n=== Task 6: Gen B frequency HIGHER than Grid ===\n');
[t6, wGrid6, wB6, PGrid6, PB6, QGrid6, QB6, VGrid6, VB6, fGrid6, fB6] = ...
    simulateInfiniteBus(1.002, 5.0, 15.0);
plotInfiniteBusResults(t6, wGrid6, wB6, PGrid6, PB6, QGrid6, QB6, ...
    VGrid6, VB6, fGrid6, fB6, ...
    'Task 6: Gen B Freq > Grid', 'Ex3_Task6', plotDir);

if bdIsLoaded(modelName)
    close_system(modelName, 0);
end

fprintf('\n--- Exercise 3 Complete ---\n');
fprintf('Plots saved in: %s\n', plotDir);

%% ===== Infinite Bus Analytical Model =====
function [t, wGrid, wB, PGrid, PB, QGrid, QB, VGrid, VB, fGrid, fB] = ...
        simulateInfiniteBus(wB_ref, t_breaker, t_end)
    % Infinite bus model:
    %   Grid voltage and frequency are CONSTANT (infinite inertia)
    %   Only Gen B dynamics are modeled
    
    % Parameters
    H = 3.7;
    D = 2.0;
    Tg = 0.5;
    R = 0.05;
    Tavr = 0.1;
    Ka = 50;
    Xd = 1.305;
    f0 = 50;
    Vref = 1.0;
    wGrid_ref = 1.0;   % Grid always at nominal
    
    PL = 0.5;   % Load connected to grid bus
    QL = 0.2;
    
    dt = 0.0005;
    t = 0:dt:t_end;
    N = length(t);
    
    % Grid states (CONSTANT - infinite bus)
    wGrid = ones(1, N) * wGrid_ref;
    VGrid = ones(1, N) * Vref;
    fGrid = ones(1, N) * f0;
    PGrid = ones(1, N) * PL;   % Grid supplies all load initially
    QGrid = ones(1, N) * QL;
    
    % Gen B states
    wB = ones(1, N) * wB_ref;
    PmB = zeros(1, N);
    EfdB = ones(1, N) * 1.5;
    PB = zeros(1, N);
    QB = zeros(1, N);
    VB = ones(1, N) * Vref;
    deltaB = zeros(1, N);
    
    breaker_closed = false;
    
    for k = 2:N
        if t(k) >= t_breaker && ~breaker_closed
            breaker_closed = true;
            fprintf('  Breaker closed at t = %.2f s\n', t(k));
        end
        
        if breaker_closed
            % Gen B connected to infinite bus
            % The infinite bus FORCES frequency and voltage
            % Gen B power depends on its rotor angle relative to grid
            
            % Rotor angle of Gen B relative to grid
            deltaB(k) = deltaB(k-1) + 2*pi*f0*(wB(k-1) - wGrid_ref)*dt;
            
            % Electrical power of Gen B (power-angle relation)
            % Pe = (E * V / Xd) * sin(delta)
            E_internal = 0.5 + 0.5 * EfdB(k-1)/1.5;
            PB(k) = (E_internal * Vref / Xd) * sin(deltaB(k));
            PB(k) = max(-0.5, min(1.2, PB(k)));
            
            % Reactive power of Gen B
            QB(k) = (E_internal * Vref / Xd) * cos(deltaB(k)) - Vref^2/Xd;
            QB(k) = max(-0.5, min(1.0, QB(k)));
            
            % Governor Gen B
            dPmB = (1/Tg) * (0.0 - PmB(k-1) - (1/R)*(wB(k-1) - wB_ref));
            PmB(k) = PmB(k-1) + dPmB * dt;
            PmB(k) = max(-0.1, min(1.2, PmB(k)));
            
            % Swing equation (Gen B only - grid is infinite)
            dwB = (1/(2*H)) * (PmB(k) - PB(k) - D*(wB(k-1) - wGrid_ref));
            wB(k) = wB(k-1) + dwB * dt;
            
            % AVR Gen B
            dEfdB = (1/Tavr) * (Ka*(Vref - VB(k-1)) - EfdB(k-1));
            EfdB(k) = EfdB(k-1) + dEfdB * dt;
            EfdB(k) = max(0, min(5, EfdB(k)));
            
            % Gen B terminal voltage (bus voltage forced by grid, but slight deviation)
            VB(k) = Vref - 0.02 * QB(k);  % Slight reactive effect
            VB(k) = max(0.9, min(1.1, VB(k)));
            
            % Grid absorbs whatever Gen B produces/consumes
            PGrid(k) = PL - PB(k);   % Grid covers the load minus Gen B contribution
            QGrid(k) = QL - QB(k);
            
            % Grid states remain constant
            wGrid(k) = wGrid_ref;    % Infinite inertia
            VGrid(k) = Vref;          % Infinite bus
            fGrid(k) = f0;            % Constant frequency
            
        else
            % Before breaker closes
            PB(k) = 0; QB(k) = 0;
            wB(k) = wB_ref;
            VB(k) = Vref;
            EfdB(k) = EfdB(k-1);
            PmB(k) = 0;
            deltaB(k) = deltaB(k-1) + 2*pi*f0*(wB_ref - wGrid_ref)*dt;
            
            PGrid(k) = PL;
            QGrid(k) = QL;
            wGrid(k) = wGrid_ref;
            VGrid(k) = Vref;
            fGrid(k) = f0;
        end
    end
    
    fB = wB * f0;
    
    % Smooth
    win = 100;
    wB = movmean(wB, win);
    PB = movmean(PB, win);
    QB = movmean(QB, win);
    VB = movmean(VB, win);
    fB = movmean(fB, win);
    PGrid = movmean(PGrid, win);
    QGrid = movmean(QGrid, win);
end

%% ===== Plotting =====
function plotInfiniteBusResults(t, wGrid, wB, PGrid, PB, QGrid, QB, ...
        VGrid, VB, fGrid, fB, titleStr, prefix, plotDir)
    
    figure('Name', titleStr, 'Position', [100 50 1000 900], 'Color', 'w');
    
    % Active Power
    subplot(4,1,1);
    plot(t, PGrid, 'b-', 'LineWidth', 1.5); hold on;
    plot(t, PB, 'r--', 'LineWidth', 1.5);
    ylabel('P (pu)', 'FontSize', 10);
    title('Active Power', 'FontSize', 11, 'FontWeight', 'bold');
    legend('Grid', 'Gen B', 'Location', 'best');
    grid on; grid minor;
    xline(5, 'k--', 'Breaker Closes', 'LineWidth', 1, 'LabelOrientation', 'horizontal');
    set(gca, 'FontSize', 9);
    
    % Reactive Power
    subplot(4,1,2);
    plot(t, QGrid, 'b-', 'LineWidth', 1.5); hold on;
    plot(t, QB, 'r--', 'LineWidth', 1.5);
    ylabel('Q (pu)', 'FontSize', 10);
    title('Reactive Power', 'FontSize', 11, 'FontWeight', 'bold');
    legend('Grid', 'Gen B', 'Location', 'best');
    grid on; grid minor;
    xline(5, 'k--', 'Breaker Closes', 'LineWidth', 1, 'LabelOrientation', 'horizontal');
    set(gca, 'FontSize', 9);
    
    % Voltage
    subplot(4,1,3);
    plot(t, VGrid, 'b-', 'LineWidth', 1.5); hold on;
    plot(t, VB, 'r--', 'LineWidth', 1.5);
    ylabel('V (pu)', 'FontSize', 10);
    title('Terminal Voltage', 'FontSize', 11, 'FontWeight', 'bold');
    legend('Grid', 'Gen B', 'Location', 'best');
    grid on; grid minor;
    xline(5, 'k--', 'Breaker Closes', 'LineWidth', 1, 'LabelOrientation', 'horizontal');
    set(gca, 'FontSize', 9);
    
    % Frequency
    subplot(4,1,4);
    plot(t, fGrid, 'b-', 'LineWidth', 1.5); hold on;
    plot(t, fB, 'r--', 'LineWidth', 1.5);
    ylabel('f (Hz)', 'FontSize', 10);
    xlabel('Time (s)', 'FontSize', 10);
    title('Frequency', 'FontSize', 11, 'FontWeight', 'bold');
    legend('Grid', 'Gen B', 'Location', 'best');
    grid on; grid minor;
    xline(5, 'k--', 'Breaker Closes', 'LineWidth', 1, 'LabelOrientation', 'horizontal');
    set(gca, 'FontSize', 9);
    
    sgtitle(titleStr, 'FontSize', 13, 'FontWeight', 'bold');
    
    saveas(gcf, fullfile(plotDir, [prefix, '_Combined.png']));
    saveas(gcf, fullfile(plotDir, [prefix, '_Combined.fig']));
    fprintf('Saved: %s_Combined.png\n', prefix);
    
    % Individual plots
    signals = {PGrid, PB; QGrid, QB; VGrid, VB; fGrid, fB};
    ylabels_str = {'P (pu)', 'Q (pu)', 'V (pu)', 'f (Hz)'};
    titles_str = {'Active Power', 'Reactive Power', 'Terminal Voltage', 'Frequency'};
    fnames = {'ActivePower', 'ReactivePower', 'Voltage', 'Frequency'};
    
    for k = 1:4
        fig = figure('Position', [100 100 700 350], 'Color', 'w');
        plot(t, signals{k,1}, 'b-', 'LineWidth', 1.5); hold on;
        plot(t, signals{k,2}, 'r--', 'LineWidth', 1.5);
        xlabel('Time (s)', 'FontSize', 11);
        ylabel(ylabels_str{k}, 'FontSize', 11);
        title([titleStr, ' - ', titles_str{k}], 'FontSize', 12, 'FontWeight', 'bold');
        legend('Grid', 'Gen B', 'Location', 'best');
        grid on; grid minor;
        xline(5, 'k--', 'Breaker Closes', 'LineWidth', 1, 'LabelOrientation', 'horizontal');
        set(gca, 'FontSize', 10);
        saveas(fig, fullfile(plotDir, [prefix, '_', fnames{k}, '.png']));
        fprintf('Saved: %s_%s.png\n', prefix, fnames{k});
        close(fig);
    end
end
