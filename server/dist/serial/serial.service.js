"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerialService = void 0;
const common_1 = require("@nestjs/common");
const serialport_1 = require("serialport");
const fs = require("fs");
const path = require("path");
let SerialService = class SerialService {
    constructor() {
        this.SERIAL_PORT = 'COM6';
        this.BAUD_RATE = 9600;
        this.NEW_FIRMWARE_FILE = path.resolve('C:\\Users\\meshi\\tamplateForMAGAS\\version9.17.15.01a.SPA.bin');
        this.BACKUP_FIRMWARE_FILE = 'backup_firmware.bin';
        this.port = new serialport_1.SerialPort({ path: this.SERIAL_PORT, baudRate: this.BAUD_RATE });
    }
    async listSerialPorts() {
        const ports = await serialport_1.SerialPort.list();
        if (ports.length === 0) {
            console.error('❌ No serial ports found');
        }
        ports.forEach(port => console.log(`${port.path} - ${port.manufacturer || 'Unknown Device'}`));
        console.log("Starting SerialService...");
    }
    async sendCommand(command) {
        return new Promise((resolve, reject) => {
            let response = '';
            console.log(`🔹 Sending command: ${command}`);
            this.port.write(`terminal length 0\n`, (err) => {
                if (err) {
                    console.error(`❌ Error writing command: ${err.message}`);
                    return reject(err);
                }
            });
            setTimeout(() => {
                this.port.write(`${command}\n`, (err) => {
                    if (err) {
                        console.error(`❌ Error writing command: ${err.message}`);
                        return reject(err);
                    }
                });
            }, 500);
            const handleData = (data) => {
                const chunk = data.toString();
                response += chunk;
                if (response.includes('# ') || response.includes('> ')) {
                    this.port.removeListener('data', handleData);
                    resolve(response.trim());
                }
            };
            this.port.on('data', handleData);
            setTimeout(() => {
                this.port.removeListener('data', handleData);
                resolve(response.trim() || 'No response received');
            }, 15000);
        });
    }
    async getCurrentFirmware() {
        await this.sendCommand('enable');
        const response = await this.sendCommand('show version');
        const versionLine = response.split('\n').find(line => line.startsWith('Cisco IOS XE Software'));
        if (versionLine) {
            console.log(`🔹 Found version line: ${versionLine}`);
            return versionLine;
        }
        else {
            console.log('❌ Version line not found');
            return 'Version line not found';
        }
    }
    async backupFirmware() {
        await this.sendCommand(`copy flash:current.bin flash:${this.BACKUP_FIRMWARE_FILE}`);
    }
    async updateFirmware() {
        await this.sendCommand('enable firmware upgrade mode');
        const firmwareData = fs.readFileSync(this.NEW_FIRMWARE_FILE);
        this.port.write(firmwareData);
        await new Promise(resolve => setTimeout(resolve, 2000));
        const response = await this.sendCommand('verify flash:firmware.bin');
        return !response.toLowerCase().includes('failed');
    }
};
exports.SerialService = SerialService;
exports.SerialService = SerialService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SerialService);
//# sourceMappingURL=serial.service.js.map