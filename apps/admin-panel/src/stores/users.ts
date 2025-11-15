import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { UserEntity } from '@libs/api/internal';

export const useUsersStore = defineStore('users', () => {
  const users = ref<UserEntity[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function setUsers(data: UserEntity[]) {
    users.value = data;
  }

  function addUser(user: UserEntity) {
    users.value.push(user);
  }

  function updateUser(username: string, updates: Partial<UserEntity>) {
    const index = users.value.findIndex((u) => u.username === username);
    if (index !== -1) {
      users.value[index] = { ...users.value[index], ...updates };
    }
  }

  function removeUser(username: string) {
    users.value = users.value.filter((u) => u.username !== username);
  }

  function getUserByUsername(username: string) {
    return users.value.find((u) => u.username === username);
  }

  return {
    users,
    loading,
    error,
    setUsers,
    addUser,
    updateUser,
    removeUser,
    getUserByUsername,
  };
});
