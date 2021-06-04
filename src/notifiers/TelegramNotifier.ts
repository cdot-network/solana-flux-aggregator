import TelegramBot from "node-telegram-bot-api";
import { jsonReplacer, jsonReviver } from "../json";
import { stateFromJSON } from "../state";
import { BaseNotifier, NotifyLevel } from "./BaseNotifier";
import path from "path"

interface TelegramNotifierState {
  chatIds: number[];
}

export class TelegramNotifier extends BaseNotifier {
  private bot: TelegramBot;
  private state: TelegramNotifierState = {
    chatIds: [],
  };


  constructor(token: string, private oraclePK: string) {
    super();
    this.bot = new TelegramBot(token, { polling: true });

    this.state = stateFromJSON<TelegramNotifierState>(
      path.join(__dirname, '../../config/telegram.bot.json'),
      {
        chatIds: [],
      },
      {
        replacer: jsonReplacer,
        reviver: jsonReviver,
      }
    )

    this.bot.on("message", (msg) => {
      const chatId = msg.chat.id;
      const msgText = msg.text;
      console.log('msg.text', msg.text);
      
      switch (msgText) {
        case '/start':
        case '/help':
            this.bot.sendMessage(
              chatId,
              ` Commands:
/sub : subscribe to all oracles 
/unsub : unsubscribe from all oracles notifications
/help : show this message
/list : list my oracles subscriptions
/whoisthere : list all active oracles
      `
            );
            break;
        case '/whoisthere':
          this.bot.sendMessage(
            chatId,
            `
      Oracle: ${oraclePK}
            `);
        break;
        case '/sub':
          if(!this.state.chatIds.includes(chatId)) {
            this.state.chatIds.push(chatId);
          }
          break;
        case '/unsub':
          this.state.chatIds = this.state.chatIds.filter(i => i!==chatId);
          break;
        default:
          this.bot.sendMessage(chatId, "Command invalid");
          break;
      }
    });
  }

  notifyCritical(level: NotifyLevel, event: string, message: string, meta: {[key: string]: string}, error: unknown) {
    this.sendMessage(`
*${level} error in ${event}*
${message}
${Object.entries(meta).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
Details: ${error || 'none'}
    `)
  }

  private sendMessage(markdown: string) {
    this.state.chatIds.forEach((chatId) => {
      this.bot.sendMessage(chatId, markdown, {parse_mode: 'Markdown'});
    });
  }
}