import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../config/prisma";
import { config } from "../../config/env";
import {
  UnauthorizedError,
  BadRequestError,
} from "../../shared/errors/AppError";
import { LoginDTO, AuthTokenPayload } from "../../shared/types";

type UpdateProfileDTO = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export class AuthService {
  async login(data: LoginDTO) {
    const { email, password } = data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (!user.isActive) {
      throw new UnauthorizedError("Account is inactive");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const payload: AuthTokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        locationId: user.locationId,
      },
    };
  }

  async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as AuthTokenPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError("Invalid token");
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        locationId: user.locationId,
      };
    } catch {
      throw new UnauthorizedError("Invalid token");
    }
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        locationId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestError("User not found");
    }

    if (!user.isActive) {
      throw new UnauthorizedError("Account is inactive");
    }

    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileDTO) {
    const { firstName, lastName, email } = data;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isActive: true },
    });

    if (!existingUser) {
      throw new BadRequestError("User not found");
    }

    if (!existingUser.isActive) {
      throw new UnauthorizedError("Account is inactive");
    }

    const updateData: UpdateProfileDTO = {};

    if (typeof firstName === "string") {
      const trimmed = firstName.trim();
      if (!trimmed) {
        throw new BadRequestError("First name cannot be empty");
      }
      updateData.firstName = trimmed;
    }

    if (typeof lastName === "string") {
      const trimmed = lastName.trim();
      if (!trimmed) {
        throw new BadRequestError("Last name cannot be empty");
      }
      updateData.lastName = trimmed;
    }

    if (typeof email === "string") {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new BadRequestError("Email cannot be empty");
      }

      if (normalizedEmail !== existingUser.email) {
        const emailTaken = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });

        if (emailTaken) {
          throw new BadRequestError("Email already registered");
        }

        updateData.email = normalizedEmail;
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError("No valid profile fields provided");
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        locationId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestError("User not found");
    }

    if (!user.isActive) {
      throw new UnauthorizedError("Account is inactive");
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isValidPassword) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (isSameAsCurrent) {
      throw new BadRequestError(
        "New password must be different from current password",
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: "Password changed successfully" };
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role:
      | "RAW_STOCK_MANAGER"
      | "PRODUCTION_CLIENT"
      | "DISTRIBUTOR"
      | "TRANSPORT_PROVIDER"
      | "FINISHED_STOCK_MANAGER";
  }) {
    const { email, password, firstName, lastName, role } = data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestError("Email already registered");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        isActive: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }
}
