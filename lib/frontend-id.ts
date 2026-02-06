import { db } from "../db";

/**
 * Character set for frontend IDs: A-Z and 0-9
 * Using uppercase letters only for better readability on receipts
 */
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CHARSET_LENGTH = CHARSET.length; // 36 characters

/**
 * Length of frontend IDs
 * 6 characters gives us 36^6 = 2,176,782,336 possible combinations
 */
const ID_LENGTH = 6;

/**
 * Generate a cryptographically secure random frontend ID
 * Format: 6 alphanumeric characters (A-Z, 0-9)
 * Example: "A3X9K2", "B7M2P4"
 *
 * Uses crypto.getRandomValues() for secure random generation
 */
export function generateFrontendId(): string {
  const randomValues = new Uint8Array(ID_LENGTH);
  crypto.getRandomValues(randomValues);

  let id = "";
  for (let i = 0; i < ID_LENGTH; i++) {
    // Map the random byte to a character in our charset
    // Using modulo to map 0-255 to 0-35 (slight bias, acceptable for this use case)
    id += CHARSET[randomValues[i] % CHARSET_LENGTH];
  }

  return id;
}

/**
 * Check if a frontend ID already exists in the local database
 *
 * @param frontendId - The ID to check for collision
 * @returns true if the ID already exists, false otherwise
 */
export async function checkCollision(frontendId: string): Promise<boolean> {
  const existing = await db.orders.get(frontendId);
  return existing !== undefined;
}

/**
 * Generate a unique frontend ID that doesn't collide with existing IDs
 * Performs collision check against Dexie database
 *
 * @param maxAttempts - Maximum number of generation attempts (default: 10)
 * @returns A unique frontend ID
 * @throws Error if unable to generate unique ID after maxAttempts
 */
export async function generateUniqueFrontendId(
  maxAttempts: number = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = generateFrontendId();
    const hasCollision = await checkCollision(id);

    if (!hasCollision) {
      return id;
    }
  }

  throw new Error(
    `Failed to generate unique frontend ID after ${maxAttempts} attempts`
  );
}

/**
 * Validate a frontend ID format
 * Must be exactly 6 characters, all alphanumeric (A-Z, 0-9)
 *
 * @param id - The ID to validate
 * @returns true if valid format, false otherwise
 */
export function isValidFrontendId(id: string): boolean {
  if (typeof id !== "string" || id.length !== ID_LENGTH) {
    return false;
  }

  // Check all characters are in the charset
  for (const char of id) {
    if (!CHARSET.includes(char)) {
      return false;
    }
  }

  return true;
}
