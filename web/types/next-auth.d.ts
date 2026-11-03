import NextAuth, { DefaultSession } from "next-auth"
import { Role } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      /** Linked active StaffMember with type GROOMER. */
      isGroomer?: boolean
      /** Linked active StaffMember with type DOCTOR. */
      isDoctor?: boolean
      /** Active store membership with role MANAGER. */
      isManager?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    role: Role
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
    isGroomer?: boolean
    isDoctor?: boolean
    isManager?: boolean
  }
}
