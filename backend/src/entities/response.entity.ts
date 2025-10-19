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
import { User } from './user.entity';
import { Answer } from './answer.entity';

export enum ResponseStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
}

@Entity('responses')
export class Response {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  formId: string;

  @ManyToOne(() => Form, (form) => form.responses)
  @JoinColumn({ name: 'formId' })
  form: Form;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.responses)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({
    type: 'enum',
    enum: ResponseStatus,
    default: ResponseStatus.IN_PROGRESS,
  })
  status: ResponseStatus;

  @OneToMany(() => Answer, (answer) => answer.response, {
    cascade: true,
    eager: true,
  })
  answers: Answer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
