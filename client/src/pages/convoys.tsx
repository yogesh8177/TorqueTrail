import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import ConvoyCard from "@/components/convoy/convoy-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Plus, Calendar, MapPin, Clock, Route, Filter, Search } from "lucide-react";
import { insertConvoySchema } from "@shared/schema";
import { z } from "zod";
import { format, addDays } from "date-fns";

const convoyFormSchema = insertConvoySchema.extend({
  startDateTime: z.string().transform((str) => new Date(str)),
  maxParticipants: z.number().min(2).max(100),
  estimatedDuration: z.number().optional(),
});

type ConvoyFormData = z.infer<typeof convoyFormSchema>;

export default function Convoys() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [activeTab, setActiveTab] = useState("upcoming");
  
  const [formData, setFormData] = useState<Partial<ConvoyFormData>>({
    title: "",
    description: "",
    startLocation: "",
    endLocation: "",
    routeName: "",
    distance: "",
    estimatedDuration: undefined,
    startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    maxParticipants: 20,
    meetingPoint: "",
    difficulty: "easy",
    vehicleTypes: ["car"],
  });

  // Fetch upcoming convoys
  const { data: upcomingConvoys = [], isLoading: upcomingLoading } = useQuery({
    queryKey: ["/api/convoys/upcoming"],
    enabled: !!user,
  });

  // Fetch user convoys
  const { data: userConvoys = [], isLoading: userLoading } = useQuery({
    queryKey: ["/api/convoys/user"],
    enabled: !!user,
  });

  // Create convoy mutation
  const createConvoyMutation = useMutation({
    mutationFn: async (data: ConvoyFormData) => {
      return await apiRequest("POST", "/api/convoys", data);
    },
    onSuccess: () => {
      toast({
        title: "Convoy created successfully!",
        description: "Your convoy event has been created and is now open for participants.",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/convoys/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/convoys/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create convoy",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      startLocation: "",
      endLocation: "",
      routeName: "",
      distance: "",
      estimatedDuration: undefined,
      startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      maxParticipants: 20,
      meetingPoint: "",
      difficulty: "easy",
      vehicleTypes: ["car"],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = convoyFormSchema.parse({
        ...formData,
        organizerId: user?.id,
        startDateTime: formData.startDateTime?.toISOString(),
      });

      createConvoyMutation.mutate(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  // Filter convoys based on search and filters
  const filterConvoys = (convoys: any[]) => {
    return convoys.filter(convoy => {
      const matchesSearch = convoy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           convoy.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           convoy.routeName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDifficulty = selectedDifficulty === "all" || convoy.difficulty === selectedDifficulty;
      
      return matchesSearch && matchesDifficulty;
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const filteredUpcoming = filterConvoys(upcomingConvoys);
  const filteredUserConvoys = filterConvoys(userConvoys);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        <Sidebar />
        <main className="flex-1 lg:pl-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">Convoys</h1>
                <p className="text-muted-foreground">
                  Join group drives and organize automotive adventures
                </p>
              </div>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-secondary hover:bg-secondary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Convoy
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Convoy</DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Convoy Title *</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Sunset Strip Cruise, Mountain Pass Adventure"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe the convoy route, expectations, and what participants should know..."
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Route Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Route Details</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startLocation">Start Location *</Label>
                          <Input
                            id="startLocation"
                            value={formData.startLocation}
                            onChange={(e) => setFormData(prev => ({ ...prev, startLocation: e.target.value }))}
                            placeholder="e.g., Los Angeles, CA"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="endLocation">End Location</Label>
                          <Input
                            id="endLocation"
                            value={formData.endLocation}
                            onChange={(e) => setFormData(prev => ({ ...prev, endLocation: e.target.value }))}
                            placeholder="e.g., Malibu, CA"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="routeName">Route Name</Label>
                          <Input
                            id="routeName"
                            value={formData.routeName}
                            onChange={(e) => setFormData(prev => ({ ...prev, routeName: e.target.value }))}
                            placeholder="e.g., Pacific Coast Highway"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="distance">Distance</Label>
                          <Input
                            id="distance"
                            value={formData.distance}
                            onChange={(e) => setFormData(prev => ({ ...prev, distance: e.target.value }))}
                            placeholder="e.g., 85 miles"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="meetingPoint">Meeting Point *</Label>
                        <Input
                          id="meetingPoint"
                          value={formData.meetingPoint}
                          onChange={(e) => setFormData(prev => ({ ...prev, meetingPoint: e.target.value }))}
                          placeholder="e.g., Starbucks on Main Street, Parking Lot A"
                          required
                        />
                      </div>
                    </div>

                    {/* Event Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Event Details</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startDateTime">Start Date & Time *</Label>
                          <Input
                            id="startDateTime"
                            type="datetime-local"
                            value={formData.startDateTime instanceof Date 
                              ? format(formData.startDateTime, "yyyy-MM-dd'T'HH:mm")
                              : ""
                            }
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              startDateTime: new Date(e.target.value) 
                            }))}
                            min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="estimatedDuration">Duration (minutes)</Label>
                          <Input
                            id="estimatedDuration"
                            type="number"
                            value={formData.estimatedDuration || ""}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              estimatedDuration: e.target.value ? parseInt(e.target.value) : undefined 
                            }))}
                            placeholder="e.g., 180 (3 hours)"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="maxParticipants">Max Participants *</Label>
                          <Input
                            id="maxParticipants"
                            type="number"
                            value={formData.maxParticipants}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              maxParticipants: parseInt(e.target.value) 
                            }))}
                            min="2"
                            max="100"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="difficulty">Difficulty Level *</Label>
                          <Select 
                            value={formData.difficulty} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy - Beginners welcome</SelectItem>
                              <SelectItem value="moderate">Moderate - Some experience needed</SelectItem>
                              <SelectItem value="hard">Hard - Experienced drivers only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Types */}
                    <div className="space-y-2">
                      <Label>Welcome Vehicle Types</Label>
                      <div className="flex flex-wrap gap-2">
                        {["car", "motorcycle", "truck", "suv", "sports car", "classic"].map((type) => (
                          <Badge
                            key={type}
                            variant={formData.vehicleTypes?.includes(type) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              const currentTypes = formData.vehicleTypes || [];
                              if (currentTypes.includes(type)) {
                                setFormData(prev => ({
                                  ...prev,
                                  vehicleTypes: currentTypes.filter(t => t !== type)
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  vehicleTypes: [...currentTypes, type]
                                }));
                              }
                            }}
                          >
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          resetForm();
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createConvoyMutation.isPending}
                        className="flex-1"
                      >
                        {createConvoyMutation.isPending ? "Creating..." : "Create Convoy"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="automotive-card">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{upcomingConvoys.length}</p>
                      <p className="text-muted-foreground">Upcoming Convoys</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="automotive-card">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{user.totalConvoys || 0}</p>
                      <p className="text-muted-foreground">Convoys Joined</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="automotive-card">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Route className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{userConvoys.length}</p>
                      <p className="text-muted-foreground">Organized</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search convoys by title, route, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Convoy Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming">Upcoming Convoys</TabsTrigger>
                <TabsTrigger value="my-convoys">My Convoys</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upcoming" className="space-y-6">
                {upcomingLoading ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <Card key={i} className="automotive-card">
                        <CardContent className="p-6">
                          <div className="space-y-3">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                            <div className="grid grid-cols-2 gap-4">
                              <Skeleton className="h-12 w-full" />
                              <Skeleton className="h-12 w-full" />
                            </div>
                            <Skeleton className="h-10 w-full" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredUpcoming.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredUpcoming.map((convoy: any, index: number) => (
                      <ConvoyCard
                        key={convoy.id}
                        convoy={convoy}
                        variant={index === 0 ? "featured" : "default"}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="automotive-card text-center py-12">
                    <CardContent>
                      <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No upcoming convoys</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery || selectedDifficulty !== "all"
                          ? "Try adjusting your search or filters"
                          : "Be the first to organize a convoy event"
                        }
                      </p>
                      {!searchQuery && selectedDifficulty === "all" && (
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Convoy
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="my-convoys" className="space-y-6">
                {userLoading ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(2)].map((_, i) => (
                      <Card key={i} className="automotive-card">
                        <CardContent className="p-6">
                          <div className="space-y-3">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                            <div className="grid grid-cols-2 gap-4">
                              <Skeleton className="h-12 w-full" />
                              <Skeleton className="h-12 w-full" />
                            </div>
                            <Skeleton className="h-10 w-full" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredUserConvoys.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredUserConvoys.map((convoy: any) => (
                      <ConvoyCard
                        key={convoy.id}
                        convoy={convoy}
                        showJoinButton={false}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="automotive-card text-center py-12">
                    <CardContent>
                      <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No convoys yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Start organizing convoy events or join existing ones
                      </p>
                      <div className="flex justify-center space-x-3">
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Convoy
                        </Button>
                        <Button variant="outline" onClick={() => setActiveTab("upcoming")}>
                          Browse Convoys
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <main className="pb-16">
          <div className="px-4 py-6">
            {/* Mobile Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">Convoys</h1>
                <p className="text-muted-foreground text-sm">
                  {upcomingConvoys.length} upcoming
                </p>
              </div>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search convoys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Mobile Convoys */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="my-convoys">Mine</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upcoming" className="space-y-4">
                {upcomingLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="automotive-card">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-2/3" />
                            <Skeleton className="h-8 w-full" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredUpcoming.length > 0 ? (
                  <div className="space-y-4">
                    {filteredUpcoming.slice(0, 5).map((convoy: any) => (
                      <ConvoyCard key={convoy.id} convoy={convoy} />
                    ))}
                  </div>
                ) : (
                  <Card className="automotive-card text-center py-8">
                    <CardContent>
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <h3 className="font-semibold mb-1">No convoys found</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Try creating one or adjusting your search
                      </p>
                      <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Convoy
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="my-convoys" className="space-y-4">
                {userLoading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <Card key={i} className="automotive-card">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-2/3" />
                            <Skeleton className="h-8 w-full" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredUserConvoys.length > 0 ? (
                  <div className="space-y-4">
                    {filteredUserConvoys.map((convoy: any) => (
                      <ConvoyCard
                        key={convoy.id}
                        convoy={convoy}
                        showJoinButton={false}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="automotive-card text-center py-8">
                    <CardContent>
                      <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <h3 className="font-semibold mb-1">No convoys yet</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Create your first convoy event
                      </p>
                      <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Convoy
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
