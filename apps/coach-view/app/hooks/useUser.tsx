'use client';

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { User } from "../types/user";

export const useUser = () => {
    const [user, setUser] = useState<User>({} as User);

    useEffect(() => {
        const userCookie = Cookies.get("user");
        setUser(JSON.parse(userCookie || "{}"));
    }, []);

    const login = (token) => {
        Cookies.set("user", JSON.stringify(token));
        setUser((prevUser) => ({ ...prevUser, ...token }));
    };

    const logout = () => {
        Cookies.remove("user");
        setUser({} as User); // Assuming you want to clear the user on logout
    };

    return { user, login, logout };
};