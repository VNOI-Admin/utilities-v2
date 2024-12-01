<script setup>
import { ref } from 'vue'
import { authApi } from '~/services/api';

const username = ref('')
const password = ref('')
const router = useRouter()
const route = useRoute()

const login = async () => {
    console.log(username.value, password.value);

    try {
        const response = await authApi.auth.login({
            username: username.value,
            password: password.value
        })

        const redirectPath = route.query.redirect || '/'
        router.push({ path: redirectPath })
    } catch (error) {
        console.log(error)
    }
}

</script>

<template>
    <v-form class="login-form" @submit.prevent v-on:submit="login">
        <v-text-field v-model="username" label="First name"></v-text-field>
        <v-text-field @keyup.enter="login" v-model="password" label="Password" type="password"></v-text-field>
        <v-btn class="mt-2" type="submit" block>Submit</v-btn>
    </v-form>
</template>

<style scoped>
.login-form {
    width: 300px;
    height: fit-content;
    margin: auto auto;
}
</style>
