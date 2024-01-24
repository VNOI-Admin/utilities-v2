import { error } from "@sveltejs/kit";

import type { Actions } from "./$types";

export const actions: Actions = {
  async default({ request }) {
    const formData = await request.formData();
    const username = formData.get("username");
    const password = formData.get("password");
    if (typeof username !== "string") {
      error(400, "Username is not valid!");
    }
    if (typeof password !== "string") {
      error(400, "Password is not valid!");
    }
  },
};
