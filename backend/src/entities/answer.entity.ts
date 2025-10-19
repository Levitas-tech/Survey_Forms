import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Response } from './response.entity';
import { Question } from './question.entity';

@Entity('answers')
export class Answer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  responseId: string;

  @ManyToOne(() => Response, (response) => response.answers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'responseId' })
  response: Response;

  @Column()
  questionId: string;

  @ManyToOne(() => Question, (question) => question.answers)
  @JoinColumn({ name: 'questionId' })
  question: Question;

  @Column({ type: 'jsonb', nullable: true })
  value: any;

  @Column({ type: 'float', nullable: true })
  score: number;

  @Column({ type: 'jsonb', nullable: true })
  files: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
