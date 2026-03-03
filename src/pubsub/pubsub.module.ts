import { Module } from '@nestjs/common';
import { PubSubProvider } from './pubsub.service';

@Module({
  providers: [PubSubProvider],
  exports: [PubSubProvider],
})
export class PubsubModule {}
