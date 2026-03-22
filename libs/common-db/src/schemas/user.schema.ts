import { Role } from '@libs/common/decorators/role.decorator';
import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { type Document, type Query } from 'mongoose';

export type UserDocument = User & Document;

export type KeyPairType = {
  publicKey: string | null;
  privateKey: string | null;
};

@Schema({ _id: false })
export class MachineUsage {
  @Prop({ required: true, default: 0 })
  cpu!: number;

  @Prop({ required: true, default: 0 })
  memory!: number;

  @Prop({ required: true, default: 0 })
  disk!: number;

  @Prop({ required: true, default: 0 })
  ping!: number;

  @Prop({ required: true, default: false })
  isOnline!: boolean;

  @Prop({ required: false })
  lastReportedAt!: Date;
}

@Schema({ autoCreate: true, autoIndex: true })
export class User {
  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ required: false })
  fullName!: string;

  @Prop({ required: true })
  password!: string;

  @Prop()
  refreshToken?: string;

  @Prop({ required: true, type: String, default: Role.CONTESTANT })
  role!: Role;

  @Prop({ type: String, default: null })
  vpnIpAddress!: string | null;

  @Prop({ required: true, default: true })
  isActive!: boolean;

  @Prop(
    raw({
      publicKey: { type: String, default: null },
      privateKey: { type: String, default: null },
    }),
  )
  keyPair!: KeyPairType;

  @Prop({ type: MachineUsage })
  machineUsage!: MachineUsage;

  @Prop({ required: false })
  group!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index(
  { vpnIpAddress: 1 },
  {
    unique: true,
    partialFilterExpression: {
      vpnIpAddress: { $type: 'string' },
    },
  },
);

let queueVpnSync = async (_usernames: string[]) => {};

function isVpnSyncField(path: string): boolean {
  return (
    path === 'role' ||
    path === 'isActive' ||
    path === 'vpnIpAddress' ||
    path === 'keyPair' ||
    path.startsWith('keyPair.')
  );
}

function hasVpnSyncChanges(update: unknown, prefix = ''): boolean {
  if (Array.isArray(update)) {
    return update.some((item) => hasVpnSyncChanges(item, prefix));
  }

  if (!update || typeof update !== 'object') {
    return false;
  }

  for (const [key, value] of Object.entries(update)) {
    if (key.startsWith('$')) {
      if (hasVpnSyncChanges(value, prefix)) {
        return true;
      }

      continue;
    }

    const path = prefix ? `${prefix}.${key}` : key;
    if (isVpnSyncField(path) || hasVpnSyncChanges(value, path)) {
      return true;
    }
  }

  return false;
}

async function captureUsernameBeforeUpdate(this: Query<unknown, UserDocument> & { vpnSyncUsernames?: string[] }) {
  if (!hasVpnSyncChanges(this.getUpdate())) {
    return;
  }

  const options = this.getOptions();
  const user = await this.model
    .findOne(this.getFilter())
    .setOptions({
      collation: options.collation,
      session: options.session,
      sort: options.sort,
    })
    .select('username')
    .lean<{ username: string }>()
    .exec();

  this.vpnSyncUsernames = user ? [user.username] : [];
}

export function setUserVpnSyncQueue(fn: (usernames: string[]) => Promise<void>) {
  queueVpnSync = async (usernames) => {
    if (usernames.length === 0) {
      return;
    }

    try {
      await fn(usernames);
    } catch (error) {
      console.error('Unable to queue VPN sync jobs:', error);
    }
  };
}

async function queueCapturedUsernames(this: Query<unknown, UserDocument> & { vpnSyncUsernames?: string[] }) {
  await queueVpnSync(this.vpnSyncUsernames ?? []);
}

UserSchema.pre('save', function (this: UserDocument, next) {
  this.$locals.shouldQueueVpnSync = this.isNew || this.modifiedPaths().some(isVpnSyncField);
  next();
});

UserSchema.post('save', async function (this: UserDocument) {
  if (!this.$locals.shouldQueueVpnSync) {
    return;
  }

  await queueVpnSync([this.username]);
});

UserSchema.post('deleteOne', { document: true, query: false }, async function (this: UserDocument) {
  await queueVpnSync([this.username]);
});

UserSchema.pre(
  'deleteMany',
  { document: false, query: true },
  async function (this: Query<unknown, UserDocument> & { vpnSyncUsernames?: string[] }) {
    const options = this.getOptions();
    this.vpnSyncUsernames = await this.model
      .distinct('username', this.getFilter())
      .setOptions({
        collation: options.collation,
        session: options.session,
      })
      .exec();
  },
);

UserSchema.post(
  'deleteMany',
  { document: false, query: true },
  async function (this: Query<unknown, UserDocument> & { vpnSyncUsernames?: string[] }) {
    await queueVpnSync(this.vpnSyncUsernames ?? []);
  },
);

UserSchema.pre('updateOne', { document: false, query: true }, captureUsernameBeforeUpdate);

UserSchema.post('updateOne', { document: false, query: true }, queueCapturedUsernames);

UserSchema.pre('findOneAndUpdate', { document: false, query: true }, captureUsernameBeforeUpdate);

UserSchema.post('findOneAndUpdate', { document: false, query: true }, queueCapturedUsernames);
