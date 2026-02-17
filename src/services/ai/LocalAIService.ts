import { toast } from 'sonner';

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const DEFAULT_MODEL = 'qwen2.5:7b'; // أفضل موديل حالياً للعربي والأداء المتوازن

export interface AIResponse {
  response: string;
  done: boolean;
  context?: number[];
}

export const localAiService = {
  /**
   * التحقق من اتصال السيرفر المحلي
   */
  checkConnection: async (): Promise<boolean> => {
    try {
      const res = await fetch('http://localhost:11434/api/tags'); // endpoint to list models
      return res.ok;
    } catch (e) {
      console.warn('Ollama is not running locally.');
      return false;
    }
  },

  /**
   * إرسال طلب ذكي (تحليل، كتابة، تلخيص)
   */
  generate: async (
    prompt: string,
    model = DEFAULT_MODEL,
    onStream?: (chunk: string) => void
  ): Promise<string> => {
    try {
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: true, // تفعيل الرد المتتابع (مثل ChatGPT)
        }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      let isDone = false;
      while (!isDone) {
        const { done, value } = await reader.read();
        if (done) {
          isDone = true;
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        // Ollama sends JSON objects in chunks
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              fullResponse += json.response;
              if (onStream) onStream(json.response);
            }
            if (json.done) break;
          } catch (e) {
            // Ignore parse errors for partial chunks
          }
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('AI Generation Failed:', error);
      toast.error('تأكد من تشغيل Ollama في الخلفية');
      return 'فشل الاتصال بالذكاء الاصطناعي المحلي.';
    }
  },
};
