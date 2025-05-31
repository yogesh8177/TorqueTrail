import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { 
  User, 
  Mail, 
  Calendar, 
  Car, 
  Users, 
  Trophy,
  MapPin,
  Activity
} from "lucide-react";

export default function Profile() {
  const { user } = useAuth();

  const { data: vehicles } = useQuery({
    queryKey: ['/api/vehicles'],
  });

  const { data: userConvoys } = useQuery({
    queryKey: ['/api/convoys/user'],
  });

  const { data: userPosts } = useQuery({
    queryKey: ['/api/posts/user'],
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to view your profile</h1>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64">
          <div className="container mx-auto px-4 py-8 pb-20 lg:pb-8 space-y-6">
            {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg">
                {user.firstName ? user.firstName[0] : user.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user.email || 'User'
                }
              </h1>
              
              {user.email && (
                <div className="flex items-center text-muted-foreground mt-1">
                  <Mail className="h-4 w-4 mr-2" />
                  {user.email}
                </div>
              )}
              
              <div className="flex items-center text-muted-foreground mt-1">
                <Calendar className="h-4 w-4 mr-2" />
                Member since {formatDate(user.createdAt)}
              </div>
            </div>

            <Button variant="outline">
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Overview */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Vehicles</span>
                </div>
                <Badge variant="secondary">
                  {vehicles?.length || 0}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Convoys</span>
                </div>
                <Badge variant="secondary">
                  {userConvoys?.length || 0}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Posts</span>
                </div>
                <Badge variant="secondary">
                  {userPosts?.length || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                No recent activity to display
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Vehicles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                My Vehicles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vehicles && vehicles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vehicles.map((vehicle: any) => (
                    <div key={vehicle.id} className="border rounded-lg p-4">
                      {vehicle.imageUrl && (
                        <img 
                          src={vehicle.imageUrl} 
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                      )}
                      <div className="space-y-1">
                        <h3 className="font-semibold">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h3>
                        {vehicle.color && (
                          <p className="text-sm text-muted-foreground">
                            Color: {vehicle.color}
                          </p>
                        )}
                        {vehicle.engine && (
                          <p className="text-sm text-muted-foreground">
                            Engine: {vehicle.engine}
                          </p>
                        )}
                        <Badge variant={vehicle.isPublic ? "default" : "outline"}>
                          {vehicle.isPublic ? "Public" : "Private"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No vehicles added yet</p>
                  <Button variant="outline" className="mt-4">
                    Add Your First Vehicle
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Convoys */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                My Convoys
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userConvoys && userConvoys.length > 0 ? (
                <div className="space-y-4">
                  {userConvoys.map((convoy: any) => (
                    <div key={convoy.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{convoy.title}</h3>
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {convoy.startLocation}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(convoy.startDateTime)}
                          </div>
                        </div>
                        <Badge variant={convoy.status === 'upcoming' ? 'default' : 'outline'}>
                          {convoy.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No convoys joined yet</p>
                  <Button variant="outline" className="mt-4">
                    Browse Convoys
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}