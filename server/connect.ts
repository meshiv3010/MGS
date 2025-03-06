const { SerialPort } = require('serialport');
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const SERIAL_PORT = 'COM6';
const BAUD_RATE = 9600;
const NEW_FIRMWARE_FILE = path.resolve('C:\\Users\\meshi\\tamplateForMAGAS\\version9.17.15.01a.SPA.bin');
const BACKUP_FIRMWARE_FILE = 'backup_firmware.bin';

async function listSerialPorts(): Promise<void> {
    const ports = await SerialPort.list();
    ports.forEach(port => {
        console.log(`    ${port.path} - ${port.manufacturer || 'Unknown Device'}`);
    });
}

async function sendCommand(port: SerialPort, command: string, delay: number = 2000): Promise<string> {
    return new Promise((resolve) => {
        let response = '';
        port.write(`${command}\n`, (err) => {
            if (err) {
                console.error(`Error writing command: ${err.message}`);
                resolve(response);
            }
        });
        
        setTimeout(() => {
            port.read();
            resolve(response);
        }, delay);
    });
}

async function getCurrentFirmware(port: SerialPort): Promise<string> {
    await sendCommand(port, 'enable', 2000);
    const response = await sendCommand(port, 'show version', 2000);
    const versionLine = response.split('\n').find(line => line.includes('Version'))?.trim() || 'Version not found';
    console.log(`Current version:\n${versionLine}`);
    return versionLine;
}

async function backupFirmware(port: SerialPort): Promise<void> {
    console.log('Creating a backup of the current version...');
    await sendCommand(port, `copy flash:current.bin flash:${BACKUP_FIRMWARE_FILE}`, 5000);
    console.log('The backup is complete.');
}

async function updateFirmware(port: SerialPort): Promise<boolean> {
    console.log(`Starting to upload the new version from ${NEW_FIRMWARE_FILE}...`);
    await sendCommand(port, 'enable firmware upgrade mode', 2000);
    
    const firmwareData = fs.readFileSync(NEW_FIRMWARE_FILE);
    port.write(firmwareData);
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Finished uploading the file. Verifying installation...');

    const response = await sendCommand(port, 'verify flash:firmware.bin', 5000);
    if (response.toLowerCase().includes('failed')) {
        console.error('Installation error! Initiating restore operation...');
        await restoreFirmware(port);
        return false;
    }
    return true;
}

async function restoreFirmware(port: SerialPort): Promise<void> {
    console.log('Restoring the previous version...');
    await sendCommand(port, `copy flash:${BACKUP_FIRMWARE_FILE} flash:current.bin`, 5000);
    await sendCommand(port, 'reload', 10000);
    console.log('The router has been restored to the previous version.');
}

async function main(): Promise<void> {
    if (!fs.existsSync(NEW_FIRMWARE_FILE)) {
        console.error('✖ Error: The file is not found in the specified path');
        return;
    }
    console.log('✔ The file is found and readable.');

    try {
        const port = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });
        console.log(`Connected to ${SERIAL_PORT} at speed ${BAUD_RATE}.`);
        
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for connection
        
        const currentVersion = await getCurrentFirmware(port);
        await backupFirmware(port);
        const updateSuccess = await updateFirmware(port);
        
        if (updateSuccess) {
            console.log('Firmware update completed successfully!');
            await sendCommand(port, 'reload', 10000);
        } else {
            console.error('Update failed, firmware restored.');
        }
    } catch (error) {
        console.error(`Error: ${error}`);
    }
}

listSerialPorts().then(main);
