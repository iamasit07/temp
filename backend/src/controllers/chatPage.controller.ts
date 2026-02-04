import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.middleware.js";

export const listChatPages = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.params.workspaceId as string;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    if (!workspaceId) {
      throw new AppError("Workspace ID is required", 400);
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        userId: userId,
      },
    });

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    const chats = await prisma.chatPage.findMany({
      where: { workspaceId: workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    res.status(200).json({ workspace, chats });
  } catch (error) {
    next(error);
  }
};

export const getChatPage = async (
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

    res.status(200).json({ chatPage });
  } catch (error) {
    next(error);
  }
};

export const createChatPage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.params.workspaceId as string;
    const { title } = req.body;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    if (!workspaceId) {
      throw new AppError("Workspace ID is required", 400);
    }

    const titleValue = title || "New Chat";

    if (typeof titleValue !== "string" || titleValue.trim().length > 100) {
      throw new AppError("Title must be less than 100 characters", 400);
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        userId: userId,
      },
    });

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    const newChatPage = await prisma.chatPage.create({
      data: {
        title: titleValue.trim(),
        workspaceId: workspaceId,
      },
    });

    res.status(201).json({ chatPage: newChatPage });
  } catch (error) {
    next(error);
  }
};

export const updateChatPageTitle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const chatPageId = req.params.chatPageId as string;
    const { title } = req.body;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    if (!chatPageId) {
      throw new AppError("Chat page ID is required", 400);
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      throw new AppError("Title is required", 400);
    }

    if (title.trim().length > 100) {
      throw new AppError("Title must be less than 100 characters", 400);
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

    const updatedChatPage = await prisma.chatPage.update({
      where: { id: chatPageId },
      data: { title: title.trim(), updatedAt: new Date() },
    });

    res.status(200).json({ chatPage: updatedChatPage });
  } catch (error) {
    next(error);
  }
};

export const deleteChatPage = async (
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

    await prisma.chatPage.delete({
      where: { id: chatPageId },
    });

    res.status(200).json({ message: "Chat page deleted successfully" });
  } catch (error) {
    next(error);
  }
};
