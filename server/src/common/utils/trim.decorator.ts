import { Transform, type TransformFnParams } from 'class-transformer';

export function Trim(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  );
}
