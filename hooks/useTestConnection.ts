/**
 * Test Connection Hook
 *
 * Validates WooCommerce API credentials by making a test request
 * to the /wp-json/wc/v3 endpoint (store info).
 */

import { useState, useCallback } from "react";
import axios from "axios";
import type { ApiConfig } from "@/stores/settings";

export type ConnectionStatus = "idle" | "testing" | "success" | "error";

export interface UseTestConnectionResult {
  /** Test the provided API configuration */
  test: (config: ApiConfig) => Promise<boolean>;
  /** Current status of the connection test */
  status: ConnectionStatus;
  /** Error message if the test failed */
  error: string | null;
  /** Reset the hook to idle state */
  reset: () => void;
}

/** Timeout for connection test in milliseconds (10 seconds) */
const TEST_TIMEOUT = 10 * 1000;

/**
 * Hook for testing WooCommerce API credentials
 *
 * @returns Test function, status, error, and reset function
 *
 * @example
 * ```tsx
 * const { test, status, error, reset } = useTestConnection();
 *
 * const handleTest = async () => {
 *   const success = await test({
 *     baseUrl: 'https://example.com',
 *     consumerKey: 'ck_...',
 *     consumerSecret: 'cs_...',
 *   });
 *   if (success) {
 *     // Credentials are valid
 *   }
 * };
 * ```
 */
export function useTestConnection(): UseTestConnectionResult {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  /**
   * Test the provided API configuration
   *
   * Makes a GET request to /wp-json/wc/v3 to validate credentials.
   * This endpoint returns store information and requires authentication.
   *
   * @param config - API configuration with baseUrl, consumerKey, and consumerSecret
   * @returns true if connection successful, false otherwise
   */
  const test = useCallback(async (config: ApiConfig): Promise<boolean> => {
    // Validate that all required fields are provided
    if (!config.baseUrl || !config.consumerKey || !config.consumerSecret) {
      setStatus("error");
      setError("Please fill in all fields.");
      return false;
    }

    setStatus("testing");
    setError(null);

    try {
      // Normalize the base URL (remove trailing slashes)
      const baseUrl = config.baseUrl.replace(/\/+$/, "");

      // Create a test client with the provided credentials
      const testClient = axios.create({
        baseURL: `${baseUrl}/wp-json/wc/v3`,
        timeout: TEST_TIMEOUT,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        auth: {
          username: config.consumerKey,
          password: config.consumerSecret,
        },
      });

      // Test the connection by requesting store info
      // The /wp-json/wc/v3 endpoint returns store details and requires authentication
      await testClient.get("");

      setStatus("success");
      setError(null);
      return true;
    } catch (err) {
      setStatus("error");

      if (axios.isAxiosError(err)) {
        const statusCode = err.response?.status;

        if (statusCode === 401 || statusCode === 403) {
          // Authentication failed
          setError("Invalid credentials. Please check your Consumer Key and Secret.");
        } else if (statusCode === 404) {
          // WooCommerce API not found
          setError("WooCommerce API not found. Please check the URL and ensure WooCommerce is installed.");
        } else if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
          // Timeout
          setError("Connection timed out. Please check the URL and try again.");
        } else if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
          // Network error (CORS, DNS, etc.)
          setError("Could not connect. Please check the URL and ensure the site is accessible.");
        } else if (statusCode && statusCode >= 500) {
          // Server error
          setError(`Server error (${statusCode}). Please try again later.`);
        } else {
          // Other errors
          setError(err.message || "Connection failed. Please check your settings.");
        }
      } else {
        // Non-Axios error
        setError("An unexpected error occurred. Please try again.");
      }

      return false;
    }
  }, []);

  /**
   * Reset the hook to idle state
   */
  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return {
    test,
    status,
    error,
    reset,
  };
}

export default useTestConnection;
