/**
 * ATS Checker Service
 * Extracts text from PDFs and analyzes for ATS compatibility
 */

import { analyzeATSWithOpenAI, ATSAnalysisResult } from './openaiService';

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Dynamic import to keep bundle size small
    const pdfjs: any = await import('pdfjs-dist');
    const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default as string;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let extracted = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = (content.items as any[]).map((it: any) => it.str ?? '').join(' ');
      extracted += strings + '\n';
    }

    return extracted.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF. Please ensure the file is a valid PDF.');
  }
}

/**
 * Extract text from DOCX file
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    const { default: mammoth }: any = await import('mammoth/mammoth.browser');
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value || '';
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from DOCX. Please ensure the file is a valid DOCX file.');
  }
}

/**
 * Extract text from text file
 */
export async function extractTextFromTXT(file: File): Promise<string> {
  return await file.text();
}

/**
 * Check ATS compatibility of a resume file
 */
export async function checkATSCompatibility(
  file: File,
  jobDescription?: string
): Promise<ATSAnalysisResult> {
  let resumeText = '';

  // Extract text based on file type
  if (file.type === 'application/pdf') {
    resumeText = await extractTextFromPDF(file);
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    resumeText = await extractTextFromDOCX(file);
  } else if (file.type === 'text/plain') {
    resumeText = await extractTextFromTXT(file);
  } else {
    throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT file.');
  }

  if (!resumeText.trim()) {
    throw new Error('Could not extract text from the document. Please ensure the file contains readable text.');
  }

  // Analyze with OpenAI
  return await analyzeATSWithOpenAI(resumeText, jobDescription);
}

/**
 * Check ATS compatibility from resume text
 */
export async function checkATSCompatibilityFromText(
  resumeText: string,
  jobDescription?: string
): Promise<ATSAnalysisResult> {
  if (!resumeText.trim()) {
    throw new Error('Resume text cannot be empty');
  }

  return await analyzeATSWithOpenAI(resumeText, jobDescription);
}


