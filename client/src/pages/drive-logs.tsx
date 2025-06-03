import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Route, Eye, Trash2, Calendar, MapPin, Car, MoreVertical, Share, Edit, Facebook, Twitter, Instagram, Copy } from "lucide-react";
import type { DriveLog, PitstopLocation } from "@shared/schema";
import GoogleMapsPitstopSelector from "@/components/GoogleMapsPitstopSelector";
import PitstopImageUpload from "@/components/PitstopImageUpload";

interface DriveLogFormData {
  title: string;
  description: string;
  startLocation: string;
  endLocation: string;
  distance: string;
  startTime: Date;
  endTime?: Date;
  vehicleId?: number;
}

export default function DriveLogs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [pitstops, setPitstops] = useState<PitstopLocation[]>([]);
  const [pitstopImages, setPitstopImages] = useState<{[key: number]: File[]}>({});
  const [selectedDriveLog, setSelectedDriveLog] = useState<DriveLog | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDriveLog, setEditingDriveLog] = useState<DriveLog | null>(null);

  const { data: driveLogs, isLoading: driveLogsLoading } = useQuery({
    queryKey: ['/api/drive-logs'],
  });

  const { data: vehicles } = useQuery({
    queryKey: ['/api/vehicles'],
  });

  const form = useForm<DriveLogFormData>({
    defaultValues: {
      title: "",
      description: "",
      startLocation: "",
      endLocation: "",
      distance: "0",
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

      return await apiRequest('/api/drive-logs', {
        method: 'POST',
        body: formData,
      });
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
    mutationFn: async (data: { id: number; updates: Partial<DriveLogFormData> }) => {
      const response = await fetch(`/api/drive-logs/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.updates),
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
        description: "Drive log updated successfully!",
      });
      setShowEditDialog(false);
      setEditingDriveLog(null);
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
    createDriveLogMutation.mutate(data);
  };

  const handleDelete = (driveLog: DriveLog) => {
    if (confirm(`Are you sure you want to delete "${driveLog.title}"?`)) {
      deleteDriveLogMutation.mutate(driveLog.id);
    }
  };

  const handleEdit = (driveLog: DriveLog) => {
    setEditingDriveLog(driveLog);
    setShowEditDialog(true);
  };

  const handleShare = (driveLog: DriveLog, platform: string) => {
    const url = `${window.location.origin}/drive-logs/${driveLog.id}`;
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
          title: "Link copied",
          description: "Drive log link copied to clipboard!",
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-6">Create New Drive Log</DialogTitle>
          </DialogHeader>

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
                  <Label htmlFor="distance" className="text-sm font-medium">Distance (miles)</Label>
                  <Input
                    id="distance"
                    {...form.register("distance")}
                    placeholder="0"
                    type="number"
                    className="mt-1"
                  />
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
        </DialogContent>
      </Dialog>

      {/* Edit Drive Log Modal */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
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
                  }
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
                <Label htmlFor="edit-distance">Distance (miles)</Label>
                <Input
                  id="edit-distance"
                  name="distance"
                  defaultValue={editingDriveLog.distance}
                  type="number"
                  placeholder="Distance"
                />
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
                  onClick={() => setShowEditDialog(false)}
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
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{driveLog.distance} miles</span>
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
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Route className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Distance</p>
                      <p className="text-sm text-muted-foreground">{selectedDriveLog.distance} miles</p>
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
    </div>
  );
}