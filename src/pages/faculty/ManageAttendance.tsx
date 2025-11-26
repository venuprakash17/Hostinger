import { UserCheck, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ManageAttendance() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Manage Attendance</h1>
        <p className="text-muted-foreground mt-1">Mark and manage student attendance</p>
      </div>

      <Card className="shadow-card">
        <CardContent className="py-16 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-primary/10 p-6">
              <UserCheck className="h-16 w-16 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Coming Soon</h2>
              <p className="text-muted-foreground max-w-md">
                The attendance management feature is currently under development. We're working hard to bring you a comprehensive attendance marking system.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
              <Clock className="h-4 w-4" />
              <span>This feature will be available soon</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
