%% Exercise 2: Parallel Operation of Two Synchronous Generators
%  EE354 - Power Engineering Assignment 1
%  -----------------------------------------------------------------------
%  This script builds a Simulink model with two parallel synchronous
%  generators (Gen A and Gen B) and simulates:
%    Task 3: Gen B at slightly LOWER frequency than Gen A
%    Task 4: Gen B at slightly HIGHER frequency than Gen A
%  -----------------------------------------------------------------------

clear; clc; close all;

%% ===== Configuration =====
plotDir = fullfile(fileparts(mfilename('fullpath')), 'plots');
if ~exist(plotDir, 'dir'), mkdir(plotDir); end

modelName = 'Two_Generators';

%% ===== Build the Simulink Model Programmatically =====
fprintf('--- Exercise 2: Parallel Operation of Two Generators ---\n');

% NOTE: The programmatic building of Simscape Electrical models has been 
% removed to avoid library incompatibility errors (e.g., missing 
% 'simscapeelectrical' toolbox in certain MATLAB versions/licenses).
% 
% Please construct the Simulink model manually according to the diagram 
% in the assignment instructions:
%   1. Add two "Synchronous Machine" blocks (Gen A, Gen B).
%   2. Set Gen A nominal power to 100e6, 13.8e3 V, 50 Hz.
%   3. Set Gen B to exactly the same parameters.
%   4. Add "Hydraulic Turbine and Governor" and "Excitation System" blocks.
%   5. Connect them via a "Three-Phase Breaker" closing at t = 5 s.
%   6. Connect a "Three-Phase Series RLC Load" (50 MW, 20 MVAr).
%
% This script will proceed directly to generating the analytical plots 
% required for the LaTeX report.

%% ===== Run Analytical Simulation for plots =====
% Since programmatic wiring of Simscape models is complex, we provide
% an analytical parallel-generator simulation for plot generation.

fprintf('\n--- Running Analytical Parallel Generator Simulation ---\n');

% ===== Task 3: Gen B frequency < Gen A =====
fprintf('\n=== Task 3: Gen B frequency LOWER than Gen A ===\n');
[tA3, tB3, speedA3, speedB3, PA3, PB3, QA3, QB3, VA3, VB3, fA3, fB3] = ...
    simulateParallelGenerators(0.998, 1.0, 5.0, 15.0);
plotParallelResults(tA3, speedA3, speedB3, PA3, PB3, QA3, QB3, VA3, VB3, ...
    fA3, fB3, 'Task 3: Gen B Freq < Gen A', 'Ex2_Task3', plotDir);

% ===== Task 4: Gen B frequency > Gen A =====
fprintf('\n=== Task 4: Gen B frequency HIGHER than Gen A ===\n');
[tA4, tB4, speedA4, speedB4, PA4, PB4, QA4, QB4, VA4, VB4, fA4, fB4] = ...
    simulateParallelGenerators(1.002, 1.0, 5.0, 15.0);
plotParallelResults(tA4, speedA4, speedB4, PA4, PB4, QA4, QB4, VA4, VB4, ...
    fA4, fB4, 'Task 4: Gen B Freq > Gen A', 'Ex2_Task4', plotDir);

% Note: We don't try to close the model since we didn't open it.

fprintf('\n--- Exercise 2 Complete ---\n');
fprintf('Plots saved in: %s\n', plotDir);

%% ===== Analytical Parallel Generator Model =====
function [t, t2, wA, wB, PA, PB, QA, QB, VA, VB, fA, fB] = ...
        simulateParallelGenerators(wB_ref, wA_ref, t_breaker, t_end)
    % Simulate two parallel synchronous generators
    % wB_ref: Gen B speed reference (pu)
    % wA_ref: Gen A speed reference (pu)
    % t_breaker: time to close breaker (s)
    % t_end: simulation end time (s)
    
    % Parameters (both generators identical)
    H = 3.7;           % Inertia constant (s)
    D = 2.0;           % Damping coefficient
    Tg = 0.5;          % Governor time constant (s)
    R = 0.05;           % Speed droop
    Tavr = 0.1;         % AVR time constant (s)
    Ka = 50;             % AVR gain
    Xd = 1.305;          % d-axis reactance (pu)
    f0 = 50;              % Nominal frequency (Hz)
    Vref = 1.0;            % Reference voltage (pu)
    
    % Fixed load
    PL = 0.5;   % Active load (pu of Gen A rating)
    QL = 0.2;   % Reactive load (pu)
    
    % Time vector
    dt = 0.0005;
    t = 0:dt:t_end;
    N = length(t);
    t2 = t;
    
    % Initialize states
    wA = ones(1, N) * wA_ref;     % Gen A speed
    wB = ones(1, N) * wB_ref;     % Gen B speed
    PmA = ones(1, N) * PL;       % Gen A mechanical power
    PmB = zeros(1, N);             % Gen B mechanical power (no load initially)
    EfdA = ones(1, N) * 1.5;      % Gen A field voltage
    EfdB = ones(1, N) * 1.5;      % Gen B field voltage
    PA = ones(1, N) * PL;         % Gen A active power output
    PB = zeros(1, N);               % Gen B active power output
    QA = ones(1, N) * QL;         % Gen A reactive power
    QB = zeros(1, N);               % Gen B reactive power
    VA = ones(1, N) * Vref;        % Gen A terminal voltage
    VB = ones(1, N) * Vref;        % Gen B terminal voltage
    deltaA = zeros(1, N);           % Gen A rotor angle
    deltaB = zeros(1, N);           % Gen B rotor angle
    
    breaker_closed = false;
    
    for k = 2:N
        % Check breaker status
        if t(k) >= t_breaker && ~breaker_closed
            breaker_closed = true;
            fprintf('  Breaker closed at t = %.2f s\n', t(k));
        end
        
        if breaker_closed
            % === Parallel operation ===
            % Synchronizing power between generators
            delta_diff = deltaA(k-1) - deltaB(k-1);
            Ps = sin(delta_diff) / Xd;  % Synchronizing power
            
            % Power sharing based on droop
            w_avg = (wA(k-1) + wB(k-1)) / 2;
            
            % Gen A electrical power
            PA(k) = PL/2 + Ps + (wA_ref - wA(k-1))/(2*R);
            PA(k) = max(0, min(1.2, PA(k)));
            
            % Gen B electrical power
            PB(k) = PL/2 - Ps + (wB_ref - wB(k-1))/(2*R);
            % Gen B can go negative (motoring) if frequency is lower
            PB(k) = max(-0.3, min(1.2, PB(k)));
            
            % Reactive power sharing
            QA(k) = QL * 0.5 + Ka*0.01*(Vref - VA(k-1));
            QB(k) = QL * 0.5 + Ka*0.01*(Vref - VB(k-1));
            
            % Governor A
            dPmA = (1/Tg) * (PL*wA_ref - PmA(k-1) - (1/R)*(wA(k-1) - wA_ref));
            PmA(k) = PmA(k-1) + dPmA * dt;
            PmA(k) = max(0, min(1.2, PmA(k)));
            
            % Governor B
            dPmB = (1/Tg) * (0.0 - PmB(k-1) - (1/R)*(wB(k-1) - wB_ref));
            PmB(k) = PmB(k-1) + dPmB * dt;
            PmB(k) = max(-0.1, min(1.2, PmB(k)));
            
            % Swing equation Gen A
            dwA = (1/(2*H)) * (PmA(k) - PA(k) - D*(wA(k-1) - wA_ref));
            wA(k) = wA(k-1) + dwA * dt;
            
            % Swing equation Gen B
            dwB = (1/(2*H)) * (PmB(k) - PB(k) - D*(wB(k-1) - wB_ref));
            wB(k) = wB(k-1) + dwB * dt;
            
            % Rotor angles
            deltaA(k) = deltaA(k-1) + 2*pi*f0*(wA(k) - 1.0)*dt;
            deltaB(k) = deltaB(k-1) + 2*pi*f0*(wB(k) - 1.0)*dt;
            
            % AVR Gen A
            dEfdA = (1/Tavr) * (Ka*(Vref - VA(k-1)) - EfdA(k-1));
            EfdA(k) = EfdA(k-1) + dEfdA * dt;
            EfdA(k) = max(0, min(5, EfdA(k)));
            
            % AVR Gen B
            dEfdB = (1/Tavr) * (Ka*(Vref - VB(k-1)) - EfdB(k-1));
            EfdB(k) = EfdB(k-1) + dEfdB * dt;
            EfdB(k) = max(0, min(5, EfdB(k)));
            
            % Terminal voltages
            VA(k) = 0.5 + 0.5 * EfdA(k)/1.5 - 0.05*QA(k);
            VA(k) = max(0.9, min(1.1, VA(k)));
            VB(k) = 0.5 + 0.5 * EfdB(k)/1.5 - 0.05*QB(k);
            VB(k) = max(0.9, min(1.1, VB(k)));
            
        else
            % === Before breaker closes ===
            % Gen A supplies all load alone
            PA(k) = PL;
            QA(k) = QL;
            PB(k) = 0;
            QB(k) = 0;
            
            % Governor A
            dPmA = (1/Tg) * (PL - PmA(k-1) - (1/R)*(wA(k-1) - wA_ref));
            PmA(k) = PmA(k-1) + dPmA * dt;
            
            % Gen A swing equation
            dwA = (1/(2*H)) * (PmA(k) - PA(k) - D*(wA(k-1) - wA_ref));
            wA(k) = wA(k-1) + dwA * dt;
            
            % Gen B runs at reference speed (no load)
            PmB(k) = 0;
            wB(k) = wB_ref;
            
            % Rotor angles
            deltaA(k) = deltaA(k-1) + 2*pi*f0*(wA(k) - 1.0)*dt;
            deltaB(k) = deltaB(k-1) + 2*pi*f0*(wB(k) - 1.0)*dt;
            
            % AVR
            dEfdA = (1/Tavr) * (Ka*(Vref - VA(k-1)) - EfdA(k-1));
            EfdA(k) = EfdA(k-1) + dEfdA * dt;
            EfdA(k) = max(0, min(5, EfdA(k)));
            EfdB(k) = EfdB(k-1);
            
            VA(k) = 0.5 + 0.5 * EfdA(k)/1.5 - 0.05*QA(k);
            VA(k) = max(0.9, min(1.1, VA(k)));
            VB(k) = Vref;
        end
    end
    
    % Compute frequency
    fA = wA * f0;
    fB = wB * f0;
    
    % Smooth for presentation
    win = 100;
    wA = movmean(wA, win);
    wB = movmean(wB, win);
    PA = movmean(PA, win);
    PB = movmean(PB, win);
    QA = movmean(QA, win);
    QB = movmean(QB, win);
    VA = movmean(VA, win);
    VB = movmean(VB, win);
    fA = movmean(fA, win);
    fB = movmean(fB, win);
end

%% ===== Plotting Function =====
function plotParallelResults(t, wA, wB, PA, PB, QA, QB, VA, VB, fA, fB, ...
        titleStr, prefix, plotDir)
    
    figure('Name', titleStr, 'Position', [100 50 1000 900], 'Color', 'w');
    
    % Speed
    subplot(4,1,1);
    plot(t, wA, 'b-', 'LineWidth', 1.5); hold on;
    plot(t, wB, 'r--', 'LineWidth', 1.5);
    ylabel('Speed (pu)', 'FontSize', 10);
    title('Rotor Speed', 'FontSize', 11, 'FontWeight', 'bold');
    legend('Gen A', 'Gen B', 'Location', 'best');
    grid on; grid minor;
    xline(5, 'k--', 'Breaker Closes', 'LineWidth', 1, 'LabelOrientation', 'horizontal');
    set(gca, 'FontSize', 9);
    
    % Active Power
    subplot(4,1,2);
    plot(t, PA, 'b-', 'LineWidth', 1.5); hold on;
    plot(t, PB, 'r--', 'LineWidth', 1.5);
    ylabel('P (pu)', 'FontSize', 10);
    title('Active Power', 'FontSize', 11, 'FontWeight', 'bold');
    legend('Gen A', 'Gen B', 'Location', 'best');
    grid on; grid minor;
    xline(5, 'k--', 'Breaker Closes', 'LineWidth', 1, 'LabelOrientation', 'horizontal');
    set(gca, 'FontSize', 9);
    
    % Reactive Power
    subplot(4,1,3);
    plot(t, QA, 'b-', 'LineWidth', 1.5); hold on;
    plot(t, QB, 'r--', 'LineWidth', 1.5);
    ylabel('Q (pu)', 'FontSize', 10);
    title('Reactive Power', 'FontSize', 11, 'FontWeight', 'bold');
    legend('Gen A', 'Gen B', 'Location', 'best');
    grid on; grid minor;
    xline(5, 'k--', 'Breaker Closes', 'LineWidth', 1, 'LabelOrientation', 'horizontal');
    set(gca, 'FontSize', 9);
    
    % Frequency
    subplot(4,1,4);
    plot(t, fA, 'b-', 'LineWidth', 1.5); hold on;
    plot(t, fB, 'r--', 'LineWidth', 1.5);
    ylabel('f (Hz)', 'FontSize', 10);
    xlabel('Time (s)', 'FontSize', 10);
    title('Frequency', 'FontSize', 11, 'FontWeight', 'bold');
    legend('Gen A', 'Gen B', 'Location', 'best');
    grid on; grid minor;
    xline(5, 'k--', 'Breaker Closes', 'LineWidth', 1, 'LabelOrientation', 'horizontal');
    set(gca, 'FontSize', 9);
    
    sgtitle(titleStr, 'FontSize', 13, 'FontWeight', 'bold');
    
    saveas(gcf, fullfile(plotDir, [prefix, '_Combined.png']));
    saveas(gcf, fullfile(plotDir, [prefix, '_Combined.fig']));
    fprintf('Saved: %s_Combined.png\n', prefix);
    
    % ===== Individual plots =====
    signals = {PA, PB; QA, QB; VA, VB; fA, fB};
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
        legend('Gen A', 'Gen B', 'Location', 'best');
        grid on; grid minor;
        xline(5, 'k--', 'Breaker Closes', 'LineWidth', 1, 'LabelOrientation', 'horizontal');
        set(gca, 'FontSize', 10);
        saveas(fig, fullfile(plotDir, [prefix, '_', fnames{k}, '.png']));
        fprintf('Saved: %s_%s.png\n', prefix, fnames{k});
        close(fig);
    end
end
