import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle } from "lucide-react";

interface Accommodation {
  id: number;
  name: string;
  total: number;
  allocated: number;
  percentage: number;
}

interface SpecialRequirement {
  id: number;
  text: string;
  status: "completed" | "pending";
}

interface AccommodationStatusProps {
  accommodations: Accommodation[];
  specialRequirements: SpecialRequirement[];
  onManageClick?: () => void;
}

export default function AccommodationStatus({ 
  accommodations, 
  specialRequirements,
  onManageClick
}: AccommodationStatusProps) {
  return (
    <Card>
      <CardHeader className="p-6 border-b border-gray-200">
        <CardTitle className="text-lg font-medium font-playfair">Accommodation Status</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {accommodations.map((accommodation) => (
            <div key={accommodation.id}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-500">{accommodation.name}</span>
                <span className="text-sm font-medium text-gray-700">
                  {accommodation.allocated}/{accommodation.total} allocated
                </span>
              </div>
              <Progress value={accommodation.percentage} className="h-2 bg-gray-200" indicatorClassName="bg-primary" />
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h4 className="font-medium text-neutral mb-4">Special Requirements</h4>
          <ul className="space-y-2">
            {specialRequirements.map((requirement) => (
              <li key={requirement.id} className="flex items-start">
                {requirement.status === "completed" ? (
                  <CheckCircle className="text-success mt-1 mr-2 h-4 w-4" />
                ) : (
                  <AlertCircle className="text-warning mt-1 mr-2 h-4 w-4" />
                )}
                <span className="text-sm">{requirement.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <Button 
            onClick={onManageClick}
            className="w-full gold-gradient text-white hover:bg-opacity-90"
          >
            Manage Accommodations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
