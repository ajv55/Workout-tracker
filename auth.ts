import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./app/lib/prisma";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
  },

  providers: [Google],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },

    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
      }

      return session;
    },
   }
});
