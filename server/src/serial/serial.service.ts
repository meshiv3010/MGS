import { Injectable } from '@nestjs/common';
import { SerialPort } from 'serialport';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SerialService {
  // Serial port configuration
  private SERIAL_PORT = 'COM6'; // Serial port name
  private BAUD_RATE = 9600; // Baud rate for communication

  // Paths for firmware files
  private NEW_FIRMWARE_FILE = path.resolve('C:\\Users\\meshi\\tamplateForMAGAS\\version9.17.15.01a.SPA.bin');
  private BACKUP_FIRMWARE_FILE = 'backup_firmware.bin';

  private port: SerialPort; // Serial port instance

  constructor() {
    // Initialize the serial port connection
    this.port = new SerialPort({ path: this.SERIAL_PORT, baudRate: this.BAUD_RATE });
  }

  /**
   * Lists available serial ports and logs them to the console.
   */
  async listSerialPorts(): Promise<void> {
    const ports = await SerialPort.list();
    if (ports.length === 0) {
      console.error('❌ No serial ports found');
    }
    ports.forEach(port => console.log(`${port.path} - ${port.manufacturer || 'Unknown Device'}`));
    console.log("Starting SerialService...");
  }

  /**
   * Sends a command to the serial port and waits for a response.
   * @param command - The command to send.
   * @param delay - Delay in milliseconds before resolving.
   * @returns A promise resolving to the received response.
   */
  async sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let response = '';
      console.log(`🔹 Sending command: ${command}`);
  
      // שליחת הפקודה לביטול עימוד
      this.port.write(`terminal length 0\n`, (err) => {
        if (err) {
          console.error(`❌ Error writing command: ${err.message}`);
          return reject(err);
        }
      });
  
      // שליחת הפקודה האמיתית אחרי השהייה קצרה (לוודא שהפקודה הראשונה התקבלה)
      setTimeout(() => {
        this.port.write(`${command}\n`, (err) => {
          if (err) {
            console.error(`❌ Error writing command: ${err.message}`);
            return reject(err);
          }
        });
      }, 500);
  
      // מאזין לקבלת נתונים מהנתב
      const handleData = (data: Buffer) => {
        const chunk = data.toString();
        response += chunk;
  
        // מזהים את ה-Prompt של הנתב כסימן סיום
        if (response.includes('# ') || response.includes('> ')) {
          this.port.removeListener('data', handleData);
          resolve(response.trim());
        }
      };
  
      this.port.on('data', handleData);
  
      // Timeout מוגדל ל-15 שניות
      setTimeout(() => {
        this.port.removeListener('data', handleData);
        resolve(response.trim() || 'No response received');
      }, 15000);
    });
  }

/**
 * Retrieves the current firmware version from the device.
 * @returns A promise resolving to the firmware version string.
 */
async getCurrentFirmware(): Promise<string> {
    // שליחה של פקודת enable לפני show version
    await this.sendCommand('enable');
    const response = await this.sendCommand('show version');  
    // שליפת השורה שמתחילה ב-"Cisco IOS XE Software"
    const versionLine = response.split('\n').find(line => line.startsWith('Cisco IOS XE Software'));
    
    if (versionLine) {
      console.log(`🔹 Found version line: ${versionLine}`);
      return versionLine;
    } else {
      console.log('❌ Version line not found');
      return 'Version line not found';
    }
  }
  

  /**
    * Creates a backup of the current firmware.
  */
  async backupFirmware(): Promise<void> {
    await this.sendCommand(`copy flash:current.bin flash:${this.BACKUP_FIRMWARE_FILE}`);
  }

  /**
   * Updates the firmware on the device.
   * @returns A promise resolving to a boolean indicating success or failure.
   */
  async updateFirmware(): Promise<boolean> {
    await this.sendCommand('enable firmware upgrade mode'); // Enable firmware update mode

    // Read the new firmware file
    const firmwareData = fs.readFileSync(this.NEW_FIRMWARE_FILE);

    // Send the firmware data to the device
    this.port.write(firmwareData);

    // Wait for the firmware update process to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify the updated firmware
    const response = await this.sendCommand('verify flash:firmware.bin');

    // Check if the verification was successful
    return !response.toLowerCase().includes('failed');
  }
}
