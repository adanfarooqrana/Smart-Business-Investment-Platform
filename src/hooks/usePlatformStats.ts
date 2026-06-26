import { useEffect, useState } from "react";
import {
  EMPTY_PLATFORM_STATS,
  subscribePlatformStats,
  syncPlatformStatsToRtdb,
  type PlatformStats,
} from "@/services/platformStatsService";

export function usePlatformStats(): PlatformStats {
  const [stats, setStats] = useState<PlatformStats>(EMPTY_PLATFORM_STATS);

  useEffect(() => {
    syncPlatformStatsToRtdb();
    return subscribePlatformStats(setStats);
  }, []);

  return stats;
}
