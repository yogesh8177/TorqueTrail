import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import VehicleCard from "@/components/garage/vehicle-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Car, Plus, Upload, Zap, Trophy, Star } from "lucide-react";
import { insertVehicleSchema } from "@shared/schema";
import { z } from "zod";

const vehicleFormSchema = insertVehicleSchema.extend({
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  horsepower: z.number().optional(),
});

type VehicleFormData = z.infer<typeof vehicleFormSchema>;

export default function Garage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [formData, setFormData] = useState<Partial<VehicleFormData>>({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    engine: "",
    horsepower: undefined,
    transmission: "",
    fuelType: "",
    description: "",
    isPublic: true,
  });

  // Fetch user vehicles
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["/api/vehicles"],
    enabled: !!user,
  });

  // Fetch monthly garage votes for leaderboard
  const { data: monthlyVotes = [] } = useQuery({
    queryKey: ["/api/garage/votes/monthly"],
    enabled: !!user,
  });

  // Create vehicle mutation
  const createVehicleMutation = useMutation({
    mutationFn: async (data: VehicleFormData) => {
      return await apiRequest("POST", "/api/vehicles", data);
    },
    onSuccess: () => {
      toast({
        title: "Vehicle added successfully!",
        description: "Your new vehicle has been added to your garage.",
      });
      setIsAddDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add vehicle",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update vehicle mutation
  const updateVehicleMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<VehicleFormData> }) => {
      return await apiRequest("PUT", `/api/vehicles/${data.id}`, data.updates);
    },
    onSuccess: () => {
      toast({
        title: "Vehicle updated successfully!",
        description: "Your vehicle information has been updated.",
      });
      setEditingVehicle(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update vehicle",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // AI analysis mutation
  const analyzeImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      return await apiRequest("POST", "/api/vehicles/analyze", formData);
    },
    onSuccess: (data: any) => {
      toast({
        title: "AI Analysis Complete!",
        description: "Vehicle details have been auto-filled based on the image.",
      });
      setFormData(prev => ({
        ...prev,
        make: data.make || prev.make,
        model: data.model || prev.model,
        year: data.year ? parseInt(data.year) : prev.year,
        color: data.color || prev.color,
        description: data.description || prev.description,
      }));
    },
    onError: (error: any) => {
      toast({
        title: "AI Analysis Failed",
        description: error.message || "Could not analyze the image. Please fill in details manually.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      make: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      engine: "",
      horsepower: undefined,
      transmission: "",
      fuelType: "",
      description: "",
      isPublic: true,
    });
    setUploadedImage(null);
  };

  const handleEdit = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color || "",
      engine: vehicle.engine || "",
      horsepower: vehicle.horsepower || undefined,
      transmission: vehicle.transmission || "",
      fuelType: vehicle.fuelType || "",
      description: vehicle.description || "",
      isPublic: vehicle.isPublic,
    });
    setIsAddDialogOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      // Trigger AI analysis
      analyzeImageMutation.mutate(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = vehicleFormSchema.parse({
        ...formData,
        userId: user?.id,
      });

      if (editingVehicle) {
        updateVehicleMutation.mutate({
          id: editingVehicle.id,
          updates: validatedData,
        });
      } else {
        createVehicleMutation.mutate(validatedData);
      }
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

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
                <h1 className="text-3xl font-bold">My Garage</h1>
                <p className="text-muted-foreground">
                  Manage your vehicle collection and showcase your rides
                </p>
              </div>
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vehicle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* AI Image Upload */}
                    <div className="space-y-2">
                      <Label>Vehicle Photo (Optional)</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                          {uploadedImage ? (
                            <div className="space-y-2">
                              <img
                                src={URL.createObjectURL(uploadedImage)}
                                alt="Preview"
                                className="w-32 h-32 object-cover rounded-lg mx-auto"
                              />
                              <p className="text-sm text-green-500">
                                Image uploaded! AI analysis {analyzeImageMutation.isPending ? "in progress..." : "complete"}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">Upload vehicle photo</p>
                                <p className="text-xs text-muted-foreground">
                                  AI will auto-fill vehicle details
                                </p>
                              </div>
                            </div>
                          )}
                        </label>
                      </div>
                      {analyzeImageMutation.isPending && (
                        <div className="flex items-center space-x-2 text-sm text-secondary">
                          <Zap className="w-4 h-4 animate-pulse" />
                          <span>AI analyzing image...</span>
                        </div>
                      )}
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="make">Make *</Label>
                        <Input
                          id="make"
                          value={formData.make}
                          onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                          placeholder="e.g., BMW, Toyota"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="model">Model *</Label>
                        <Input
                          id="model"
                          value={formData.model}
                          onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                          placeholder="e.g., M3, Camry"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="year">Year *</Label>
                        <Input
                          id="year"
                          type="number"
                          value={formData.year}
                          onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                          min="1900"
                          max={new Date().getFullYear() + 1}
                          required
                        />
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="color">Color</Label>
                        <Input
                          id="color"
                          value={formData.color}
                          onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                          placeholder="e.g., Alpine White"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="engine">Engine</Label>
                        <Input
                          id="engine"
                          value={formData.engine}
                          onChange={(e) => setFormData(prev => ({ ...prev, engine: e.target.value }))}
                          placeholder="e.g., 3.0L Twin-Turbo I6"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="horsepower">Horsepower</Label>
                        <Input
                          id="horsepower"
                          type="number"
                          value={formData.horsepower || ""}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            horsepower: e.target.value ? parseInt(e.target.value) : undefined 
                          }))}
                          placeholder="e.g., 425"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="transmission">Transmission</Label>
                        <Select 
                          value={formData.transmission} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, transmission: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select transmission" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Manual">Manual</SelectItem>
                            <SelectItem value="Automatic">Automatic</SelectItem>
                            <SelectItem value="CVT">CVT</SelectItem>
                            <SelectItem value="Dual-Clutch">Dual-Clutch</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="fuelType">Fuel Type</Label>
                        <Select 
                          value={formData.fuelType} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, fuelType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select fuel type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Gasoline">Gasoline</SelectItem>
                            <SelectItem value="Diesel">Diesel</SelectItem>
                            <SelectItem value="Electric">Electric</SelectItem>
                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                            <SelectItem value="Plug-in Hybrid">Plug-in Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Tell us about your vehicle, modifications, story..."
                        rows={3}
                      />
                    </div>

                    {/* Visibility */}
                    <div className="space-y-2">
                      <Label>Visibility</Label>
                      <Select 
                        value={formData.isPublic ? "public" : "private"} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, isPublic: value === "public" }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public - Visible to everyone</SelectItem>
                          <SelectItem value="private">Private - Only visible to you</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          setEditingVehicle(null);
                          resetForm();
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createVehicleMutation.isPending || updateVehicleMutation.isPending}
                        className="flex-1"
                      >
                        {createVehicleMutation.isPending || updateVehicleMutation.isPending
                          ? "Saving..."
                          : editingVehicle
                          ? "Update Vehicle"
                          : "Add Vehicle"
                        }
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
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Car className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{vehicles.length}</p>
                      <p className="text-muted-foreground">Vehicles in Garage</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="automotive-card">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{user.garageRating || "4.8"}⭐</p>
                      <p className="text-muted-foreground">Garage Rating</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="automotive-card">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center">
                      <Star className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">15</p>
                      <p className="text-muted-foreground">Monthly Votes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vehicles Grid */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Your Vehicles</h2>
              
              {vehiclesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="automotive-card">
                      <CardContent className="p-0">
                        <Skeleton className="w-full h-48 rounded-t-xl" />
                        <div className="p-6 space-y-3">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                          <div className="grid grid-cols-2 gap-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : vehicles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vehicles.map((vehicle: any) => (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              ) : (
                <Card className="automotive-card text-center py-12">
                  <CardContent>
                    <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No vehicles yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start building your dream garage by adding your first vehicle
                    </p>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Vehicle
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
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
                <h1 className="text-2xl font-bold">My Garage</h1>
                <p className="text-muted-foreground text-sm">
                  {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="automotive-card">
                <CardContent className="p-4 text-center">
                  <p className="text-xl font-bold">{vehicles.length}</p>
                  <p className="text-xs text-muted-foreground">Vehicles</p>
                </CardContent>
              </Card>
              <Card className="automotive-card">
                <CardContent className="p-4 text-center">
                  <p className="text-xl font-bold">{user.garageRating || "4.8"}⭐</p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Vehicles */}
            {vehiclesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="automotive-card">
                    <CardContent className="p-0">
                      <Skeleton className="w-full h-40" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : vehicles.length > 0 ? (
              <div className="space-y-4">
                {vehicles.map((vehicle: any) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            ) : (
              <Card className="automotive-card text-center py-8">
                <CardContent>
                  <Car className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">No vehicles yet</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Add your first vehicle to get started
                  </p>
                  <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vehicle
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
