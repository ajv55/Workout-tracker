import { NextResponse } from "next/server";
import argon2 from "argon2";
import { prisma } from "@/app/lib/prisma";
import { registerSchema } from "@/app/lib/validations/auth";

export async function POST(request: Request) {
  let body: unknown;

  // 1. Parse the incoming JSON safely.
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // 2. Validate the registration data.
  const result = registerSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        message: "Invalid registration data",
        errors: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { name, email, password } = result.data;

  try {
    // 3. Check whether this email already exists.
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // 4. Hash the password before storing anything.
    const passwordHash = await argon2.hash(password);

    // 5. Create the user in MongoDB through Prisma.
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // 6. Return only safe user fields, never the password hash.
    return NextResponse.json(
      {
        message: "Account created successfully",
        user,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    // Handle a duplicate email if concurrent requests race.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    console.error("Registration failed", error);

    return NextResponse.json(
      { message: "Unable to create account" },
      { status: 500 }
    );
  }
}
