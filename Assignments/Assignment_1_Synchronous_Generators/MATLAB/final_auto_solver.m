function final_auto_solver()
% final_auto_solver.m
disp('Starting final_auto_solver...');
try
    %% Bypass Windows Path Length Limit
    if ~exist('C:\temp_slprj', 'dir')
        mkdir('C:\temp_slprj');
    end
    Simulink.fileGenControl('set', 'CacheFolder', 'C:\temp_slprj', 'CodeGenFolder', 'C:\temp_slprj');
    disp('Cache folder set to C:\temp_slprj to avoid Windows path length limit.');

    orig_dir = pwd;
    target_dir = fullfile(orig_dir, 'Exercise1');
    addpath(target_dir);
    model_name = 'Exercise1_SyncGen';
    load_system(model_name);
    
    % Force single simulation output object
    set_param(model_name, 'ReturnWorkspaceOutputs', 'on');
    set_param(model_name, 'ReturnWorkspaceOutputsName', 'out');
    
    % Enable full logging
    set_param(model_name, 'SignalLogging', 'on');
    set_param(model_name, 'SignalLoggingName', 'logsout');
    set_param(model_name, 'SimscapeLogType', 'all');
    set_param(model_name, 'SimscapeLogName', 'simlog_out');
    
    % Run simulation
    disp('Simulating...');
    out = sim(model_name);
    disp('Simulation finished.');
    
    % Find correct signals
    simlog = out.simlog_out;
    
    fid = fopen('found_nodes.txt', 'w');
    if fid == -1
        disp('ERROR: cannot open found_nodes.txt');
    end
    search_simlog(simlog, 'simlog_out', fid);
    fclose(fid);
    disp('Saved found_nodes.txt');

catch ME
    disp(['ERROR: ' ME.getReport()]);
end
exit;

end

function search_simlog(node, path_str, fid)
    ch = node.childIDs;
    for i = 1:length(ch)
        cname = ch{i};
        cnode = node.childNode(cname);
        try
            % If it has Data property, it is a series
            s = cnode.series;
            fprintf(fid, '%s.%s\n', path_str, cname);
        catch
            % It is a parent node
            search_simlog(cnode, [path_str, '.', cname], fid);
        end
    end
end
