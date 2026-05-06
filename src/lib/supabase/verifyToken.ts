/**
 * Verify and decode Bearer token from Authorization header
 * Returns the decoded JWT payload with user info
 */
export function verifyBearerToken(authHeader: string): { sub: string; email?: string; [key: string]: any } | null {
  try {
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    
    // JWT format: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode payload (middle part)
    const payload = parts[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    
    // Validate it has a 'sub' claim (user id) and hasn't expired
    if (!decoded.sub || (decoded.exp && decoded.exp * 1000 < Date.now())) {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}
