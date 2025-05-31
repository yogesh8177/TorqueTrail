import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  MapPin, 
  Clock, 
  Calendar, 
  Route, 
  AlertTriangle, 
  CloudSun,
  User,
  Navigation
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Convoy {
  id: number;
  organizerId: string;
  title: string;
  description?: string;
  startLocation: string;
  endLocation?: string;
  routeName?: string;
  distance?: string;
  estimatedDuration?: number;
  startDateTime: string;
  maxParticipants: number;
  currentParticipants: number;
  meetingPoint: string;
  weatherAlert?: string;
  roadAlert?: string;
  difficulty: string;
  vehicleTypes?: string[];
  status: string;
  imageUrl?: string;
}

interface ConvoyCardProps {
  convoy: Convoy;
  showJoinButton?: boolean;
  variant?: "default" | "featured";
}

export default function ConvoyCard({ convoy, showJoinButton = true, variant = "default" }: ConvoyCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isJoined, setIsJoined] = useState(false);

  const joinConvoyMutation = useMutation({
    mutationFn: async () => {
      if (isJoined) {
        return await apiRequest("POST", `/api/convoys/${convoy.id}/leave`);
      } else {
        return await apiRequest("POST", `/api/convoys/${convoy.id}/join`);
      }
    },
    onSuccess: () => {
      setIsJoined(!isJoined);
      toast({
        title: isJoined ? "Left convoy" : "Joined convoy",
        description: isJoined 
          ? "You have left this convoy event."
          : "You have successfully joined this convoy event.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/convoys/upcoming"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update convoy participation",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleJoinToggle = () => {
    joinConvoyMutation.mutate();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "moderate":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "hard":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "full":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "completed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  const isUpcoming = new Date(convoy.startDateTime) > new Date();
  const isFull = convoy.currentParticipants >= convoy.maxParticipants;

  return (
    <Card className={`automotive-card-interactive ${
      variant === "featured" 
        ? "border-secondary/30 bg-gradient-to-br from-card to-secondary/5" 
        : ""
    }`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-bold">{convoy.title}</h3>
              {variant === "featured" && (
                <Badge className="bg-secondary/20 text-secondary border-secondary/30">
                  Featured
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline" className={getStatusColor(convoy.status)}>
                {convoy.status}
              </Badge>
              <Badge variant="outline" className={getDifficultyColor(convoy.difficulty)}>
                {convoy.difficulty}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Organized by Driver {convoy.organizerId.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {convoy.description && (
          <p className="text-muted-foreground mb-4 leading-relaxed">
            {convoy.description}
          </p>
        )}

        {/* Event Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-secondary" />
              <div>
                <p className="text-sm font-medium">
                  {format(new Date(convoy.startDateTime), "MMM dd, yyyy")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(convoy.startDateTime), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">
                  {format(new Date(convoy.startDateTime), "h:mm a")}
                </p>
                {convoy.estimatedDuration && (
                  <p className="text-xs text-muted-foreground">
                    {Math.floor(convoy.estimatedDuration / 60)}h {convoy.estimatedDuration % 60}m duration
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">
                  {convoy.currentParticipants}/{convoy.maxParticipants} spots
                </p>
                <p className="text-xs text-muted-foreground">
                  {convoy.maxParticipants - convoy.currentParticipants} remaining
                </p>
              </div>
            </div>
            
            {convoy.distance && (
              <div className="flex items-center space-x-2">
                <Route className="w-4 h-4 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">{convoy.distance}</p>
                  <p className="text-xs text-muted-foreground">Total distance</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Route Information */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Meeting Point:</span>
            <span className="text-sm text-muted-foreground">{convoy.meetingPoint}</span>
          </div>
          
          {convoy.routeName && (
            <div className="flex items-center space-x-2">
              <Navigation className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium">Route:</span>
              <span className="text-sm text-muted-foreground">{convoy.routeName}</span>
            </div>
          )}
        </div>

        {/* Alerts */}
        {(convoy.weatherAlert || convoy.roadAlert) && (
          <div className="space-y-2 mb-4">
            {convoy.weatherAlert && (
              <div className="flex items-start space-x-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <CloudSun className="w-4 h-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-400">Weather Update</p>
                  <p className="text-xs text-muted-foreground">{convoy.weatherAlert}</p>
                </div>
              </div>
            )}
            
            {convoy.roadAlert && (
              <div className="flex items-start space-x-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">Road Alert</p>
                  <p className="text-xs text-muted-foreground">{convoy.roadAlert}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vehicle Types */}
        {convoy.vehicleTypes && convoy.vehicleTypes.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Welcome Vehicle Types:</p>
            <div className="flex flex-wrap gap-1">
              {convoy.vehicleTypes.map((type) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showJoinButton && isUpcoming && convoy.status === "open" && (
          <div className="flex space-x-3">
            <Button
              onClick={handleJoinToggle}
              disabled={joinConvoyMutation.isPending || (isFull && !isJoined)}
              className={`flex-1 ${
                isJoined
                  ? "bg-red-500 hover:bg-red-600"
                  : isFull
                  ? "opacity-50 cursor-not-allowed"
                  : "bg-secondary hover:bg-secondary/90"
              }`}
            >
              {joinConvoyMutation.isPending
                ? "Processing..."
                : isJoined
                ? "Leave Convoy"
                : isFull
                ? "Full"
                : "Join Convoy"
              }
            </Button>
            
            <Link href={`/convoy/${convoy.id}`}>
              <Button variant="outline" size="default">
                View Details
              </Button>
            </Link>
          </div>
        )}
        
        {!isUpcoming && (
          <Button variant="outline" className="w-full">
            View Results
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
