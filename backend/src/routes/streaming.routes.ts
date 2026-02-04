import { Router, type RequestHandler } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  completeChat,
  streamChat,
} from "../controllers/streaming.controller.js";

const StreamRouter = Router();

StreamRouter.use(authMiddleware as RequestHandler);

StreamRouter.post(
  "/:chatPageId/stream",
  streamChat as unknown as RequestHandler,
);
StreamRouter.post(
  "/:chatPageId/complete",
  completeChat as unknown as RequestHandler,
);

export default StreamRouter;
