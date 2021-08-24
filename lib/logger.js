const config = require('./config')
const winston = require('winston')

/**
 * The JSON structured logging format.
 */
const JSON_FORMAT = 'json'

const logger = winston.createLogger({
  level: config.getConf('logger:level'),
  format:
    config.getConf('logger:format') === JSON_FORMAT
      ? winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.timestamp(),
          winston.format.json()
        )
      // Maintain the format from Winston 2.x.
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.errors({ stack: true }),
          winston.format.timestamp(),
          winston.format.printf((info) => {
            return `${info.timestamp} - ${info.level}: ${
              info.stack == null ? info.message : info.stack
            }`
          })
        ),
  transports: [new winston.transports.Console()]
})

module.exports = exports = logger
