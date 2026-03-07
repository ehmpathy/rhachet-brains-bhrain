import { DomainLiteral } from 'domain-objects';
import { z } from 'zod';

/**
 * .what = json schema definition for tool parameters
 * .why = enables llm to understand tool interface and generate valid calls
 */
export type BrainArch1ToolJsonSchema = Record<string, unknown>;

/**
 * .what = schema container for tool input and output definitions
 * .why = centralizes schema definitions and supports both zod and json schema
 */
export interface BrainArch1ToolSchema {
  input: BrainArch1ToolJsonSchema;
  output?: BrainArch1ToolJsonSchema;
}

/**
 * .what = captures the schema definition of an available tool
 * .why = enables llm to understand available tools and generate valid calls
 */
export interface BrainArch1ToolDefinition {
  /**
   * unique name of the tool
   */
  name: string;

  /**
   * human-readable description of what the tool does
   */
  description: string;

  /**
   * json schemas defining the tool's input and output parameters
   */
  schema: BrainArch1ToolSchema;

  /**
   * whether to enforce strict schema validation
   */
  strict: boolean;
}

export class BrainArch1ToolDefinition
  extends DomainLiteral<BrainArch1ToolDefinition>
  implements BrainArch1ToolDefinition
{
  public static nested = {
    schema: DomainLiteral,
  };
}

/**
 * .what = extracts json schema from a zod object schema
 * .why = enables defining tool schemas using zod for type safety and validation
 *
 * .note = only object schemas are supported. tool parameters must be objects.
 */
export const toJsonSchema = <T extends z.ZodSchema>(
  zodSchema: T,
): BrainArch1ToolJsonSchema => z.toJSONSchema(zodSchema);
