import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MapPin, Calendar, Car, Route, Clock, Share2, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface PublicDriveLog {
  id: number;
  title: string;
  description?: string;
  startLocation: string;
  endLocation: string;
  distance: number;
  route?: string;
  startTime: string;
  endTime?: string;
  titleImageUrl?: string;
  vehicle?: {
    make: string;
    model: string;
    year: number;
  };
  user: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
  pitstops: Array<{
    id: number;
    name: string;
    description?: string;
    latitude: number;
    longitude: number;
    address?: string;
    type: string;
    imageUrls?: string[];
  }>;
}

export default function PublicDriveLog() {
  const { id } = useParams<{ id: string }>();
  const [driveLog, setDriveLog] = useState<PublicDriveLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPitstops, setExpandedPitstops] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    const fetchPublicDriveLog = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/public/drive-logs/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Drive log not found or not public");
          } else {
            setError("Failed to load drive log");
          }
          return;
        }

        const data = await response.json();
        setDriveLog(data);
      } catch (err) {
        setError("Failed to load drive log");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPublicDriveLog();
    }
  }, [id]);

  const handleShare = () => {
    if (navigator.share && driveLog) {
      navigator.share({
        title: driveLog.title,
        text: `Check out this drive log: ${driveLog.startLocation} to ${driveLog.endLocation}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return null;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      return `${diffMinutes} minutes`;
    }
    
    return `${diffHours.toFixed(1)} hours`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading drive log...</p>
        </div>
      </div>
    );
  }

  if (error || !driveLog) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Drive Log Not Found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => window.location.href = '/'}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Visit TorqueTrail
          </Button>
        </div>
      </div>
    );
  }

  const siteUrl = window.location.origin;
  const shareUrl = window.location.href;
  const imageUrl = driveLog.titleImageUrl ? `${siteUrl}${driveLog.titleImageUrl}` : `${siteUrl}/generated-icon.png`;
  const authorName = driveLog.user.firstName && driveLog.user.lastName 
    ? `${driveLog.user.firstName} ${driveLog.user.lastName}` 
    : driveLog.user.email.split('@')[0];

  return (
    <>
      <Helmet>
        <title>{driveLog.title} - TorqueTrail</title>
        <meta name="description" content={`${driveLog.description || `Drive from ${driveLog.startLocation} to ${driveLog.endLocation}`} - Shared on TorqueTrail`} />
        
        {/* Open Graph meta tags */}
        <meta property="og:title" content={`${driveLog.title} - TorqueTrail`} />
        <meta property="og:description" content={`${driveLog.description || `Drive from ${driveLog.startLocation} to ${driveLog.endLocation}`} by ${authorName}`} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="TorqueTrail" />
        
        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${driveLog.title} - TorqueTrail`} />
        <meta name="twitter:description" content={`${driveLog.description || `Drive from ${driveLog.startLocation} to ${driveLog.endLocation}`} by ${authorName}`} />
        <meta name="twitter:image" content={imageUrl} />
        
        {/* Additional meta tags */}
        <meta name="author" content={authorName} />
        <link rel="canonical" href={shareUrl} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 break-words">{driveLog.title}</h1>
              <p className="text-muted-foreground">Shared by {authorName}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" onClick={handleShare} size="sm" className="md:h-10">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button onClick={() => window.location.href = '/'} size="sm" className="md:h-10">
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit TorqueTrail
              </Button>
            </div>
          </div>

          {/* Title Image */}
          {driveLog.titleImageUrl && (
            <div className="mb-8">
              <img
                src={driveLog.titleImageUrl}
                alt={driveLog.title}
                className="w-full h-64 md:h-96 object-cover rounded-lg shadow-lg"
              />
            </div>
          )}

          {/* Drive Details */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Drive Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">From:</span>
                  <span>{driveLog.startLocation}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">To:</span>
                  <span>{driveLog.endLocation}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Distance:</span>
                  <span>{driveLog.distance} km</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Date:</span>
                  <span>{formatDate(driveLog.startTime)}</span>
                </div>
                {driveLog.route && (
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Route:</span>
                    <span>{driveLog.route}</span>
                  </div>
                )}
                {driveLog.endTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Duration:</span>
                    <span>{formatDuration(driveLog.startTime, driveLog.endTime)}</span>
                  </div>
                )}
              </div>
              
              {driveLog.vehicle && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Vehicle:</span>
                  <span>{driveLog.vehicle.year} {driveLog.vehicle.make} {driveLog.vehicle.model}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {driveLog.description && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{driveLog.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Pitstops */}
          {driveLog.pitstops && driveLog.pitstops.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Pitstops ({driveLog.pitstops.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {driveLog.pitstops.map((pitstop, index) => (
                    <Collapsible
                      key={pitstop.id}
                      open={expandedPitstops[pitstop.id]}
                      onOpenChange={(open) => 
                        setExpandedPitstops(prev => ({ ...prev, [pitstop.id]: open }))
                      }
                    >
                      <div className="border rounded-lg overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <div className="w-full p-4 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="flex-shrink-0">
                                  {expandedPitstops[pitstop.id] ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-medium truncate">{index + 1}. {pitstop.name}</h4>
                                  {pitstop.address && (
                                    <p className="text-sm text-muted-foreground truncate">{pitstop.address}</p>
                                  )}
                                </div>
                              </div>
                              <Badge variant="secondary" className="flex-shrink-0 ml-2">{pitstop.type}</Badge>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="p-4 pt-0">
                            {pitstop.description && (
                              <p className="text-sm mb-4 text-muted-foreground">{pitstop.description}</p>
                            )}
                            
                            {pitstop.imageUrls && pitstop.imageUrls.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {pitstop.imageUrls.map((imageUrl, imgIndex) => (
                                  <img
                                    key={imgIndex}
                                    src={imageUrl}
                                    alt={`${pitstop.name} - Image ${imgIndex + 1}`}
                                    className="w-full h-32 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(imageUrl, '_blank')}
                                  />
                                ))}
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
        </div>
      </div>
    </>
  );
}