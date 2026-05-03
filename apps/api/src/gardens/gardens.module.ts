import { Module } from '@nestjs/common';
import { GardensController } from './gardens.controller';
import { GardensService } from './gardens.service';
import { GardenNotesController } from './garden-notes.controller';
import { GardenNotesService } from './garden-notes.service';

@Module({
  controllers: [GardensController, GardenNotesController],
  providers: [GardensService, GardenNotesService],
  exports: [GardensService, GardenNotesService],
})
export class GardensModule {}
