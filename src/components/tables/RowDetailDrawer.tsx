import { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

export interface DetailField {
  label: string;
  value: ReactNode;
  full?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  fields: DetailField[];
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  extraActions?: ReactNode;
}

export function RowDetailDrawer({
  open, onOpenChange, title, subtitle, fields, canEdit, canDelete, onEdit, onDelete, extraActions,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
        </SheetHeader>

        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3">
          {fields.map((f, i) => (
            <div key={i} className={f.full ? "col-span-2" : "col-span-1"}>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</div>
              <div className="text-sm mt-0.5 break-words">{f.value ?? "-"}</div>
            </div>
          ))}
        </div>

        {(canEdit || canDelete || extraActions) && (
          <div className="mt-8 flex flex-wrap gap-2 border-t pt-4">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </Button>
            )}
            {canDelete && (
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </Button>
            )}
            {extraActions}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
