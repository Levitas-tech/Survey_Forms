import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Form } from './form.entity';
import { Option } from './option.entity';
import { Answer } from './answer.entity';

export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TEXT_SHORT = 'text_short',
  TEXT_LONG = 'text_long',
  LIKERT_SCALE = 'likert_scale',
  NUMERIC_SCALE = 'numeric_scale',
  FILE_UPLOAD = 'file_upload',
  INSTRUCTION = 'instruction',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  formId: string;

  @ManyToOne(() => Form, (form) => form.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'formId' })
  form: Form;

  @Column({
    type: 'enum',
    enum: QuestionType,
  })
  type: QuestionType;

  @Column()
  text: string;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;

  @Column({ default: 0 })
  orderIndex: number;

  @Column({ default: false })
  required: boolean;

  @OneToMany(() => Option, (option) => option.question, {
    cascade: true,
    eager: true,
  })
  options: Option[];

  @OneToMany(() => Answer, (answer) => answer.question)
  answers: Answer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
