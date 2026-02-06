import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import CouponsAPI, {
  CouponSchema,
  CouponValidationResult,
  validateCoupon,
} from "@/api/coupons";

// Validation status for UI display
export type CouponValidationStatus =
  | "idle" // No code entered
  | "validating" // Currently checking with server
  | "valid" // Coupon is valid
  | "invalid" // Coupon code not found or invalid
  | "error"; // Network or server error

export interface UseCouponValidationReturn {
  // The coupon code being validated
  code: string;
  // Set the coupon code (debounced validation will trigger)
  setCode: (code: string) => void;
  // Current validation status
  status: CouponValidationStatus;
  // Validation result (null if not validated yet)
  result: CouponValidationResult | null;
  // The validated coupon (null if invalid or not validated)
  coupon: CouponSchema | null;
  // Human-readable discount summary
  summary: string;
  // Error message if validation failed
  error: string | null;
  // Loading state
  isLoading: boolean;
  // Clear the current code and reset state
  clear: () => void;
  // Manually trigger validation
  validate: () => void;
}

/**
 * Hook for validating coupon codes with debounced API calls
 *
 * Features:
 * - Debounced validation (default 500ms delay)
 * - Human-readable discount summary generation
 * - Graceful error handling
 * - Clear validation status indicators
 *
 * @param debounceMs - Milliseconds to wait before validating (default: 500)
 * @returns Validation state and controls
 */
export function useCouponValidation(
  debounceMs: number = 500
): UseCouponValidationReturn {
  const [code, setCodeState] = useState("");
  const [debouncedCode, setDebouncedCode] = useState("");

  // Debounce the code input
  useEffect(() => {
    if (!code.trim()) {
      setDebouncedCode("");
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedCode(code.trim());
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [code, debounceMs]);

  // Query for coupon validation
  const {
    data: coupon,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["coupon", "validate", debouncedCode],
    queryFn: async () => {
      if (!debouncedCode) return null;
      return CouponsAPI.getCouponByCode(debouncedCode);
    },
    enabled: !!debouncedCode,
    staleTime: 30 * 1000, // Cache for 30 seconds
    retry: 1, // Only retry once on failure
  });

  // Compute validation result
  const result: CouponValidationResult | null =
    coupon !== undefined && coupon !== null
      ? validateCoupon(coupon)
      : debouncedCode && !isLoading && !isFetching && coupon === null
        ? { isValid: false, coupon: null, summary: "", error: "Coupon not found" }
        : null;

  // Compute status
  const getStatus = (): CouponValidationStatus => {
    if (!code.trim()) return "idle";
    if (isLoading || isFetching || code.trim() !== debouncedCode) return "validating";
    if (queryError) return "error";
    if (result?.isValid === false) return "invalid";
    if (result?.isValid === true) return "valid";
    return "idle";
  };

  // Compute error message
  const getError = (): string | null => {
    if (queryError) {
      // Handle network errors
      if (queryError instanceof Error) {
        if (queryError.message.includes("Network Error")) {
          return "Network error. Please check your connection.";
        }
        return queryError.message;
      }
      return "An error occurred while validating the coupon";
    }
    return result?.error || null;
  };

  const setCode = useCallback((newCode: string) => {
    setCodeState(newCode);
  }, []);

  const clear = useCallback(() => {
    setCodeState("");
    setDebouncedCode("");
  }, []);

  const validate = useCallback(() => {
    if (code.trim()) {
      setDebouncedCode(code.trim());
      refetch();
    }
  }, [code, refetch]);

  return {
    code,
    setCode,
    status: getStatus(),
    result,
    coupon: result?.coupon || null,
    summary: result?.summary || "",
    error: getError(),
    isLoading: isLoading || isFetching || code.trim() !== debouncedCode,
    clear,
    validate,
  };
}

/**
 * Query key generator for coupon-related queries
 */
export function generateCouponQueryKey(
  context: string,
  code?: string
): (string | undefined)[] {
  switch (context) {
    case "validate":
      return ["coupon", "validate", code];
    case "list":
      return ["coupons", "list"];
    default:
      return ["coupons"];
  }
}
