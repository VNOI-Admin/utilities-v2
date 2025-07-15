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

  await Promise.all(
    users.map(async (user) => {
      const username = user['username_practice'];
      console.log(`Patch user ${username}, ${JSON.stringify(user)}`);
      try {
        await internalApi.user.updateUser(username, {
          isActive: false,
        });

        console.log(`User ${user['username_practice']} created`);
      } catch (error) {
        console.error(`Failed to create user ${user['username_practice']}: ${getErrorMessage(error)}`);
      }
    }),
  );
}

void run();
