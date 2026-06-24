import { ReactNode, useEffect } from "react";
import { useForm, DefaultValues, FieldValues, Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

export type FieldType = "text" | "number" | "textarea";
export interface FieldDef<T extends FieldValues> {
  name: Path<T>;
  label: string;
  type?: FieldType;
  placeholder?: string;
}

interface Props<T extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: ZodTypeAny;
  defaultValues: DefaultValues<T>;
  fields: FieldDef<T>[];
  onSubmit: (values: T) => Promise<unknown> | unknown;
  submitting?: boolean;
  submitLabel?: string;
}

export function EntityFormDialog<T extends FieldValues>({
  open, onOpenChange, title, description, schema, defaultValues, fields, onSubmit, submitting, submitLabel = "Salvar",
}: Props<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((f) => (
              <FormField
                key={String(f.name)}
                control={form.control}
                name={f.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{f.label}</FormLabel>
                    <FormControl>
                      {f.type === "textarea" ? (
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          placeholder={f.placeholder}
                          rows={3}
                        />
                      ) : (
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          type={f.type === "number" ? "number" : "text"}
                          placeholder={f.placeholder}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
