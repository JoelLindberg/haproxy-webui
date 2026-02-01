import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // For same-origin requests, we can omit baseURL or use empty string
  // Better Auth will use the current origin automatically
});

// Export useful hooks and methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
