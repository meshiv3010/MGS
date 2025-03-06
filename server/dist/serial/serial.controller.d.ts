import { SerialService } from './serial.service';
export declare class SerialController {
    private readonly serialService;
    constructor(serialService: SerialService);
    listPorts(): Promise<void>;
    getFirmwareVersion(): Promise<string>;
}
