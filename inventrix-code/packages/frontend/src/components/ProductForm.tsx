import { forwardRef, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { celebrate } from "../fx/celebrate";
import { gsap } from "../fx/gsap";
import { shake } from "../fx/shake";
import { apiFetch, toApiError } from "../lib/api";
import type { Product, ProductInput } from "../lib/types";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import SummonCircle from "../ui/SummonCircle";
import TextArea from "../ui/TextArea";
import { useToast } from "../ui/Toast";

interface FormState {
  name: string;
  description: string;
  price: string;
  stock: string;
  image_url: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price: "",
  stock: "",
  image_url: "",
};

function toFormState(product: Product | null): FormState {
  if (!product) return EMPTY_FORM;
  return {
    name: product.name,
    description: product.description ?? "",
    price: String(product.price),
    stock: String(product.stock),
    image_url: product.image_url ?? "",
  };
}

function validate(form: FormState): {
  errors: FormErrors;
  input: ProductInput | null;
} {
  const errors: FormErrors = {};
  const price = Number(form.price);
  const stock = Number(form.stock);
  if (!form.name.trim()) errors.name = "Name is required";
  if (!form.description.trim()) errors.description = "Description is required";
  if (form.price.trim() === "" || !Number.isFinite(price) || price < 0)
    errors.price = "Enter a price of 0 or more";
  if (form.stock.trim() === "" || !Number.isInteger(stock) || stock < 0)
    errors.stock = "Enter a whole number of 0 or more";
  if (!form.image_url.trim())
    errors.image_url = "Add an image URL or generate one";
  if (Object.keys(errors).length > 0) return { errors, input: null };
  return {
    errors,
    input: {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      stock,
      image_url: form.image_url.trim(),
    },
  };
}

interface ProductFormProps {
  editing: Product | null;
  onSaved: () => void;
  onCancelEdit: () => void;
}

/** Create / edit form with AI image generation. Keeps the form intact on any failure. */
const ProductForm = forwardRef<HTMLDivElement, ProductFormProps>(
  function ProductForm({ editing, onSaved, onCancelEdit }, ref) {
    const toast = useToast();
    const [form, setForm] = useState<FormState>(() => toFormState(editing));
    const [errors, setErrors] = useState<FormErrors>({});
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const previewRef = useRef<HTMLImageElement>(null);
    const cardRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      setForm(toFormState(editing));
      setErrors({});
    }, [editing]);

    const update = (key: keyof FormState, value: string) => {
      setForm((current) => ({ ...current, [key]: value }));
      setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const setRefs = (el: HTMLDivElement | null) => {
      cardRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const { errors: nextErrors, input } = validate(form);
      setErrors(nextErrors);
      if (!input) {
        shake(cardRef.current);
        return;
      }
      setSaving(true);
      try {
        if (editing) {
          await apiFetch<Product>(`/api/products/${editing.id}`, {
            method: "PUT",
            body: input,
          });
          toast.success(
            "Product updated",
            `${input.name} has been recalibrated.`,
          );
        } else {
          await apiFetch<Product>("/api/products", {
            method: "POST",
            body: input,
          });
          toast.success(
            "Product launched",
            `${input.name} is now in the catalogue.`,
          );
        }
        setForm(EMPTY_FORM);
        onSaved();
      } catch (err: unknown) {
        shake(cardRef.current);
        toast.error("Save failed", toApiError(err).message);
      } finally {
        setSaving(false);
      }
    };

    const generateImage = async () => {
      if (!form.name.trim()) {
        setErrors((current) => ({
          ...current,
          name: "Enter a product name first",
        }));
        shake(cardRef.current);
        return;
      }
      setGenerating(true);
      try {
        const data = await apiFetch<{ imageUrl: string }>(
          "/api/products/generate-image",
          {
            method: "POST",
            body: {
              productName: form.name.trim(),
              description: form.description.trim(),
            },
          },
        );
        update("image_url", data.imageUrl);
        celebrate(900);
        toast.success("Image summoned", "Fresh pixels from the void.");
      } catch (err: unknown) {
        toast.error("Image generation failed", toApiError(err).message);
      } finally {
        setGenerating(false);
      }
    };

    const onPreviewLoad = () => {
      gsap.fromTo(
        previewRef.current,
        { opacity: 0, scale: 1.3, filter: "brightness(4) saturate(3)" },
        {
          opacity: 1,
          scale: 1,
          filter: "brightness(1) saturate(1)",
          duration: 1,
          ease: "expo.out",
        },
      );
    };

    return (
      <Card ref={setRefs} className="scroll-mt-28">
        <h2 className="font-display text-2xl font-black">
          {editing ? `Edit #${editing.id}` : "Add a product"}
        </h2>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-6 grid gap-5 md:grid-cols-2"
        >
          <div className="flex flex-col gap-5">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              error={errors.name}
              data-testid="product-name"
            />
            <TextArea
              label="Description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              error={errors.description}
              data-testid="product-description"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Price"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                error={errors.price}
                data-testid="product-price"
              />
              <Input
                label="Stock"
                type="number"
                step="1"
                min="0"
                inputMode="numeric"
                value={form.stock}
                onChange={(e) => update("stock", e.target.value)}
                error={errors.stock}
                data-testid="product-stock"
              />
            </div>
            <Input
              label="Image URL"
              value={form.image_url}
              onChange={(e) => update("image_url", e.target.value)}
              error={errors.image_url}
              data-testid="product-image-url"
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/20 bg-void/50">
              {generating ? (
                <SummonCircle />
              ) : form.image_url ? (
                <img
                  ref={previewRef}
                  src={form.image_url}
                  alt="Preview"
                  onLoad={onPreviewLoad}
                  className="h-full w-full object-cover"
                  data-testid="product-image-preview"
                />
              ) : (
                <span className="text-sm text-white/40">No image yet</span>
              )}
            </div>
            <Button
              variant="lime"
              onClick={generateImage}
              loading={generating}
              loadingText="Summoning…"
              data-testid="product-generate-image"
            >
              ✦ Generate image
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 md:col-span-2">
            <Button
              type="submit"
              size="lg"
              loading={saving}
              loadingText="Saving…"
              data-testid="product-submit"
              className="flex-1"
            >
              {editing ? "Update product" : "Add product"}
            </Button>
            {editing && (
              <Button
                variant="ghost"
                size="lg"
                onClick={onCancelEdit}
                disabled={saving}
                data-testid="product-cancel-edit"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>
    );
  },
);

export default ProductForm;
