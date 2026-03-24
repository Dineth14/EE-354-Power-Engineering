% Exercise 1: Understanding the Model Structure
disp('--- STEP 2: UNDERSTANDING MODEL STRUCTURE ---');
model_name = 'Exercise1_SyncGen';

% Check if model is open
if ~bdIsLoaded(model_name)
    open_system(model_name);
end

% a) List ALL blocks
disp('a) Listing blocks in the model...');
all_blocks = find_system(model_name, 'Type', 'block');
fprintf('Found %d blocks total.\n', length(all_blocks));
top_blocks = find_system(model_name, 'SearchDepth', 1, 'Type', 'block');
for i = 2:length(top_blocks)
    bType = get_param(top_blocks{i}, 'BlockType');
    bName = strrep(get_param(top_blocks{i}, 'Name'), char(10), ' ');
    fprintf('  - %s (Type: %s)\n', bName, bType);
end

% b) List signal logging configurations
disp('b) Listing signal logging configurations...');
logged_signals = find_system(model_name, 'FindAll', 'on', 'Type', 'port', 'DataLogging', 'on');
if isempty(logged_signals)
    disp('  No explicitly logged signals found.');
else
    fprintf('  Found %d logged signals.\n', length(logged_signals));
    for i = 1:length(logged_signals)
        pName = get_param(logged_signals(i), 'Name');
        if isempty(pName), pName = '<unnamed>'; end
        pParent = strrep(get_param(logged_signals(i), 'Parent'), char(10), ' ');
        fprintf('  - Signal "%s" from block "%s"\n', pName, pParent);
    end
end

% c) List workspace variables
disp('c) Listing workspace variables output configuration...');
try
    out_vars = get_param(model_name, 'ReturnWorkspaceOutputsName');
    fprintf('  Model returns outputs to: %s\n', out_vars);
catch
    disp('  ReturnWorkspaceOutputsName not defined in this model version.');
end

to_workspaces = find_system(model_name, 'BlockType', 'ToWorkspace');
if isempty(to_workspaces)
    disp('  No "To Workspace" blocks found.');
else
    for i = 1:length(to_workspaces)
        varName = get_param(to_workspaces{i}, 'VariableName');
        bName = strrep(get_param(to_workspaces{i}, 'Name'), char(10), ' ');
        fprintf('  - Block "%s" outputs to variable "%s"\n', bName, varName);
    end
end

% d) Identify load variation block
disp('d) Identifying load variation block...');
cb_blocks = find_system(model_name, 'RegExp', 'on', 'Name', '.*Breaker.*');
for i = 1:length(cb_blocks)
    bName = strrep(get_param(cb_blocks{i}, 'Name'), char(10), ' ');
    try
        tTrans = get_param(cb_blocks{i}, 'TransTime');
        fprintf('  - Breaker Block: "%s" switches at: [%s]\n', bName, num2str(tTrans));
    catch
        fprintf('  - Breaker Block: "%s" found.\n', bName);
    end
end
step_blocks = find_system(model_name, 'BlockType', 'Step');
for i = 1:length(step_blocks)
    bName = strrep(get_param(step_blocks{i}, 'Name'), char(10), ' ');
    try
        tStep = get_param(step_blocks{i}, 'Time');
        fprintf('  - Step Block: "%s" applies variation at t=%s sec\n', bName, num2str(tStep));
    catch
        fprintf('  - Step Block: "%s" found.\n', bName);
    end
end

disp('--- STEP 2 COMPLETE ---');
