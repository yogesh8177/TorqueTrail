import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Camera, Clock, Car, Route } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDriveLogSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

type DriveLogFormData = z.infer<typeof insertDriveLogSchema>;

interface DriveLog {
  id: number;
  title: string;
  description?: string;
  startLocation: string;
  endLocation: string;
  distance: string;
  duration?: number;
  startTime: string;
  totalPitstops: number;
  titleImageUrl?: string;
  estimatedReadTime?: number;
  vehicleId?: number;
  createdAt: string;
}

interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
}

export default function DriveLogs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const { data: driveLogs, isLoading: driveLogsLoading } = useQuery({
    queryKey: ['/api/drive-logs'],
  });

  const { data: vehicles } = useQuery({
    queryKey: ['/api/vehicles'],
  });

  const form = useForm<DriveLogFormData>({
    resolver: zodResolver(insertDriveLogSchema),
    defaultValues: {
      title: "",
      description: "",
      startLocation: "",
      endLocation: "",
      distance: "0",
      startTime: new Date(),
      notes: "",
    },
  });

  const createDriveLogMutation = useMutation({
    mutationFn: async (data: DriveLogFormData & { titleImage?: File }) => {
      const formData = new FormData();
      
      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'titleImage') return; // Skip image, handle separately
        if (value instanceof Date) {
          formData.append(key, value.toISOString());
        } else if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Add image if selected
      if (data.titleImage) {
        formData.append('titleImage', data.titleImage);
      }

      return await apiRequest('/api/drive-logs', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive-logs'] });
      setShowCreateDialog(false);
      form.reset();
      setSelectedImage(null);
      toast({
        title: "Success",
        description: "Drive log created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create drive log. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: DriveLogFormData) => {
    createDriveLogMutation.mutate({
      ...data,
      titleImage: selectedImage || undefined,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  if (driveLogsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Drive Logs</h1>
          <p className="text-muted-foreground">Document your journeys and create memorable travel stories</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Drive Log
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Drive Log</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Epic Road Trip to..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Location</FormLabel>
                        <FormControl>
                          <Input placeholder="New York, NY" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Los Angeles, CA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="distance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distance (miles)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="500" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vehicleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vehicle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vehicles?.map((vehicle: Vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your journey..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <Label htmlFor="titleImage">Title Image</Label>
                  <Input
                    id="titleImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-1"
                  />
                  {selectedImage && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Selected: {selectedImage.name}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createDriveLogMutation.isPending}
                  >
                    {createDriveLogMutation.isPending ? "Creating..." : "Create Drive Log"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {driveLogs && driveLogs.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No drive logs yet</h3>
            <p className="text-muted-foreground mb-4">
              Start documenting your journeys by creating your first drive log
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Drive Log
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {driveLogs?.map((driveLog: DriveLog) => (
            <Card key={driveLog.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {driveLog.titleImageUrl && (
                <div className="h-48 bg-gray-100">
                  <img 
                    src={driveLog.titleImageUrl} 
                    alt={driveLog.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{driveLog.title}</h3>
                
                {driveLog.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {driveLog.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    {driveLog.startLocation} → {driveLog.endLocation}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Car className="h-4 w-4 mr-1" />
                      {driveLog.distance} miles
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Camera className="h-4 w-4 mr-1" />
                      {driveLog.totalPitstops} stops
                    </div>
                  </div>

                  {driveLog.estimatedReadTime && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      {driveLog.estimatedReadTime} min read
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {formatDistanceToNow(new Date(driveLog.createdAt))} ago
                  </Badge>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}