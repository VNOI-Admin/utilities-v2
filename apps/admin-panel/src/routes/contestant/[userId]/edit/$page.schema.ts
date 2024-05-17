import { z } from "zod";

export const updateUserSchema = z.object({
  username: z.string().min(1, "Please enter an username!"),
  fullName: z.string().min(1, "Please enter a name!"),
  password: z.string().min(1, "Please enter a password!"),
  role: z.union([z.literal("user"), z.literal("admin")]),
});
