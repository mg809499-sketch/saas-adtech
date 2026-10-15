import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { StoresModule } from '../stores/stores.module';

@Module({ imports: [StoresModule], controllers: [AdminController] })
export class AdminModule {}
