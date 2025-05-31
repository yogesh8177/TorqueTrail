import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Camera, Video, MapPin, Car, X } from "lucide-react";

export default function CreatePost() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [postType, setPostType] = useState<"drive" | "garage" | "general">("general");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const createPostMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/posts", data);
    },
    onSuccess: () => {
      toast({
        title: "Post created successfully!",
        description: "Your post has been shared with the community.",
      });
      setContent("");
      setTitle("");
      setTags("");
      setSelectedFiles([]);
      setIsExpanded(false);
      queryClient.invalidateQueries({ queryKey: ["/api/posts/feed"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create post",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 5) {
      toast({
        title: "Too many files",
        description: "You can only upload up to 5 files per post.",
        variant: "destructive",
      });
      return;
    }
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please write something before posting.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("content", content);
    formData.append("type", postType);
    if (title) formData.append("title", title);
    if (tags) formData.append("tags", tags);
    
    selectedFiles.forEach(file => {
      formData.append("media", file);
    });

    createPostMutation.mutate(formData);
  };

  if (!user) return null;

  return (
    <Card className="automotive-card">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/50 to-secondary/50 border-2 border-border flex items-center justify-center">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <Car className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              {isExpanded ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Add a title (optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-accent/20 border-accent"
                  />
                  <Textarea
                    placeholder="Share your latest drive, garage update, or automotive thoughts..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="bg-accent/20 border-accent min-h-[100px] resize-none"
                    autoFocus
                  />
                  <Input
                    placeholder="Add tags (comma separated, e.g., BMW, M3, Track Day)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="bg-accent/20 border-accent"
                  />
                </div>
              ) : (
                <Input
                  placeholder="Share your latest drive, garage update, or automotive thoughts..."
                  onClick={() => setIsExpanded(true)}
                  readOnly
                  className="bg-accent/20 border-accent cursor-pointer"
                />
              )}
            </div>
          </div>

          {isExpanded && (
            <>
              {/* Post Type Selection */}
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">Post Type</Label>
                <div className="flex space-x-2">
                  {[
                    { id: "general", label: "General", icon: Car },
                    { id: "drive", label: "Drive Log", icon: MapPin },
                    { id: "garage", label: "Garage Update", icon: Car },
                  ].map(({ id, label, icon: Icon }) => (
                    <Button
                      key={id}
                      type="button"
                      variant={postType === id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPostType(id as any)}
                      className="flex items-center space-x-1"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="mb-4">
                  <Label className="text-sm font-medium mb-2 block">Selected Files</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-accent/20 rounded-lg flex items-center justify-center border border-accent">
                          {file.type.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt="Preview"
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Video className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors">
                      <Camera className="w-5 h-5" />
                      <span className="text-sm">Photo/Video</span>
                    </div>
                  </label>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-secondary"
                  >
                    <MapPin className="w-5 h-5 mr-2" />
                    <span className="text-sm">Add Location</span>
                  </Button>
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsExpanded(false);
                      setContent("");
                      setTitle("");
                      setTags("");
                      setSelectedFiles([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPostMutation.isPending || !content.trim()}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {createPostMutation.isPending ? "Posting..." : "Share"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
