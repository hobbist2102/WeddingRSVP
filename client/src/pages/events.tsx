import React, { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useEvents } from "@/hooks/use-events";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { formatDate, getDaysDifference } from "@/lib/utils";
import { 
  AlertCircle, 
  CalendarClock, 
  MapPin, 
  Users, 
  Calendar,
  Clock,
  PlusCircle,
  Edit,
  Trash
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import DataTable from "@/components/ui/data-table";

// Define form schemas
const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  coupleNames: z.string().min(1, "Couple names are required"),
  date: z.string().min(1, "Date is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
});

const ceremonyFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  attireCode: z.string().optional(),
});

export default function Events() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { 
    events, 
    isLoadingEvents, 
    createEvent, 
    isCreatingEvent,
    updateEvent,
    isUpdatingEvent,
    getCeremonies,
  } = useEvents();
  
  // State for modals
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  const [showEditEventDialog, setShowEditEventDialog] = useState(false);
  const [showAddCeremonyDialog, setShowAddCeremonyDialog] = useState(false);
  const [showEditCeremonyDialog, setShowEditCeremonyDialog] = useState(false);
  const [showDeleteCeremonyDialog, setShowDeleteCeremonyDialog] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [currentCeremony, setCurrentCeremony] = useState<any>(null);
  
  // Event form
  const eventForm = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      coupleNames: "",
      date: "",
      location: "",
      description: "",
    },
  });
  
  // Ceremony form
  const ceremonyForm = useForm<z.infer<typeof ceremonyFormSchema>>({
    resolver: zodResolver(ceremonyFormSchema),
    defaultValues: {
      name: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      description: "",
      attireCode: "",
    },
  });
  
  // Select event for detail view
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  
  // Fetch ceremonies for selected event
  const { data: ceremonies = [] } = useQuery({
    queryKey: [`/api/events/${selectedEventId}/ceremonies`],
    enabled: !!selectedEventId,
  });
  
  // Create ceremony mutation
  const createCeremonyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        "POST", 
        `/api/events/${selectedEventId}/ceremonies`, 
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${selectedEventId}/ceremonies`] });
      setShowAddCeremonyDialog(false);
      ceremonyForm.reset();
      toast({
        title: "Ceremony Added",
        description: "The ceremony has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Add Ceremony",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    },
  });
  
  // Update ceremony mutation
  const updateCeremonyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        "PUT", 
        `/api/ceremonies/${currentCeremony.id}`, 
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${selectedEventId}/ceremonies`] });
      setShowEditCeremonyDialog(false);
      setCurrentCeremony(null);
      toast({
        title: "Ceremony Updated",
        description: "The ceremony has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Update Ceremony",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    },
  });
  
  // Delete ceremony mutation
  const deleteCeremonyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "DELETE", 
        `/api/ceremonies/${currentCeremony.id}`, 
        {}
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${selectedEventId}/ceremonies`] });
      setShowDeleteCeremonyDialog(false);
      setCurrentCeremony(null);
      toast({
        title: "Ceremony Deleted",
        description: "The ceremony has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Delete Ceremony",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    },
  });
  
  // Handle event form submission
  const onSubmitEventForm = (data: z.infer<typeof eventFormSchema>) => {
    if (currentEvent) {
      // Update existing event
      updateEvent({
        id: currentEvent.id,
        data: {
          ...data,
          date: new Date(data.date),
        },
      });
    } else {
      // Create new event
      createEvent({
        ...data,
        date: new Date(data.date),
        createdBy: 1, // Assuming the current user ID
      });
    }
  };
  
  // Handle ceremony form submission
  const onSubmitCeremonyForm = (data: z.infer<typeof ceremonyFormSchema>) => {
    if (currentCeremony) {
      // Update existing ceremony
      updateCeremonyMutation.mutate({
        ...data,
        date: new Date(data.date),
      });
    } else {
      // Create new ceremony
      createCeremonyMutation.mutate({
        ...data,
        date: new Date(data.date),
      });
    }
  };
  
  // Open edit event dialog
  const handleEditEvent = (event: any) => {
    setCurrentEvent(event);
    eventForm.reset({
      title: event.title,
      coupleNames: event.coupleNames,
      date: event.date ? format(new Date(event.date), "yyyy-MM-dd") : "",
      location: event.location,
      description: event.description || "",
    });
    setShowEditEventDialog(true);
  };
  
  // Open add ceremony dialog
  const handleAddCeremony = () => {
    setCurrentCeremony(null);
    ceremonyForm.reset({
      name: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      description: "",
      attireCode: "",
    });
    setShowAddCeremonyDialog(true);
  };
  
  // Open edit ceremony dialog
  const handleEditCeremony = (ceremony: any) => {
    setCurrentCeremony(ceremony);
    ceremonyForm.reset({
      name: ceremony.name,
      date: ceremony.date ? format(new Date(ceremony.date), "yyyy-MM-dd") : "",
      startTime: ceremony.startTime,
      endTime: ceremony.endTime,
      location: ceremony.location,
      description: ceremony.description || "",
      attireCode: ceremony.attireCode || "",
    });
    setShowEditCeremonyDialog(true);
  };
  
  // Open delete ceremony dialog
  const handleDeleteCeremony = (ceremony: any) => {
    setCurrentCeremony(ceremony);
    setShowDeleteCeremonyDialog(true);
  };
  
  // Ceremony details table columns
  const ceremonyColumns = [
    {
      header: "Name",
      accessor: "name",
    },
    {
      header: "Date",
      accessor: "date",
      cell: (row: any) => formatDate(row.date),
    },
    {
      header: "Time",
      accessor: (row: any) => `${row.startTime} - ${row.endTime}`,
    },
    {
      header: "Location",
      accessor: "location",
    },
    {
      header: "Attire",
      accessor: "attireCode",
      cell: (row: any) => row.attireCode || "Not specified",
    },
    {
      header: "Actions",
      accessor: (row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditCeremony(row);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCeremony(row);
            }}
            className="text-red-500 hover:text-red-700"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-playfair font-bold text-neutral">Events & Ceremonies</h2>
          <p className="text-sm text-gray-500">
            Manage your wedding events and ceremonies
          </p>
        </div>
        
        <Button 
          onClick={() => {
            setCurrentEvent(null);
            eventForm.reset({
              title: "",
              coupleNames: "",
              date: "",
              location: "",
              description: "",
            });
            setShowAddEventDialog(true);
          }}
          className="gold-gradient"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </div>
      
      {isLoadingEvents ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event: any) => (
            <Card 
              key={event.id} 
              className="overflow-hidden transition-all duration-300 hover:shadow-lg"
            >
              <CardHeader className="bg-primary/10 pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-xl font-playfair">{event.title}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEditEvent(event)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="font-script text-lg text-primary">
                  {event.coupleNames}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-start space-x-2">
                  <CalendarClock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">{formatDate(event.date)}</div>
                    <div className="text-sm text-muted-foreground">
                      {getDaysDifference(event.date) > 0 
                        ? `${getDaysDifference(event.date)} days to go` 
                        : "Event has passed"}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>{event.location}</div>
                </div>
                
                {event.description && (
                  <p className="text-sm text-muted-foreground">
                    {event.description}
                  </p>
                )}
              </CardContent>
              
              <CardFooter className="border-t pt-4 flex justify-between">
                <Button 
                  variant="outline" 
                  className="border-primary text-primary"
                  onClick={() => setSelectedEventId(event.id)}
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Events Found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              You haven't created any wedding events yet. Start by adding your first event.
            </p>
            <Button 
              onClick={() => {
                setCurrentEvent(null);
                eventForm.reset();
                setShowAddEventDialog(true);
              }}
              className="gold-gradient"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Event
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Event Details Dialog */}
      {selectedEventId && (
        <Dialog open={!!selectedEventId} onOpenChange={() => setSelectedEventId(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-playfair">
                {events.find(e => e.id === selectedEventId)?.title}
              </DialogTitle>
              <DialogDescription className="font-script text-lg text-primary">
                {events.find(e => e.id === selectedEventId)?.coupleNames}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="info">
              <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-6">
                <TabsTrigger value="info">
                  <Calendar className="mr-2 h-4 w-4" /> Event Info
                </TabsTrigger>
                <TabsTrigger value="ceremonies">
                  <Clock className="mr-2 h-4 w-4" /> Ceremonies
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="info">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Event Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium">{formatDate(events.find(e => e.id === selectedEventId)?.date)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium">{events.find(e => e.id === selectedEventId)?.location}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Description</h3>
                    <p className="text-muted-foreground">
                      {events.find(e => e.id === selectedEventId)?.description || "No description provided"}
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Timeline Overview</h3>
                    {ceremonies.length > 0 ? (
                      <div className="space-y-4">
                        {ceremonies.map((ceremony: any) => (
                          <div key={ceremony.id} className="flex space-x-4">
                            <div className="flex flex-col items-center">
                              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-primary" />
                              </div>
                              <div className="w-0.5 bg-gray-200 h-full mt-2"></div>
                            </div>
                            <div className="space-y-1 pt-1">
                              <div className="font-medium">{ceremony.name}</div>
                              <div className="text-sm text-muted-foreground">{formatDate(ceremony.date)}</div>
                              <div className="text-sm">{ceremony.startTime} - {ceremony.endTime}</div>
                              <div className="text-sm flex items-center">
                                <MapPin className="h-3 w-3 mr-1" /> {ceremony.location}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No ceremonies added yet. Add ceremonies from the Ceremonies tab.
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="ceremonies">
                <div className="flex justify-between mb-4">
                  <h3 className="text-lg font-medium">Ceremonies</h3>
                  <Button 
                    size="sm" 
                    onClick={handleAddCeremony}
                    className="gold-gradient"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Ceremony
                  </Button>
                </div>
                
                {ceremonies.length > 0 ? (
                  <DataTable
                    data={ceremonies}
                    columns={ceremonyColumns}
                    keyField="id"
                  />
                ) : (
                  <div className="bg-muted/50 p-8 rounded-lg text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-1">No Ceremonies Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Add ceremonies like welcome dinner, main ceremony, reception, etc.
                    </p>
                    <Button onClick={handleAddCeremony} className="gold-gradient">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add First Ceremony
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Add/Edit Event Dialog */}
      <Dialog 
        open={showAddEventDialog || showEditEventDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddEventDialog(false);
            setShowEditEventDialog(false);
            setCurrentEvent(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
            <DialogDescription>
              {currentEvent ? "Update the event details" : "Fill in the details for your wedding event"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...eventForm}>
            <form onSubmit={eventForm.handleSubmit(onSubmitEventForm)} className="space-y-4">
              <FormField
                control={eventForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sarah & Michael's Wedding" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={eventForm.control}
                name="coupleNames"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Couple Names</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sarah & Michael" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={eventForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={eventForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Grand Palace Hotel, New York" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={eventForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add details about your wedding event..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  className="gold-gradient"
                  disabled={isCreatingEvent || isUpdatingEvent}
                >
                  {isCreatingEvent || isUpdatingEvent ? "Saving..." : currentEvent ? "Save Changes" : "Add Event"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Add/Edit Ceremony Dialog */}
      <Dialog 
        open={showAddCeremonyDialog || showEditCeremonyDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddCeremonyDialog(false);
            setShowEditCeremonyDialog(false);
            setCurrentCeremony(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentCeremony ? "Edit Ceremony" : "Add New Ceremony"}</DialogTitle>
            <DialogDescription>
              {currentCeremony ? "Update the ceremony details" : "Fill in the details for this ceremony or event"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...ceremonyForm}>
            <form onSubmit={ceremonyForm.handleSubmit(onSubmitCeremonyForm)} className="space-y-4">
              <FormField
                control={ceremonyForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ceremony Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Welcome Dinner, Main Ceremony, Reception" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={ceremonyForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={ceremonyForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 14:00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={ceremonyForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 16:00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={ceremonyForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Hotel Garden, Grand Ballroom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={ceremonyForm.control}
                name="attireCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attire Code (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Formal, Semi-Formal, Casual" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={ceremonyForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add details about this ceremony..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  className="gold-gradient"
                  disabled={createCeremonyMutation.isPending || updateCeremonyMutation.isPending}
                >
                  {createCeremonyMutation.isPending || updateCeremonyMutation.isPending 
                    ? "Saving..." 
                    : currentCeremony ? "Save Changes" : "Add Ceremony"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Ceremony Dialog */}
      <Dialog 
        open={showDeleteCeremonyDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteCeremonyDialog(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ceremony</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this ceremony? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {currentCeremony && (
            <div className="py-4">
              <p className="font-medium">{currentCeremony.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(currentCeremony.date)}, {currentCeremony.startTime} - {currentCeremony.endTime}
              </p>
              <p className="text-sm text-muted-foreground">{currentCeremony.location}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteCeremonyDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteCeremonyMutation.mutate()}
              disabled={deleteCeremonyMutation.isPending}
            >
              {deleteCeremonyMutation.isPending ? "Deleting..." : "Delete Ceremony"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
