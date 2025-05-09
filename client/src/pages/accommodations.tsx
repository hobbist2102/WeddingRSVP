import React from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";

export default function Accommodations() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-playfair font-bold text-neutral">Accommodations</h2>
        <p className="text-sm text-gray-500">
          Manage hotel accommodations and room allocations
        </p>
      </div>
      
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center text-center">
            <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mb-2">
              The accommodations management feature is under development and will be available soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}