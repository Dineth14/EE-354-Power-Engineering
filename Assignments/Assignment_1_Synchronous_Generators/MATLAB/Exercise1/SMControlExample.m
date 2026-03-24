%% Three-Phase Synchronous Machine Control
% 
% This example shows how to control and initialize a Synchronous Machine
% (SM). The test circuit shows the SM operating as a generator. The
% terminal voltage is controlled using an AVR and the speed is controlled
% using a governor.
% 
% To view the SM machine base values and initial conditions, right-click
% the Synchronous Machine Round Rotor (standard) block and select
% 'Electrical' and then 'Display Base Values', 'Display Associated Base
% Values', or 'Display Associated Initial Conditions'. The overall model is
% initialized to start in periodic steady state to supply a load of 250
% MW/15 Mvar.
% 

% Copyright 2013-2023 The MathWorks, Inc.



%% Model

open_system('SMControl')

set_param(find_system('SMControl','FindAll', 'on','type','annotation','Tag','ModelFeatures'),'Interpreter','off')

%% Simulation Results from Simscape Logging
%%
%
% The plot below shows the terminal voltage and rotor velocity for the 
% Synchronous Machine.
%

SMControlPlotResults;

%% Results from Real-Time Simulation
%%
%
% This example has been tested on a Speedgoat Performance real-time target 
% machine with an Intel(R) 3.5 GHz i7 multi-core CPU. This model can run 
% in real time with a step size of 100 microseconds.

%%

