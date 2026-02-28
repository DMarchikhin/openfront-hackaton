import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { IsArray, IsNotEmpty, IsNumber, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GetQuizQuestionsUseCase } from '../application/get-quiz-questions.use-case';
import { SubmitQuizUseCase } from '../application/submit-quiz.use-case';

class AnswerDto {
  @IsUUID()
  questionId: string;

  @IsNumber()
  selectedValue: number;
}

class SubmitQuizDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

@Controller('quiz')
export class QuizController {
  constructor(
    private readonly getQuizQuestionsUseCase: GetQuizQuestionsUseCase,
    private readonly submitQuizUseCase: SubmitQuizUseCase,
  ) {}

  @Get('questions')
  async getQuestions() {
    const questions = await this.getQuizQuestionsUseCase.execute();
    return {
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        displayOrder: q.displayOrder,
        options: q.options.map((o) => ({
          label: o.label,
          value: o.scoreWeight,
        })),
      })),
    };
  }

  @Post('submit')
  @HttpCode(201)
  async submit(@Body() body: SubmitQuizDto) {
    return this.submitQuizUseCase.execute(body.userId, body.answers);
  }
}
