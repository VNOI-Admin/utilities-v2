<script setup lang="ts">
export type HeaderProps = {
  align: 'start' | 'end';
  key: string;
  sortable: boolean;
  title: string;
  type: 'content' | 'image' | 'rating' | 'badge' | 'progress';
};

const props = defineProps<{
  items: object[];
  title: string;
  headers: HeaderProps[];
  pagination: boolean;
}>();

const search = ref('');

</script>

<template>
  <v-card flat>
    <v-card-title class="d-flex align-center pe-2">
      <v-icon icon="mdi-video-input-component"></v-icon> &nbsp; {{ title }}

      <v-spacer></v-spacer>

      <v-text-field
        v-model="search"
        density="compact"
        label="Search"
        prepend-inner-icon="mdi-magnify"
        variant="solo-filled"
        flat
        hide-details
        single-line
      ></v-text-field>
    </v-card-title>

    <v-divider></v-divider>
    <v-data-table
      v-model:search="search"
      :items="items"
      :headers="headers"
      :items-per-page="itemsPerPage"
    >
      <template v-slot:[`item.image`]="{ item }">
        <v-card class="my-2" elevation="2" rounded>
          <v-img
            :src="`${item.image}`"
            height="64"
            cover
          ></v-img>
        </v-card>
      </template>

      <template v-slot:[`item.rating`]="{ item }">
        <v-rating
          :model-value="item.rating"
          color="orange-darken-2"
          density="compact"
          size="small"
          readonly
        ></v-rating>
      </template>

      <template v-slot:[`item.badge`]="{ item }">
        <div class="text">
          <v-chip
            :color="item.badge.color"
            :text="item.badge.content"
            class="text-uppercase"
            size="small"
            label
          ></v-chip>
        </div>
      </template>

      <template v-slot:[`item.progress`]="{ item }">
        <div class="text">
          <v-progress-linear :model-value="item.progress"></v-progress-linear>
        </div>
      </template>
    </v-data-table>
  </v-card>
</template>
