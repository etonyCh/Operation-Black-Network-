import { vi } from 'vitest'

// Mock winston to suppress log output and prevent file creation
vi.mock('winston', () => {
  const noop = () => {}
  const logger = {
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    verbose: noop,
  }
  return {
    default: {
      createLogger: () => logger,
      transports: { Console: class {}, File: class {} },
      format: {
        combine: () => {},
        timestamp: () => {},
        colorize: () => {},
        printf: () => {},
        json: () => {},
        errors: () => {},
      },
    },
    createLogger: () => logger,
    transports: { Console: class {}, File: class {} },
    format: {
      combine: () => {},
      timestamp: () => {},
      colorize: () => {},
      printf: () => {},
      json: () => {},
      errors: () => {},
    },
  }
})
