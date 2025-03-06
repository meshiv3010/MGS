export declare class SerialService {
    private SERIAL_PORT;
    private BAUD_RATE;
    private NEW_FIRMWARE_FILE;
    private BACKUP_FIRMWARE_FILE;
    private port;
    constructor();
    listSerialPorts(): Promise<void>;
    sendCommand(command: string): Promise<string>;
    getCurrentFirmware(): Promise<string>;
    backupFirmware(): Promise<void>;
    updateFirmware(): Promise<boolean>;
}
