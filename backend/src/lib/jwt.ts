import jwt, { type SignOptions } from "jsonwebtoken";

const JWT_SECRET: string =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const REFRESH_SECRET: string =
  process.env.REFRESH_SECRET || "your-refresh-secret-change-in-production";

const ACCESS_TOKEN_EXPIRES_IN = 15 * 60;
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60;

export interface JwtPayload {
  userId: string;
  email: string;
  type?: "access" | "refresh";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function generateAccessToken(payload: Omit<JwtPayload, "type">): string {
  const options: SignOptions = { expiresIn: ACCESS_TOKEN_EXPIRES_IN };
  return jwt.sign({ ...payload, type: "access" }, JWT_SECRET, options);
}

export function generateRefreshToken(
  payload: Omit<JwtPayload, "type">,
): string {
  const options: SignOptions = { expiresIn: REFRESH_TOKEN_EXPIRES_IN };
  return jwt.sign({ ...payload, type: "refresh" }, REFRESH_SECRET, options);
}

export function generateTokenPair(
  payload: Omit<JwtPayload, "type">,
): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}

// Legacy support - generates access token (kept for backwards compatibility)
export function generateToken(payload: Omit<JwtPayload, "type">): string {
  return generateAccessToken(payload);
}
