<script setup>
import { ref } from 'vue'
import { authApi, userApi } from '~/services/api';

const props = defineProps(['user'])
const isEdit = ref(props.user !== null)
const emit = defineEmits(['closeEditDialog']);
const localUser = reactive({
    username: props.user?.username || '',
    fullName: props.user?.fullName || '',
    vpnIpAddress: props.user?.vpnIpAddress || '',
    role: props.user?.role || '',
    isActive: props.user?.isActive || false,
});

const cancelEdit = () => {
    emit('closeEditDialog');
};

const submit = () => {
    if (isEdit.value) {
        userApi.user.updateUser(props.user.username, localUser).then(() => {
            window.location.reload();
        }).catch((error) => {
            if (error.response.status === 401) {
                authApi.auth.refresh().then(() => {
                    submit();
                });
            }
        });
    } else {
        userApi.user.createUser(localUser).then(() => {
            window.location.reload();
        }).catch((error) => {
            if (error.response.status === 401) {
                authApi.auth.refresh().then(() => {
                    submit();
                });
            }
        });
    }
    emit('closeEditDialog');
};

</script>

<template>
    <v-card>
        <v-card-title class="text-h5">Edit User</v-card-title>
        <v-card-text>
            <v-form>
                <v-container>
                    <v-row>
                        <v-col cols="12" sm="6">
                            <v-text-field v-model="localUser.username" label="Username"></v-text-field>
                        </v-col>
                        <v-col cols="12" sm="6">
                            <v-text-field v-model="localUser.fullName" label="Full Name"></v-text-field>
                        </v-col>
                        <v-col cols="12" sm="6">
                            <v-text-field v-model="localUser.vpnIpAddress" label="VPN IP Address"></v-text-field>
                        </v-col>
                        <v-col cols="12" sm="6">
                            <v-select v-model="localUser.role" :items="['admin', 'contestant']" label="Role"></v-select>
                        </v-col>
                        <v-col cols="12" sm="6">
                            <v-checkbox v-model="localUser.isActive" label="Active"></v-checkbox>
                        </v-col>
                    </v-row>
                </v-container>
            </v-form>
        </v-card-text>
        <v-card-actions>
            <v-btn color="blue-darken-1" variant="text" @click="cancelEdit">Cancel</v-btn>
            <v-btn color="blue-darken-1" variant="text" @click="submit">Submit</v-btn>
        </v-card-actions>
    </v-card>
</template>
