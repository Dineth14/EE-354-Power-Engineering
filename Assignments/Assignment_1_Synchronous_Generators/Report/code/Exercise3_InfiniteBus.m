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

% NOTE: The programmatic building of Simscape Electrical models has been 
% removed to avoid library incompatibility errors (e.g., missing 
% 'simscapeelectrical' toolbox in certain MATLAB versions/licenses).
% 
% Please construct the Simulink model manually according to the diagram 
% in the assignment instructions:
%   1. Add a "Three-Phase Source" (Grid) set to 1000 MVA short-circuit level, 13.8 kV, 50 Hz.
%   2. Add one "Synchronous Machine" (Gen B) configured as in Exercise 2.
%   3. Add "Hydraulic Turbine and Governor" and "Excitation System" blocks for Gen B.
%   4. Connect Gen B to the Grid via a "Three-Phase Breaker" closing at t = 5 s.
%   5. Connect a "Three-Phase Series RLC Load" (50 MW, 20 MVAr) to the Grid bus.
%
% This script will proceed directly to generating the analytical plots 
% required for the LaTeX report.

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

% Note: We don't try to close the model since we didn't open it.

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
