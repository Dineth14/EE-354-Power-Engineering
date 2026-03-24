% inspect_results.m
function inspect_results()
    try
        load(fullfile(pwd, 'Exercise1', 'sim_results.mat'));
        disp('Loaded results.');
        
        disp('--- logsout contents ---');
        if ~isempty(logsout) && logsout.numElements > 0
            for i = 1:logsout.numElements
                el = logsout.getElement(i);
                disp(['Name: ', el.Name, ' Class: ', class(el)]);
            end
        else
            disp('logsout is empty.');
        end
        
        disp('--- simlog_out contents ---');
        disp(simlog_out);
        print_simlog(simlog_out, 1, '  ');
    catch ME
        disp(['ERROR: ', ME.message]);
    end
    exit;
end

function print_simlog(node, depth, prefix)
    if depth > 2, return; end
    ch = node.childIDs;
    for i = 1:length(ch)
        cname = ch{i};
        cnode = node.childNode(cname);
        disp([prefix, cname]);
        print_simlog(cnode, depth+1, [prefix, '  ']);
    end
end
