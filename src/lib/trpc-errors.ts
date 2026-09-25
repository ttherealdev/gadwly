import { Prisma } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";

export function toTRPCError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2025") {
      return new TRPCError({ code: "NOT_FOUND", message: "Not found" });
    }
    if (e.code === "P2002") {
      return new TRPCError({ code: "CONFLICT", message: "Already exists" });
    }
  }
  return e instanceof Error
    ? new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e.message })
    : new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
}
