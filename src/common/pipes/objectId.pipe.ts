import { Injectable, PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Defines the pipe for Types.ObjectId validation and transformation
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<any, Types.ObjectId> {
  /**
   * Validates and transforms a value to a Types.ObjectId
   *
   * @remarks
   * Throws a ArgumentException if the validation fails
   *
   * @param value - The value to validate and transform
   * @returns The Types.ObjectId
   */
  public transform(value: string): Types.ObjectId {
    try {
      const transformedObjectId: Types.ObjectId = new Types.ObjectId(value);
      return transformedObjectId;
    } catch (error) {
      throw new Error('Validation failed (ObjectId is expected)');
    }
  }
}
