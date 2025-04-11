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
                vscode.window.showInformationMessage('Gemini API client initialized successfully.');
            } catch (error) {
                // ユーザーにはエラーメッセージが表示されるので、console.errorは不要
                vscode.window.showErrorMessage(`Failed to initialize Gemini API client: ${error instanceof Error ? error.message : String(error)}`);
            }
        } else {
            vscode.window.showWarningMessage('Gemini API key not found. AI features will be disabled.');
        }

        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('memory-bank.ai.apiKey')) {
                // 設定変更を検出、キーをリロード
                this.loadApiKey();
                if (this.apiKey) {
                    try {
                        this.genAI = new GoogleGenerativeAI(this.apiKey);
                        // クライアント再初期化成功、UIにもメッセージを表示
                        vscode.window.showInformationMessage('Gemini API client updated.');
                    } catch (error) {
                        // ユーザーにはエラーメッセージを表示済み
                        vscode.window.showErrorMessage(`Failed to update Gemini API client: ${error instanceof Error ? error.message : String(error)}`);
                        this.genAI = undefined;
                    }
                } else {
                    this.genAI = undefined;
                    vscode.window.showWarningMessage('Gemini API key removed or invalid. AI features disabled.');
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
            // APIキーが設定されていないため警告メッセージを表示する必要がある場合は
            // ここでvscode.window.showWarningMessageを呼び出せるが、
            // 他の場所で同様のメッセージが表示されるので省略
        } else {
            // APIキーのロード成功はログに残す必要なし（初期化成功メッセージが表示される）
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

        // UI上のステータスバーなどに表示するとよいかもしれないが、
        // コンソール出力は必要ない
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
                 // エラーメッセージはUI上に表示されるのでコンソール出力は不要
                 vscode.window.showErrorMessage('Gemini API call failed: No response received.');
                 return null;
            }

           if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
               const blockReason = response.promptFeedback?.blockReason;
               // 現在は使用していないがデバッグ時に必要かもしれないので変数名を_で始める
               const _safetyRatings = response.promptFeedback?.safetyRatings ?? [];
                // 詳細な理由はデバッグ時のみ必要なため、UI上のメッセージには単純化した情報のみを表示
                vscode.window.showWarningMessage(`Content generation blocked due to safety settings. Reason: ${blockReason || 'Check Logs'}`);
                return null;
            }

            const text = response.text();
            // 成功メッセージはUI上に表示してもいいが今回は省略（テキストが戻ってくるので成功は明らか）
            return text;
        } catch (error) {
            // エラーはUI上に表示されるため、コンソール出力は不要
            vscode.window.showErrorMessage(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
}
