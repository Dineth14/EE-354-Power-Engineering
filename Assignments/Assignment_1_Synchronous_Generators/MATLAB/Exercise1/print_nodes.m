% print_nodes.m
addpath(pwd);
model_name = 'Exercise1_SyncGen';
load_system(model_name);

set_param(model_name, 'SimscapeLogType', 'all');
set_param(model_name, 'SimscapeLogName', 'simlog_out');

disp('Simulating...');
out = sim(model_name);
disp('Done simulation. Getting log...');

simlog_out = out.simlog_out;
ch = simlog_out.childIDs;
fid = fopen('nodes.txt', 'w');
for i=1:length(ch)
    cname = ch{i};
    fprintf(fid, '%s\n', cname);
    try
        ch2 = simlog_out.childNode(cname).childIDs;
        for j=1:length(ch2)
            c2name = ch2{j};
            fprintf(fid, '  %s\n', c2name);
            try
                ch3 = simlog_out.childNode(cname).childNode(c2name).childIDs;
                for k=1:length(ch3)
                    fprintf(fid, '    %s\n', ch3{k});
                end
            catch
            end
        end
    catch
    end
end
fclose(fid);
disp('Saved nodes.txt');
exit;
