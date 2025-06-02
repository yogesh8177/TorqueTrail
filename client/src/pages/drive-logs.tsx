import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Plus, MapPin, Camera, Clock, Car, Route, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDriveLogSchema, type PitstopLocation } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import GoogleMapsPitstopSelector from "@/components/GoogleMapsPitstopSelector";
import PitstopImageUpload from "@/components/PitstopImageUpload";
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
  const [selectedDriveLog, setSelectedDriveLog] = useState<DriveLog | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [driveLogToEdit, setDriveLogToEdit] = useState<DriveLog | null>(null);
  const [pitstops, setPitstops] = useState<PitstopLocation[]>([]);
  const [pitstopImages, setPitstopImages] = useState<{[key: number]: File[]}>({});

  const { data: driveLogs, isLoading: driveLogsLoading } = useQuery({
    queryKey: ['/api/drive-logs'],
  });

  const { data: vehicles } = useQuery({
    queryKey: ['/api/vehicles'],
  });

  const form = useForm<DriveLogFormData>({
    resolver: zodResolver(insertDriveLogSchema.omit({ userId: true })),
    defaultValues: {
      title: "",
      description: "",
      startLocation: "",
      endLocation: "",
      routeName: "",
      distance: "0",
      startTime: new Date(),
      endTime: undefined,
      weatherConditions: "",
      roadConditions: "",
      vehicleId: undefined,
      notes: "",
    },
  });

  const createDriveLogMutation = useMutation({
    mutationFn: async (data: DriveLogFormData & { titleImage?: File }) => {
      console.log('Mutation started with data:', data);
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
      if (data.titleImage && data.titleImage instanceof File) {
        formData.append('titleImage', data.titleImage);
      }

      // Add pitstops data
      if (pitstops.length > 0) {
        formData.append('pitstops', JSON.stringify(pitstops));
      }

      // Add pitstop images
      Object.entries(pitstopImages).forEach(([pitstopIndex, images]) => {
        images.forEach((image, imageIndex) => {
          formData.append(`pitstop_${pitstopIndex}_image_${imageIndex}`, image);
        });
      });

      console.log('FormData entries:', Array.from(formData.entries()));

      const response = await fetch('/api/drive-logs', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Success response:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive-logs'] });
      setShowCreateDialog(false);
      form.reset();
      setSelectedImage(null);
      setPitstops([]);
      setPitstopImages({});
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

  const deleteDriveLogMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/drive-logs/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete drive log');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/stats'] });
      toast({
        title: "Success",
        description: "Drive log deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete drive log. Please try again.",
        variant: "destructive",
      });
    },
  });

  const editDriveLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DriveLogFormData & { titleImage?: File } }) => {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'titleImage') return;
        if (value instanceof Date) {
          formData.append(key, value.toISOString());
        } else if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      if (data.titleImage && data.titleImage instanceof File) {
        formData.append('titleImage', data.titleImage);
      }

      const response = await fetch(`/api/drive-logs/${id}`, {
        method: 'PUT',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/stats'] });
      setShowEditDialog(false);
      form.reset();
      setSelectedImage(null);
      setDriveLogToEdit(null);
      toast({
        title: "Success",
        description: "Drive log updated successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update drive log. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: DriveLogFormData) => {
    console.log('Form submitted with data:', data);
    console.log('Form errors:', form.formState.errors);
    console.log('Selected image:', selectedImage);
    
    if (driveLogToEdit) {
      // Edit mode
      editDriveLogMutation.mutate({
        id: driveLogToEdit.id,
        data: {
          ...data,
          titleImage: selectedImage || undefined,
        }
      });
    } else {
      // Create mode
      createDriveLogMutation.mutate({
        ...data,
        titleImage: selectedImage || undefined,
      });
    }
  };

  const handleEdit = (driveLog: DriveLog) => {
    setDriveLogToEdit(driveLog);
    form.reset({
      title: driveLog.title,
      description: driveLog.description || "",
      startLocation: driveLog.startLocation,
      endLocation: driveLog.endLocation,
      routeName: (driveLog as any).routeName || "",
      distance: driveLog.distance.toString(),
      startTime: new Date(driveLog.startTime),
      endTime: undefined,
      weatherConditions: (driveLog as any).weatherConditions || "",
      roadConditions: (driveLog as any).roadConditions || "",
      vehicleId: driveLog.vehicleId || undefined,
      notes: (driveLog as any).notes || "",
    });
    setSelectedImage(null);
    setShowEditDialog(true);
  };

  const handleDelete = (driveLog: DriveLog) => {
    if (window.confirm('Are you sure you want to delete this drive log? This action cannot be undone.')) {
      deleteDriveLogMutation.mutate(driveLog.id);
    }
  };

  const onFormError = (errors: any) => {
    console.error('Form validation errors:', errors);
    toast({
      title: "Form Error",
      description: "Please check all required fields are filled correctly.",
      variant: "destructive",
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Image selected:', file);
      setSelectedImage(file);
    } else {
      setSelectedImage(null);
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
    <div className="min-h-screen bg-background">
      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        <Sidebar />
        <main className="flex-1 lg:pl-64">
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
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto sm:max-w-2xl w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>Create New Drive Log</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit, onFormError)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <Select 
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                          value={field.value?.toString() || ""}
                        >
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

                  <FormField
                    control={form.control}
                    name="routeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Route Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Pacific Coast Highway" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weatherConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weather Conditions</FormLabel>
                        <FormControl>
                          <Input placeholder="Sunny, Clear Skies" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="roadConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Road Conditions</FormLabel>
                        <FormControl>
                          <Input placeholder="Dry, Good Visibility" {...field} />
                        </FormControl>
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

                {/* Pitstop Management */}
                <div className="space-y-4 border-2 border-dashed border-blue-300 p-4 rounded-lg bg-blue-50/50">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-bold text-blue-800">🗺️ Pitstops ({pitstops.length}/10)</Label>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => {
                        if (pitstops.length < 10) {
                          setPitstops([...pitstops, {
                            name: '',
                            latitude: 0,
                            longitude: 0,
                            type: 'other' as const,
                            orderIndex: pitstops.length
                          }]);
                        }
                      }}
                      disabled={pitstops.length >= 10}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      ➕ Add Pitstop
                    </Button>
                  </div>
                  <p className="text-sm text-blue-700">Add places you stopped during your journey (restaurants, scenic spots, gas stations, etc.)</p>
                  
                  {pitstops.length > 0 && (
                    <div className="space-y-2">
                      {pitstops.map((pitstop, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                          <Input
                            placeholder="Pitstop name"
                            value={pitstop.name}
                            onChange={(e) => {
                              const updated = [...pitstops];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setPitstops(updated);
                            }}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setPitstops(pitstops.filter((_, i) => i !== index));
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createDriveLogMutation.isPending}
                    className="w-full sm:w-auto"
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
            <Card key={driveLog.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <div 
                onClick={() => {
                  setSelectedDriveLog(driveLog);
                  setShowDetailDialog(true);
                }}
                className="h-full"
              >
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedDriveLog(driveLog);
                          setShowDetailDialog(true);
                        }}
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEdit(driveLog)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(driveLog)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
              </div>
            </Card>
          ))}
            </div>
          )}
          </div>
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <main className="pb-16">
          <div className="px-4 py-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">Drive Logs</h1>
                <p className="text-muted-foreground text-sm">Document your journeys</p>
              </div>
              
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Log
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto sm:max-w-2xl w-[95vw] sm:w-full">
                  <DialogHeader>
                    <DialogTitle>Create New Drive Log</DialogTitle>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit, onFormError)} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title *</FormLabel>
                              <FormControl>
                                <Input placeholder="Epic road trip to..." {...field} />
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
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select vehicle" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(vehicles as any)?.map((vehicle: Vehicle) => (
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="startLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Location *</FormLabel>
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
                              <FormLabel>End Location *</FormLabel>
                              <FormControl>
                                <Input placeholder="Los Angeles, CA" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="distance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Distance *</FormLabel>
                              <FormControl>
                                <Input placeholder="2,800 miles" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="routeName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Route Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Route 66, I-80, etc." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="weatherConditions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weather Conditions</FormLabel>
                              <FormControl>
                                <Input placeholder="Sunny, Rainy, Cloudy" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="roadConditions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Road Conditions</FormLabel>
                              <FormControl>
                                <Input placeholder="Dry, Wet, Construction" {...field} />
                              </FormControl>
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
                                placeholder="Describe your journey, highlights, challenges..."
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
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground mb-2">
                              Selected: {selectedImage.name}
                            </p>
                            <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                              <img 
                                src={URL.createObjectURL(selectedImage)} 
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setShowCreateDialog(false);
                            form.reset();
                            setSelectedImage(null);
                          }}
                          className="w-full sm:w-auto"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createDriveLogMutation.isPending}
                          className="w-full sm:w-auto"
                        >
                          {createDriveLogMutation.isPending ? "Creating..." : "Create Drive Log"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Mobile Drive Logs Grid */}
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
              <div className="grid grid-cols-1 gap-4">
                {driveLogs?.map((driveLog: DriveLog) => (
                  <Card key={driveLog.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <div 
                      onClick={() => {
                        setSelectedDriveLog(driveLog);
                        setShowDetailDialog(true);
                      }}
                      className="h-full"
                    >
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedDriveLog(driveLog);
                                setShowDetailDialog(true);
                              }}
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(driveLog)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(driveLog)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
        <MobileNav />
      </div>

      {/* Drive Log Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDriveLog?.title}</DialogTitle>
          </DialogHeader>
          {selectedDriveLog && (
            <div className="space-y-6">
              {/* Image */}
              {selectedDriveLog.titleImageUrl && (
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={selectedDriveLog.titleImageUrl} 
                    alt={selectedDriveLog.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Route Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">ROUTE</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">{selectedDriveLog.startLocation}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-red-500 mr-2" />
                      <span className="text-sm">{selectedDriveLog.endLocation}</span>
                    </div>
                    {selectedDriveLog.routeName && (
                      <div className="flex items-center">
                        <Route className="h-4 w-4 text-blue-500 mr-2" />
                        <span className="text-sm">{selectedDriveLog.routeName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">TRIP DETAILS</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Distance:</span>
                      <span className="text-sm font-medium">{selectedDriveLog.distance}</span>
                    </div>
                    {selectedDriveLog.duration && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Duration:</span>
                        <span className="text-sm font-medium">{selectedDriveLog.duration} min</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Pitstops:</span>
                      <span className="text-sm font-medium">{selectedDriveLog.totalPitstops}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Started:</span>
                      <span className="text-sm font-medium">
                        {new Date(selectedDriveLog.startTime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conditions */}
              {(selectedDriveLog.weatherConditions || selectedDriveLog.roadConditions) && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">CONDITIONS</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedDriveLog.weatherConditions && (
                      <div>
                        <span className="text-sm text-muted-foreground">Weather:</span>
                        <p className="text-sm font-medium">{selectedDriveLog.weatherConditions}</p>
                      </div>
                    )}
                    {selectedDriveLog.roadConditions && (
                      <div>
                        <span className="text-sm text-muted-foreground">Road:</span>
                        <p className="text-sm font-medium">{selectedDriveLog.roadConditions}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedDriveLog.description && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">DESCRIPTION</h3>
                  <p className="text-sm">{selectedDriveLog.description}</p>
                </div>
              )}

              {/* Notes */}
              {selectedDriveLog.notes && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">NOTES</h3>
                  <p className="text-sm">{selectedDriveLog.notes}</p>
                </div>
              )}

              {/* Vehicle Info */}
              {selectedDriveLog.vehicleId && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">VEHICLE</h3>
                  <div className="flex items-center">
                    <Car className="h-4 w-4 text-muted-foreground mr-2" />
                    <span className="text-sm">
                      {vehicles?.find((v: any) => v.id === selectedDriveLog.vehicleId)?.make} {vehicles?.find((v: any) => v.id === selectedDriveLog.vehicleId)?.model}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Drive Log Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Drive Log</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit, onFormError)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Epic road trip to..." {...field} />
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
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(vehicles as any)?.map((vehicle: Vehicle) => (
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Location *</FormLabel>
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
                      <FormLabel>End Location *</FormLabel>
                      <FormControl>
                        <Input placeholder="Los Angeles, CA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance *</FormLabel>
                      <FormControl>
                        <Input placeholder="2,800 miles" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="routeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Route Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Route 66, I-80, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weatherConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weather Conditions</FormLabel>
                      <FormControl>
                        <Input placeholder="Sunny, Rainy, Cloudy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roadConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Road Conditions</FormLabel>
                      <FormControl>
                        <Input placeholder="Dry, Wet, Construction" {...field} />
                      </FormControl>
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
                        placeholder="Describe your journey, highlights, challenges..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Label htmlFor="editTitleImage">Title Image</Label>
                <Input
                  id="editTitleImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-1"
                />
                {driveLogToEdit?.titleImageUrl && !selectedImage && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-2">Current image:</p>
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={driveLogToEdit.titleImageUrl} 
                        alt="Current"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                {selectedImage && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-2">
                      Selected: {selectedImage.name}
                    </p>
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={URL.createObjectURL(selectedImage)} 
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowEditDialog(false);
                    setDriveLogToEdit(null);
                    form.reset();
                    setSelectedImage(null);
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={editDriveLogMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {editDriveLogMutation.isPending ? "Updating..." : "Update Drive Log"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}