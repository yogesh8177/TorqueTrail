import { useState, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import FeedPost from "@/components/post/feed-post";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText } from "lucide-react";
import { useLocation } from "wouter";

export default function UserPosts() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['/api/posts/user'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await apiRequest(`/api/posts/user?limit=10&offset=${pageParam}`);
      return response;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: any[], pages) => {
      if (lastPage.length < 10) return undefined;
      return pages.length * 10;
    },
    enabled: !!user,
  });

  // Load more posts when user scrolls near bottom
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = data?.pages.flatMap(page => page) || [];

  if (!user) {
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="lg:hidden">
            <MobileNav />
          </div>
          <div className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-8">
              <div className="text-center">
                <p className="text-muted-foreground">Please log in to view your posts.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden">
          <MobileNav />
        </div>
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/profile')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Profile
              </Button>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                <h1 className="text-3xl font-bold">My Posts</h1>
                <span className="text-muted-foreground">
                  ({allPosts.length} total)
                </span>
              </div>
            </div>

            {/* Posts List */}
            {isLoading ? (
              <div className="space-y-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-4" />
                    <Skeleton className="h-32 w-full rounded" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Failed to load posts</p>
                <p className="text-muted-foreground">
                  There was an error loading your posts. Please try again.
                </p>
              </div>
            ) : allPosts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No posts yet</p>
                <p className="text-muted-foreground">
                  Start sharing your automotive experiences by creating your first post!
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => setLocation('/')}
                >
                  Create Your First Post
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {allPosts.map((post: any) => (
                  <FeedPost key={post.id} post={post} />
                ))}
                
                {/* Loading indicator for next page */}
                {isFetchingNextPage && (
                  <div className="space-y-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={`loading-${i}`} className="border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4 mb-4" />
                        <Skeleton className="h-32 w-full rounded" />
                      </div>
                    ))}
                  </div>
                )}

                {/* End of posts indicator */}
                {!hasNextPage && allPosts.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      You've reached the end of your posts
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}