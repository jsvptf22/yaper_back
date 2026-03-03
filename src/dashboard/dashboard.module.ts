import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Meetup, MeetupSchema } from 'src/rooms/meetup/meetup.model';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Meetup.name, schema: MeetupSchema }]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
