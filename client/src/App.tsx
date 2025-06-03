import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Garage from "@/pages/garage";
import Convoys from "@/pages/convoys";
import ConvoyDetail from "@/pages/convoy-detail";
import DriveLogs from "@/pages/drive-logs";
import PublicDriveLog from "@/pages/public-drive-log";
import Profile from "@/pages/profile";
import UserPosts from "@/pages/user-posts";
import Routes from "@/pages/routes";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/share/:id" component={PublicDriveLog} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/garage" component={Garage} />
      <Route path="/convoys" component={Convoys} />
      <Route path="/convoy/:id" component={ConvoyDetail} />
      <Route path="/drive-logs" component={DriveLogs} />
      <Route path="/drive-logs/:id" component={DriveLogs} />
      <Route path="/share/:id" component={PublicDriveLog} />
      <Route path="/profile" component={Profile} />
      <Route path="/profile/posts" component={UserPosts} />
      <Route path="/routes" component={Routes} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark min-h-screen bg-background text-foreground">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
