import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import CreatePost from "@/components/post/create-post";
import FeedPost from "@/components/post/feed-post";
import AIBlogPost from "@/components/post/ai-blog-post";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, Users, Trophy, MapPin, AlertTriangle, Info, CloudRain } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  // Fetch feed posts
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["/api/posts/feed"],
    enabled: !!user,
  });

  // Fetch upcoming convoys
  const { data: upcomingConvoys = [] } = useQuery({
    queryKey: ["/api/convoys/upcoming?limit=5"],
    enabled: !!user,
  });

  // Fetch weather alerts
  const { data: weatherAlerts = [] } = useQuery({
    queryKey: ["/api/weather/alerts"],
    enabled: !!user,
  });

  // Fetch top contributors
  const { data: topContributors = [] } = useQuery({
    queryKey: ["/api/leaderboard/contributors?limit=5"],
    enabled: !!user,
  });

  // Mock user stats - in real app would come from user profile
  const userStats = {
    totalMiles: user?.totalMiles || 0,
    convoysJoined: user?.totalConvoys || 0,
    garageRating: user?.garageRating || "0.0",
    followers: user?.followers || 0,
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        <Sidebar />
        <main className="flex-1 lg:pl-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Hero Section */}
            <div className="mb-8">
              <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden bg-gradient-to-r from-primary/20 to-secondary/20 bg-[url('https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&h=800')] bg-cover bg-center">
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                    Welcome back, {user.firstName || "Driver"}!
                  </h1>
                  <p className="text-muted-foreground text-lg">Ready for your next adventure?</p>
                  <div className="flex flex-wrap gap-4 mt-4">
                    <Button className="bg-primary hover:bg-primary/90">
                      Share Drive
                    </Button>
                    <Button variant="outline" className="border-secondary text-secondary hover:bg-secondary/10">
                      Organize Convoy
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="automotive-card hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Total Miles</p>
                      <p className="text-2xl font-bold text-primary">{userStats.totalMiles.toLocaleString()}</p>
                    </div>
                    <Car className="w-8 h-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="automotive-card hover:border-secondary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Convoys Joined</p>
                      <p className="text-2xl font-bold text-secondary">{userStats.convoysJoined}</p>
                    </div>
                    <Users className="w-8 h-8 text-secondary/50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="automotive-card hover:border-yellow-500/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Garage Rating</p>
                      <p className="text-2xl font-bold text-yellow-500">{userStats.garageRating}⭐</p>
                    </div>
                    <Trophy className="w-8 h-8 text-yellow-500/50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="automotive-card hover:border-green-500/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Followers</p>
                      <p className="text-2xl font-bold text-green-500">{userStats.followers.toLocaleString()}</p>
                    </div>
                    <Users className="w-8 h-8 text-green-500/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Feed */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Feed Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Create Post */}
                <CreatePost />

                {/* Posts Feed */}
                {postsLoading ? (
                  <div className="space-y-6">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="automotive-card">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4 mb-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-4 w-3/4 mb-4" />
                          <Skeleton className="h-40 w-full rounded-lg" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {posts.map((post: any, index: number) => {
                      // Simulate AI blog posts for demo
                      if (index === 0) {
                        return <AIBlogPost key={post.id} post={post} />;
                      }
                      return <FeedPost key={post.id} post={post} />;
                    })}
                  </div>
                )}
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Upcoming Convoys */}
                <Card className="automotive-card">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-4">Upcoming Convoys</h3>
                    {upcomingConvoys.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingConvoys.slice(0, 3).map((convoy: any) => (
                          <div key={convoy.id} className="p-3 bg-muted/20 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">{convoy.title}</h4>
                              <span className="text-xs text-secondary">
                                {new Date(convoy.startDateTime).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground space-x-4">
                              <span>{new Date(convoy.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span>{convoy.currentParticipants} going</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No upcoming convoys</p>
                    )}
                    <Button variant="outline" className="w-full mt-4" size="sm">
                      View All Convoys
                    </Button>
                  </CardContent>
                </Card>

                {/* Weather & Route Alerts */}
                <Card className="automotive-card">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-4">Route Alerts</h3>
                    <div className="space-y-3">
                      {weatherAlerts.length > 0 ? (
                        weatherAlerts.slice(0, 2).map((alert: any) => (
                          <div key={alert.id} className={`p-3 rounded-lg border ${
                            alert.severity === 'high' ? 'bg-red-500/10 border-red-500/20' :
                            alert.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/20' :
                            'bg-blue-500/10 border-blue-500/20'
                          }`}>
                            <div className="flex items-start space-x-3">
                              {alert.severity === 'high' ? (
                                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                              ) : alert.severity === 'medium' ? (
                                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                              ) : (
                                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                              )}
                              <div>
                                <p className="text-sm font-medium">{alert.routeName}</p>
                                <p className="text-xs text-muted-foreground">{alert.description}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <div className="flex items-start space-x-3">
                              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-yellow-500">PCH Construction</p>
                                <p className="text-xs text-muted-foreground">Lane closures near Malibu. Add 20min to your drive.</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="flex items-start space-x-3">
                              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-blue-500">Perfect Weather</p>
                                <p className="text-xs text-muted-foreground">Clear skies for Angeles Crest Highway this weekend!</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <Button variant="outline" className="w-full mt-4" size="sm">
                      View All Alerts
                    </Button>
                  </CardContent>
                </Card>

                {/* Top Contributors */}
                <Card className="automotive-card">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-4">Top Contributors</h3>
                    <div className="space-y-3">
                      {topContributors.length > 0 ? (
                        topContributors.map((contributor: any, index: number) => (
                          <div key={contributor.user.id} className="flex items-center space-x-3">
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              index === 0 ? 'bg-primary text-primary-foreground' :
                              index === 1 ? 'bg-muted text-muted-foreground' :
                              'bg-yellow-600 text-white'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/50 to-secondary/50 border-2 border-border" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{contributor.user.firstName} {contributor.user.lastName}</p>
                              <p className="text-xs text-muted-foreground">{contributor.points} points</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="space-y-3">
                          {[
                            { name: "Jake Morrison", points: 2847, rank: 1 },
                            { name: "Elena Vasquez", points: 2156, rank: 2 },
                            { name: "David Kim", points: 1923, rank: 3 },
                          ].map((contributor, index) => (
                            <div key={contributor.name} className="flex items-center space-x-3">
                              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                index === 0 ? 'bg-primary text-primary-foreground' :
                                index === 1 ? 'bg-muted text-muted-foreground' :
                                'bg-yellow-600 text-white'
                              }`}>
                                {contributor.rank}
                              </div>
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/50 to-secondary/50 border-2 border-border" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{contributor.name}</p>
                                <p className="text-xs text-muted-foreground">{contributor.points} points</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button variant="outline" className="w-full mt-4" size="sm">
                      View Full Leaderboard
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <main className="pb-16">
          <div className="px-4 py-6">
            {/* Mobile Hero */}
            <div className="mb-6">
              <div className="relative h-48 rounded-xl overflow-hidden bg-gradient-to-r from-primary/20 to-secondary/20 bg-[url('https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400')] bg-cover bg-center">
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h1 className="text-2xl font-bold mb-1">Welcome back, {user.firstName || "Driver"}!</h1>
                  <p className="text-muted-foreground">Ready for your next adventure?</p>
                </div>
              </div>
            </div>

            {/* Mobile Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="automotive-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{userStats.totalMiles.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Miles</p>
                </CardContent>
              </Card>
              <Card className="automotive-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-secondary">{userStats.convoysJoined}</p>
                  <p className="text-xs text-muted-foreground">Convoys</p>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Feed */}
            <div className="space-y-6">
              <CreatePost />
              {postsLoading ? (
                <div className="space-y-6">
                  {[...Array(2)].map((_, i) => (
                    <Card key={i} className="automotive-card">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-2 w-16" />
                          </div>
                        </div>
                        <Skeleton className="h-3 w-full mb-2" />
                        <Skeleton className="h-32 w-full rounded-lg" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.slice(0, 5).map((post: any, index: number) => {
                    if (index === 0) {
                      return <AIBlogPost key={post.id} post={post} />;
                    }
                    return <FeedPost key={post.id} post={post} />;
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
