import { readFileSync } from 'fs';

const USER_SERVICE_ENDPOINT =
  process.env.USER_SERVICE_ENDPOINT || 'http://localhost:8001';

async function run() {
  // read from users.json

  const users = JSON.parse(readFileSync('./scripts/users.json', 'utf-8'));

  for (const user of users) {
    console.log(`Creating user ${user.username}, ${JSON.stringify(user)}`);
    const response = await fetch(`${USER_SERVICE_ENDPOINT}/user/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.USER_SERVICE_TOKEN}`,
      },
      body: JSON.stringify({
        username: user.username,
        password: user.password,
        fullName: user.fullName,
        role: user.role,
      }),
    });

    if (response.ok) {
      console.log(`User ${user.username} created`);
    } else {
      console.error(
        `Failed to create user ${user.username}, status: ${response.status}`,
      );
    }
  }
}

void run();
