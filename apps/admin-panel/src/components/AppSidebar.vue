<script setup>

</script>

<template>
    <div class="sidebar">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/users">Users</RouterLink>
    </div>
</template>

<style lang="css" scoped>
    .sidebar {
        min-width: 300px;
        height: 100%;
        /* background-color: ; */
        border-right: 1px solid #ccc;
        padding: 20px;
        display: flex;
        flex-direction: column;
    }
</style>
