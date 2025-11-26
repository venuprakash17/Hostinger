import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info, CheckCircle, XCircle, X } from "lucide-react";
import { apiClient } from "@/integrations/api/client";

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export function AnnouncementPopup() {
  const location = useLocation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Don't show announcements on login/signup pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  
  // Check if user is authenticated (has token)
  const isAuthenticated = () => {
    return !!localStorage.getItem('access_token');
  };

  useEffect(() => {
    // Only fetch announcements if user is authenticated and not on auth pages
    if (!isAuthPage && isAuthenticated()) {
      fetchAnnouncements();
    }
  }, [location.pathname]);

  const fetchAnnouncements = async () => {
    // Don't fetch if on auth pages or not authenticated
    if (isAuthPage || !isAuthenticated()) {
      return;
    }

    try {
      setLoading(true);
      // Use Promise.race with a timeout for announcements (non-critical)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      const data = await Promise.race([
        apiClient.getMyAnnouncements(),
        timeoutPromise
      ]) as Announcement[];
      
      if (data && data.length > 0) {
        setAnnouncements(data);
        setCurrentIndex(0);
        setOpen(true);
      }
    } catch (error: any) {
      // Silently ignore errors - announcements are non-critical
      // Don't log to console to avoid cluttering logs
      if (process.env.NODE_ENV === 'development') {
        console.debug("Announcements not available:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (announcements.length > 0 && currentIndex < announcements.length) {
      // Mark current announcement as seen
      try {
        await apiClient.markAnnouncementSeen(announcements[currentIndex].id);
      } catch (error: any) {
        console.error("Error marking announcement as seen:", error);
      }
    }

    // Move to next announcement or close
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setOpen(false);
      setAnnouncements([]);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case "error":
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "success":
        return "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800";
      case "warning":
        return "border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800";
      case "error":
        return "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800";
      default:
        return "border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800";
    }
  };

  // Don't render on auth pages or if not authenticated
  if (isAuthPage || !isAuthenticated() || loading || announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent 
        className={`max-w-md ${getTypeStyles(currentAnnouncement.type)}`}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-start gap-3">
            {getIcon(currentAnnouncement.type)}
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">
                {currentAnnouncement.title}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm whitespace-pre-wrap">
                {currentAnnouncement.message}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          {announcements.length > 1 && (
            <span className="text-xs text-muted-foreground self-center mr-auto">
              {currentIndex + 1} of {announcements.length}
            </span>
          )}
          <Button onClick={handleClose} size="sm">
            {currentIndex < announcements.length - 1 ? "Next" : "Got it"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

