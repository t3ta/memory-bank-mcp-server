import * as vscode from 'vscode';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

/**
 * Service class for interacting with the Google Generative AI (Gemini) API.
 * Handles API key retrieval, client initialization, and basic API calls.
 */
export class AIService {
    private genAI: GoogleGenerativeAI | undefined;
    private apiKey: string | undefined;

    constructor() {
        this.loadApiKey();
        if (this.apiKey) {
            try {
                this.genAI = new GoogleGenerativeAI(this.apiKey);
                console.log('GoogleGenerativeAI client initialized successfully.');
            } catch (error) {
                console.error('Failed to initialize GoogleGenerativeAI client:', error);
                vscode.window.showErrorMessage(`Failed to initialize Gemini API client: ${error instanceof Error ? error.message : String(error)}`);
            }
        } else {
            console.warn('Gemini API key not found. AI features will be disabled.');
        }

        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('memory-bank.ai.apiKey')) {
                console.log('Gemini API key configuration changed. Reloading key and client.');
                this.loadApiKey();
                if (this.apiKey) {
                    try {
                        this.genAI = new GoogleGenerativeAI(this.apiKey);
                        console.log('GoogleGenerativeAI client re-initialized successfully.');
                        vscode.window.showInformationMessage('Gemini API client updated.');
                    } catch (error) {
                        console.error('Failed to re-initialize GoogleGenerativeAI client:', error);
                        vscode.window.showErrorMessage(`Failed to update Gemini API client: ${error instanceof Error ? error.message : String(error)}`);
                        this.genAI = undefined;
                    }
                } else {
                    this.genAI = undefined;
                    console.warn('Gemini API key removed or invalid. AI features disabled.');
                }
            }
        });
    }

    /**
     * Loads the Gemini API key from VS Code settings.
     */
    private loadApiKey(): void {
        const configuration = vscode.workspace.getConfiguration('memory-bank.ai');
        this.apiKey = configuration.get<string>('apiKey');
        if (!this.apiKey) {
            console.warn("Configuration 'memory-bank.ai.apiKey' not found or empty.");
        } else {
            console.log("Gemini API key loaded from settings.");
        }
    }

    /**
     * Checks if the AI service is properly configured and ready to use.
     * @returns True if the service is ready, false otherwise.
     */
    public isReady(): boolean {
        return !!this.genAI;
    }

    /**
     * Generates content using the specified model and prompt.
     * Basic example - more sophisticated error handling and configuration needed.
     * @param modelName The name of the model to use (e.g., 'gemini-1.5-pro-latest').
     * @param prompt The text prompt for generation.
     * @returns The generated text content, or null if an error occurs or the service is not ready.
     */
    public async generateContent(modelName: string = 'gemini-1.5-flash', prompt: string): Promise<string | null> {
        if (!this.isReady() || !this.genAI) {
            vscode.window.showErrorMessage('Gemini API client is not initialized. Please configure the API key.');
            return null;
        }

        console.log(`Generating content with model: ${modelName}`);
        try {
            const model = this.genAI.getGenerativeModel({ model: modelName });

            const safetySettings = [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ];

            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    // Add specific generation config if needed
                },
                safetySettings,
            });

            const response = result.response;
            if (!response) {
                 console.error('Gemini API call failed: No response received.');
                 vscode.window.showErrorMessage('Gemini API call failed: No response received.');
                 return null;
            }

           if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
               const blockReason = response.promptFeedback?.blockReason;
               const safetyRatings = response.promptFeedback?.safetyRatings ?? [];
                console.warn(`Content generation blocked. Reason: ${blockReason || 'Unknown'}. Ratings: ${JSON.stringify(safetyRatings)}`);
                vscode.window.showWarningMessage(`Content generation blocked due to safety settings. Reason: ${blockReason || 'Check Logs'}`);
                return null;
            }

            const text = response.text();
            console.log('Content generated successfully.');
            return text;
        } catch (error) {
            console.error(`Error generating content with model ${modelName}:`, error);
            vscode.window.showErrorMessage(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
}
