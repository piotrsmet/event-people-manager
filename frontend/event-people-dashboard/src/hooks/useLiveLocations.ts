import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { LocationLog } from "../types/location";

export function useLiveLocations(token: string) {
  const [locations, setLocations] = useState<Record<string, LocationLog>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => console.log("STOMP: " + str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      setIsConnected(true);
      client.subscribe("/topic/locations", (message) => {
        const data = JSON.parse(message.body) as LocationLog;
        setLocations(prev => ({
          ...prev,
          [data.userId]: data
        }));
      });
    };

    client.onDisconnect = () => setIsConnected(false);

    client.onStompError = (frame) => {
      console.error("Broker reported error: " + frame.headers["message"]);
      console.error("Additional details: " + frame.body);
    };

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [token]);

  return { 
    locations: Object.values(locations), 
    isConnected 
  };
}
