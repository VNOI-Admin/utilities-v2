'use client';

import { useForm } from "react-hook-form";
import { post } from "../api/api";
import { useUser } from "../hooks/useUser";

export default function Login(): JSX.Element {
    const { register, handleSubmit } = useForm();
    const { login } = useUser();

    const onSubmit = (data: any) => {
        post({path: "auth/login", body: data}).then((res) => {
            login(res);
        });
    };

    return <section className="flex justify-center items-center h-[50%]">
        <div className="bg-gray-100 p-8 rounded-md">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 text-lg">
                <div>
                    <input className="border border-gray-300" id="username" {...register("username")} type="text" placeholder="Username" />
                </div>
                <div>
                    <input className="border border-gray-300" id="password" {...register("password")} type="password" placeholder="Password" />
                </div>
                <button className="text-lg p-2 bg-green-300 rounded-md" type="submit">Login</button>
            </form>
        </div>
    </section>
}
