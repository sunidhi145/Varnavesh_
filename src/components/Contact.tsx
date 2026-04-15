import { useState } from "react";
import { Instagram, Linkedin, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { backendRequiredMessage, isBackendConfigured, submitContact } from "@/lib/api";
import { contactFormSchema, getFieldErrors, type ContactFormValues } from "@/lib/validators";
import contactBg from "@/assets/contact-bg.jpg";
import contactOverlay from "@/assets/contact-overlay.png";

const initialFormState: ContactFormValues = {
  name: "",
  contact: "",
  email: "",
  query: "",
};

const Contact = () => {
  const [formData, setFormData] = useState<ContactFormValues>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ContactFormValues, string>>>({});
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsed = contactFormSchema.safeParse(formData);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors<keyof ContactFormValues>(parsed.error));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await submitContact(parsed.data, honeypot);
      toast.success("Thank you for your message. We'll get back to you soon.");
      setFormData(initialFormState);
      setHoneypot("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn't send your message right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    if (name in fieldErrors) {
      setFieldErrors((current) => ({
        ...current,
        [name]: undefined,
      }));
    }
  };

  return (
    <section
      id="contact"
      className="relative overflow-hidden px-4 py-20"
      style={{
        backgroundImage: `url(${contactBg})`,
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />

      <div
        className="absolute left-12 top-1/4 hidden h-64 w-48 opacity-25 pointer-events-none lg:block"
        style={{
          backgroundImage: `url(${contactOverlay})`,
          backgroundPosition: "left center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
        }}
      />

      <div
        className="absolute right-12 top-1/3 hidden h-64 w-48 opacity-20 pointer-events-none lg:block"
        style={{
          backgroundImage: `url(${contactOverlay})`,
          backgroundPosition: "right center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          transform: "scaleX(-1)",
        }}
      />

      <div className="container relative z-10 mx-auto max-w-5xl">
        <div className="mb-12 text-center animate-fade-in">
          <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Get In Touch</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Have a question or want to learn more about our collection? We'd love to hear from you.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card className="animate-slide-up border-border/50">
            <CardHeader>
              <CardTitle className="text-2xl">Send us a message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    required
                  />
                  {fieldErrors.name ? <p className="mt-1 text-sm text-destructive">{fieldErrors.name}</p> : null}
                </div>

                <div>
                  <Label htmlFor="contact">Contact Number</Label>
                  <Input
                    id="contact"
                    name="contact"
                    type="tel"
                    value={formData.contact}
                    onChange={handleChange}
                    placeholder="+91 XXXXX XXXXX"
                    required
                  />
                  {fieldErrors.contact ? <p className="mt-1 text-sm text-destructive">{fieldErrors.contact}</p> : null}
                </div>

                <div>
                  <Label htmlFor="email">Email ID</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    required
                  />
                  {fieldErrors.email ? <p className="mt-1 text-sm text-destructive">{fieldErrors.email}</p> : null}
                </div>

                <div>
                  <Label htmlFor="query">Your Query</Label>
                  <Textarea
                    id="query"
                    name="query"
                    value={formData.query}
                    onChange={handleChange}
                    placeholder="Tell us how we can help you..."
                    rows={4}
                    required
                  />
                  {fieldErrors.query ? <p className="mt-1 text-sm text-destructive">{fieldErrors.query}</p> : null}
                </div>

                <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
                  <Label htmlFor="contact-website">Website</Label>
                  <Input
                    id="contact-website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(event) => setHoneypot(event.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !isBackendConfigured}
                  className="w-full bg-primary transition-all hover:scale-105 hover:bg-primary/90"
                >
                  {!isBackendConfigured ? "Backend Setup Required" : isSubmitting ? "Submitting..." : "Submit"}
                </Button>
                {!isBackendConfigured ? (
                  <p className="text-sm text-muted-foreground">{backendRequiredMessage}</p>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a
                        href="mailto:sunidhi.23bce8853@vitapstudent.ac.in"
                        className="text-foreground transition-colors hover:text-primary"
                      >
                        sunidhi.23bce8853@vitapstudent.ac.in
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-foreground">Coming Soon</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Connect With Us</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <a
                    href="https://www.instagram.com/varnavesh.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary text-white transition-transform hover:scale-110"
                    aria-label="Instagram"
                  >
                    <Instagram size={20} />
                  </a>
                  <a
                    href="https://www.linkedin.com/company/varnavesh/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-110"
                    aria-label="LinkedIn"
                  >
                    <Linkedin size={20} />
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="pt-6">
                <p className="text-sm italic text-muted-foreground">
                  "Fashion is the armor to survive the reality of everyday life. At VARNAVESH, we craft that armor
                  with tradition, luxury, and fearless design."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
