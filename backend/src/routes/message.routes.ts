import { Router, type RequestHandler } from "express";
import {
  getMessages,
  listMessages,
  createMessage,
  deleteMessage,
} from "../controllers/message.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  validateBody,
  validateParams,
} from "../middleware/validate.middleware.js";
import { createMessageSchema, mongoIdSchema } from "../lib/validations.js";
import { z } from "zod";

const MessageRouter = Router({ mergeParams: true }); // Enable access to parent route params

MessageRouter.use(authMiddleware as RequestHandler);

// Get all messages for a chat page
MessageRouter.get("/", listMessages as unknown as RequestHandler);

// Get specific message or all messages
MessageRouter.get(
  "/:messageId",
  validateParams(z.object({ messageId: mongoIdSchema })) as RequestHandler,
  getMessages as unknown as RequestHandler,
);

// Create a new message
MessageRouter.post(
  "/",
  validateBody(createMessageSchema) as RequestHandler,
  createMessage as unknown as RequestHandler,
);

// Delete a message
MessageRouter.delete(
  "/:messageId",
  validateParams(z.object({ messageId: mongoIdSchema })) as RequestHandler,
  deleteMessage as unknown as RequestHandler,
);

export default MessageRouter;
