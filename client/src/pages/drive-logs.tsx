import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, Route } from "lucide-react";
import type { DriveLog, PitstopLocation } from "@shared/schema";

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
      
      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'titleImage') return;
        if (value instanceof Date) {
          formData.append(key, value.toISOString());
        } else if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Add pitstops data
      if (pitstops.length > 0) {
        formData.append('pitstopsData', JSON.stringify(pitstops));
      }

      // Add image if selected
      if (selectedImage) {
        formData.append('titleImage', selectedImage);
      }

      return await apiRequest('/api/drive-logs', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive-logs'] });
      toast({
        title: "Success",
        description: "Drive log created successfully!",
      });
      setShowCreateDialog(false);
      form.reset();
      setPitstops([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create drive log",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: DriveLogFormData) => {
    createDriveLogMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Drive Logs</h1>
          <p className="text-muted-foreground">Document your journeys and create memorable travel stories</p>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Drive Log
        </Button>
      </div>

      {/* Working Pitstop Form Modal */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Create New Drive Log</h2>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateDialog(false)}
              >
                Close
              </Button>
            </div>
            
            {/* BRIGHT TEST SECTION */}
            <div className="p-8 bg-yellow-300 border-4 border-black text-center mb-4">
              <h2 className="text-2xl font-bold">FORM TEST - CAN YOU SEE THIS?</h2>
              <p>If you can see this yellow box, forms are working</p>
            </div>

            {/* Complete Form with Pitstops */}
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  {...form.register("title")}
                  placeholder="Trip Title"
                  className="col-span-2"
                />
                <Input
                  {...form.register("startLocation")}
                  placeholder="Start Location"
                />
                <Input
                  {...form.register("endLocation")}
                  placeholder="End Location"
                />
                <Input
                  {...form.register("distance")}
                  placeholder="Distance (miles)"
                  type="number"
                />
                <select {...form.register("vehicleId")} className="p-2 border rounded">
                  <option value="">Select Vehicle</option>
                  {Array.isArray(vehicles) && vehicles.map((vehicle: any) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>
              
              <textarea
                {...form.register("description")}
                placeholder="Describe your journey..."
                className="w-full p-2 border rounded min-h-[100px]"
              />

              {/* PITSTOP SECTION - Inside Form */}
              <div className="p-6 bg-red-100 border-4 border-red-500 rounded-lg">
              <h3 className="text-xl font-bold text-red-800 mb-4">PITSTOPS ({pitstops.length}/10)</h3>
              <Button
                type="button"
                onClick={() => {
                  if (pitstops.length < 10) {
                    setPitstops([...pitstops, {
                      name: `Pitstop ${pitstops.length + 1}`,
                      latitude: 0,
                      longitude: 0,
                      type: 'other' as const,
                      orderIndex: pitstops.length,
                      description: '',
                      address: ''
                    }]);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white mb-4"
              >
                Add Pitstop
              </Button>
              
              {pitstops.length > 0 && (
                <div className="space-y-3">
                  {pitstops.map((pitstop, index) => (
                    <div key={index} className="bg-white p-4 rounded border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">#{index + 1}</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setPitstops(pitstops.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <Input
                          placeholder="Pitstop name"
                          value={pitstop.name}
                          onChange={(e) => {
                            const updated = [...pitstops];
                            updated[index] = { ...updated[index], name: e.target.value };
                            setPitstops(updated);
                          }}
                        />
                        <Input
                          placeholder="Address or location"
                          value={pitstop.address || ''}
                          onChange={(e) => {
                            const updated = [...pitstops];
                            updated[index] = { ...updated[index], address: e.target.value };
                            setPitstops(updated);
                          }}
                        />
                        <select
                          value={pitstop.type}
                          onChange={(e) => {
                            const updated = [...pitstops];
                            updated[index] = { ...updated[index], type: e.target.value as any };
                            setPitstops(updated);
                          }}
                          className="p-2 border rounded"
                        >
                          <option value="food">Food & Dining</option>
                          <option value="fuel">Fuel Station</option>
                          <option value="scenic">Scenic Spot</option>
                          <option value="rest">Rest Area</option>
                          <option value="attraction">Attraction</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {pitstops.length === 0 && (
                <div className="text-center py-4 text-red-600">
                  <p>No pitstops added yet</p>
                  <p className="text-sm">Click "Add Pitstop" to get started</p>
                </div>
              )}
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label htmlFor="titleImage">Title Image</Label>
                <Input
                  id="titleImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedImage(file);
                    }
                  }}
                  className="mt-1"
                />
                {selectedImage && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-2">
                      Selected: {selectedImage.name}
                    </p>
                    <img
                      src={URL.createObjectURL(selectedImage)}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded border"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateDialog(false);
                    form.reset();
                    setSelectedImage(null);
                    setPitstops([]);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createDriveLogMutation.isPending}>
                  {createDriveLogMutation.isPending ? "Creating..." : "Create Drive Log"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drive Logs List */}
      {driveLogsLoading ? (
        <div>Loading...</div>
      ) : Array.isArray(driveLogs) && driveLogs.length === 0 ? (
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
          {Array.isArray(driveLogs) && driveLogs.map((driveLog: DriveLog) => (
            <Card key={driveLog.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-2">{driveLog.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {driveLog.startLocation} → {driveLog.endLocation}
                </p>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{driveLog.distance} miles</span>
                  <span>{new Date(driveLog.startTime).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}