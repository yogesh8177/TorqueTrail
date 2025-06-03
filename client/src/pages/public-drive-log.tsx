import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, Car, Heart, Eye, ChevronDown, ChevronUp, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { DriveLog, Vehicle, Pitstop } from "@shared/schema";

export default function PublicDriveLog() {
  const { toast } = useToast();
  const params = useParams();
  const [expandedPitstops, setExpandedPitstops] = useState<{[key: number]: boolean}>({});
  const [hasLiked, setHasLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Fetch public drive log data
  const { data: driveLog, isLoading } = useQuery({
    queryKey: ['/api/public/drive-logs/' + params.id],
    enabled: !!params.id,
  });

  // Fetch pitstops for the drive log
  const { data: pitstops } = useQuery({
    queryKey: ['/api/public/pitstops/' + params.id],
    enabled: !!params.id,
  });

  // Fetch vehicle data if available
  const { data: vehicle } = useQuery({
    queryKey: ['/api/public/vehicles/' + driveLog?.vehicleId],
    enabled: !!driveLog?.vehicleId,
  });

  // Generate or get client ID for likes
  const getClientId = () => {
    let clientId = localStorage.getItem('publicClientId');
    if (!clientId) {
      clientId = 'public_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('publicClientId', clientId);
    }
    return clientId;
  };

  // Fetch initial like status
  const { data: likeData } = useQuery({
    queryKey: ['/api/public/drive-logs/' + params.id + '/likes', getClientId()],
    enabled: !!params.id,
    queryFn: async () => {
      const response = await fetch(`/api/public/drive-logs/${params.id}/likes?clientId=${getClientId()}`);
      if (!response.ok) throw new Error('Failed to fetch likes');
      return response.json();
    },
  });

  // Update like state when data is fetched
  useEffect(() => {
    if (likeData) {
      setHasLiked(likeData.liked);
      setLikeCount(likeData.likeCount);
    }
  }, [likeData]);

  // Like mutation for public users
  const likeMutation = useMutation({
    mutationFn: async () => {
      const clientId = getClientId();
      const response = await fetch(`/api/public/drive-logs/${params.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to like drive log');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setHasLiked(data.liked);
      setLikeCount(data.likeCount);
      
      // Invalidate and refetch like data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/public/drive-logs/' + params.id + '/likes', getClientId()] 
      });
      
      toast({
        title: data.liked ? "Liked!" : "Like removed",
        description: data.liked ? "You liked this drive log" : "You removed your like",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    },
  });

  // Generate unique client ID for anonymous likes
  const generateClientId = () => {
    return 'public_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  // Handle share functionality
  const handleShare = () => {
    const url = window.location.href;
    
    if (navigator.share) {
      navigator.share({
        title: driveLog?.title,
        text: `Check out this drive log: ${driveLog?.title}`,
        url: url,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(url);
        toast({
          title: "Link copied!",
          description: "Drive log link copied to clipboard",
        });
      });
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Drive log link copied to clipboard",
      });
    }
  };

  // Format date function
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format time function
  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Get pitstop type badge color
  const getPitstopTypeBadge = (type: string) => {
    const colors = {
      food: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      fuel: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      scenic: "bg-green-500/20 text-green-400 border-green-500/30",
      rest: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      attraction: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      other: "bg-gray-500/20 text-gray-400 border-gray-500/30"
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading drive log...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!driveLog) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Drive Log Not Found</h1>
              <p className="text-muted-foreground">This drive log may be private or no longer available.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{driveLog.title}</h1>
          <p className="text-muted-foreground text-lg">{driveLog.description}</p>
        </div>

        {/* Title Image */}
        {driveLog.titleImageUrl && (
          <div className="mb-6">
            <img
              src={driveLog.titleImageUrl}
              alt={driveLog.title}
              className="w-full h-64 md:h-80 object-cover rounded-lg border shadow-lg"
            />
          </div>
        )}

        {/* Main Drive Log Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-xl">{driveLog.title}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => likeMutation.mutate()}
                  disabled={likeMutation.isPending}
                  className={hasLiked ? "text-red-500 border-red-500" : ""}
                >
                  <Heart className={`h-4 w-4 mr-1 ${hasLiked ? "fill-current" : ""}`} />
                  {likeCount || 0}
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Route Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">From:</span>
                <span className="font-medium">{driveLog.startLocation}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">To:</span>
                <span className="font-medium">{driveLog.endLocation}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{driveLog.distance}</div>
                <div className="text-sm text-muted-foreground">Kilometers</div>
              </div>
              {driveLog.duration && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{formatDuration(driveLog.duration)}</div>
                  <div className="text-sm text-muted-foreground">Duration</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{pitstops?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Pitstops</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{formatDate(driveLog.startTime)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{formatTime(driveLog.startTime)}</div>
              </div>
            </div>

            {/* Vehicle Info */}
            {vehicle && (
              <div className="flex items-center gap-2 pt-4 border-t">
                <Car className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Vehicle:</span>
                <span className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pitstops Section */}
        {pitstops && pitstops.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Pitstops ({pitstops.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pitstops.map((pitstop: Pitstop, index: number) => (
                  <Collapsible
                    key={pitstop.id}
                    open={expandedPitstops[index]}
                    onOpenChange={(open) => setExpandedPitstops(prev => ({
                      ...prev,
                      [index]: open
                    }))}
                  >
                    <div className="border rounded-lg p-4">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-muted-foreground">#{index + 1}</div>
                            <div className="text-left">
                              <div className="font-medium">{pitstop.name}</div>
                              <div className="text-sm text-muted-foreground">{pitstop.address}</div>
                            </div>
                            <Badge className={`ml-auto ${getPitstopTypeBadge(pitstop.type)}`}>
                              {pitstop.type}
                            </Badge>
                          </div>
                          {expandedPitstops[index] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="pt-4">
                        <div className="space-y-3">
                          {pitstop.description && (
                            <p className="text-sm text-muted-foreground">{pitstop.description}</p>
                          )}
                          
                          {pitstop.notes && (
                            <div>
                              <h4 className="font-medium text-sm mb-1">Notes</h4>
                              <p className="text-sm text-muted-foreground">{pitstop.notes}</p>
                            </div>
                          )}
                          
                          {/* Pitstop Images */}
                          {pitstop.imageUrls && pitstop.imageUrls.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm mb-2">Photos</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {pitstop.imageUrls.map((imageUrl: string, imgIndex: number) => (
                                  <img
                                    key={imgIndex}
                                    src={imageUrl}
                                    alt={`${pitstop.name} - Photo ${imgIndex + 1}`}
                                    className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(imageUrl, '_blank')}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Shared from TorqueTrail - The automotive enthusiast community
          </p>
        </div>
      </div>
    </div>
  );
}