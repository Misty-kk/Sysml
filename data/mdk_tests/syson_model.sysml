requirement REQ-MDK-SYSON-001 "SysON text telemetry requirement";
part BLK-MDK-SYSON-TM "SysON telemetry processor";
interface IF-MDK-SYSON-CAN "SysON CAN telemetry interface";
testcase TST-MDK-SYSON-001 "SysON telemetry verification";
satisfy BLK-MDK-SYSON-TM REQ-MDK-SYSON-001;
verify REQ-MDK-SYSON-001 TST-MDK-SYSON-001;
connect BLK-MDK-SYSON-TM IF-MDK-SYSON-CAN;
