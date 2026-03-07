import { DomainEvent } from 'domain-objects';

import type { BrainArch1ToolCall } from './BrainArch1ToolCall';
import type { BrainArch1ToolResult } from './BrainArch1ToolResult';

/**
 * .what = event emitted when a tool execution completes
 * .why = enables observability and logging of tool usage
 */
export interface BrainArch1ToolExecutionCompletedEvent {
  /**
   * session uuid this event belongs to
   */
  sessionUuid: string;

  /**
   * iteration number when this tool was called
   */
  iterationNumber: number;

  /**
   * timestamp when this event occurred
   */
  occurredAt: string;

  /**
   * the tool call that was executed
   */
  call: BrainArch1ToolCall;

  /**
   * the result of the tool execution
   */
  result: BrainArch1ToolResult;

  /**
   * duration of execution in milliseconds
   */
  durationMs: number;
}

export class BrainArch1ToolExecutionCompletedEvent
  extends DomainEvent<BrainArch1ToolExecutionCompletedEvent>
  implements BrainArch1ToolExecutionCompletedEvent
{
  public static unique = ['sessionUuid', 'call.id'] as const;
}
