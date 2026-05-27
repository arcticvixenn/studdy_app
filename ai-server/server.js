import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const QuestionSchema = z.object({
  questionText: z.string(),
  optionA: z.string(),
  optionB: z.string(),
  optionC: z.string(),
  optionD: z.string(),
  correctOption: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string(),
  topic: z.string(),
  difficulty: z.number().int().min(1).max(5),
  questionOrder: z.number().int().min(1),
});

const QuizSchema = z.object({
  title: z.string(),
  questions: z.array(QuestionSchema).min(3).max(10),
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'studdy-ai-server' });
});

app.post('/generate-quiz', async (req, res) => {
  try {
    const {
      lessonTitle,
      lessonContent,
      questionsCount = 5,
    } = req.body;

    if (!lessonContent || lessonContent.trim().length < 200) {
      return res.status(400).json({
        error: 'Недостатньо тексту для генерації тесту.',
      });
    }

    const response = await openai.responses.parse({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content:
            'Ти створюєш навчальні тести українською мовою. Генеруй тільки коректні тестові питання за змістом наданого уроку. Не вигадуй факти, яких немає в тексті. Варіанти мають бути правдоподібні, але лише один правильний.',
        },
        {
          role: 'user',
          content: `
Назва уроку: ${lessonTitle || 'Урок'}

Створи ${questionsCount} тестових питань на основі цього навчального матеріалу.

Вимоги:
- 4 варіанти відповіді: A, B, C, D
- одна правильна відповідь
- пояснення правильної відповіді
- topic — коротка назва теми
- difficulty від 1 до 5
- questionOrder від 1

Текст уроку:
${lessonContent}
          `,
        },
      ],
      text: {
        format: zodTextFormat(QuizSchema, 'generated_quiz'),
      },
    });

    const quiz = response.output_parsed;

    return res.json({
      title: quiz.title || `Тест: ${lessonTitle || 'Урок'}`,
      questions: quiz.questions.map((question, index) => ({
        ...question,
        questionOrder: index + 1,
      })),
    });
  } catch (error) {
    console.error('generate quiz error:', error);

    return res.status(500).json({
      error: 'Не вдалося згенерувати тест через AI.',
      details: error.message,
    });
  }
});

app.listen(process.env.PORT || 5050, () => {
  console.log(`AI server running on http://localhost:${process.env.PORT || 5050}`);
});