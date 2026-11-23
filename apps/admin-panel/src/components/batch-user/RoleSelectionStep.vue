<template>
  <div class="space-y-5">
    <div>
      <h3 class="font-semibold">Role</h3>
      <p class="text-mission-muted text-sm mt-1">
        Every user in this import gets the same role.
      </p>
    </div>

    <!-- Role Selection -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <button
        v-for="roleOption in roleOptions"
        :key="roleOption.value"
        type="button"
        @click="role = roleOption.value"
        class="p-4 rounded-xl border text-left transition-colors"
        :class="[
          role === roleOption.value
            ? 'border-mission-accent bg-mission-accent/10'
            : 'border-white/10 hover:border-white/25',
        ]"
      >
        <component
          :is="roleOption.icon"
          :size="20"
          class="mb-2"
          :class="role === roleOption.value ? 'text-mission-accent' : 'text-mission-muted'"
        />
        <div class="text-sm font-medium">{{ roleOption.label }}</div>
        <div class="text-xs text-mission-muted mt-1">{{ roleOption.description }}</div>
      </button>
    </div>

    <!-- Summary -->
    <p class="rounded-xl bg-mission-gray px-4 py-3 text-sm text-gray-300">
      {{ validCount }} {{ validCount === 1 ? 'user' : 'users' }} will be created as
      <span class="font-medium text-gray-100">{{ role }}</span>.
    </p>
  </div>
</template>

<script setup lang="ts">
import { Shield, Users, User } from 'lucide-vue-next';

interface Props {
  validCount: number;
}

defineProps<Props>();

const role = defineModel<'admin' | 'coach' | 'contestant'>('role', { required: true });

const roleOptions = [
  { value: 'contestant' as const, label: 'Contestant', icon: User, description: 'Competition participant with contest access and a VPN config.' },
  { value: 'coach' as const, label: 'Coach', icon: Users, description: 'Can watch contestants and follow their progress.' },
  { value: 'admin' as const, label: 'Admin', icon: Shield, description: 'Full access, including user management and settings.' },
];
</script>
