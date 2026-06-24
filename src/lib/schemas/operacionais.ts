import { z } from "zod";

export const obraSchema = z.object({
  num_obra: z.string().trim().min(1, "Número da obra é obrigatório").max(60),
  status: z.string().trim().max(60).optional().or(z.literal("")),
  sigco: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }),
});
export type ObraFormData = z.infer<typeof obraSchema>;

export const localidadeSchema = z.object({
  cod_lcd: z.string().trim().min(1, "Código é obrigatório").max(30),
  nome_lcd: z.string().trim().min(1, "Nome é obrigatório").max(120),
  regional: z.string().trim().max(60).optional().or(z.literal("")),
});
export type LocalidadeFormData = z.infer<typeof localidadeSchema>;

export const prioritarioSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(120),
  cpf_corrigido: z
    .string()
    .trim()
    .max(14)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(v.replace(/\D/g, "").length === 11 ? v : v), {
      message: "CPF inválido",
    }),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
  endereco: z.string().trim().max(255).optional().or(z.literal("")),
});
export type PrioritarioFormData = z.infer<typeof prioritarioSchema>;
