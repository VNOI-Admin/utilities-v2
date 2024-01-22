"use server";
import { cookies } from "next/headers";
import { BASE_URL } from "../api/api";
import type { LoginFormState } from "./types";

export const login = async (
  oldState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> => {
  try {
    const cookiesStore = cookies();
    const username = formData.get("username");
    const password = formData.get("password");
    if (typeof username !== "string") {
      return {
        ...oldState,
        usernameMessages: [...oldState.usernameMessages, "Username is not valid!"],
      };
    }
    if (typeof password !== "string") {
      return {
        ...oldState,
        passwordMessages: [...oldState.passwordMessages, "Password is not valid!"],
      };
    }
    const res = await fetch(new URL("/auth/login", BASE_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "http://localhost:8001",
      },
      body: JSON.stringify({ username, password }),
    });
    cookiesStore.set({
      name: "user",
      value: JSON.stringify(await res.json()),
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: "/",
    });
    return {
      ...oldState,
      usernameMessages: [],
      passwordMessages: [],
      messages: [],
    };
  } catch (e) {
    console.error(e);
    return {
      ...oldState,
      messages: ["An internal server error occurred"],
    };
  }
};
