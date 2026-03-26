#!/usr/bin/env node

import { Command } from "commander";
import { registerListCommand } from "./commands/list";
import { registerQueryCommand } from "./commands/query";
import {
  registerInsertCommand,
  registerUpdateCommand,
  registerDeleteCommand,
} from "./commands/crud";
import {
  registerCompactCommand,
  registerDropCommand,
  registerExportCommand,
  registerImportCommand,
} from "./commands/admin";
import { registerIndexCommand } from "./commands/index";
import { registerStudioCommand } from "./commands/studio";
import { registerShellCommand } from "./commands/shell";
import { registerStatsCommand } from "./commands/stats";

const program = new Command();

program
  .name("toollessdb")
  .description("Command-line interface for ToollessDB database")
  .version("1.0.1");

registerListCommand(program);
registerQueryCommand(program);
registerInsertCommand(program);
registerUpdateCommand(program);
registerDeleteCommand(program);
registerCompactCommand(program);
registerDropCommand(program);
registerExportCommand(program);
registerImportCommand(program);
registerIndexCommand(program);
registerStatsCommand(program);
registerShellCommand(program);
registerStudioCommand(program);

program.parse();
