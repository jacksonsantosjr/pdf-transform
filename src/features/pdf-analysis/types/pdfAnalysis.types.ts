
import { ExtractionResult } from "../../field-extraction/utils/fieldExtractor";

export interface PageInfo {
    pageNumber: number;
    width: number;
    height: number;
    characterCount: number;
    wordCount: number;
    hasText: boolean;
    hasImages: boolean;
    imageCount: number;
    textPreview: string;
    fullText: string;
}

export interface SuitabilityRating {
    score: number;
    level: "excellent" | "good" | "fair" | "poor";
    reasons: string[];
    recommendations: string[];
}

export type PDFType = "native-text" | "scanned-image" | "mixed" | "empty";

export interface PDFAnalysis {
    fileName: string;
    fileSize: number;
    pageCount: number;
    metadata: Record<string, string>;
    pages: PageInfo[];
    pdfType: PDFType;
    suitability: SuitabilityRating;
    totalCharacters: number;
    totalWords: number;
    hasText: boolean;
    hasImages: boolean;
    pdfVersion: string;
    extractedFields: ExtractionResult | null;
}
