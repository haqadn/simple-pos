export interface Command {
  parse(command: string): boolean;
  execute(): Promise<void>;
}
