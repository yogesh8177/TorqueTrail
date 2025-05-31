import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageCircle, Share2, Bookmark, MapPin, Clock, User, Send, Twitter, Facebook, Link, Copy, MoreHorizontal, Edit, Trash } from "lucide-react";
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
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || "");
  const [editContent, setEditContent] = useState(post.content || "");

  // Fetch comments for this post
  const { data: comments = [], isLoading: commentsLoading } = useQuery<any[]>({
    queryKey: [`/api/posts/${post.id}/comments`],
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/posts/${post.id}/like`);
    },
    onSuccess: (response: any) => {
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

  const commentMutation = useMutation({
    mutationFn: async (comment: string) => {
      return await apiRequest("POST", `/api/posts/${post.id}/comments`, {
        content: comment,
      });
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/feed"] });
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add comment",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/posts/${post.id}/save`);
    },
    onSuccess: (response: any) => {
      setIsSaved(response.saved);
      toast({
        title: isSaved ? "Post removed from saved" : "Post saved",
        description: isSaved ? "Post has been removed from your saved posts." : "Post has been saved to your collection.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save post",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: { title?: string; content: string }) => {
      return await apiRequest("PUT", `/api/posts/${post.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Post updated!",
        description: "Your post has been successfully updated.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts/saved'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update post",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLike = () => {
    likeMutation.mutate();
  };

  const handleComment = () => {
    setShowComments(!showComments);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    commentMutation.mutate(newComment.trim());
  };

  const handleShare = (platform: string) => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const postText = `Check out this post: "${post.content}"`;
    
    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(postText)}&url=${encodeURIComponent(postUrl)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(postUrl).then(() => {
          toast({
            title: "Link copied",
            description: "Post link has been copied to clipboard.",
          });
        }).catch(() => {
          toast({
            title: "Failed to copy",
            description: "Unable to copy link to clipboard.",
            variant: "destructive",
          });
        });
        break;
    }
    setIsShareOpen(false);
  };

  const handleEditSubmit = () => {
    if (!editContent.trim()) {
      toast({
        title: "Content required",
        description: "Post content cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    editMutation.mutate({
      title: editTitle.trim() || undefined,
      content: editContent.trim(),
    });
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditTitle(post.title || "");
    setEditContent(post.content || "");
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const getPostTypeStyle = (type: string) => {
    switch (type) {
      case "drive":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "garage":
      case "vehicle_showcase":
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
      case "vehicle_showcase":
        return "Vehicle Showcase";
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
          {user?.id === post.userId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Post Title */}
        {isEditing ? (
          <div className="space-y-3 mb-4">
            <Input
              placeholder="Post title (optional)"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="bg-accent/20 border-accent"
            />
            <Textarea
              placeholder="Post content"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="bg-accent/20 border-accent min-h-[100px] resize-none"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditCancel}
                disabled={editMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleEditSubmit}
                disabled={editMutation.isPending || !editContent.trim()}
              >
                {editMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {post.title && (
              <h2 className="text-xl font-bold mb-3 gradient-text-racing">{post.title}</h2>
            )}
            <p className="mb-4 leading-relaxed">{post.content}</p>
          </>
        )}

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
              onClick={handleComment}
              className="flex items-center space-x-2 text-muted-foreground hover:text-secondary"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{post.comments}</span>
            </Button>
            
            <DropdownMenu open={isShareOpen} onOpenChange={setIsShareOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm">Share</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleShare('twitter')}>
                  <Twitter className="w-4 h-4 mr-2" />
                  Share on Twitter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('facebook')}>
                  <Facebook className="w-4 h-4 mr-2" />
                  Share on Facebook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('copy')}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className={`${
              isSaved
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-muted-foreground hover:text-yellow-500"
            }`}
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-border pt-4 mt-4">
            {/* Add Comment Form */}
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/50 to-secondary/50 border border-border flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || commentMutation.isPending}
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{commentMutation.isPending ? "Posting..." : "Post Comment"}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {commentsLoading ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <div className="bg-accent/50 rounded-lg px-3 py-2">
                          <div className="flex items-center space-x-2 mb-1">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : Array.isArray(comments) && comments.length > 0 ? (
                comments.map((comment: any) => (
                  <div key={comment.id} className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/50 to-secondary/50 border border-border flex items-center justify-center">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-accent/50 rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium">Driver {comment.userId.slice(0, 8)}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No comments yet. Be the first to comment!
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
