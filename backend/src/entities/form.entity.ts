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
import { User } from './user.entity';
import { Question } from './question.entity';
import { Response } from './response.entity';

export enum FormStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('forms')
export class Form {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: FormStatus,
    default: FormStatus.DRAFT,
  })
  status: FormStatus;

  @Column()
  createdById: string;

  @ManyToOne(() => User, (user) => user.createdForms)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'timestamp', nullable: true })
  publishAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expireAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @OneToMany(() => Question, (question) => question.form, {
    cascade: true,
    eager: true,
  })
  questions: Question[];

  @OneToMany(() => Response, (response) => response.form)
  responses: Response[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
