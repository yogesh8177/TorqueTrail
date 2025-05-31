import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, MessageCircle, Share2, Bookmark, MapPin, Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FeedPostProps {
  post: {
    id: number;
    userId: string;
    content: string;
    title?: string;
    type: string;
    imageUrls?: string[];
    videoUrls?: string[];
    likes: number;
    comments: number;
    shares: number;
    createdAt: string;
  };
}

export default function FeedPost({ post }: FeedPostProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(false);

  const likeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/posts/${post.id}/like`);
    },
    onSuccess: (response) => {
      setIsLiked(response.liked);
      queryClient.invalidateQueries({ queryKey: ["/api/posts/feed"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update like",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLike = () => {
    likeMutation.mutate();
  };

  const getPostTypeStyle = (type: string) => {
    switch (type) {
      case "drive":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "garage":
        return "bg-primary/20 text-primary border-primary/30";
      case "convoy":
        return "bg-secondary/20 text-secondary border-secondary/30";
      default:
        return "bg-accent/20 text-muted-foreground border-accent/30";
    }
  };

  const getPostTypeLabel = (type: string) => {
    switch (type) {
      case "drive":
        return "Drive Log";
      case "garage":
        return "Garage Update";
      case "convoy":
        return "Convoy Event";
      default:
        return "Post";
    }
  };

  return (
    <Card className="automotive-card hover:border-accent/50 transition-colors">
      <CardContent className="p-6">
        {/* Post Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/50 to-secondary/50 border-2 border-border flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium">Driver {post.userId.slice(0, 8)}</h3>
              <span
                className={`text-xs px-2 py-1 rounded-full border ${getPostTypeStyle(post.type)}`}
              >
                {getPostTypeLabel(post.type)}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </Button>
        </div>

        {/* Post Title */}
        {post.title && (
          <h2 className="text-xl font-bold mb-3">{post.title}</h2>
        )}

        {/* Post Content */}
        <p className="mb-4 leading-relaxed">{post.content}</p>

        {/* Media */}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <div className={`mb-4 rounded-lg overflow-hidden ${
            post.imageUrls.length === 1 ? "" : "grid grid-cols-2 gap-2"
          }`}>
            {post.imageUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Post image ${index + 1}`}
                className={`w-full object-cover cursor-pointer hover:opacity-90 transition-opacity ${
                  post.imageUrls!.length === 1 ? "h-64 sm:h-80" : "h-32 sm:h-40"
                }`}
                onError={(e) => {
                  console.error("Image failed to load:", e);
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={() => {
                  console.log("Image loaded successfully");
                }}
              />
            ))}
          </div>
        )}

        {/* Video */}
        {post.videoUrls && post.videoUrls.length > 0 && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <video
              controls
              className="w-full h-64 sm:h-80 object-cover"
              poster="/placeholder-video-thumbnail.jpg"
            >
              <source src={post.videoUrls[0]} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* Drive Stats for Drive Posts */}
        {post.type === "drive" && (
          <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-accent/10 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">127mi</p>
              <p className="text-xs text-muted-foreground">Distance</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary">3h 45m</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">8</p>
              <p className="text-xs text-muted-foreground">Stops</p>
            </div>
          </div>
        )}

        {/* Location Badge */}
        {post.type === "drive" && (
          <div className="flex items-center space-x-2 mb-4">
            <div className="flex items-center space-x-1 bg-primary/20 px-3 py-1 rounded-full border border-primary/30">
              <MapPin className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-primary">Pacific Coast Highway</span>
            </div>
          </div>
        )}

        {/* Engagement Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={likeMutation.isPending}
              className={`flex items-center space-x-2 ${
                isLiked
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Heart
                className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`}
              />
              <span className="text-sm">{post.likes}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 text-muted-foreground hover:text-secondary"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{post.comments}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
            >
              <Share2 className="w-5 h-5" />
              <span className="text-sm">Share</span>
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-yellow-500"
          >
            <Bookmark className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
