% Exercise 1: Model Setup
disp('--- STEP 1: MODEL SETUP ---');
orig_dir = pwd;
target_dir = fullfile(orig_dir, 'Exercise1');

disp('a) Opening SMControlExample safely...');
try
    openExample('simscapeelectrical/SMControlExample');
    disp('[OK] Example opened successfully.');
catch ME
    error('Failed to open example: %s', ME.message);
end

pause(2); % Wait for initialization

% Find newly opened files
example_dir = pwd;
slx_files = dir(fullfile(example_dir, '*.slx'));
if isempty(slx_files)
    error('Could not find .slx files in example directory.');
end
model_filename = slx_files(1).name;
[~, original_name, ~] = fileparts(model_filename);
disp(['Model found: ', original_name]);

% Close the model to safely copy files
close_system(original_name, 0);

disp(['b) Copying files to ', target_dir]);
if ~exist(target_dir, 'dir')
    mkdir(target_dir);
end
copyfile(fullfile(example_dir, '*'), target_dir);
disp('[OK] All files copied.');

% Return to original dir
cd(orig_dir);
addpath(target_dir);

disp('c) Renaming the copied model...');
old_model_path = fullfile(target_dir, model_filename);
new_model_name = 'Exercise1_SyncGen';
new_model_path = fullfile(target_dir, [new_model_name, '.slx']);
movefile(old_model_path, new_model_path);
disp(['[OK] Renamed to ', new_model_name, '.slx']);

disp('d) Opening the copied model...');
open_system(new_model_name);
disp('[OK] Model opened successfully.');

disp('--- STEP 1 COMPLETE ---');
