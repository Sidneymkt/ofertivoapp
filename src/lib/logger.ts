/**
 * Sistema de logging condicional
 * Só exibe logs em ambiente de desenvolvimento
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

const noop = () => {};

const createLogger = (): Logger => {
  if (!isDev) {
    return {
      log: noop,
      info: noop,
      warn: noop,
      error: console.error.bind(console), // Sempre mostrar erros, mesmo em produção
      debug: noop,
    };
  }

  return {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };
};

export const logger = createLogger();
