import { writeFileSync } from 'fs';
import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { Role } from '@libs/common/decorators/role.decorator';

dotenv.config();

const DESTINATION_DB_URI = process.env.DESTINATION_DB_URI as string;
const DESTINATION_DB_NAME = process.env.DESTINATION_DB_NAME as string;

async function run() {
  const destinationClient = await MongoClient.connect(DESTINATION_DB_URI);
  const userDb = destinationClient.db(DESTINATION_DB_NAME);

  const usersCollection = userDb.collection('users');

  // Get all users
  const users = await usersCollection
    .find({
      $or: [
        {
          isActive: true,
          keyPair: { $exists: true, $ne: null },
          vpnIpAddress: { $exists: true, $ne: null },
        },
        {
          role: Role.GUEST,
          keyPair: { $exists: true, $ne: null },
          vpnIpAddress: { $exists: true, $ne: null },
        }
      ],
    })
    .toArray();

  let wireGuardConfig = `[Interface]
PrivateKey = ${process.env.WG_CORE_PRIVATE_KEY}
Address = ${process.env.WG_CORE_IP_ADDRESS}/32
ListenPort = ${process.env.WG_LISTEN_PORT}
PostUp = iptables -w -t nat -A POSTROUTING -o eth0 -j MASQUERADE; ip6tables -w -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -w -t nat -D POSTROUTING -o eth0 -j MASQUERADE; ip6tables -w -t nat -D POSTROUTING -o eth0 -j MASQUERADE
MTU = ${process.env.WG_MTU}
`;

  for (const user of users) {
    wireGuardConfig += `
# ${user.username}
[Peer]
PublicKey = ${user.keyPair.publicKey}
AllowedIPs = ${user.vpnIpAddress}/32
PersistentKeepalive = ${process.env.WG_PERSISTENT_KEEPALIVE}
`;
  }

  // write wireGuardConfig to file
  writeFileSync('wg0.conf', wireGuardConfig);

  console.log('WireGuard configuration written to wg0.conf');
  console.log('Use root-vpn.sh with root privileges to finish the setup.');

  await destinationClient.close();
}

void run();
