import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCurrentEvent } from "@/hooks/use-current-event";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Clock, Edit, Mail, MessageCircle, Plus, Smartphone, Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Template type definitions
interface RsvpFollowupTemplate {
  id: number;
  eventId: number;
  type: string;
  emailTemplate: string | null;
  emailSubject: string | null;
  whatsappTemplate: string | null;
  sendImmediately: boolean | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  enabled: boolean | null;
  lastUpdated: Date | null;
}

// Form schema for template editing
const templateFormSchema = z.object({
  type: z.string(),
  emailSubject: z.string().min(1, "Email subject is required"),
  emailTemplate: z.string().min(1, "Email template is required"),
  whatsappTemplate: z.string().optional(),
  sendImmediately: z.boolean().default(true),
  scheduledDate: z.string().optional().nullable(),
  scheduledTime: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
});

// Communication settings schema
const communicationSettingsSchema = z.object({
  emailFrom: z.string().email("Invalid email address").min(1, "Email address is required"),
  emailReplyTo: z.string().email("Invalid email address").optional(),
  whatsappNumber: z.string().min(10, "Phone number is required").optional(),
  useGmail: z.boolean().default(false),
  useOutlook: z.boolean().default(false),
  useSendGrid: z.boolean().default(false),
  gmailAccount: z.string().email("Invalid email address").optional(),
  outlookAccount: z.string().email("Invalid email address").optional(),
  sendGridApiKey: z.string().optional(),
});

// Template types with friendly names
const templateTypes = [
  { id: "attendance_confirmed", name: "Attendance Confirmed", description: "Sent when guests confirm their attendance" },
  { id: "attendance_declined", name: "Attendance Declined", description: "Sent when guests decline their attendance" },
  { id: "attendance_pending", name: "Attendance Pending", description: "Sent to remind guests who haven't completed their RSVP" },
  { id: "attendance_maybe", name: "Attendance Maybe", description: "Sent to guests who aren't sure if they can attend" },
];

// Component for seeing a template preview with personalized variables
const TemplatePreview: React.FC<{ template: string }> = ({ template }) => {
  const personalizedTemplate = template
    .replace(/{{guest_name}}/g, "John Smith")
    .replace(/{{first_name}}/g, "John")
    .replace(/{{last_name}}/g, "Smith")
    .replace(/{{couple_names}}/g, "Sarah & Michael")
    .replace(/{{event_name}}/g, "Sarah & Michael's Wedding")
    .replace(/{{rsvp_status}}/g, "confirmed")
    .replace(/{{rsvp_link}}/g, "https://wedding-app.com/rsvp?token=abc123")
    .replace(/{{rsvp_deadline}}/g, "August 15, 2025");

  return (
    <div className="p-4 border rounded-md bg-white">
      <div className="font-medium text-sm mb-2">Preview:</div>
      <div className="whitespace-pre-wrap text-sm">{personalizedTemplate}</div>
    </div>
  );
};

export default function RsvpFollowupConfiguration() {
  const { toast } = useToast();
  const { currentEvent, currentEventId } = useCurrentEvent();
  const [activeTab, setActiveTab] = useState("templates");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RsvpFollowupTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // OAuth configuration is now handled in Event Settings

  // Form for editing templates
  const templateForm = useForm({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      type: "attendance_confirmed",
      emailSubject: "",
      emailTemplate: "",
      whatsappTemplate: "",
      sendImmediately: true,
      scheduledDate: null,
      scheduledTime: null,
      enabled: true,
    },
  });

  // Form for communication settings
  const communicationForm = useForm({
    resolver: zodResolver(communicationSettingsSchema),
    defaultValues: {
      emailFrom: currentEvent?.emailFrom || "",
      emailReplyTo: currentEvent?.emailReplyTo || "",
      whatsappNumber: currentEvent?.whatsappBusinessNumber || "",
      useGmail: false,
      useOutlook: false,
      useSendGrid: false,
      gmailAccount: "",
      outlookAccount: "",
      sendGridApiKey: "",
    },
  });

  // Fetch templates for current event
  const {
    data: templates,
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = useQuery({
    queryKey: [`/api/events/${currentEventId}/rsvp-followup-templates`],
    enabled: !!currentEventId,
  });

  // Mutation for creating/updating a template
  const {
    mutate: saveTemplate,
    isPending: isSavingTemplate,
  } = useMutation({
    mutationFn: async (data: any) => {
      const url = selectedTemplate 
        ? `/api/events/${currentEventId}/rsvp-followup-templates/${selectedTemplate.id}` 
        : `/api/events/${currentEventId}/rsvp-followup-templates`;
      
      const method = selectedTemplate ? "PUT" : "POST";
      const response = await apiRequest(method, url, {
        ...data,
        eventId: currentEventId,
      });
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template saved",
        description: "The follow-up template has been saved successfully.",
      });
      
      // Reset the form and close the dialog
      templateForm.reset();
      setSelectedTemplate(null);
      setShowAddDialog(false);
      
      // Refetch templates
      queryClient.invalidateQueries({ 
        queryKey: [`/api/events/${currentEventId}/rsvp-followup-templates`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving template",
        description: "There was an error saving the template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for saving communication settings
  const {
    mutate: saveCommunicationSettings,
    isPending: isSavingSettings,
  } = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/events/${currentEventId}/communication-settings`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "The communication settings have been saved successfully.",
      });
      
      // Refetch event data to update current event
      queryClient.invalidateQueries({ queryKey: [`/api/current-event`] });
    },
    onError: (error) => {
      toast({
        title: "Error saving settings",
        description: "There was an error saving the communication settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a template
  const {
    mutate: deleteTemplate,
    isPending: isDeletingTemplate,
  } = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/events/${currentEventId}/rsvp-followup-templates/${templateId}`
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template deleted",
        description: "The follow-up template has been deleted successfully.",
      });
      
      // Refetch templates
      queryClient.invalidateQueries({ 
        queryKey: [`/api/events/${currentEventId}/rsvp-followup-templates`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting template",
        description: "There was an error deleting the template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reset form when selected template changes
  useEffect(() => {
    if (selectedTemplate) {
      templateForm.reset({
        type: selectedTemplate.type,
        emailSubject: selectedTemplate.emailSubject || "",
        emailTemplate: selectedTemplate.emailTemplate || "",
        whatsappTemplate: selectedTemplate.whatsappTemplate || "",
        sendImmediately: selectedTemplate.sendImmediately || true,
        scheduledDate: selectedTemplate.scheduledDate || null,
        scheduledTime: selectedTemplate.scheduledTime || null,
        enabled: selectedTemplate.enabled || true,
      });
    } else {
      templateForm.reset({
        type: "attendance_confirmed",
        emailSubject: "",
        emailTemplate: "",
        whatsappTemplate: "",
        sendImmediately: true,
        scheduledDate: null,
        scheduledTime: null,
        enabled: true,
      });
    }
  }, [selectedTemplate, templateForm]);

  // Update communication form when currentEvent changes
  useEffect(() => {
    if (currentEvent) {
      communicationForm.reset({
        emailFrom: currentEvent.emailFrom || "",
        emailReplyTo: currentEvent.emailReplyTo || "",
        whatsappNumber: currentEvent.whatsappBusinessNumber || "",
        useGmail: !!currentEvent.useGmail,
        useOutlook: !!currentEvent.useOutlook,
        useSendGrid: !!currentEvent.useSendGrid,
        gmailAccount: currentEvent.gmailAccount || "",
        outlookAccount: currentEvent.outlookAccount || "",
        sendGridApiKey: currentEvent.sendGridApiKey || "",
      });
      
      // OAuth configuration is now handled in Event Settings
    }
  }, [currentEvent, communicationForm]);
  
  // OAuth configuration is now handled in Event Settings
  // This legacy function can be removed as it's no longer needed

  // Handle template form submission
  const handleTemplateFormSubmit = (data: z.infer<typeof templateFormSchema>) => {
    saveTemplate(data);
  };

  // Handle communication settings form submission
  const handleCommunicationFormSubmit = (data: z.infer<typeof communicationSettingsSchema>) => {
    saveCommunicationSettings(data);
  };

  // Show a preview of the template
  const handlePreviewTemplate = (template: string) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  // Handle editing a template
  const handleEditTemplate = (template: RsvpFollowupTemplate) => {
    setSelectedTemplate(template);
    setShowAddDialog(true);
  };

  // Handle deleting a template with confirmation
  const handleDeleteTemplate = (templateId: number) => {
    if (window.confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
      deleteTemplate(templateId);
    }
  };

  // Get friendly name for template type
  const getTemplateTypeName = (type: string) => {
    return templateTypes.find(t => t.id === type)?.name || type;
  };

  // Render template list
  const renderTemplates = () => {
    if (isLoadingTemplates) {
      return (
        <div className="py-4 text-center text-muted-foreground">
          <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent mx-auto mb-2"></div>
          Loading templates...
        </div>
      );
    }

    if (templatesError) {
      return (
        <div className="py-4 text-center text-destructive">
          <AlertCircle className="h-6 w-6 mx-auto mb-2" />
          Error loading templates
        </div>
      );
    }

    if (!templates || templates.length === 0) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No follow-up templates found</p>
          <p className="text-sm mt-1">Create templates to send personalized messages after RSVP responses</p>
          <Button 
            onClick={() => {
              setSelectedTemplate(null);
              setShowAddDialog(true);
            }} 
            className="mt-4"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Your First Template
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {templates.map((template: RsvpFollowupTemplate) => (
          <Card key={template.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-medium">
                    {getTemplateTypeName(template.type)}
                  </CardTitle>
                  <CardDescription>
                    {templateTypes.find(t => t.id === template.type)?.description}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  {template.enabled ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-1 text-blue-500" />
                  <div className="text-sm">
                    <div className="font-medium">Email Subject:</div>
                    <div>{template.emailSubject || "No subject"}</div>
                  </div>
                </div>
                {template.whatsappTemplate && (
                  <div className="flex items-start gap-2">
                    <Smartphone className="h-4 w-4 mt-1 text-green-500" />
                    <div className="text-sm">
                      <div className="font-medium">WhatsApp Template:</div>
                      <div className="line-clamp-2">{template.whatsappTemplate}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-1 text-amber-500" />
                  <div className="text-sm">
                    <div className="font-medium">Sending:</div>
                    <div>
                      {template.sendImmediately 
                        ? "Immediately after RSVP" 
                        : template.scheduledDate 
                          ? `Scheduled for ${template.scheduledDate} ${template.scheduledTime || ''}` 
                          : "Not scheduled"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handlePreviewTemplate(template.emailTemplate || "")}
              >
                Preview
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEditTemplate(template)}
                >
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-destructive border-destructive hover:bg-destructive/10" 
                  onClick={() => handleDeleteTemplate(template.id)}
                  disabled={isDeletingTemplate}
                >
                  <Trash className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-playfair">RSVP Follow-up Configuration</h2>
          <p className="text-muted-foreground">
            Customize messages sent to guests after they RSVP and configure communication settings
          </p>
        </div>
        {activeTab === "templates" && templates && templates.length > 0 && (
          <Button 
            onClick={() => {
              setSelectedTemplate(null);
              setShowAddDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> New Template
          </Button>
        )}
      </div>

      <Tabs defaultValue="templates" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full md:w-[400px]">
          <TabsTrigger value="templates" className="w-full">
            <MessageCircle className="h-4 w-4 mr-2" /> Follow-up Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>RSVP Follow-up Templates</CardTitle>
              <CardDescription>
                Create and manage custom messages sent to guests after they respond to your invitation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderTemplates()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Settings Tab Removed - Now handled in Event Settings */}
      </Tabs>

      {/* Add/Edit Template Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Edit Follow-up Template" : "Create Follow-up Template"}
            </DialogTitle>
            <DialogDescription>
              Customize the messages sent to guests after they respond to your invitation
            </DialogDescription>
          </DialogHeader>

          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(handleTemplateFormSubmit)} className="space-y-4">
              <FormField
                control={templateForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!!selectedTemplate}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templateTypes.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex flex-col">
                              <span>{type.name}</span>
                              <span className="text-xs text-muted-foreground">{type.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This determines when the message will be sent
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={templateForm.control}
                  name="emailSubject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Thank you for your RSVP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={templateForm.control}
                  name="emailTemplate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Dear {{guest_name}},\n\nThank you for your RSVP..." 
                          className="min-h-[200px] font-mono text-sm"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        You can use these placeholders: {"{{"}{`guest_name || "[guest name]"`}{"}}"}, {"{{"}{`first_name || "[first name]"`}{"}}"}, {"{{"}{`last_name || "[last name]"`}{"}}"}, 
                        {"{{"}{`couple_names || "[couple names]"`}{"}}"}, {"{{"}{`event_name || "[event name]"`}{"}}"}, {"{{"}{`rsvp_status || "[RSVP status]"`}{"}}"}, {"{{"}{`rsvp_link || "[RSVP link]"`}{"}}"}, {"{{"}{`rsvp_deadline || "[RSVP deadline]"`}{"}}"} 
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={templateForm.control}
                  name="whatsappTemplate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={`Dear {{guest_name || "[guest name]"}},\n\nThank you for your RSVP...`}
                          className="min-h-[150px] font-mono text-sm"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        If not provided, the email template will be used for WhatsApp messages
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={templateForm.control}
                  name="sendImmediately"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Send Immediately After RSVP
                        </FormLabel>
                        <FormDescription>
                          If unchecked, you can schedule when to send the message
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {!templateForm.watch("sendImmediately") && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={templateForm.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={templateForm.control}
                      name="scheduledTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={templateForm.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enable Template
                        </FormLabel>
                        <FormDescription>
                          When enabled, this template will be sent based on your settings
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    const value = templateForm.watch("emailTemplate");
                    if (value) {
                      handlePreviewTemplate(value);
                    } else {
                      toast({
                        title: "No template to preview",
                        description: "Please enter an email template first.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Preview
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSavingTemplate}
                  className="gold-gradient"
                >
                  {isSavingTemplate ? "Saving..." : "Save Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              This is how your template will appear to guests
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <TemplatePreview template={previewTemplate} />
          )}
          <DialogFooter>
            <Button onClick={() => setShowPreview(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}