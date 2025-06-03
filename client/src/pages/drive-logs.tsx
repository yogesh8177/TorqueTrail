import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Route, Eye, Trash2, Calendar, MapPin, Car, MoreVertical, Share, Edit, Facebook, Twitter, Instagram, Copy, ChevronDown, ChevronUp } from "lucide-react";
import type { DriveLog, PitstopLocation } from "@shared/schema";
import GoogleMapsPitstopSelector from "@/components/GoogleMapsPitstopSelector";
import PitstopImageUpload from "@/components/PitstopImageUpload";

interface DriveLogFormData {
  title: string;
  description: string;
  startLocation: string;
  endLocation: string;
  distance: string;
  route?: string;
  startTime: Date;
  endTime?: Date;
  vehicleId?: number;
}

export default function DriveLogs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [pitstops, setPitstops] = useState<PitstopLocation[]>([]);
  const [pitstopImages, setPitstopImages] = useState<{[key: number]: File[]}>({});
  const [selectedDriveLog, setSelectedDriveLog] = useState<DriveLog | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDriveLog, setEditingDriveLog] = useState<DriveLog | null>(null);
  const [editTitleImage, setEditTitleImage] = useState<File | null>(null);
  const [expandedPitstops, setExpandedPitstops] = useState<{[key: number]: boolean}>({});
  const [editPitstops, setEditPitstops] = useState<PitstopLocation[]>([]);
  const [editPitstopImages, setEditPitstopImages] = useState<{[key: number]: File[]}>({});
  const [existingPitstopImages, setExistingPitstopImages] = useState<{[key: number]: string[]}>({});

  const { data: driveLogs, isLoading: driveLogsLoading } = useQuery({
    queryKey: ['/api/drive-logs'],
  });

  const { data: vehicles } = useQuery({
    queryKey: ['/api/vehicles'],
  });

  // Fetch pitstops for all drive logs to show counts
  const { data: allPitstops } = useQuery({
    queryKey: ['/api/all-pitstops'],
  });

  // Fetch pitstops for selected drive log
  const { data: selectedDriveLogPitstops } = useQuery({
    queryKey: ['/api/pitstops/' + selectedDriveLog?.id],
    enabled: !!selectedDriveLog?.id,
  });

  // Fetch pitstops for editing drive log
  const { data: editingDriveLogPitstops } = useQuery({
    queryKey: ['/api/pitstops/' + editingDriveLog?.id],
    enabled: !!editingDriveLog?.id,
  });

  // Helper function to get pitstop count for a drive log
  const getPitstopCount = (driveLogId: number) => {
    if (!allPitstops || !Array.isArray(allPitstops)) return 0;
    return allPitstops.filter((p: any) => p.driveLogId === driveLogId).length;
  };

  // Populate edit pitstops when editing drive log pitstops are fetched
  useEffect(() => {
    if (editingDriveLogPitstops && Array.isArray(editingDriveLogPitstops)) {
      const pitstopData = editingDriveLogPitstops.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        latitude: p.latitude,
        longitude: p.longitude,
        address: p.address || '',
        placeId: p.placeId || '',
        type: p.type,
        orderIndex: p.orderIndex,
        notes: p.notes || '',
        imageUrls: p.imageUrls || [],
      }));
      setEditPitstops(pitstopData);
      
      // Set existing images
      const existingImages: {[key: number]: string[]} = {};
      pitstopData.forEach((p: any, index: number) => {
        if (p.imageUrls && p.imageUrls.length > 0) {
          existingImages[index] = p.imageUrls;
        }
      });
      setExistingPitstopImages(existingImages);
    }
  }, [editingDriveLogPitstops]);

  // Handle shared drive log URLs
  useEffect(() => {
    if (params.id && driveLogs && Array.isArray(driveLogs)) {
      const driveLogId = parseInt(params.id);
      const sharedDriveLog = driveLogs.find((log: DriveLog) => log.id === driveLogId);
      
      if (sharedDriveLog) {
        setSelectedDriveLog(sharedDriveLog);
        setShowDetailDialog(true);
      }
    }
  }, [params.id, driveLogs]);

  const form = useForm<DriveLogFormData>({
    defaultValues: {
      title: "",
      description: "",
      startLocation: "",
      endLocation: "",
      distance: "",
      startTime: new Date(),
      endTime: undefined,
      vehicleId: undefined,
    },
  });

  const createDriveLogMutation = useMutation({
    mutationFn: async (data: DriveLogFormData & { titleImage?: File }) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'titleImage' && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      if (selectedImage) {
        formData.append('titleImage', selectedImage);
      }

      formData.append('pitstops', JSON.stringify(pitstops));

      return await apiRequest('POST', '/api/drive-logs', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive-logs'] });
      form.reset();
      setSelectedImage(null);
      setPitstops([]);
      setPitstopImages({});
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: "Drive log created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create drive log",
        variant: "destructive",
      });
    },
  });

  const deleteDriveLogMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/drive-logs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive-logs'] });
      toast({
        title: "Success",
        description: "Drive log deleted successfully!",
      });
      setShowDetailDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete drive log",
        variant: "destructive",
      });
    },
  });

  const updateDriveLogMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<DriveLogFormData>; titleImage?: File }) => {
      // First update the drive log with title image if provided
      const formData = new FormData();
      Object.entries(data.updates).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      if (data.titleImage) {
        formData.append('titleImage', data.titleImage);
      }

      const response = await fetch(`/api/drive-logs/${data.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedDriveLog = await response.json();
      
      // Then handle pitstops if any exist
      if (editPitstops.length > 0) {
        for (let i = 0; i < editPitstops.length; i++) {
          const pitstop = editPitstops[i];
          const newImages = editPitstopImages[i] || [];
          const existingImages = existingPitstopImages[i] || [];
          
          // Prepare pitstop data
          const pitstopData = {
            name: pitstop.name,
            description: pitstop.description || '',
            latitude: pitstop.latitude,
            longitude: pitstop.longitude,
            address: pitstop.address || '',
            placeId: pitstop.placeId || '',
            type: pitstop.type,
            orderIndex: i,
            notes: pitstop.notes || '',
            driveLogId: data.id,
            imageUrls: existingImages
          };
          
          let pitstopResult;
          
          // Create or update pitstop
          if (pitstop.id) {
            // Update existing pitstop
            const updateResponse = await fetch(`/api/pitstops/${pitstop.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(pitstopData),
            });
            
            if (!updateResponse.ok) {
              throw new Error(`Failed to update pitstop: ${updateResponse.status}`);
            }
            
            pitstopResult = await updateResponse.json();
          } else {
            // Create new pitstop
            const createResponse = await fetch('/api/pitstops', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(pitstopData),
            });
            
            if (!createResponse.ok) {
              throw new Error(`Failed to create pitstop: ${createResponse.status}`);
            }
            
            pitstopResult = await createResponse.json();
          }
          
          // Upload new images if any
          if (newImages.length > 0) {
            const formData = new FormData();
            newImages.forEach(file => {
              formData.append('images', file);
            });
            
            const imageResponse = await fetch(`/api/pitstops/${pitstopResult.id}/images`, {
              method: 'POST',
              body: formData,
            });
            
            if (!imageResponse.ok) {
              console.warn(`Failed to upload images for pitstop ${pitstopResult.id}`);
            }
          }
        }
      }
      
      return updatedDriveLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/all-pitstops'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pitstops/' + editingDriveLog?.id] });
      
      toast({
        title: "Success",
        description: "Drive log updated successfully!",
      });
      
      setShowEditDialog(false);
      setEditingDriveLog(null);
      setEditTitleImage(null);
      setEditPitstops([]);
      setEditPitstopImages({});
      setExistingPitstopImages({});
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update drive log",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: DriveLogFormData) => {
    // Frontend validation for required fields
    if (!data.title.trim()) {
      toast({
        title: "Title is required",
        description: "Please enter a title for your drive log",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.startLocation.trim()) {
      toast({
        title: "Start location is required",
        description: "Please enter the starting location",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.endLocation.trim()) {
      toast({
        title: "End location is required", 
        description: "Please enter the destination",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.distance.trim() || data.distance === "0") {
      toast({
        title: "Distance is required",
        description: "Please enter the distance traveled",
        variant: "destructive",
      });
      return;
    }
    
    createDriveLogMutation.mutate({ ...data, titleImage: selectedImage || undefined });
  };

  const handleDelete = (driveLog: DriveLog) => {
    if (confirm(`Are you sure you want to delete "${driveLog.title}"?`)) {
      deleteDriveLogMutation.mutate(driveLog.id);
    }
  };

  const handleEdit = (driveLog: DriveLog) => {
    setEditingDriveLog(driveLog);
    setShowEditDialog(true);
    
    // Pre-populate form with existing data
    form.reset({
      title: driveLog.title,
      description: driveLog.description || "",
      startLocation: driveLog.startLocation,
      endLocation: driveLog.endLocation,
      distance: driveLog.distance.toString(),
      startTime: new Date(driveLog.startTime),
      endTime: driveLog.endTime ? new Date(driveLog.endTime) : undefined,
      vehicleId: driveLog.vehicleId || undefined,
    });
  };

  const handleShare = (driveLog: DriveLog, platform: string) => {
    const url = `${window.location.origin}/share/${driveLog.id}`;
    const text = `Check out my drive log: ${driveLog.title} - ${driveLog.startLocation} to ${driveLog.endLocation}`;
    
    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'instagram':
        navigator.clipboard.writeText(`${text} ${url}`);
        toast({
          title: "Copied to clipboard",
          description: "Share text copied! You can paste it in Instagram.",
        });
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        toast({
          title: "Public link copied",
          description: "Anyone with this link can view your drive log!",
        });
        break;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Drive Logs</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Drive Log
        </Button>
      </div>

      {/* Enhanced Drive Log Form Modal */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-2xl font-bold text-center mb-6">Create New Drive Log</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium">Trip Title</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="Enter your trip title"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="Describe your drive experience..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startLocation" className="text-sm font-medium">Start Location</Label>
                  <Input
                    id="startLocation"
                    {...form.register("startLocation")}
                    placeholder="Where did you start?"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="endLocation" className="text-sm font-medium">End Location</Label>
                  <Input
                    id="endLocation"
                    {...form.register("endLocation")}
                    placeholder="Where did you end?"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="distance" className="text-sm font-medium">Distance (km)</Label>
                  <Input
                    id="distance"
                    {...form.register("distance")}
                    placeholder="0"
                    type="number"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="route" className="text-sm font-medium">Route</Label>
                  <Input
                    id="route"
                    {...form.register("route")}
                    placeholder="e.g., Highway 1, Route 66"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="vehicleId" className="text-sm font-medium">Vehicle</Label>
                <select 
                  id="vehicleId"
                  {...form.register("vehicleId")} 
                  className="mt-1 w-full p-2 border border-input rounded-md bg-background"
                >
                  <option value="">Select your vehicle</option>
                  {Array.isArray(vehicles) && vehicles.map((vehicle: any) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} ({vehicle.year})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="titleImage" className="text-sm font-medium">Title Image</Label>
                <Input
                  id="titleImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                {selectedImage && (
                  <div className="mt-2">
                    <img
                      src={URL.createObjectURL(selectedImage)}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Pitstops (Optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (pitstops.length >= 10) {
                      toast({
                        title: "Maximum pitstops reached",
                        description: "You can add up to 10 pitstops per drive log",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    setPitstops([...pitstops, {
                      name: '',
                      address: '',
                      latitude: 0,
                      longitude: 0,
                      type: 'other',
                      orderIndex: pitstops.length,
                      description: '',
                    }]);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Pitstop
                </Button>
              </div>

              {pitstops.length > 0 && (
                <div className="space-y-4">
                  {pitstops.map((pitstop, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Pitstop {index + 1}</h4>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const updated = pitstops.filter((_, i) => i !== index);
                            setPitstops(updated.map((p, i) => ({ ...p, orderIndex: i })));
                            // Remove images for this pitstop
                            setPitstopImages(prev => {
                              const newImages = { ...prev };
                              delete newImages[index];
                              return newImages;
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label htmlFor={`pitstop-name-${index}`} className="text-sm font-medium">Pitstop Name</Label>
                          <Input
                            id={`pitstop-name-${index}`}
                            placeholder="Enter pitstop name"
                            value={pitstop.name}
                            onChange={(e) => {
                              const updated = [...pitstops];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setPitstops(updated);
                            }}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`pitstop-location-${index}`} className="text-sm font-medium">Location</Label>
                          <div className="relative">
                            <Input
                              id={`pitstop-location-${index}`}
                              placeholder="Search for location or enter address"
                              value={pitstop.address || ''}
                              onChange={(e) => {
                                const updated = [...pitstops];
                                updated[index] = { ...updated[index], address: e.target.value };
                                setPitstops(updated);
                              }}
                              className="mt-1 pr-10"
                            />
                            <MapPin className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor={`pitstop-type-${index}`} className="text-sm font-medium">Type</Label>
                          <select
                            id={`pitstop-type-${index}`}
                            value={pitstop.type}
                            onChange={(e) => {
                              const updated = [...pitstops];
                              updated[index] = { ...updated[index], type: e.target.value as any };
                              setPitstops(updated);
                            }}
                            className="mt-1 w-full p-2 border border-input rounded-md bg-background"
                          >
                            <option value="food">Food & Dining</option>
                            <option value="fuel">Fuel Station</option>
                            <option value="scenic">Scenic Spot</option>
                            <option value="rest">Rest Area</option>
                            <option value="attraction">Attraction</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <Label htmlFor={`pitstop-description-${index}`} className="text-sm font-medium">Description (Optional)</Label>
                          <Textarea
                            id={`pitstop-description-${index}`}
                            placeholder="Describe this pitstop"
                            value={pitstop.description || ''}
                            onChange={(e) => {
                              const updated = [...pitstops];
                              updated[index] = { ...updated[index], description: e.target.value };
                              setPitstops(updated);
                            }}
                            className="mt-1 min-h-[60px]"
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Images (up to 3)</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length > 3) {
                                toast({
                                  title: "Too many images",
                                  description: "You can upload up to 3 images per pitstop",
                                  variant: "destructive",
                                });
                                return;
                              }
                              setPitstopImages(prev => ({
                                ...prev,
                                [index]: files
                              }));
                            }}
                            className="mt-1"
                          />
                          
                          {pitstopImages[index] && pitstopImages[index].length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {pitstopImages[index].map((file, imgIndex) => (
                                <div key={imgIndex} className="relative">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={`Pitstop ${index + 1} - Image ${imgIndex + 1}`}
                                    className="w-full h-16 object-cover rounded border"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    className="absolute -top-1 -right-1 h-5 w-5 p-0"
                                    onClick={() => {
                                      const updatedImages = [...pitstopImages[index]];
                                      updatedImages.splice(imgIndex, 1);
                                      setPitstopImages(prev => ({
                                        ...prev,
                                        [index]: updatedImages
                                      }));
                                    }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pitstops.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                  <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-2">No pitstops added yet</p>
                  <p className="text-sm text-muted-foreground">Click "Add Pitstop" to start adding stops to your route</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={createDriveLogMutation.isPending}
                className="flex-1"
              >
                {createDriveLogMutation.isPending ? "Creating..." : "Create Drive Log"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Drive Log Modal */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setEditTitleImage(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Drive Log</DialogTitle>
          </DialogHeader>
          
          {editingDriveLog && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                updateDriveLogMutation.mutate({
                  id: editingDriveLog.id,
                  updates: {
                    title: formData.get('title') as string,
                    description: formData.get('description') as string,
                    startLocation: formData.get('startLocation') as string,
                    endLocation: formData.get('endLocation') as string,
                    distance: formData.get('distance') as string,
                  },
                  titleImage: editTitleImage || undefined
                });
              }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    name="title"
                    defaultValue={editingDriveLog.title}
                    placeholder="Trip title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={editingDriveLog.description || ''}
                    placeholder="Describe your drive..."
                    rows={4}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-startLocation">Start Location</Label>
                  <Input
                    id="edit-startLocation"
                    name="startLocation"
                    defaultValue={editingDriveLog.startLocation}
                    placeholder="Start location"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-endLocation">End Location</Label>
                  <Input
                    id="edit-endLocation"
                    name="endLocation"
                    defaultValue={editingDriveLog.endLocation}
                    placeholder="End location"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-distance">Distance (km)</Label>
                <Input
                  id="edit-distance"
                  name="distance"
                  defaultValue={editingDriveLog.distance}
                  type="number"
                  placeholder="Distance"
                />
              </div>

              <div>
                <Label htmlFor="edit-titleImage" className="text-sm font-medium">Title Image</Label>
                {editingDriveLog.titleImageUrl && !editTitleImage && (
                  <div className="mt-2 mb-2">
                    <p className="text-sm text-muted-foreground mb-2">Current image:</p>
                    <img
                      src={editingDriveLog.titleImageUrl}
                      alt={editingDriveLog.title}
                      className="w-full h-32 object-cover rounded border"
                    />
                  </div>
                )}
                <Input
                  id="edit-titleImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditTitleImage(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                {editTitleImage && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-2">New image preview:</p>
                    <img
                      src={URL.createObjectURL(editTitleImage)}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded border"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={updateDriveLogMutation.isPending}
                >
                  {updateDriveLogMutation.isPending ? "Updating..." : "Update Drive Log"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditTitleImage(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {driveLogsLoading ? (
        <Card>
          <CardContent className="p-6 text-center">
            Loading drive logs...
          </CardContent>
        </Card>
      ) : !Array.isArray(driveLogs) || driveLogs.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">No drive logs yet!</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Drive Log
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(driveLogs) && driveLogs.map((driveLog: DriveLog) => (
            <Card key={driveLog.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {driveLog.titleImageUrl && (
                <div 
                  className="aspect-video w-full overflow-hidden cursor-pointer"
                  onClick={() => {
                    setSelectedDriveLog(driveLog);
                    setShowDetailDialog(true);
                  }}
                >
                  <img
                    src={driveLog.titleImageUrl}
                    alt={driveLog.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 
                    className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
                    onClick={() => {
                      setSelectedDriveLog(driveLog);
                      setShowDetailDialog(true);
                    }}
                  >
                    {driveLog.title}
                  </h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedDriveLog(driveLog);
                        setShowDetailDialog(true);
                      }}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(driveLog)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleShare(driveLog, 'facebook')}>
                        <Facebook className="mr-2 h-4 w-4" />
                        Share on Facebook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare(driveLog, 'twitter')}>
                        <Twitter className="mr-2 h-4 w-4" />
                        Share on Twitter
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare(driveLog, 'instagram')}>
                        <Instagram className="mr-2 h-4 w-4" />
                        Share on Instagram
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare(driveLog, 'copy')}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(driveLog)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {driveLog.startLocation} → {driveLog.endLocation}
                </p>
                {driveLog.description && (
                  <p 
                    className="text-sm text-muted-foreground mb-4 line-clamp-2 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => {
                      setSelectedDriveLog(driveLog);
                      setShowDetailDialog(true);
                    }}
                  >
                    {driveLog.description}
                  </p>
                )}
                {driveLog.route && (
                  <div className="text-sm text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Route className="h-3 w-3" />
                      {driveLog.route}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>{driveLog.distance} km</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {getPitstopCount(driveLog.id)} pitstops
                    </span>
                  </div>
                  <span>{new Date(driveLog.startTime).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Drive Log Detail Modal */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDriveLog?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedDriveLog && (
            <div className="space-y-6">
              {selectedDriveLog.titleImageUrl && (
                <div className="w-full">
                  <img
                    src={selectedDriveLog.titleImageUrl}
                    alt={selectedDriveLog.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Route</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedDriveLog.startLocation} → {selectedDriveLog.endLocation}
                      </p>
                      {selectedDriveLog.route && (
                        <p className="text-sm text-primary font-medium">
                          {selectedDriveLog.route}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Route className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Distance</p>
                      <p className="text-sm text-muted-foreground">{selectedDriveLog.distance} km</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedDriveLog.startTime).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedDriveLog.description && (
                    <div>
                      <p className="font-medium mb-2">Description</p>
                      <p className="text-sm text-muted-foreground">{selectedDriveLog.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pitstops Section */}
              {selectedDriveLogPitstops && Array.isArray(selectedDriveLogPitstops) && selectedDriveLogPitstops.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-medium text-lg">Pitstops ({selectedDriveLogPitstops.length})</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedDriveLogPitstops.map((pitstop: any, index: number) => (
                      <div key={pitstop.id} className="border rounded-lg overflow-hidden">
                        <div 
                          className="p-4 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                          onClick={() => {
                            setExpandedPitstops(prev => ({
                              ...prev,
                              [pitstop.id]: !prev[pitstop.id]
                            }));
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-medium">{pitstop.name}</h4>
                                <p className="text-sm text-muted-foreground capitalize">{pitstop.type}</p>
                              </div>
                            </div>
                            {expandedPitstops[pitstop.id] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                        
                        {expandedPitstops[pitstop.id] && (
                          <div className="p-4 space-y-4">
                            {pitstop.address && (
                              <div>
                                <p className="font-medium text-sm mb-1">Location</p>
                                <p className="text-sm text-muted-foreground">{pitstop.address}</p>
                              </div>
                            )}
                            
                            {pitstop.description && (
                              <div>
                                <p className="font-medium text-sm mb-1">Description</p>
                                <p className="text-sm text-muted-foreground">{pitstop.description}</p>
                              </div>
                            )}
                            
                            {pitstop.notes && (
                              <div>
                                <p className="font-medium text-sm mb-1">Notes</p>
                                <p className="text-sm text-muted-foreground">{pitstop.notes}</p>
                              </div>
                            )}
                            
                            {pitstop.imageUrls && pitstop.imageUrls.length > 0 && (
                              <div>
                                <p className="font-medium text-sm mb-2">Images ({pitstop.imageUrls.length})</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {pitstop.imageUrls.map((imageUrl: string, imgIndex: number) => (
                                    <div key={imgIndex} className="relative">
                                      <img
                                        src={imageUrl}
                                        alt={`${pitstop.name} - Image ${imgIndex + 1}`}
                                        className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => {
                                          // Could implement image lightbox here
                                          window.open(imageUrl, '_blank');
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selectedDriveLog)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Drive Log
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDetailDialog(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Edit Drive Log Modal */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-6">Edit Drive Log</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit((data) => {
            // Frontend validation for required fields
            if (!data.title.trim()) {
              toast({
                title: "Title is required",
                description: "Please enter a title for your drive log",
                variant: "destructive",
              });
              return;
            }
            
            if (!data.startLocation.trim()) {
              toast({
                title: "Start location is required",
                description: "Please enter the starting location",
                variant: "destructive",
              });
              return;
            }
            
            if (!data.endLocation.trim()) {
              toast({
                title: "End location is required", 
                description: "Please enter the destination",
                variant: "destructive",
              });
              return;
            }
            
            if (!data.distance.trim() || data.distance === "0") {
              toast({
                title: "Distance is required",
                description: "Please enter the distance traveled",
                variant: "destructive",
              });
              return;
            }
            
            updateDriveLogMutation.mutate({
              id: editingDriveLog!.id,
              updates: data
            });
          })} className="space-y-8">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="edit-title" className="text-base font-medium">Title *</Label>
                  <Input
                    id="edit-title"
                    placeholder="Enter drive log title"
                    {...form.register("title")}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description" className="text-base font-medium">Description</Label>
                  <Textarea
                    id="edit-description"
                    placeholder="Describe your drive experience"
                    {...form.register("description")}
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-start-location" className="text-base font-medium">Start Location *</Label>
                  <Input
                    id="edit-start-location"
                    placeholder="Where did you start?"
                    {...form.register("startLocation")}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-end-location" className="text-base font-medium">End Location *</Label>
                  <Input
                    id="edit-end-location"
                    placeholder="Where did you end?"
                    {...form.register("endLocation")}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-distance" className="text-base font-medium">Distance (km) *</Label>
                  <Input
                    id="edit-distance"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    {...form.register("distance")}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-route" className="text-base font-medium">Route</Label>
                  <Input
                    id="edit-route"
                    placeholder="e.g., Highway 1, Route 66"
                    {...form.register("route")}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-vehicle" className="text-base font-medium">Vehicle</Label>
                <select
                  id="edit-vehicle"
                  {...form.register("vehicleId")}
                  className="mt-1 w-full p-2 border border-input rounded-md bg-background"
                >
                  <option value="">Select a vehicle</option>
                  {vehicles?.map((vehicle: any) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Edit Pitstops Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Pitstops (Optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (editPitstops.length >= 10) {
                      toast({
                        title: "Maximum pitstops reached",
                        description: "You can add up to 10 pitstops per drive log",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    setEditPitstops([...editPitstops, {
                      name: '',
                      address: '',
                      latitude: 0,
                      longitude: 0,
                      type: 'other',
                      orderIndex: editPitstops.length,
                      description: '',
                    }]);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Pitstop
                </Button>
              </div>

              {editPitstops.length > 0 && (
                <div className="space-y-4">
                  {editPitstops.map((pitstop, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Pitstop {index + 1}</h4>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const updated = editPitstops.filter((_, i) => i !== index);
                            setEditPitstops(updated.map((p, i) => ({ ...p, orderIndex: i })));
                            // Remove images for this pitstop
                            setEditPitstopImages(prev => {
                              const newImages = { ...prev };
                              delete newImages[index];
                              return newImages;
                            });
                            setExistingPitstopImages(prev => {
                              const newImages = { ...prev };
                              delete newImages[index];
                              return newImages;
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label htmlFor={`edit-pitstop-name-${index}`} className="text-sm font-medium">Pitstop Name</Label>
                          <Input
                            id={`edit-pitstop-name-${index}`}
                            placeholder="Enter pitstop name"
                            value={pitstop.name}
                            onChange={(e) => {
                              const updated = [...editPitstops];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setEditPitstops(updated);
                            }}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`edit-pitstop-location-${index}`} className="text-sm font-medium">Location</Label>
                          <div className="relative">
                            <Input
                              id={`edit-pitstop-location-${index}`}
                              placeholder="Search for location or enter address"
                              value={pitstop.address || ''}
                              onChange={(e) => {
                                const updated = [...editPitstops];
                                updated[index] = { ...updated[index], address: e.target.value };
                                setEditPitstops(updated);
                              }}
                              className="mt-1 pr-10"
                            />
                            <MapPin className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor={`edit-pitstop-type-${index}`} className="text-sm font-medium">Type</Label>
                          <select
                            id={`edit-pitstop-type-${index}`}
                            value={pitstop.type}
                            onChange={(e) => {
                              const updated = [...editPitstops];
                              updated[index] = { ...updated[index], type: e.target.value as any };
                              setEditPitstops(updated);
                            }}
                            className="mt-1 w-full p-2 border border-input rounded-md bg-background"
                          >
                            <option value="food">Food & Dining</option>
                            <option value="fuel">Fuel Station</option>
                            <option value="scenic">Scenic Spot</option>
                            <option value="rest">Rest Area</option>
                            <option value="attraction">Attraction</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <Label htmlFor={`edit-pitstop-description-${index}`} className="text-sm font-medium">Description (Optional)</Label>
                          <Textarea
                            id={`edit-pitstop-description-${index}`}
                            placeholder="Describe this pitstop"
                            value={pitstop.description || ''}
                            onChange={(e) => {
                              const updated = [...editPitstops];
                              updated[index] = { ...updated[index], description: e.target.value };
                              setEditPitstops(updated);
                            }}
                            className="mt-1 min-h-[60px]"
                          />
                        </div>

                        {/* Image Management */}
                        <div>
                          <Label className="text-sm font-medium">Images (up to 3)</Label>
                          
                          {/* Existing Images */}
                          {existingPitstopImages[index] && existingPitstopImages[index].length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground mb-2">Existing images:</p>
                              <div className="grid grid-cols-3 gap-2">
                                {existingPitstopImages[index].map((imageUrl, imgIndex) => (
                                  <div key={imgIndex} className="relative">
                                    <img
                                      src={imageUrl}
                                      alt={`${pitstop.name} - Image ${imgIndex + 1}`}
                                      className="w-full h-16 object-cover rounded border"
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      className="absolute -top-1 -right-1 h-5 w-5 p-0"
                                      onClick={() => {
                                        const updatedImages = [...existingPitstopImages[index]];
                                        updatedImages.splice(imgIndex, 1);
                                        setExistingPitstopImages(prev => ({
                                          ...prev,
                                          [index]: updatedImages
                                        }));
                                      }}
                                    >
                                      ×
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* New Image Upload */}
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              const existingCount = existingPitstopImages[index]?.length || 0;
                              const totalCount = existingCount + files.length;
                              
                              if (totalCount > 3) {
                                toast({
                                  title: "Too many images",
                                  description: "You can have up to 3 images per pitstop",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              setEditPitstopImages(prev => ({
                                ...prev,
                                [index]: files
                              }));
                            }}
                            className="mt-2"
                          />
                          
                          {/* New Images Preview */}
                          {editPitstopImages[index] && editPitstopImages[index].length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {editPitstopImages[index].map((file, imgIndex) => (
                                <div key={imgIndex} className="relative">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={`New ${pitstop.name} - Image ${imgIndex + 1}`}
                                    className="w-full h-16 object-cover rounded border"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    className="absolute -top-1 -right-1 h-5 w-5 p-0"
                                    onClick={() => {
                                      const updatedImages = [...editPitstopImages[index]];
                                      updatedImages.splice(imgIndex, 1);
                                      setEditPitstopImages(prev => ({
                                        ...prev,
                                        [index]: updatedImages
                                      }));
                                    }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {editPitstops.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                  <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-2">No pitstops added yet</p>
                  <p className="text-sm text-muted-foreground">Click "Add Pitstop" to start adding stops to your route</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={updateDriveLogMutation.isPending}
                className="flex-1"
              >
                {updateDriveLogMutation.isPending ? "Updating..." : "Update Drive Log"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingDriveLog(null);
                  setEditPitstops([]);
                  setEditPitstopImages({});
                  setExistingPitstopImages({});
                  form.reset();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}