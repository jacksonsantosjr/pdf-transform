import { describe, it, expect } from "vitest";
import { extractFieldsFromPages } from "./fieldExtractor";

describe("fieldExtractor", () => {
    it("deve extrair CPFs válidos formatados", () => {
        // Nota: 123.456.789-09 é um CPF matematicamente inválido, então o extrator deve ignorá-lo se a validação estiver funcionando.
        // Vamos usar um CPF válido para o teste: 000.000.000-00 (inválido por dígitos iguais)
        // Gerador de CPF válido: 529.982.247-25

        const textWithValidCPF = "O CPF é 529.982.247-25.";
        const result = extractFieldsFromPages([{ pageNumber: 1, text: textWithValidCPF }]);

        expect(result.summary.cpf).toBe(1);
        expect(result.fields.some(f => f.type === "cpf" && f.value === "529.982.247-25")).toBe(true);
    });

    it("deve ignorar CPFs inválidos", () => {
        const text = "CPF inválido: 111.111.111-11 (dígitos iguais) e 123.456.789-00 (dígito verificador errado).";
        const result = extractFieldsFromPages([{ pageNumber: 1, text }]);
        expect(result.summary.cpf).toBe(0);
    });

    it("deve extrair CNPJs válidos", () => {
        // Gerador de CNPJ válido: 12.345.678/0001-95 (Exemplo fictício válido: 00.000.000/0001-91)
        const text = "A empresa possui CNPJ 00.000.000/0001-91 ativa.";
        const result = extractFieldsFromPages([{ pageNumber: 1, text }]);

        expect(result.summary.cnpj).toBe(1);
        expect(result.fields[0].value).toBe("00.000.000/0001-91");
    });

    it("deve extrair E-mails", () => {
        const text = "Entre em contato: contato@empresa.com ou suporte@site.com.br";
        const result = extractFieldsFromPages([{ pageNumber: 1, text }]);

        expect(result.summary.email).toBe(2);
        expect(result.fields.map(f => f.value)).toContain("contato@empresa.com");
        expect(result.fields.map(f => f.value)).toContain("suporte@site.com.br");
    });

    it("deve extrair Datas em diferentes formatos", () => {
        const text = "Data 1: 25/12/2023. Data 2: 2023-12-25. Data 3: 10 de Janeiro de 2024.";
        const result = extractFieldsFromPages([{ pageNumber: 1, text }]);

        expect(result.summary.data).toBeGreaterThanOrEqual(1);
        // Verificar se extraiu pelo menos uma das datas
        const values = result.fields.filter(f => f.type === "data").map(f => f.value);
        expect(values).toContain("25/12/2023");
    });

    it("deve extrair Valores Monetários", () => {
        const text = "O valor total é R$ 1.500,00 e o desconto foi de R$ 50,00.";
        const result = extractFieldsFromPages([{ pageNumber: 1, text }]);

        expect(result.summary.valor_monetario).toBe(2);
        expect(result.fields.map(f => f.value)).toContain("R$ 1.500,00");
        expect(result.fields.map(f => f.value)).toContain("R$ 50,00");
    });

    it("deve consolidar campos repetidos em várias páginas", () => {
        const pages = [
            { pageNumber: 1, text: "Email: teste@teste.com" },
            { pageNumber: 2, text: "Fale conosco: teste@teste.com" },
        ];
        const result = extractFieldsFromPages(pages);

        expect(result.summary.email).toBe(1); // 1 email único
        const field = result.fields.find(f => f.type === "email");
        expect(field).toBeDefined();
        expect(field?.count).toBe(2);
        expect(field?.pages).toEqual([1, 2]);
    });
});
