<script setup lang="ts">
import { ref } from 'vue';

export type HeaderProps = {
  align: 'start' | 'end';
  key: string;
  sortable: boolean;
  title: string;
  type: 'content' | 'image' | 'rating' | 'badge' | 'progress' | 'action';
};

const props = defineProps<{
  items: Record<string, any>[];
  title: string;
  headers: HeaderProps[];
  pagination: boolean;
  itemsPerPage: number;
}>();

const search = ref('');

const getProgressColor = (value: number) => {
  if (value == 0) {
    return 'gray'
  } else if (value < 30) {
    return 'green darken-2';
  } else if (value < 70) {
    return 'orange darken-3';
  } else {
    return 'red darken-4';
  }
};

let dialogConfirmDelete = ref(false);

</script>

<template>
  <v-card flat>
    <v-card-title class="d-flex align-center pe-2">
      <v-icon icon="mdi-video-input-component"></v-icon> &nbsp; {{ props.title }}
      <v-spacer></v-spacer>
      <v-text-field v-model="search" density="compact" label="Search" prepend-inner-icon="mdi-magnify"
        variant="solo-filled" flat hide-details single-line></v-text-field>
    </v-card-title>

    <v-divider></v-divider>
    <v-data-table v-model:search="search" :items="items" :headers="headers" :items-per-page="itemsPerPage">
      <template v-for="header in headers" :key="header.key" v-slot:[`item.${header.key}`]="{ item }">
        <div v-if="header.type === 'image'">
          <v-card class="my-2" elevation="2" rounded>
            <v-img :src="item[header.key]" height="64" cover></v-img>
          </v-card>
        </div>
        <div v-else-if="header.type === 'rating'">
          <v-rating :model-value="item[header.key]" color="orange-darken-2" density="compact" size="small"
            readonly></v-rating>
        </div>
        <div v-else-if="header.type === 'badge'">
          <v-chip :color="item[header.key]" class="text-uppercase" size="small">
            {{ item[header.key] }}
          </v-chip>
        </div>
        <div v-else-if="header.type === 'progress'">
          <div class="d-flex align-center" max-width="250" rounded="lg">
            <v-progress-linear :model-value="item[header.key]" :color="getProgressColor(item[header.key])">
            </v-progress-linear>
            <div class="ms-4">{{ item[header.key] }}%</div>
          </div>
        </div>

        <div v-else-if="header.type === 'action'">
          <div class="d-flex align-center ga-3">
            <p v-for="o in item[header.key]" :key="item.actionName">
            <div v-if="o.actionName === 'edit'" @click="() => o.onClick(item)">
              <v-btn size="x-small" color="orange-darken-2">
                <v-icon>
                  mdi-pencil
                </v-icon>
              </v-btn>
            </div>
            <div v-if="o.actionName === 'delete'" @click="dialogConfirmDelete = true">
              <v-btn size="x-small" color="red" class="">
                <v-icon>
                  mdi-delete
                </v-icon>
                <v-dialog v-model="dialogConfirmDelete" width="auto">
                  <v-card max-width="400" prepend-icon="mdi-update" text="Are you sure you want to delete this record?"
                    title="Confirm">
                    <template v-slot:actions>
                      <v-btn class="ms-auto" text="Ok"
                        @click="() => { o.onClick(item); dialogConfirmDelete = false }"></v-btn>
                    </template>
                  </v-card>
                </v-dialog>
              </v-btn>
            </div>
            </p>
          </div>
        </div>
        <div v-else>
          {{ item[header.key] }}
        </div>
      </template>
    </v-data-table>
  </v-card>
</template>