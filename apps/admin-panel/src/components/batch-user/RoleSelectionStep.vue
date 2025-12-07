<template>
  <div class="space-y-6">
    <div class="text-center">
      <h3 class="text-lg font-display font-semibold mb-2">Select Role</h3>
      <p class="text-gray-400 text-sm">
        Choose the role to assign to all users in this batch.
      </p>
    </div>

    <!-- Role Selection -->
    <div class="grid grid-cols-3 gap-4 max-w-lg mx-auto">
      <button
        v-for="roleOption in roleOptions"
        :key="roleOption.value"
        type="button"
        @click="role = roleOption.value"
        class="p-6 border font-mono text-sm uppercase tracking-wider transition-all duration-300 text-center"
        :class="[
          role === roleOption.value
            ? 'border-mission-accent text-mission-accent bg-mission-accent/10'
            : 'border-white/20 text-gray-400 hover:border-white/40',
        ]"
      >
        <component
          :is="roleOption.icon"
          :size="32"
          class="mx-auto mb-3"
          :class="role === roleOption.value ? 'text-mission-accent' : 'text-gray-500'"
        />
        {{ roleOption.label }}
      </button>
    </div>

    <!-- Role Description -->
    <div class="max-w-lg mx-auto p-4 border border-white/10 bg-mission-gray">
      <div class="flex items-start gap-3">
        <Info :size="20" class="text-mission-cyan flex-shrink-0 mt-0.5" />
        <div class="text-sm text-gray-400">
          <p v-if="role === 'admin'">
            <strong class="text-white">Admin</strong> users have full access to the system,
            including user management and system configuration.
          </p>
          <p v-else-if="role === 'coach'">
            <strong class="text-white">Coach</strong> users can view contestants,
            monitor progress, and access coaching-related features.
          </p>
          <p v-else>
            <strong class="text-white">Contestant</strong> users are competition participants
            with access to contest-related features and VPN connectivity.
          </p>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div class="text-center p-6 border border-mission-accent/30 bg-mission-accent/5">
      <p class="text-lg">
        <span class="text-mission-accent font-mono font-bold">{{ validCount }}</span>
        <span class="text-gray-300"> users will be created with role </span>
        <span class="text-mission-accent font-mono font-bold uppercase">{{ role }}</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Shield, Users, User, Info } from 'lucide-vue-next';

interface Props {
  validCount: number;
}

defineProps<Props>();

const role = defineModel<'admin' | 'coach' | 'contestant'>('role', { required: true });

const roleOptions = [
  { value: 'admin' as const, label: 'Admin', icon: Shield },
  { value: 'coach' as const, label: 'Coach', icon: Users },
  { value: 'contestant' as const, label: 'Contestant', icon: User },
];
</script>
