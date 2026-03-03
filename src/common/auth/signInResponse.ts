import { User } from 'src/users/user.model';

export interface SignInResponse {
  token: string;
  user: User;
}
