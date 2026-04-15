import { useState } from "react";
import { Palette } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { backendRequiredMessage, isBackendConfigured, submitCustomDesignRequest } from "@/lib/api";
import {
  customDesignFormSchema,
  getFieldErrors,
  validateReferenceFiles,
  type CustomDesignFormValues,
} from "@/lib/validators";
import customizeBg from "@/assets/customize-bg.jpg";
import customizeOverlay from "@/assets/customize-overlay.png";

const initialFormState: CustomDesignFormValues = {
  garmentType: "",
  fabric: "",
  occasion: "",
  size: "",
  details: "",
};

const CustomizeStyle = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CustomDesignFormValues>(initialFormState);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CustomDesignFormValues | "images", string>>
  >({});
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsed = customDesignFormSchema.safeParse(formData);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors<keyof CustomDesignFormValues | "images">(parsed.error));
      return;
    }

    try {
      validateReferenceFiles(selectedFiles);
    } catch (error) {
      setFieldErrors((current) => ({
        ...current,
        images: error instanceof Error ? error.message : "Please review your uploaded files.",
      }));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const result = await submitCustomDesignRequest(parsed.data, honeypot, selectedFiles);
      toast.success("Your custom design request has been submitted.");

      if (result.imageUploadWarning) {
        toast.warning(result.imageUploadWarning);
      }

      setOpen(false);
      setFormData(initialFormState);
      setSelectedFiles([]);
      setHoneypot("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn't save your custom design request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="customize"
      className="relative overflow-hidden px-4 py-20"
      style={{
        backgroundImage: `url(${customizeBg})`,
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <div
        className="absolute left-0 top-1/4 hidden h-96 w-64 opacity-20 pointer-events-none lg:block"
        style={{
          backgroundImage: `url(${customizeOverlay})`,
          backgroundPosition: "left center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          transform: "translateX(-20%)",
        }}
      />

      <div
        className="absolute right-0 top-1/3 hidden h-96 w-64 opacity-20 pointer-events-none lg:block"
        style={{
          backgroundImage: `url(${customizeOverlay})`,
          backgroundPosition: "right center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          transform: "translateX(20%) scaleX(-1)",
        }}
      />

      <div className="container relative z-10 mx-auto">
        <div className="mb-12 text-center animate-fade-in">
          <div className="mb-4 flex items-center justify-center">
            <Palette className="mr-3 h-12 w-12 text-primary" />
          </div>
          <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Customize your Style</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Have a unique Indo-Western style in mind? Tell us your vision and let our designers bring it to life!
          </p>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-primary px-8 py-6 text-lg transition-all hover:scale-105 hover:bg-primary/90">
                Start Designing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">Create Your Custom Design</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="garmentType">Garment Type</Label>
                  <Select
                    value={formData.garmentType}
                    onValueChange={(value) => {
                      setFormData((current) => ({ ...current, garmentType: value }));
                      setFieldErrors((current) => ({ ...current, garmentType: undefined }));
                    }}
                  >
                    <SelectTrigger id="garmentType">
                      <SelectValue placeholder="Select garment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kurta">Kurta</SelectItem>
                      <SelectItem value="gown">Gown</SelectItem>
                      <SelectItem value="saree">Saree</SelectItem>
                      <SelectItem value="lehenga">Lehenga</SelectItem>
                      <SelectItem value="dress">Dress</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors.garmentType ? <p className="text-sm text-destructive">{fieldErrors.garmentType}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fabric">Fabric Preference</Label>
                  <Input
                    id="fabric"
                    placeholder="e.g., Silk, Cotton, Georgette"
                    value={formData.fabric}
                    onChange={(event) => {
                      setFormData((current) => ({ ...current, fabric: event.target.value }));
                      setFieldErrors((current) => ({ ...current, fabric: undefined }));
                    }}
                  />
                  {fieldErrors.fabric ? <p className="text-sm text-destructive">{fieldErrors.fabric}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occasion">Occasion</Label>
                  <Input
                    id="occasion"
                    placeholder="e.g., Wedding, Party, Festival"
                    value={formData.occasion}
                    onChange={(event) => {
                      setFormData((current) => ({ ...current, occasion: event.target.value }));
                      setFieldErrors((current) => ({ ...current, occasion: undefined }));
                    }}
                  />
                  {fieldErrors.occasion ? <p className="text-sm text-destructive">{fieldErrors.occasion}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size">Size</Label>
                  <Select
                    value={formData.size}
                    onValueChange={(value) => {
                      setFormData((current) => ({ ...current, size: value }));
                      setFieldErrors((current) => ({ ...current, size: undefined }));
                    }}
                  >
                    <SelectTrigger id="size">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xs">XS</SelectItem>
                      <SelectItem value="s">S</SelectItem>
                      <SelectItem value="m">M</SelectItem>
                      <SelectItem value="l">L</SelectItem>
                      <SelectItem value="xl">XL</SelectItem>
                      <SelectItem value="xxl">XXL</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors.size ? <p className="text-sm text-destructive">{fieldErrors.size}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="images">Reference Images (Optional)</Label>
                  <Input
                    id="images"
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      setSelectedFiles(Array.from(event.target.files ?? []));
                      setFieldErrors((current) => ({ ...current, images: undefined }));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Upload up to 4 images. JPG, PNG, and WEBP only.</p>
                  {selectedFiles.length ? (
                    <p className="text-sm text-muted-foreground">{selectedFiles.map((file) => file.name).join(", ")}</p>
                  ) : null}
                  {fieldErrors.images ? <p className="text-sm text-destructive">{fieldErrors.images}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details">Additional Details</Label>
                  <Textarea
                    id="details"
                    placeholder="Tell us more about your vision..."
                    value={formData.details}
                    onChange={(event) => {
                      setFormData((current) => ({ ...current, details: event.target.value }));
                      setFieldErrors((current) => ({ ...current, details: undefined }));
                    }}
                    rows={4}
                  />
                  {fieldErrors.details ? <p className="text-sm text-destructive">{fieldErrors.details}</p> : null}
                </div>

                <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
                  <Label htmlFor="custom-design-website">Website</Label>
                  <Input
                    id="custom-design-website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(event) => setHoneypot(event.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !isBackendConfigured}>
                  {!isBackendConfigured ? "Backend Setup Required" : isSubmitting ? "Submitting..." : "Submit Design Request"}
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

export default CustomizeStyle;
