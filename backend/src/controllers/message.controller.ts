import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.middleware.js";

const VALID_ROLES = ["user", "assistant", "system"] as const;
type MessageRole = (typeof VALID_ROLES)[number];

export const listMessages = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const chatPageId = req.params.chatPageId as string;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    if (!chatPageId) {
      throw new AppError("Chat page ID is required", 400);
    }

    const chatPage = await prisma.chatPage.findFirst({
      where: {
        id: chatPageId,
      },
      include: {
        workspace: true,
      },
    });

    if (!chatPage) {
      throw new AppError("Chat page not found", 404);
    }

    // Verify ownership
    if (chatPage.workspace.userId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    const messages = await prisma.message.findMany({
      where: {
        chatPageId: chatPageId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const chatPageId = req.params.chatPageId as string;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    if (!chatPageId) {
      throw new AppError("Chat page ID is required", 400);
    }

    const chatPage = await prisma.chatPage.findFirst({
      where: {
        id: chatPageId,
      },
      include: {
        workspace: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chatPage) {
      throw new AppError("Chat page not found", 404);
    }

    // Verify ownership
    if (chatPage.workspace.userId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    res.status(200).json(chatPage.messages);
  } catch (error) {
    next(error);
  }
};

export const createMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const chatPageId = req.params.chatPageId as string;
    const { content, role } = req.body;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    if (!chatPageId) {
      throw new AppError("Chat page ID is required", 400);
    }

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      throw new AppError("Message content is required", 400);
    }

    if (!role || typeof role !== "string") {
      throw new AppError("Role is required and must be a string", 400);
    }

    if (!VALID_ROLES.includes(role as MessageRole)) {
      throw new AppError(`Role must be one of: ${VALID_ROLES.join(", ")}`, 400);
    }

    const chatPage = await prisma.chatPage.findFirst({
      where: {
        id: chatPageId,
      },
      include: {
        workspace: true,
      },
    });

    if (!chatPage) {
      throw new AppError("Chat page not found", 404);
    }

    // Verify ownership
    if (chatPage.workspace.userId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    const newMessage = await prisma.message.create({
      data: {
        content: content.trim(),
        role,
        chatPageId: chatPageId,
      },
    });

    // Update chatPage timestamp
    await prisma.chatPage.update({
      where: { id: chatPageId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json(newMessage);
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const messageId = req.params.messageId as string;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    if (!messageId) {
      throw new AppError("Message ID is required", 400);
    }

    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
      },
      include: {
        chatPage: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!message) {
      throw new AppError("Message not found", 404);
    }

    // Verify ownership
    if (message.chatPage.workspace.userId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    next(error);
  }
};
