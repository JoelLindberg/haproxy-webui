import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Delegate all auth-related HTTP methods to better-auth's Next handler.
 * This will expose endpoints such as:
 *  POST /api/auth/sign-in/email
 *  POST /api/auth/sign-up/email
 *  POST /api/auth/sign-out
 *  ...etc (as provided by better-auth)
 */
const { GET, POST, PUT, PATCH, DELETE } = toNextJsHandler(auth);

export { GET, POST, PUT, PATCH, DELETE };