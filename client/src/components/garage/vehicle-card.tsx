import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Car, Edit, Trash2, Eye, EyeOff, Gauge, Fuel, Calendar, Palette } from "lucide-react";

interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  color?: string;
  engine?: string;
  horsepower?: number;
  transmission?: string;
  fuelType?: string;
  imageUrl?: string;
  description?: string;
  isPublic: boolean;
}

interface VehicleCardProps {
  vehicle: Vehicle;
  onEdit?: (vehicle: Vehicle) => void;
}

export default function VehicleCard({ vehicle, onEdit }: VehicleCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imageError, setImageError] = useState(false);

  const deleteVehicleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/vehicles/${vehicle.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Vehicle deleted",
        description: "Your vehicle has been removed from your garage.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete vehicle",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PUT", `/api/vehicles/${vehicle.id}`, {
        isPublic: !vehicle.isPublic,
      });
    },
    onSuccess: () => {
      toast({
        title: vehicle.isPublic ? "Vehicle made private" : "Vehicle made public",
        description: vehicle.isPublic 
          ? "Your vehicle is now hidden from other users."
          : "Your vehicle is now visible to other users.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update visibility",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this vehicle? This action cannot be undone.")) {
      deleteVehicleMutation.mutate();
    }
  };

  const handleToggleVisibility = () => {
    toggleVisibilityMutation.mutate();
  };

  return (
    <Card className="automotive-card-interactive group">
      <CardContent className="p-0">
        {/* Vehicle Image */}
        <div className="relative aspect-car overflow-hidden rounded-t-xl">
          {vehicle.imageUrl && !imageError ? (
            <img
              src={vehicle.imageUrl}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent to-muted flex items-center justify-center">
              <Car className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          
          {/* Visibility Badge */}
          <div className="absolute top-3 left-3">
            <Badge
              variant={vehicle.isPublic ? "default" : "secondary"}
              className={`${
                vehicle.isPublic
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-muted/20 text-muted-foreground border-muted/30"
              }`}
            >
              {vehicle.isPublic ? (
                <>
                  <Eye className="w-3 h-3 mr-1" />
                  Public
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 mr-1" />
                  Private
                </>
              )}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-2">
              <Button
                size="icon"
                variant="secondary"
                className="w-8 h-8 bg-background/80 backdrop-blur-sm"
                onClick={handleToggleVisibility}
                disabled={toggleVisibilityMutation.isPending}
              >
                {vehicle.isPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              
              {onEdit && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="w-8 h-8 bg-background/80 backdrop-blur-sm"
                  onClick={() => onEdit(vehicle)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              
              <Button
                size="icon"
                variant="destructive"
                className="w-8 h-8 bg-red-500/80 backdrop-blur-sm"
                onClick={handleDelete}
                disabled={deleteVehicleMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="p-6">
          {/* Header */}
          <div className="mb-4">
            <h3 className="text-xl font-bold">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            {vehicle.description && (
              <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                {vehicle.description}
              </p>
            )}
          </div>

          {/* Specs Grid */}
          <div className="grid grid-cols-2 gap-4">
            {vehicle.color && (
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Color</span>
                <span className="text-sm font-medium">{vehicle.color}</span>
              </div>
            )}
            
            {vehicle.engine && (
              <div className="flex items-center space-x-2">
                <Gauge className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Engine</span>
                <span className="text-sm font-medium">{vehicle.engine}</span>
              </div>
            )}
            
            {vehicle.horsepower && (
              <div className="flex items-center space-x-2">
                <Gauge className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Power</span>
                <span className="text-sm font-medium text-primary">{vehicle.horsepower} HP</span>
              </div>
            )}
            
            {vehicle.fuelType && (
              <div className="flex items-center space-x-2">
                <Fuel className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Fuel</span>
                <span className="text-sm font-medium">{vehicle.fuelType}</span>
              </div>
            )}
            
            {vehicle.transmission && (
              <div className="col-span-2 flex items-center space-x-2">
                <Gauge className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Transmission</span>
                <span className="text-sm font-medium">{vehicle.transmission}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-3">
            <Button variant="outline" size="sm" className="flex-1">
              View Details
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              Create Post
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
