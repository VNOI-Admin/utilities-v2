<script setup lang="ts">
import { UserEntity } from '@libs/api/internal';
import { internalApi } from '~/services/api';
import { Role } from '@libs/common/decorators/role.decorator';

const router = useRouter();
const toast = useToast();

const users = ref<UserEntity[]>([]);
const search = routerRef<string>('search', '');
const isActive = routerRef<'Active' | 'Inactive' | 'All'>('isActive', 'Active');
const isOnline = routerRef<'Online' | 'Offline' | 'All'>('isOnline', 'Online');
const role = routerRef<Role | 'All'>('role', Role.CONTESTANT);

// Dialog state
const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const editingUser = ref<UserEntity | null>(null);

// Create form data
const createFormData = ref({
  username: '',
  fullName: '',
  password: '',
  role: Role.CONTESTANT as 'contestant' | 'coach' | 'admin',
});

// Edit form data
const editFormData = ref({
  username: '',
  fullName: '',
  role: Role.CONTESTANT as Role,
  isActive: true,
});

const [fetchUsers, { loading: userLoading }] = useLazyPromise(async () => {
  users.value = await internalApi.user.getUsers({
    q: search.value,
    isActive: isActive.value === 'Active' ? true : isActive.value === 'Inactive' ? false : undefined,
    isOnline: isOnline.value === 'Online' ? true : isOnline.value === 'Offline' ? false : undefined,
    role: role.value === 'All' ? undefined : role.value,
  });
});

debouncedWatch(
  [search, isActive, isOnline, role],
  () => {
    fetchUsers();
  },
  {
    debounce: 500,
  },
);

onMounted(async () => {
  await fetchUsers();
});

const getPingColor = (ping: number) => {
  if (ping <= 0) return 'contrast';
  if (ping < 50) return 'success';
  if (ping < 100) return 'warn';
  return 'danger';
};

const getUsageColor = (value: number) => {
  if (value < 50) return 'success';
  if (value < 75) return 'warn';
  return 'danger';
};

// Dialog functions
const openCreateUserDialog = () => {
  createFormData.value = {
    username: '',
    fullName: '',
    password: '',
    role: Role.CONTESTANT as 'contestant' | 'coach' | 'admin',
  };
  showCreateDialog.value = true;
};

const openEditUserDialog = (user: UserEntity) => {
  editingUser.value = user;
  editFormData.value = {
    username: user.username,
    fullName: user.fullName || '',
    role: user.role as Role,
    isActive: user.isActive,
  };
  showEditDialog.value = true;
};

const closeCreateDialog = () => {
  showCreateDialog.value = false;
};

const closeEditDialog = () => {
  showEditDialog.value = false;
  editingUser.value = null;
};

const createUser = async () => {
  try {
    await internalApi.user.createUser({
      username: createFormData.value.username,
      fullName: createFormData.value.fullName,
      password: createFormData.value.password,
      role: createFormData.value.role,
    });
    toast.success('User created successfully');
    closeCreateDialog();
    await fetchUsers();
  } catch (error: any) {
    toast.error(error?.message || 'Failed to create user');
  }
};

const updateUser = async () => {
  try {
    if (!editingUser.value) return;

    await internalApi.user.updateUser(editingUser.value.username, editFormData.value);
    toast.success('User updated successfully');
    closeEditDialog();
    await fetchUsers();
  } catch (error: any) {
    toast.error(error?.message || 'Failed to update user');
  }
};

const roleOptions = Object.values(Role);
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-3xl font-bold">Users</h1>
      <Button
        label="Create User"
        icon="pi pi-plus"
        @click="openCreateUserDialog"
      />
    </div>
    <Divider class="mb-6" />

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="flex flex-col gap-2">
        <label for="search">Search for users</label>
        <InputText
          id="search"
          v-model="search"
          placeholder="Search..."
        />
      </div>

      <div class="flex flex-col gap-2">
        <label for="isActive">Is active</label>
        <Select
          id="isActive"
          v-model="isActive"
          :options="['All', 'Active', 'Inactive']"
          placeholder="Select status"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label for="isOnline">Is online</label>
        <Select
          id="isOnline"
          v-model="isOnline"
          :options="['All', 'Online', 'Offline']"
          placeholder="Select online status"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label for="role">Role</label>
        <Select
          id="role"
          v-model="role"
          :options="[...Object.values(Role), 'All']"
          placeholder="Select role"
        />
      </div>
    </div>

    <!-- Data Table -->
    <DataTable
      :value="users"
      :loading="userLoading"
      stripedRows
      paginator
      :rows="10"
      :rowsPerPageOptions="[5, 10, 20, 50]"
      tableStyle="min-width: 50rem"
    >
      <Column field="username" header="Username" sortable>
        <template #body="{ data }">
          <Tag :value="data.username" />
        </template>
      </Column>

      <Column field="fullName" header="Full Name">
        <template #body="{ data }">
          <Tag :value="data.fullName" />
        </template>
      </Column>

      <Column field="role" header="Role" sortable>
        <template #body="{ data }">
          <Tag :value="data.role" />
        </template>
      </Column>

      <Column field="machineUsage.cpu" header="CPU" sortable>
        <template #body="{ data }">
          <ProgressBar
            :value="data.machineUsage.cpu"
            :showValue="false"
            :severity="getUsageColor(data.machineUsage.cpu)"
            style="height: 10px"
          />
        </template>
      </Column>

      <Column field="machineUsage.memory" header="Memory" sortable>
        <template #body="{ data }">
          <ProgressBar
            :value="data.machineUsage.memory"
            :showValue="false"
            :severity="getUsageColor(data.machineUsage.memory)"
            style="height: 10px"
          />
        </template>
      </Column>

      <Column field="machineUsage.disk" header="Disk" sortable>
        <template #body="{ data }">
          <ProgressBar
            :value="data.machineUsage.disk"
            :showValue="false"
            :severity="getUsageColor(data.machineUsage.disk)"
            style="height: 10px"
          />
        </template>
      </Column>

      <Column field="machineUsage.ping" header="Ping" sortable>
        <template #body="{ data }">
          <Tag
            :value="`${data.machineUsage.ping}ms`"
            :severity="getPingColor(data.machineUsage.ping)"
            class="font-mono"
          />
        </template>
      </Column>

      <Column field="machineUsage.isOnline" header="Online" sortable>
        <template #body="{ data }">
          <Tag
            :value="data.machineUsage.isOnline ? 'Online' : 'Offline'"
            :severity="data.machineUsage.isOnline ? 'success' : 'danger'"
          />
        </template>
      </Column>

      <Column field="machineUsage.lastUpdatedAt" header="Last Online" sortable>
        <template #body="{ data }">
          {{ new Date(data.machineUsage.lastUpdatedAt).toLocaleString() }}
        </template>
      </Column>

      <Column header="Actions">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              icon="pi pi-pencil"
              severity="info"
              size="small"
              @click="openEditUserDialog(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Create User Dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      header="Create User"
      :modal="true"
      :style="{ width: '500px' }"
    >
      <div class="flex flex-col gap-4 py-4">
        <div class="flex flex-col gap-2">
          <label for="create-username">Username</label>
          <InputText
            id="create-username"
            v-model="createFormData.username"
            placeholder="Enter username"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="create-fullName">Full Name</label>
          <InputText
            id="create-fullName"
            v-model="createFormData.fullName"
            placeholder="Enter full name"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="create-password">Password</label>
          <Password
            id="create-password"
            v-model="createFormData.password"
            placeholder="Enter password"
            :feedback="false"
            toggleMask
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="create-role">Role</label>
          <Select
            id="create-role"
            v-model="createFormData.role"
            :options="['contestant', 'coach', 'admin']"
            placeholder="Select role"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="closeCreateDialog"
        />
        <Button
          label="Create"
          @click="createUser"
        />
      </template>
    </Dialog>

    <!-- Edit User Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      header="Edit User"
      :modal="true"
      :style="{ width: '500px' }"
    >
      <div class="flex flex-col gap-4 py-4">
        <div class="flex flex-col gap-2">
          <label for="edit-username">Username</label>
          <InputText
            id="edit-username"
            v-model="editFormData.username"
            disabled
            placeholder="Enter username"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="edit-fullName">Full Name</label>
          <InputText
            id="edit-fullName"
            v-model="editFormData.fullName"
            placeholder="Enter full name"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="edit-role">Role</label>
          <Select
            id="edit-role"
            v-model="editFormData.role"
            :options="roleOptions"
            placeholder="Select role"
          />
        </div>

        <div class="flex items-center gap-2">
          <Checkbox
            id="edit-isActive"
            v-model="editFormData.isActive"
            :binary="true"
          />
          <label for="edit-isActive">Active</label>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="closeEditDialog"
        />
        <Button
          label="Update"
          @click="updateUser"
        />
      </template>
    </Dialog>
  </div>
</template>
