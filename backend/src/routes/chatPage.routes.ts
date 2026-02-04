import { Router, type RequestHandler } from "express";
import {
  createChatPage,
  deleteChatPage,
  getChatPage,
  listChatPages,
  updateChatPageTitle,
} from "../controllers/chatPage.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  validateBody,
  validateParams,
} from "../middleware/validate.middleware.js";
import {
  createChatPageSchema,
  updateChatPageSchema,
  mongoIdSchema,
} from "../lib/validations.js";
import { z } from "zod";

const ChatPageRouter = Router();

ChatPageRouter.use(authMiddleware as RequestHandler);

ChatPageRouter.get(
  "/workspace/:workspaceId",
  validateParams(z.object({ workspaceId: mongoIdSchema })) as RequestHandler,
  listChatPages as unknown as RequestHandler,
);

ChatPageRouter.post(
  "/workspace/:workspaceId",
  validateParams(z.object({ workspaceId: mongoIdSchema })) as RequestHandler,
  validateBody(createChatPageSchema) as RequestHandler,
  createChatPage as unknown as RequestHandler,
);

ChatPageRouter.get(
  "/:chatPageId",
  validateParams(z.object({ chatPageId: mongoIdSchema })) as RequestHandler,
  getChatPage as unknown as RequestHandler,
);

ChatPageRouter.put(
  "/:chatPageId",
  validateParams(z.object({ chatPageId: mongoIdSchema })) as RequestHandler,
  validateBody(updateChatPageSchema) as RequestHandler,
  updateChatPageTitle as unknown as RequestHandler,
);

ChatPageRouter.delete(
  "/:chatPageId",
  validateParams(z.object({ chatPageId: mongoIdSchema })) as RequestHandler,
  deleteChatPage as unknown as RequestHandler,
);

export default ChatPageRouter;
