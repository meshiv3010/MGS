import { Controller, Get } from '@nestjs/common';
import { SerialService } from './serial.service';

@Controller('serial')
export class SerialController {
  constructor(private readonly serialService: SerialService) {}

  @Get('list-ports')
  async listPorts() {
    return this.serialService.listSerialPorts();
  }

  @Get('firmware-version')
  async getFirmwareVersion() {
    return this.serialService.getCurrentFirmware();
  }
}
