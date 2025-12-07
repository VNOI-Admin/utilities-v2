import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { GroupEntity } from '@libs/api/internal';

export const useGroupsStore = defineStore('groups', () => {
  const groups = ref<GroupEntity[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function setGroups(data: GroupEntity[]) {
    groups.value = data;
  }

  function addGroup(group: GroupEntity) {
    groups.value.push(group);
  }

  function updateGroup(code: string, updates: Partial<GroupEntity>) {
    const index = groups.value.findIndex((g) => g.code === code);
    if (index !== -1) {
      groups.value[index] = { ...groups.value[index], ...updates };
    }
  }

  function removeGroup(code: string) {
    groups.value = groups.value.filter((g) => g.code !== code);
  }

  function getGroupByCode(code: string) {
    return groups.value.find((g) => g.code === code);
  }

  return {
    groups,
    loading,
    error,
    setGroups,
    addGroup,
    updateGroup,
    removeGroup,
    getGroupByCode,
  };
});
