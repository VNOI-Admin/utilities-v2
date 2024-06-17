<template>
  <v-table theme="">
    <thead>
      <tr>
        <th class="text-left">Name</th>
        <th class="text-left">Problem</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in universities" :key="item.name">
        <td>{{ item.name }}</td>
        <td>{{ item.problem }}</td>
      </tr>
    </tbody>
  </v-table>
</template>

<script>
export default {
  data() {
    return {
      universities: [
        {
          name: 'FPT',
          problem: 10,
        },
        {
          name: 'UET',
          problem: 9,
        },
        {
          name: 'HUST',
          problem: 8,
        },
        {
          name: 'RMIT',
          problem: 7,
        },
        {
          name: 'VINU',
          problem: 8,
        },
        {
          name: 'HCMUS',
          problem: 10,
        },
        {
          name: 'HCMUT',
          problem: 8,
        },
        {
          name: 'HUE',
          problem: 8,
        },
        {
          name: 'PTIT',
          problem: 8,
        },
      ],
    };
  },
};
</script>