'use client'

import { Button, Spinner, Tooltip, Chip } from "@heroui/react";
import { useConnectivity } from "@/hooks/useConnectivity";
import { HugeiconsIcon } from "@hugeicons/react";
import { Wifi01Icon, WifiDisconnected01Icon, ArrowReloadHorizontalIcon, Alert02Icon } from "@hugeicons/core-free-icons";
import { useState, useCallback } from "react";

/**
 * OfflineIndicator Component
 *
 * Displays the current connectivity status and pending sync count.
 * Shows:
 * - Online/Offline status with icon
 * - Number of orders pending sync
 * - Manual sync button
 * - Error indicator if syncs have failed
 */
export default function OfflineIndicator() {
    const {
        isOnline,
        isOffline,
        isChecking,
        pendingSyncCount,
        hasErrors,
        triggerSync,
    } = useConnectivity();

    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = useCallback(async () => {
        if (isSyncing || isOffline) return;

        setIsSyncing(true);
        try {
            await triggerSync();
        } catch (error) {
            console.error("Manual sync failed:", error);
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, isOffline, triggerSync]);

    // Determine status color and icon
    const getStatusConfig = () => {
        if (isOffline) {
            return {
                icon: WifiDisconnected01Icon,
                color: "danger" as const,
                bgColor: "bg-red-50",
                textColor: "text-red-600",
                label: "Offline",
            };
        }
        if (isChecking) {
            return {
                icon: Wifi01Icon,
                color: "warning" as const,
                bgColor: "bg-yellow-50",
                textColor: "text-yellow-600",
                label: "Checking...",
            };
        }
        return {
            icon: Wifi01Icon,
            color: "success" as const,
            bgColor: "bg-green-50",
            textColor: "text-green-600",
            label: "Online",
        };
    };

    const config = getStatusConfig();

    return (
        <div className={`flex flex-col gap-2 p-3 rounded-lg ${config.bgColor} border border-default-200`}>
            {/* Status Row */}
            <div className="flex items-center gap-2">
                {isChecking ? (
                    <Spinner size="sm" color="warning" />
                ) : (
                    <HugeiconsIcon
                        icon={config.icon}
                        className={`h-4 w-4 ${config.textColor}`}
                    />
                )}
                <span className={`text-sm font-medium ${config.textColor}`}>
                    {config.label}
                </span>
            </div>

            {/* Pending Sync Count */}
            {pendingSyncCount > 0 && (
                <div className="flex items-center gap-2">
                    <Chip
                        size="sm"
                        color={hasErrors ? "danger" : "warning"}
                        variant="flat"
                        startContent={
                            hasErrors ? (
                                <HugeiconsIcon
                                    icon={Alert02Icon}
                                    className="h-3 w-3"
                                />
                            ) : null
                        }
                    >
                        {pendingSyncCount} pending
                    </Chip>

                    {/* Sync Button */}
                    <Tooltip content={isOffline ? "Cannot sync while offline" : "Sync now"}>
                        <Button
                            size="sm"
                            variant="flat"
                            color={hasErrors ? "danger" : "primary"}
                            isIconOnly
                            isDisabled={isOffline || isSyncing}
                            isLoading={isSyncing}
                            onPress={handleSync}
                            aria-label="Sync pending orders"
                        >
                            {!isSyncing && (
                                <HugeiconsIcon
                                    icon={ArrowReloadHorizontalIcon}
                                    className="h-4 w-4"
                                />
                            )}
                        </Button>
                    </Tooltip>
                </div>
            )}

            {/* Error Message */}
            {hasErrors && isOnline && (
                <p className="text-xs text-red-500">
                    Some orders failed to sync. Click sync to retry.
                </p>
            )}

            {/* Offline Warning */}
            {isOffline && pendingSyncCount > 0 && (
                <p className="text-xs text-red-500">
                    Orders will sync when connection is restored.
                </p>
            )}
        </div>
    );
}
