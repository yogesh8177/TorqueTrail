import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import LiveConvoyTracker from "@/components/convoy/live-convoy-tracker";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Users, 
  Car, 
  Clock,
  Navigation,
  AlertTriangle,
  UserPlus,
  UserMinus
} from "lucide-react";

export default function ConvoyDetail() {
  const [, params] = useRoute("/convoy/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const convoyId = params?.id ? parseInt(params.id) : 0;

  const { data: convoy, isLoading, error } = useQuery({
    queryKey: ['/api/convoys', convoyId],
    enabled: !!convoyId,
  });

  // Debug logging
  console.log('Convoy ID from URL:', convoyId);
  console.log('Convoy data:', convoy);
  console.log('Query error:', error);

  const { data: participants, isLoading: participantsLoading } = useQuery({
    queryKey: ['/api/convoys', convoyId, 'participants'],
    enabled: !!convoyId,
  });

  const { data: isParticipant, isLoading: participantStatusLoading } = useQuery({
    queryKey: ['/api/convoys', convoyId, 'is-participant'],
    enabled: !!convoyId && !!user?.id,
  });

  const joinConvoyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/convoys/${convoyId}/join`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Joined convoy successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/convoys', convoyId] });
      queryClient.invalidateQueries({ queryKey: ['/api/convoys', convoyId, 'participants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/convoys', convoyId, 'is-participant'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join convoy",
        variant: "destructive",
      });
    },
  });

  const leaveConvoyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/convoys/${convoyId}/leave`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Left convoy successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/convoys', convoyId] });
      queryClient.invalidateQueries({ queryKey: ['/api/convoys', convoyId, 'participants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/convoys', convoyId, 'is-participant'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to leave convoy",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!convoy) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Convoy not found</h1>
          <Button onClick={() => setLocation("/convoys")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Convoys
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'upcoming': return 'secondary';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setLocation("/convoys")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Convoys
        </Button>
        
        <div className="flex items-center gap-2">
          {user?.id !== convoy.organizerId && (
            <>
              {!isParticipant ? (
                <Button 
                  onClick={() => joinConvoyMutation.mutate()}
                  disabled={joinConvoyMutation.isPending || convoy.status !== 'upcoming'}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  {joinConvoyMutation.isPending ? "Joining..." : "Join Convoy"}
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => leaveConvoyMutation.mutate()}
                  disabled={leaveConvoyMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <UserMinus className="h-4 w-4" />
                  {leaveConvoyMutation.isPending ? "Leaving..." : "Leave Convoy"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Convoy Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{convoy.title}</CardTitle>
                  <Badge variant={getStatusBadgeVariant(convoy.status)}>
                    {convoy.status.toUpperCase()}
                  </Badge>
                </div>
                {convoy.imageUrl && (
                  <img 
                    src={convoy.imageUrl} 
                    alt={convoy.title}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {convoy.description && (
                <p className="text-muted-foreground">{convoy.description}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Start Location</div>
                    <div className="text-sm text-muted-foreground">{convoy.startLocation}</div>
                  </div>
                </div>

                {convoy.endLocation && (
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">End Location</div>
                      <div className="text-sm text-muted-foreground">{convoy.endLocation}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Date</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(convoy.startDateTime)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Time</div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(convoy.startDateTime)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Participants</div>
                    <div className="text-sm text-muted-foreground">
                      {convoy.currentParticipants} / {convoy.maxParticipants}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Meeting Point</div>
                    <div className="text-sm text-muted-foreground">{convoy.meetingPoint}</div>
                  </div>
                </div>
              </div>

              {convoy.distance && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">Distance:</span>
                  <span>{convoy.distance}</span>
                </div>
              )}

              {convoy.estimatedDuration && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">Duration:</span>
                  <span>{convoy.estimatedDuration} hours</span>
                </div>
              )}

              {convoy.vehicleTypes && convoy.vehicleTypes.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Vehicle Types:</div>
                  <div className="flex flex-wrap gap-1">
                    {convoy.vehicleTypes.map((type: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <Car className="h-3 w-3 mr-1" />
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(convoy.weatherAlert || convoy.roadAlert) && (
                <div className="space-y-2">
                  {convoy.weatherAlert && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800 dark:text-yellow-200">
                        Weather Alert: {convoy.weatherAlert}
                      </span>
                    </div>
                  )}
                  {convoy.roadAlert && (
                    <div className="flex items-center gap-2 p-2 bg-orange-100 dark:bg-orange-900/20 rounded">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-orange-800 dark:text-orange-200">
                        Road Alert: {convoy.roadAlert}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-time Convoy Tracker */}
          {isParticipant && (
            <LiveConvoyTracker convoyId={convoyId} convoy={convoy} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participants && participants.length > 0 ? (
                <div className="space-y-3">
                  {participants.map((participant: any) => (
                    <div key={participant.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            User {participant.userId}
                            {participant.userId === convoy.organizerId && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Organizer
                              </Badge>
                            )}
                          </div>
                          {participant.vehicle && (
                            <div className="text-xs text-muted-foreground">
                              {participant.vehicle.year} {participant.vehicle.make} {participant.vehicle.model}
                            </div>
                          )}
                        </div>
                      </div>
                      {convoy.status === 'active' && participant.isLocationSharing && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          Live
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No participants yet</p>
              )}
            </CardContent>
          </Card>

          {/* Route Info */}
          {convoy.routeName && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Route Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm font-medium">Route Name</div>
                    <div className="text-sm text-muted-foreground">{convoy.routeName}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Difficulty</div>
                    <Badge variant={convoy.difficulty === 'Hard' ? 'destructive' : 
                                  convoy.difficulty === 'Medium' ? 'default' : 'secondary'}>
                      {convoy.difficulty}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}