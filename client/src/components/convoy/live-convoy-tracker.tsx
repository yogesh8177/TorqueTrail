import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MapPin, 
  Users, 
  MessageCircle, 
  AlertTriangle, 
  Navigation,
  Send,
  Phone,
  Car
} from "lucide-react";

interface LiveConvoyTrackerProps {
  convoyId: number;
  convoy: {
    title: string;
    organizerId: string;
    status: string;
  };
}

interface ParticipantLocation {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface ConvoyMessage {
  type: string;
  userId: string;
  message?: string;
  emergencyType?: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
}

export default function LiveConvoyTracker({ convoyId, convoy }: LiveConvoyTrackerProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [participantLocations, setParticipantLocations] = useState<Map<string, ParticipantLocation>>(new Map());
  const [messages, setMessages] = useState<ConvoyMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      disconnectWebSocket();
    };
  }, [convoyId, user?.id]);

  const connectWebSocket = () => {
    if (!user?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      
      // Join convoy room
      ws.send(JSON.stringify({
        type: 'join_convoy',
        convoyId,
        userId: user.id
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (convoy.status === 'active') {
          connectWebSocket();
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };
  };

  const disconnectWebSocket = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  const handleWebSocketMessage = (data: ConvoyMessage) => {
    switch (data.type) {
      case 'location_update':
        if (data.latitude && data.longitude) {
          setParticipantLocations(prev => new Map(prev).set(data.userId, {
            userId: data.userId,
            latitude: data.latitude!,
            longitude: data.longitude!,
            timestamp: data.timestamp
          }));
        }
        break;
      
      case 'convoy_message':
      case 'emergency_alert':
      case 'user_joined':
      case 'user_left':
        setMessages(prev => [data, ...prev].slice(0, 100)); // Keep last 100 messages
        break;
    }
  };

  const startLocationSharing = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        // Send location update via WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'location_update',
            convoyId,
            userId: user?.id,
            payload: { latitude, longitude }
          }));
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        setIsLocationSharing(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );

    watchIdRef.current = watchId;
    setIsLocationSharing(true);
  };

  const stopLocationSharing = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLocationSharing(false);
    setUserLocation(null);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: 'convoy_message',
      convoyId,
      userId: user?.id,
      payload: { message: newMessage }
    }));

    setNewMessage("");
  };

  const sendEmergencyAlert = (emergencyType: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: 'emergency_alert',
      convoyId,
      userId: user?.id,
      payload: {
        emergencyType,
        message: `Emergency: ${emergencyType}`,
        latitude: userLocation?.lat,
        longitude: userLocation?.lng
      }
    }));
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (convoy.status !== 'active') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Convoy Coordination
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Live coordination is only available for active convoys.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Live Convoy: {convoy.title}
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {!isLocationSharing ? (
              <Button onClick={startLocationSharing} className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Share Location
              </Button>
            ) : (
              <Button variant="outline" onClick={stopLocationSharing} className="flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Stop Sharing
              </Button>
            )}
          </div>

          {/* Current Location */}
          {userLocation && (
            <div className="text-sm text-muted-foreground">
              Your location: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
            </div>
          )}

          {/* Participants Count */}
          <div className="flex items-center gap-2 mt-2">
            <Users className="h-4 w-4" />
            <span className="text-sm">{participantLocations.size} participants sharing location</span>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Emergency Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => sendEmergencyAlert("breakdown")}
              disabled={!isLocationSharing}
            >
              Vehicle Breakdown
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => sendEmergencyAlert("accident")}
              disabled={!isLocationSharing}
            >
              Accident
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => sendEmergencyAlert("medical")}
              disabled={!isLocationSharing}
            >
              Medical Emergency
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => sendEmergencyAlert("help")}
              disabled={!isLocationSharing}
            >
              Need Help
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages and Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Live Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Message Input */}
          <div className="flex gap-2 mb-4">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Send a message to the convoy..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={!isConnected}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || !isConnected}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages List */}
          <ScrollArea className="h-60">
            <div className="space-y-2">
              {messages.map((msg, index) => (
                <div key={index} className="text-sm border-l-2 border-muted pl-3">
                  <div className="flex justify-between items-start">
                    <div>
                      {msg.type === 'emergency_alert' && (
                        <div className="text-red-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          EMERGENCY: {msg.emergencyType}
                        </div>
                      )}
                      {msg.type === 'convoy_message' && (
                        <div className="text-foreground">
                          <span className="font-medium">User {msg.userId}:</span> {msg.message}
                        </div>
                      )}
                      {msg.type === 'user_joined' && (
                        <div className="text-green-600">
                          User {msg.userId} joined the convoy
                        </div>
                      )}
                      {msg.type === 'user_left' && (
                        <div className="text-orange-600">
                          User {msg.userId} left the convoy
                        </div>
                      )}
                      {msg.type === 'location_update' && (
                        <div className="text-blue-600">
                          User {msg.userId} updated location
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}