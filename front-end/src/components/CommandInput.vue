<template>
  <v-text-field
    label="Command"
    tabindex="0"
    variant="outlined"
    prefix="> "
    autofocus
    v-model="command"
    :error="error"
    @keyup.enter="executeCommand"
    @keyup.up="historyUp"
    @keyup.down="historyDown"
  ></v-text-field>
</template>

<script>
import { tryToExecuteCommand } from "../utils/command";

export default {
  data() {
    return {
      command: "",
      error: false,
      history: [],
      commandHistoryPointer: 0,
    };
  },
  methods: {
    async executeCommand() {
      if (tryToExecuteCommand(this.command)) {
        this.onCommandSuccess(this.command);
      } else {
        this.error = true;
      }
    },
    onCommandSuccess(command) {
      this.history.push(command);
      this.command = "";
      this.error = false;
      this.commandHistoryPointer = this.history.length;
    },
    historyUp() {
      if (this.commandHistoryPointer > 0) {
        this.commandHistoryPointer--;
        this.command = this.history[this.commandHistoryPointer];
      }
    },
    historyDown() {
      if (this.commandHistoryPointer < this.history.length - 1) {
        this.commandHistoryPointer++;
        this.command = this.history[this.commandHistoryPointer];
      } else {
        this.command = "";
        this.commandHistoryPointer = this.history.length;
      }
    },
  },
};
</script>
