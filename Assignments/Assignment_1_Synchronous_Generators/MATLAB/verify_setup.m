% -------------------------------------------------------------------------
% EE354 Synchronous Generator Assignment
% System Requirements and Setup Verification Script
% -------------------------------------------------------------------------

disp('======================================================');
disp('   Starting MATLAB Environment & Setup Verification   ');
disp('======================================================');

all_passed = true;

%% 1. Check Toolboxes
disp('1. Checking Required Toolboxes...');
required_toolboxes = {
    'Simulink', 
    'Simscape', 
    'Simscape Electrical', 
    'Control System Toolbox'
};

installed_toolboxes = ver;
installed_names = {installed_toolboxes.Name};

for i = 1:length(required_toolboxes)
    tb_name = required_toolboxes{i};
    % Check for exact match or contains (since some toolboxes changed names)
    match_found = any(strcmpi(installed_names, tb_name)) || any(contains(installed_names, tb_name, 'IgnoreCase', true));
    
    if match_found
        fprintf('  [OK] %s is installed.\n', tb_name);
    else
        % Fallback for older Simscape Electrical name
        if strcmp(tb_name, 'Simscape Electrical') && any(contains(installed_names, 'SimPowerSystems', 'IgnoreCase', true))
            fprintf('  [OK] SimPowerSystems (older name for Simscape Electrical) is installed.\n');
        else
            fprintf('  [FAIL] %s is MISSING!\n', tb_name);
            all_passed = false;
        end
    end
end
fprintf('\n');

%% 2. Check MATLAB Version (R2020a or later recommended)
disp('2. Checking MATLAB Version...');
v = ver('MATLAB');
ver_string = v.Release;

% Basic check to extract year from release string (e.g., '(R2023a)')
release_year_str = regexp(ver_string, '\d{4}', 'match');
if ~isempty(release_year_str)
    release_year = str2double(release_year_str{1});
    if release_year >= 2020
        fprintf('  [OK] MATLAB Version %s is compatible.\n', ver_string);
    else
        fprintf('  [WARN] MATLAB Version %s is older than R2020a. Some features might differ.\n', ver_string);
    end
else
    fprintf('  [WARN] Could not determine MATLAB year from release %s.\n', ver_string);
end
fprintf('\n');

%% 3. Verify Base Example (SMControlExample)
disp('3. Verifying the Base Example (SMControlExample)...');
try
    % openExample extracts files to a temporary or default working directory
    % and opens the SLX model automatically.
    fprintf('  Attempting to load example "simscapeelectrical/SMControlExample"...\n');
    openExample('simscapeelectrical/SMControlExample');
    fprintf('  [OK] Base example opened successfully.\n');
    
    % Get the current model name to ensure it is open
    expected_model = 'power_SMControlExample';
    if bdIsLoaded(expected_model)
        fprintf('  [OK] Model "%s" verified as loaded in memory.\n', expected_model);
    else
        fprintf('  [WARN] Example opened, but model "%s" not found in memory. It might have a different name.\n', expected_model);
    end
catch ME
    fprintf('  [FAIL] Failed to open base example.\n  Error details: %s\n', ME.message);
    all_passed = false;
end
fprintf('\n');

%% 4. Setup Working Directory explicitly (as requested)
disp('4. Setting up Base Example in Current Working Directory...');
try
    base_dir = pwd;
    fprintf('  Current directory: %s\n', base_dir);
    
    if bdIsLoaded('power_SMControlExample')
        % Close the original one without saving
        % We will copy it explicitly in Exercise 1, but we ensure it works here
        save_system('power_SMControlExample', fullfile(base_dir, 'power_SMControlExample_temp.slx'));
        close_system('power_SMControlExample');
        
        fprintf('  [OK] Successfully copied example model to the local working directory:\n');
        fprintf('       -> %s\n', fullfile(base_dir, 'power_SMControlExample_temp.slx'));
    else
        fprintf('  [WARN] Could not find loaded model to save locally.\n');
    end
catch ME
    fprintf('  [FAIL] Failed during file copy step. Error: %s\n', ME.message);
    all_passed = false;
end
fprintf('\n');

%% Final Status
disp('======================================================');
if all_passed
    disp('   Verification Complete: System is READY for Assignment');
    disp('======================================================');
    disp('You can now proceed with Exercise 1.');
else
    disp('   Verification Complete: System has MISSING REQUIREMENTS');
    disp('======================================================');
    disp('Please resolve the errors above before continuing.');
end
