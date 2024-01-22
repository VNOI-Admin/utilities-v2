import Cookies from "js-cookie";

export const BASE_URL = "http://localhost:8001";

export interface GetOptions {
  path: string;
}

export interface PostOptions {
  path: string;
  body: any;
}

const getCurrentUser = () => {
  return Cookies.get("user");
};

export const makeHeaders = () => {
  const user = getCurrentUser();
  return new Headers({
    Authorization: `${user ? "Bearer " + user.accessToken : ""}`,
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "http://localhost:8001",
  });
};

export const get = (options: GetOptions) => {
  const { path } = options;
  try {
    const response = fetch(`${BASE_URL}/${path}`, {
      headers: makeHeaders(),
    });
    return response;
  } catch (e) {
    throw new Error(e);
  }
};

export const post = async (options: PostOptions) => {
  const { path, body } = options;
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: "POST",
    headers: makeHeaders(),
    body: JSON.stringify(body),
  });

  return res.json();
};
