import { Embeddable, Embedded, Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';

@Embeddable()
export class QuizOption {
  @Property()
  label: string;

  @Property()
  scoreWeight: number;

  constructor(label: string, scoreWeight: number) {
    this.label = label;
    this.scoreWeight = scoreWeight;
  }
}

@Entity()
export class QuizQuestion {
  @PrimaryKey({ type: 'uuid' })
  id: string = uuidv4();

  @Property({ length: 500 })
  text: string;

  @Property({ unique: true })
  displayOrder: number;

  @Embedded(() => QuizOption, { array: true })
  options: QuizOption[] = [];

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  constructor(text: string, displayOrder: number, options: QuizOption[]) {
    this.text = text;
    this.displayOrder = displayOrder;
    this.options = options;
  }
}
