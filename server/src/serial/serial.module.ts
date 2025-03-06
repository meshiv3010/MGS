import { Module } from '@nestjs/common';
import { SerialService } from './serial.service';
import { SerialController } from './serial.controller';

@Module({
  controllers: [SerialController],
  providers: [SerialService],
})
export class SerialModule {}
