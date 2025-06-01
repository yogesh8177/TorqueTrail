import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { X, MapPin, Plus, Camera } from 'lucide-react';
import { PitstopLocation } from '@shared/schema';

interface GoogleMapsPitstopSelectorProps {
  pitstops: PitstopLocation[];
  onPitstopsChange: (pitstops: PitstopLocation[]) => void;
  maxPitstops?: number;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function GoogleMapsPitstopSelector({ 
  pitstops, 
  onPitstopsChange, 
  maxPitstops = 10 
}: GoogleMapsPitstopSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedPitstop, setSelectedPitstop] = useState<PitstopLocation | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadGoogleMaps = async () => {
      if (window.google) {
        initializeMap();
        return;
      }

      try {
        // Fetch the Google Maps script URL from the server
        const response = await fetch('/api/google-maps-config');
        const config = await response.json();
        
        const script = document.createElement('script');
        script.src = config.scriptUrl;
        script.async = true;
        script.defer = true;

        window.initMap = () => {
          initializeMap();
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('Failed to load Google Maps configuration:', error);
      }
    };

    const initializeMap = () => {
      if (!mapRef.current) return;

      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 8,
        center: { lat: 12.9716, lng: 77.5946 }, // Default to Bangalore
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;

      // Add click listener to add pitstops
      map.addListener('click', (event: any) => {
        if (pitstops.length >= maxPitstops) {
          alert(`Maximum ${maxPitstops} pitstops allowed`);
          return;
        }
        addPitstop(event.latLng);
      });

      setIsMapLoaded(true);
      updateMapMarkers();
    };

    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (isMapLoaded) {
      updateMapMarkers();
    }
  }, [pitstops, isMapLoaded]);

  const addPitstop = async (latLng: any) => {
    const geocoder = new window.google.maps.Geocoder();
    
    try {
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: latLng }, (results: any, status: any) => {
          if (status === 'OK' && results[0]) {
            resolve(results[0]);
          } else {
            reject(status);
          }
        });
      });

      const newPitstop: PitstopLocation = {
        name: 'New Pitstop',
        description: '',
        latitude: latLng.lat(),
        longitude: latLng.lng(),
        address: (result as any).formatted_address,
        placeId: (result as any).place_id,
        type: 'other',
        orderIndex: pitstops.length,
        imageUrls: [],
        notes: '',
      };

      const updatedPitstops = [...pitstops, newPitstop];
      onPitstopsChange(updatedPitstops);
      setSelectedPitstop(newPitstop);
      setEditingIndex(pitstops.length);
    } catch (error) {
      console.error('Geocoding failed:', error);
      // Fallback without address
      const newPitstop: PitstopLocation = {
        name: 'New Pitstop',
        description: '',
        latitude: latLng.lat(),
        longitude: latLng.lng(),
        type: 'other',
        orderIndex: pitstops.length,
        imageUrls: [],
        notes: '',
      };

      const updatedPitstops = [...pitstops, newPitstop];
      onPitstopsChange(updatedPitstops);
      setSelectedPitstop(newPitstop);
      setEditingIndex(pitstops.length);
    }
  };

  const updateMapMarkers = () => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    pitstops.forEach((pitstop, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: pitstop.latitude, lng: pitstop.longitude },
        map: mapInstanceRef.current,
        title: pitstop.name,
        label: (index + 1).toString(),
      });

      marker.addListener('click', () => {
        setSelectedPitstop(pitstop);
        setEditingIndex(index);
      });

      markersRef.current.push(marker);
    });

    // Fit map to show all markers
    if (pitstops.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      pitstops.forEach(pitstop => {
        bounds.extend({ lat: pitstop.latitude, lng: pitstop.longitude });
      });
      mapInstanceRef.current.fitBounds(bounds);
    }
  };

  const removePitstop = (index: number) => {
    const updatedPitstops = pitstops.filter((_, i) => i !== index)
      .map((pitstop, i) => ({ ...pitstop, orderIndex: i }));
    onPitstopsChange(updatedPitstops);
    setSelectedPitstop(null);
    setEditingIndex(null);
  };

  const updatePitstop = (index: number, updates: Partial<PitstopLocation>) => {
    const updatedPitstops = pitstops.map((pitstop, i) => 
      i === index ? { ...pitstop, ...updates } : pitstop
    );
    onPitstopsChange(updatedPitstops);
    setSelectedPitstop({ ...selectedPitstop!, ...updates });
  };

  const pitstopTypes = [
    { value: 'food', label: 'Food & Dining' },
    { value: 'fuel', label: 'Fuel Station' },
    { value: 'rest', label: 'Rest Area' },
    { value: 'scenic', label: 'Scenic Spot' },
    { value: 'attraction', label: 'Attraction' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Select Pitstops ({pitstops.length}/{maxPitstops})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Click on the map to add pitstops to your route. You can add up to {maxPitstops} pitstops.
          </p>
        </CardHeader>
        <CardContent>
          <div 
            ref={mapRef} 
            className="w-full h-64 bg-gray-200 rounded-lg"
            style={{ minHeight: '300px' }}
          />
        </CardContent>
      </Card>

      {pitstops.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pitstops List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pitstops.map((pitstop, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{index + 1}</Badge>
                  <div>
                    <p className="font-medium">{pitstop.name}</p>
                    <p className="text-sm text-muted-foreground">{pitstop.address}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPitstop(pitstop);
                      setEditingIndex(index);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removePitstop(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {selectedPitstop && editingIndex !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Pitstop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pitstop-name">Name</Label>
              <Input
                id="pitstop-name"
                value={selectedPitstop.name}
                onChange={(e) => updatePitstop(editingIndex, { name: e.target.value })}
                placeholder="Pitstop name"
              />
            </div>

            <div>
              <Label htmlFor="pitstop-type">Type</Label>
              <Select
                value={selectedPitstop.type}
                onValueChange={(value) => updatePitstop(editingIndex, { type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pitstopTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pitstop-description">Description</Label>
              <Textarea
                id="pitstop-description"
                value={selectedPitstop.description || ''}
                onChange={(e) => updatePitstop(editingIndex, { description: e.target.value })}
                placeholder="Brief description of this pitstop"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="pitstop-notes">Notes</Label>
              <Textarea
                id="pitstop-notes"
                value={selectedPitstop.notes || ''}
                onChange={(e) => updatePitstop(editingIndex, { notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setSelectedPitstop(null);
                  setEditingIndex(null);
                }}
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}