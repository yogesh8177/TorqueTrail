import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Users, Route, Trophy, Zap, MapPin } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10" />
        
        <div className="relative container-automotive py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo */}
            <div className="flex items-center justify-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mr-4">
                <Car className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold gradient-text-racing">
                TorqueTrail
              </h1>
            </div>
            
            {/* Hero text */}
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 text-balance">
              The ultimate social platform for car enthusiasts. Share your garage, 
              organize convoys, and connect with fellow automotive lovers.
            </p>
            
            {/* CTA Button */}
            <Button 
              onClick={handleLogin}
              size="lg"
              className="gradient-racing text-lg px-8 py-4 hover:scale-105 transition-transform duration-200"
            >
              Join the Community
            </Button>
            
            {/* Feature highlights */}
            <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Car className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium">Virtual Garage</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-secondary" />
                </div>
                <p className="text-sm font-medium">Group Convoys</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Route className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm font-medium">Route Sharing</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-yellow-500" />
                </div>
                <p className="text-sm font-medium">AI Blogs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-card/50">
        <div className="container-automotive">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Everything You Need for Your Automotive Journey
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From garage management to epic convoy adventures, TorqueTrail has all the tools 
              to enhance your car enthusiasm.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Garage Management */}
            <Card className="automotive-card-interactive">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                  <Car className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Digital Garage</h3>
                <p className="text-muted-foreground mb-4">
                  Showcase your vehicles with detailed profiles, photos, and specifications. 
                  Compete for Garage of the Month and build your automotive legacy.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Vehicle specifications & photos</li>
                  <li>• Monthly garage competitions</li>
                  <li>• Community ratings & reviews</li>
                </ul>
              </CardContent>
            </Card>

            {/* Convoy Events */}
            <Card className="automotive-card-interactive">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Convoy Events</h3>
                <p className="text-muted-foreground mb-4">
                  Organize and join group drives with fellow enthusiasts. Discover scenic routes 
                  and share unforgettable driving experiences.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Group drive coordination</li>
                  <li>• Route planning & sharing</li>
                  <li>• Real-time weather alerts</li>
                </ul>
              </CardContent>
            </Card>

            {/* AI-Powered Features */}
            <Card className="automotive-card-interactive">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">AI-Powered Blogs</h3>
                <p className="text-muted-foreground mb-4">
                  Transform your drive logs and photos into engaging travel blogs automatically. 
                  Share your automotive adventures with the community.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Automatic blog generation</li>
                  <li>• Photo & video analysis</li>
                  <li>• Route recommendations</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container-automotive">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">10K+</div>
              <div className="text-muted-foreground">Car Enthusiasts</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-secondary mb-2">500+</div>
              <div className="text-muted-foreground">Active Convoys</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-green-500 mb-2">1M+</div>
              <div className="text-muted-foreground">Miles Logged</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-yellow-500 mb-2">25K+</div>
              <div className="text-muted-foreground">AI Blogs Created</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="container-automotive text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of car enthusiasts already sharing their passion on TorqueTrail. 
            Your next automotive adventure awaits.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="gradient-racing text-lg px-8 py-4 hover:scale-105 transition-transform duration-200"
          >
            Get Started Now
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container-automotive text-center text-muted-foreground">
          <p>&copy; 2024 TorqueTrail. Built for car enthusiasts, by car enthusiasts.</p>
        </div>
      </footer>
    </div>
  );
}
