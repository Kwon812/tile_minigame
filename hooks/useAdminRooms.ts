"use client";

import { useCallback, useEffect, useState } from "react";
import { listRooms, type RoomInfo } from "@/services/gameService";

/** Live room list for the admin dashboard (socket-server backed). */
export function useAdminRooms() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const reload = useCallback(async () => {
    try {
      setRooms(await listRooms());
    } catch {
      /* 소켓 서버 미동작 시 무시 */
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { rooms, reload };
}
