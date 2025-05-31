import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Mountain,
  Car,
  Route,
  Search
} from "lucide-react";

export default function Routes() {
  const [location, setLocation] = useState("");
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const { toast } = useToast();

  const recommendationsMutation = useMutation({
    mutationFn: async (data: { location: string; preferences?: any }) => {
      const response = await apiRequest('/api/routes/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (data) => {
      setRecommendations(data.routes || []);
      toast({
        title: "Success",
        description: "Route recommendations generated successfully!"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate route recommendations",
        variant: "destructive"
      });
    }
  });

  const handleSearch = () => {
    if (!location.trim()) {
      toast({
        title: "Error",
        description: "Please enter a location to search for routes",
        variant: "destructive"
      });
      return;
    }

    recommendationsMutation.mutate({
      location: location.trim(),
      preferences: {
        type: "scenic",
        difficulty: "moderate"
      }
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64">
          <div className="container mx-auto px-4 py-8 pb-20 lg:pb-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Discover Routes</h1>
        <p className="text-muted-foreground">
          Find the perfect driving routes for your next adventure
        </p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Route Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Starting Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter a city, landmark, or address..."
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <Button 
              onClick={handleSearch} 
              disabled={recommendationsMutation.isPending || !location.trim()}
              className="w-full"
            >
              {recommendationsMutation.isPending ? "Generating..." : "Get Route Recommendations"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Recommended Routes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((route, index) => (
              <Card key={index} className="automotive-card-interactive">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Route Header */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">{route.name}</h3>
                      <p className="text-sm text-muted-foreground">{route.description}</p>
                    </div>

                    {/* Route Details */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{route.startPoint} → {route.endPoint}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Route className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{route.distance}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{route.duration}</span>
                      </div>

                      {route.difficulty && (
                        <div className="flex items-center gap-2">
                          <Mountain className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline" className={getDifficultyColor(route.difficulty)}>
                            {route.difficulty}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Route Features */}
                    {route.features && route.features.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Highlights:</p>
                        <div className="flex flex-wrap gap-1">
                          {route.features.map((feature: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button variant="outline" className="w-full">
                      <Navigation className="h-4 w-4 mr-2" />
                      Plan Convoy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Popular Routes */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Routes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Pacific Coast Highway</h3>
              <p className="text-sm text-muted-foreground">
                Scenic coastal drive from San Francisco to Los Angeles
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>655 miles</span>
                <span>12+ hours</span>
                <Badge variant="outline" className="text-xs">Scenic</Badge>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Blue Ridge Parkway</h3>
              <p className="text-sm text-muted-foreground">
                Mountain views through Virginia and North Carolina
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>469 miles</span>
                <span>8+ hours</span>
                <Badge variant="outline" className="text-xs">Mountain</Badge>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Route 66</h3>
              <p className="text-sm text-muted-foreground">
                Historic highway from Chicago to Santa Monica
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>2,448 miles</span>
                <span>35+ hours</span>
                <Badge variant="outline" className="text-xs">Historic</Badge>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Going-to-the-Sun Road</h3>
              <p className="text-sm text-muted-foreground">
                Spectacular mountain road through Glacier National Park
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>50 miles</span>
                <span>2+ hours</span>
                <Badge variant="outline" className="text-xs">National Park</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}