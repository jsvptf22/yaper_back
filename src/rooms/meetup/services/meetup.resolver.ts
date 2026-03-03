import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Meetup } from '../meetup.model';

@Resolver((of) => Meetup)
export class MeetupResolver {
  @ResolveField()
  async users(@Parent() meetup: Meetup) {
    const allPlayed = meetup.users.every((user) => user.option);

    return meetup.users.map((user) => {
      const displayOption = allPlayed ? user.option : 'played';

      return {
        ...user,
        option: user.option ? displayOption : null,
      };
    });
  }
}
