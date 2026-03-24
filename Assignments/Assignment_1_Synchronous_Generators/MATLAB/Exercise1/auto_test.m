% auto_test.m
disp('Starting auto_test...');
try
    addpath(pwd);
    model_name = 'Exercise1_SyncGen';
    load_system(model_name);
    
    set_param(model_name, 'SignalLogging', 'on');
    set_param(model_name, 'SignalLoggingName', 'logsout');
    
    sm_block = 'Exercise1_SyncGen/Synchronous Machine Round Rotor (standard)';
    ph = get_param(sm_block, 'PortHandles');
    
    % The 'm' port is the Outport
    set_param(ph.Outport(1), 'DataLogging', 'on');
    set_param(ph.Outport(1), 'DataLoggingNameMode', 'Custom');
    set_param(ph.Outport(1), 'DataLoggingName', 'm_log');
    
    % Run simulation
    out = sim(model_name);
    
    % Access logsout
    logsout = out.logsout;
    m_log = logsout.getElement('m_log');
    
    % Display struct elements
    disp(class(m_log.Values));
    if isa(m_log.Values, 'Simulink.TsArray')
        % It's a bus!
        sigNames = m_log.Values.format('cell');
        disp('Signals inside m_log bus:');
        for i=1:length(sigNames)
            disp(sigNames{i});
        end
    else
        % It's a vector
        disp(size(m_log.Values.Data));
    end
catch ME
    disp(['ERROR: ' ME.message]);
end
exit;
