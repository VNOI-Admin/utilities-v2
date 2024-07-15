<script setup lang="ts">
import { HeaderProps } from "../components/Table/Table.vue";

//
const headers: HeaderProps[] = [
  {
    align: "start",
    key: "name",
    sortable: true,
    title: "NameTitle",
    type: "content",
  },
  {
    align: "start",
    key: "image",
    sortable: false,
    title: "ImageTitle",
    type: "image",
  },
  {
    align: "start",
    key: "price",
    sortable: true,
    title: "PriceTitle",
    type: "content",
  },
  {
    align: "start",
    key: "rating",
    sortable: true,
    title: "RatingTitle",
    type: "rating",
  },
  {
    align: "start",
    key: "badge",
    sortable: true,
    title: "StockTitle",
    type: "rating",
  },

  {
    align: "start",
    key: "progress",
    sortable: true,
    title: "progressTitle",
    type: "progress",
  },
];
const items: object[] = [
  {
    name: "Nebula GTX 3080",
    image: "1.png",
    price: 699.99,
    rating: 5,
    badge: {
      color: "green",
      content: "out of stock",
    },
    progress: 40,
  },
  {
    name: "Galaxy RTX 3080",
    image: "2.png",
    price: 799.99,
    rating: 4,
    badge: false,
  },
  {
    name: "Orion RX 6800 XT",
    image: "3.png",
    price: 649.99,
    rating: 3,
    badge: {
      color: "red",
      content: "in stock",
    },
  },
  {
    name: "Vortex RTX 3090",
    image: "4.png",
    price: 1499.99,
    rating: 4,
    badge: true,
  },
  {
    name: "Cosmos GTX 1660 Super",
    image: "5.png",
    price: 299.99,
    rating: 4,
    badge: false,
  },
];

const items2 = [...items, ...items, ...items];
const title = "Title Table";
const pagination = true;
</script>

<template>
  <Table
    :headers="headers"
    :items="items2"
    :title="title"
    :pagination="pagination"
  />
</template>
