%% Three-Phase Synchronous Machine Control - Plot Simulation Results
% This example shows how to control and initialize a Synchronous Machine (SM).
% The test circuit shows the SM operating as a generator. The terminal
% voltage is controlled using an AVR and the speed is controlled using a
% governor.
%
% To view the SM machine base values and initial conditions, right-click
% the Synchronous Machine Round Rotor (standard) block and select
% 'Electrical' and then 'Display Base Values', 'Display Associated Base
% Values', or 'Display Associated Initial Conditions'. The overall model is
% initialized to start in periodic steady state to supply a load of
% 250 MW/15 Mvar. To view machine and controllers, open the model
% SMControl.

% Copyright 2013-2023 The MathWorks, Inc.

% Generate new simulation results if they don't exist or if they need to be updated
if ~exist('simlog_SMControl', 'var') || ...
        simlogNeedsUpdate(simlog_SMControl, 'SMControl') 
    sim('SMControl')
    % Model StopFcn callback adds a timestamp to the Simscape simulation data log
end

% Reuse figure if it exists, else create new figure
if ~exist('h1_SMControl', 'var') || ...
        ~isgraphics(h1_SMControl, 'figure')
    h1_SMControl = figure('Name', 'SMControl');
end
figure(h1_SMControl)
clf(h1_SMControl)

simlog_t = simlog_SMControl.AVR_and_Exciter.Terminal_Voltage_Measurement.pu_output.series.time;
simlog_pu_Vt = simlog_SMControl.AVR_and_Exciter.Terminal_Voltage_Measurement.pu_output.series.values;
simlog_pu_w = simlog_SMControl.Governor_and_Prime_Mover.Rotor_Velocity_Measurement.pu_output.series.values;

subplot(2,1,1), plot(simlog_t,simlog_pu_Vt)
grid('on');
ylabel('Terminal voltage (per-unit)')
subplot(2,1,2), plot(simlog_t,simlog_pu_w)
grid('on');
xlabel('Time (s)'), ylabel('Rotor velocity (per-unit)')

clear simlog_t simlog_pu_VT simlog_pu_w
