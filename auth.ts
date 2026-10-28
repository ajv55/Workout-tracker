import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./app/lib/prisma";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import argon2 from "argon2";
import { loginSchema } from "./app/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
  },

  providers: [
    Google,
    GitHub,
    Credentials({
        name: "Email and Password",

        credentials: {
        email: {
            label: "Email",
            type: "email",
        },
        password: {
            label: "Password",
            type: "password",
        },
        },

        async authorize(credentials) {
            const result = loginSchema.safeParse({
                    email: credentials?.email,
                    password: credentials?.password,
                });

            if (!result.success) {
                return null;
            }

            const { email, password } = result.data;

            const user = await prisma.user.findUnique({
                where: { email },
                select: {
                id: true,
                name: true,
                email: true,
                passwordHash: true,
                },
            });

            // OAuth-only accounts do not have a password hash.
            if (!user?.passwordHash) {
                return null;
            }

            const passwordIsValid = await argon2.verify(
                user.passwordHash,
                password
            );


            if (!passwordIsValid) {
                return null;
            }

            return {
                id: user.id,
                name: user.name,
                email: user.email,
            };
        },
    }),
    ],

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
