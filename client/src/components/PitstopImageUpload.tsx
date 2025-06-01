import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { X, Camera, Upload } from 'lucide-react';

interface PitstopImageUploadProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  existingImageUrls?: string[];
  maxImages?: number;
}

export default function PitstopImageUpload({ 
  images, 
  onImagesChange, 
  existingImageUrls = [],
  maxImages = 3 
}: PitstopImageUploadProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed per pitstop`);
      return;
    }

    const validFiles = files.filter(file => file.type.startsWith('image/'));
    const newImages = [...images, ...validFiles];
    
    // Create preview URLs for new images
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    
    onImagesChange(newImages);
    
    // Reset the input
    event.target.value = '';
  };

  const removeImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      // Handle removing existing images (would need parent component to track this)
      return;
    }
    
    const newImages = images.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    
    // Revoke the URL to prevent memory leaks
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }
    
    setPreviewUrls(newPreviewUrls);
    onImagesChange(newImages);
  };

  const totalImages = existingImageUrls.length + images.length;
  const canAddMore = totalImages < maxImages;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Pitstop Images ({totalImages}/{maxImages})</Label>
        {canAddMore && (
          <div>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
              id="pitstop-images"
            />
            <Label htmlFor="pitstop-images" className="cursor-pointer">
              <Button type="button" variant="outline" size="sm" asChild>
                <span>
                  <Camera className="h-4 w-4 mr-2" />
                  Add Images
                </span>
              </Button>
            </Label>
          </div>
        )}
      </div>

      {(existingImageUrls.length > 0 || images.length > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {/* Existing images */}
          {existingImageUrls.map((url, index) => (
            <Card key={`existing-${index}`} className="relative">
              <CardContent className="p-2">
                <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                  <img 
                    src={url} 
                    alt={`Pitstop image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => removeImage(index, true)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* New images */}
          {images.map((file, index) => (
            <Card key={`new-${index}`} className="relative">
              <CardContent className="p-2">
                <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                  <img 
                    src={previewUrls[index] || URL.createObjectURL(file)} 
                    alt={`New pitstop image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalImages === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">No images added yet</p>
          <p className="text-xs text-gray-500">You can add up to {maxImages} images for this pitstop</p>
        </div>
      )}
    </div>
  );
}