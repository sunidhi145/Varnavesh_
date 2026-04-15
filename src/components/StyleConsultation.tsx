import { useState } from "react";
import { Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { backendRequiredMessage, isBackendConfigured, submitConsultation } from "@/lib/api";
import {
  consultationFormSchema,
  getFieldErrors,
  getTodayDateString,
  type ConsultationFormValues,
} from "@/lib/validators";
import consultationBg from "@/assets/consultation-bg.jpg";
import consultationOverlay from "@/assets/consultation-overlay.png";

const initialFormState: ConsultationFormValues = {
  name: "",
  email: "",
  date: "",
  time: "",
  notes: "",
};

const StyleConsultation = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<ConsultationFormValues>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ConsultationFormValues, string>>>({});
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsed = consultationFormSchema.safeParse(formData);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors<keyof ConsultationFormValues>(parsed.error));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await submitConsultation(parsed.data, honeypot);
      toast.success("Your consultation is booked. We'll contact you with the next steps.");
      setOpen(false);
      setFormData(initialFormState);
      setHoneypot("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn't save your booking right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="consultation"
      className="relative overflow-hidden px-4 py-20"
      style={{
        backgroundImage: `url(${consultationBg})`,
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />

      <div
        className="absolute bottom-8 left-8 hidden h-72 w-72 opacity-30 pointer-events-none lg:block"
        style={{
          backgroundImage: `url(${consultationOverlay})`,
          backgroundPosition: "left bottom",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
        }}
      />

      <div
        className="absolute right-8 top-8 hidden h-64 w-64 opacity-25 pointer-events-none lg:block"
        style={{
          backgroundImage: `url(${consultationOverlay})`,
          backgroundPosition: "right top",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          transform: "scaleX(-1)",
        }}
      />

      <div className="container relative z-10 mx-auto">
        <div className="mb-12 text-center animate-fade-in">
          <div className="mb-4 flex items-center justify-center">
            <Video className="mr-3 h-12 w-12 text-primary" />
          </div>
          <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Personal Style Consultation</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Unsure how to mix and match? Book a free 15-minute video consultation with our expert Indo-Western stylists
            for personalized advice, fitting guidance, and exclusive recommendations.
          </p>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-primary px-8 py-6 text-lg transition-all hover:scale-105 hover:bg-primary/90">
                Book Your Free Call
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">Book Your Consultation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="consultation-name">Full Name</Label>
                  <Input
                    id="consultation-name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(event) => {
                      setFormData((current) => ({ ...current, name: event.target.value }));
                      setFieldErrors((current) => ({ ...current, name: undefined }));
                    }}
                    required
                  />
                  {fieldErrors.name ? <p className="text-sm text-destructive">{fieldErrors.name}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consultation-email">Email Address</Label>
                  <Input
                    id="consultation-email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(event) => {
                      setFormData((current) => ({ ...current, email: event.target.value }));
                      setFieldErrors((current) => ({ ...current, email: undefined }));
                    }}
                    required
                  />
                  {fieldErrors.email ? <p className="text-sm text-destructive">{fieldErrors.email}</p> : null}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="consultation-date">Preferred Date</Label>
                    <Input
                      id="consultation-date"
                      type="date"
                      min={getTodayDateString()}
                      value={formData.date}
                      onChange={(event) => {
                        setFormData((current) => ({ ...current, date: event.target.value }));
                        setFieldErrors((current) => ({ ...current, date: undefined }));
                      }}
                      required
                    />
                    {fieldErrors.date ? <p className="text-sm text-destructive">{fieldErrors.date}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultation-time">Preferred Time</Label>
                    <Input
                      id="consultation-time"
                      type="time"
                      value={formData.time}
                      onChange={(event) => {
                        setFormData((current) => ({ ...current, time: event.target.value }));
                        setFieldErrors((current) => ({ ...current, time: undefined }));
                      }}
                      required
                    />
                    {fieldErrors.time ? <p className="text-sm text-destructive">{fieldErrors.time}</p> : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consultation-notes">What do you need help with?</Label>
                  <Textarea
                    id="consultation-notes"
                    placeholder="Tell us briefly what you'd like to discuss..."
                    value={formData.notes}
                    onChange={(event) => {
                      setFormData((current) => ({ ...current, notes: event.target.value }));
                      setFieldErrors((current) => ({ ...current, notes: undefined }));
                    }}
                    rows={4}
                  />
                  {fieldErrors.notes ? <p className="text-sm text-destructive">{fieldErrors.notes}</p> : null}
                </div>

                <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
                  <Label htmlFor="consultation-website">Website</Label>
                  <Input
                    id="consultation-website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(event) => setHoneypot(event.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !isBackendConfigured}>
                  {!isBackendConfigured ? "Backend Setup Required" : isSubmitting ? "Saving..." : "Confirm Booking"}
                </Button>
                {!isBackendConfigured ? (
                  <p className="text-sm text-muted-foreground">{backendRequiredMessage}</p>
                ) : null}
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
};

export default StyleConsultation;
