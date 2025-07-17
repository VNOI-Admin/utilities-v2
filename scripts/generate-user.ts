import { readFileSync } from 'fs';
import { InternalApi } from '@app/api/internal';
import { getErrorMessage } from '@libs/common/helper/error';

const USER_SERVICE_ENDPOINT = process.env.USER_SERVICE_ENDPOINT || 'http://localhost:8001';

const internalApi = new InternalApi({
  baseURL: USER_SERVICE_ENDPOINT,
  headers: {
    Authorization: `Bearer ${process.env.USER_SERVICE_TOKEN}`,
  },
});

async function run() {
  const users = JSON.parse(readFileSync('./users.json', 'utf-8'));

  for (const user of users) {
    const username = user['username'];
    console.log(`Creating user ${username}, ${JSON.stringify(user)}`);
    try {
        await internalApi.user.createUser({
          username,
          fullName: user['fullname'],
          password: username,
          role: user['role'],
        });

        console.log(`User ${user['username']} created`);
      } catch (error) {
      console.error(`Failed to create user ${username}: ${getErrorMessage(error)}`);
    }
  }
}

void run();
