% MATLAB Simulation Evidence sample for MDK.
% sysml-docgen:begin
% {
%   "elements": [
%     {
%       "id": "TST-MDK-MAT-001",
%       "name": "MATLAB bus voltage simulation evidence",
%       "type": "TestCase",
%       "stereotype": "testCase",
%       "description": "Simulation evidence imported from a MATLAB script.",
%       "owner": "Simulation Team",
%       "attributes": {
%         "method": "MATLAB time-domain simulation",
%         "criterion": "27.16 V <= bus_voltage <= 28.84 V",
%         "result": "pass",
%         "min_voltage": "27.7 V",
%         "max_voltage": "28.4 V"
%       },
%       "relations": [
%         {
%           "type": "verify",
%           "target": "REQ-MDK-JSON-001"
%         }
%       ]
%     }
%   ]
% }
% sysml-docgen:end

bus_voltage = [28.1, 27.9, 28.4, 27.7, 28.0];
assert(min(bus_voltage) >= 27.16);
assert(max(bus_voltage) <= 28.84);
